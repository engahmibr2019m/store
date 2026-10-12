import { useEffect, useRef, useState } from 'react';
import MP4Box from 'mp4box';

const LERP_TAU = 8;
const SNAP = 0.002;
const LRU_MAX = 24;
const LEAD = 24;
const WATCHDOG = 60000;

type BankFrame = { ts: number; blob: Blob };

export function useVideoScrub(
  videoSrc: string,
  containerRef: React.RefObject<HTMLElement>
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [canvasLive, setCanvasLive] = useState(false);

  useEffect(() => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let span = 1;
    let dur = 0;
    let current = 0;
    let target = 0;
    let ready = false;
    let reverted = false;
    let painted = false;
    let building = false;
    let raf = 0;
    let last = performance.now();
    let lastP = -1;
    let seeking = false;
    let bank: BankFrame[] = [];
    let lastIndex = -1;
    const lru = new Map<number, ImageBitmap | null>();
    let lastBitmap: ImageBitmap | null = null;
    let cancelled = false;

    const measure = () => {
      const el = containerRef.current;
      span = el ? Math.max(1, el.offsetHeight - window.innerHeight) : 1;
    };
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (containerRef.current) resizeObserver?.observe(containerRef.current);
    const getProgress = () => Math.min(1, Math.max(0, window.scrollY / span));

    const onMeta = () => { dur = video.duration || 0; };
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('seeking', () => (seeking = true));
    video.addEventListener('seeked', () => (seeking = false));
    if (video.readyState >= 1) onMeta();

    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    measure();

    /* ---------- frame bank helpers ---------- */
    const nearestIndex = (t: number) => {
      const us = t * 1e6;
      let lo = 0;
      let hi = bank.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (bank[mid].ts < us) lo = mid + 1;
        else hi = mid;
      }
      if (lo > 0 && Math.abs(bank[lo - 1].ts - us) <= Math.abs(bank[lo].ts - us)) return lo - 1;
      return lo;
    };

    const loadBitmap = (i: number) => {
      if (i < 0 || i >= bank.length || lru.has(i)) return;
      lru.set(i, null);
      createImageBitmap(bank[i].blob).then((bmp) => {
        if (cancelled) return bmp.close();
        lru.set(i, bmp);
        while (lru.size > LRU_MAX) {
          const oldest = lru.keys().next().value as number;
          lru.get(oldest)?.close();
          lru.delete(oldest);
        }
      });
    };

    const paint = (bmp: ImageBitmap) => {
      // object-cover behaviour on the 1920x1080 canvas
      const cw = canvas.width;
      const ch = canvas.height;
      const s = Math.max(cw / bmp.width, ch / bmp.height);
      const w = bmp.width * s;
      const h = bmp.height * s;
      ctx.drawImage(bmp, (cw - w) / 2, (ch - h) / 2, w, h);
      lastBitmap = bmp;
      if (!painted) {
        painted = true;
        setCanvasLive(true);
      }
    };

    const drawFromBank = () => {
      const i = nearestIndex(current);
      for (let k = i - 1; k <= i + 2; k++) loadBitmap(k);
      const bmp = lru.get(i);
      if (bmp) {
        if (i !== lastIndex || bmp !== lastBitmap) {
          paint(bmp);
          lastIndex = i;
        }
      } else if (lastBitmap && !painted) {
        paint(lastBitmap);
      }
    };

    /* ---------- build the frame bank ---------- */
    const buildBank = async (hw: 'prefer-hardware' | 'prefer-software') => {
      const res = await fetch(videoSrc, { mode: 'cors' });
      const buf = (await res.arrayBuffer()) as ArrayBuffer & { fileStart?: number };
      if (cancelled) return;

      const file = MP4Box.createFile();
      const samples: any[] = [];
      let config: VideoDecoderConfig | null = null;

      await new Promise<void>((resolve, reject) => {
        file.onError = reject;
        file.onReady = (info: any) => {
          const track = info.videoTracks[0];
          if (!track) return reject(new Error('no video track'));
          const trak = file.getTrackById(track.id);
          const entry = trak.mdia.minf.stbl.stsd.entries[0];
          const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
          let description: Uint8Array | undefined;
          if (box) {
            const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);
            box.write(stream);
            description = new Uint8Array(stream.buffer, 8);
          }
          config = {
            codec: track.codec.startsWith('vp08') ? 'vp8' : track.codec,
            codedWidth: track.video.width,
            codedHeight: track.video.height,
            hardwareAcceleration: hw,
            description,
          };
          file.setExtractionOptions(track.id, null, { nbSamples: 1000 });
          file.start();
        };
        file.onSamples = (_id: number, _u: unknown, s: any[]) => {
          samples.push(...s);
          if (samples.length >= (file.getInfo().videoTracks[0].nb_samples ?? Infinity)) resolve();
        };
        buf.fileStart = 0;
        file.appendBuffer(buf);
        file.flush();
        // flush may deliver everything synchronously; resolve defensively
        setTimeout(resolve, 0);
      });

      if (!config || cancelled) return;
      const support = await VideoDecoder.isConfigSupported(config);
      if (!support.supported) throw new Error('config unsupported');

      const off = new OffscreenCanvas(1280, 720);
      const octx = off.getContext('2d')!;
      const frames: BankFrame[] = [];
      let pending = 0;
      const encodes: Promise<void>[] = [];

      const decoder = new VideoDecoder({
        output: (frame) => {
          const ts = frame.timestamp;
          if (off.width !== frame.displayWidth) {
            off.width = frame.displayWidth;
            off.height = frame.displayHeight;
          }
          octx.drawImage(frame, 0, 0);
          frame.close();
          pending++;
          encodes.push(
            off.convertToBlob({ type: 'image/webp', quality: 0.82 }).then((blob) => {
              frames.push({ ts, blob });
              pending--;
            })
          );
        },
        error: (e) => { throw e; },
      });
      decoder.configure(config);

      for (const s of samples) {
        if (cancelled) return;
        while (decoder.decodeQueueSize + pending > LEAD) {
          await new Promise((r) => setTimeout(r, 4));
        }
        decoder.decode(
          new EncodedVideoChunk({
            type: s.is_sync ? 'key' : 'delta',
            timestamp: (s.cts * 1e6) / s.timescale,
            duration: (s.duration * 1e6) / s.timescale,
            data: s.data,
          })
        );
      }
      await decoder.flush();
      await Promise.all(encodes);
      decoder.close();

      frames.sort((a, b) => a.ts - b.ts);
      bank = frames;
      if (!cancelled && !reverted && bank.length > 1) ready = true;
    };

    const startBuild = async () => {
      if (building || reduced || typeof VideoDecoder === 'undefined') return;
      building = true;
      const watchdog = window.setTimeout(() => {
        if (!ready) {
          reverted = true;
          setCanvasLive(false);
        }
      }, WATCHDOG);
      try {
        try {
          await buildBank('prefer-hardware');
        } catch {
          await buildBank('prefer-software');
        }
      } catch {
        reverted = true; // video seeking fallback keeps working
      } finally {
        clearTimeout(watchdog);
      }
    };

    if (document.readyState === 'complete') startBuild();
    else window.addEventListener('load', startBuild, { once: true });

    /* ---------- main loop ---------- */
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const p = getProgress();
      if (p !== lastP) {
        lastP = p;
        setProgress(p);
      }

      if (dur > 0) {
        target = p * dur;
        if (reduced) current = target;
        else {
          current += (target - current) * (1 - Math.exp(-dt * LERP_TAU));
          if (Math.abs(target - current) < SNAP) current = target;
        }
        if (ready && !reverted) drawFromBank();
        else if (!seeking && Math.abs(video.currentTime - current) > 0.01) {
          video.currentTime = current;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      resizeObserver?.disconnect();
      video.removeEventListener('loadedmetadata', onMeta);
      lru.forEach((b) => b?.close());
    };
  }, [videoSrc, containerRef]);

  return { videoRef, canvasRef, progress, canvasLive };
}
