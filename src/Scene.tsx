import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, ArrowDown, ChevronUp } from 'lucide-react';
import { useVideoScrub } from './useVideoScrub';
import Backdrop from './Backdrop';
import type { Dict } from './i18n';
import { products } from './data';

/** نفس الفيديو المرجعي. استبدله برابط فيديو تاني لو عايز، بشرط يدعم CORS عشان بنك الفريمات يشتغل. */
const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4';
/** لو حطيت فيديو باسم bg.mp4 جوه فولدر public هيتستخدم بدل رابط CloudFront (وبيشتغل من غير مشاكل CORS) */
const LOCAL_VIDEO = '/bg.mp4';
const TRACK_VH = 500;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const d = (s: string) => ({ '--d': s }) as CSSProperties;

const s1Opacity = (p: number) => (p < 0.2 ? 1 : Math.max(0, 1 - (p - 0.2) / 0.08));
const s2Opacity = (p: number) => {
  if (p < 0.32) return 0;
  if (p < 0.4) return (p - 0.32) / 0.08;
  if (p < 0.55) return 1;
  return Math.max(0, 1 - (p - 0.55) / 0.08);
};
const s3Opacity = (p: number) => (p < 0.67 ? 0 : p < 0.75 ? (p - 0.67) / 0.08 : 1);

const STATS = [
  { icon: '<', target: 500, decimals: 0 },
  { icon: '%', target: 10, decimals: 0 },
  { icon: '*', target: 3, decimals: 0 },
  { icon: '#', target: products.length, decimals: 0 },
];

function Stat({ i, label, suffix, icon, target, decimals }: {
  i: number; label: string; suffix: string; icon: string; target: number; decimals: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = wrap.current;
    const out = num.current;
    if (!el || !out) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = 0;
    let raf = 0;
    const run = () => {
      if (reduce) { out.textContent = target.toFixed(decimals); return; }
      const dur = 1500 + i * 80;
      let start: number | null = null;
      const frame = (now: number) => {
        if (start === null) start = now;
        const t = Math.min((now - start) / dur, 1);
        const e = 1 - Math.pow(1 - t, 3);
        out.textContent = (target * e).toFixed(decimals);
        if (t < 1) raf = requestAnimationFrame(frame);
      };
      timer = window.setTimeout(() => { raf = requestAnimationFrame(frame); }, 480 + i * 90);
    };
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) { run(); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [i, target, decimals]);

  return (
    <div className="stat anim" style={d(`${0.5 + i * 0.08}s`)} ref={wrap}>
      <span className="stat-icon" aria-hidden="true">{icon}</span>
      <span className="stat-value"><span ref={num}>0</span><span className="suf">{suffix}</span></span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function Stagger({ show, delay = 0, children, className = '' }: {
  show: boolean; delay?: number; children: ReactNode; className?: string;
}) {
  const style: CSSProperties = {
    opacity: show ? 1 : 0,
    transform: show ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  };
  return <div className={className} style={style}>{children}</div>;
}

type SceneProps = { t: Dict; onShop: () => void; onCategories: () => void; onTop: () => void };

function SceneInner({ src, t, onShop, onCategories, onTop }: SceneProps & { src: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackVh, setTrackVh] = useState(TRACK_VH);
  const { videoRef, canvasRef, progress: p, canvasLive } = useVideoScrub(src, trackRef);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 720px)');
    const update = () => setTrackVh(mobile.matches ? 360 : TRACK_VH);
    update();
    mobile.addEventListener('change', update);
    return () => mobile.removeEventListener('change', update);
  }, []);

  const o1 = s1Opacity(p);
  const o2 = s2Opacity(p);
  const o3 = s3Opacity(p);
  const sec = (o: number): CSSProperties => ({ opacity: clamp01(o) });

  return (
    <div ref={trackRef} className="track" style={{ height: `${trackVh}vh` }}>
      <div className="scene">
        <Backdrop progress={p} />
        <video ref={videoRef} src={src} muted playsInline preload="auto" className="layer" />
        <canvas ref={canvasRef} width={1920} height={1080}
          className="layer canvas-frames" style={{ opacity: canvasLive ? 1 : 0 }} />
        <div className="scrim" />

        <div className="overlay">
          {/* Section 1 — hero + stats */}
          <section className={`sec s1 ${o1 > 0.3 ? 'on' : ''}`} style={sec(o1)}>
            <div className="hero">
              <h1 className="headline anim">
                <span className="line l1">{t.h1a}</span>
                <span className="line l2">{t.h1b}</span>
              </h1>

              <p className="subhead anim" style={d('0.28s')}>{t.sub}</p>

              <div className="cta-row">
                <button type="button" className="cta anim anim-pulse" style={d('0.4s')} onClick={onShop}>{t.cta}</button>
                <button type="button" className="cta-ghost anim" style={d('0.48s')} onClick={onCategories}>{t.cta2}</button>
              </div>
            </div>

            <div className="stats">
              {STATS.map((s, i) => (
                <Stat key={i} i={i} label={t.stats[i]} suffix={t.statSuf[i]} {...s} />
              ))}
            </div>

          </section>

          {/* Section 2 — statement */}
          <section className={`sec s2 ${o2 > 0.3 ? 'on' : ''}`} style={sec(o2)}>
            <Stagger show={o2 > 0.3} delay={0} className="s2-wrap">
              <h2 className="s2-title">
                {t.s2a}
                <span style={{ opacity: 0.8 }}>{t.s2b}</span>
                <span style={{ color: 'var(--accent)' }}>{t.s2c}</span>
              </h2>
            </Stagger>
            <div className="s2-controls">
              <Stagger show={o2 > 0.3} delay={200}>
                <button type="button" className="circle c48" aria-label={t.cta2} onClick={onCategories}><ArrowDown size={18} /></button>
              </Stagger>
              <Stagger show={o2 > 0.3} delay={350}>
                <div className="dots"><i className="act" /><i /><i /></div>
              </Stagger>
              <Stagger show={o2 > 0.3} delay={500}>
                <button type="button" className="circle c40" aria-label="Top" onClick={onTop}><ChevronUp size={16} /></button>
              </Stagger>
            </div>
          </section>

          {/* Section 3 — closing */}
          <section className={`sec s3 ${o3 > 0.3 ? 'on' : ''}`} style={sec(o3)}>
            <div className="s3-box">
              <Stagger show={o3 > 0.3} delay={0}>
                <p className="eyebrow">{t.s3eyebrow}</p>
              </Stagger>
              <Stagger show={o3 > 0.3} delay={150}>
                <h2 className="s3-title">{t.s3a}<br />{t.s3b}</h2>
              </Stagger>
              <Stagger show={o3 > 0.3} delay={300}>
                <div className="s3-cta">
                  <span>{t.s3cta}</span>
                  <button type="button" className="go" aria-label={t.s3cta} onClick={onShop}>
                    <ArrowRight size={16} className="flip" />
                  </button>
                </div>
              </Stagger>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function useVideoSource() {
  const [src, setSrc] = useState(VIDEO_URL);
  useEffect(() => {
    let off = false;
    fetch(LOCAL_VIDEO, { method: 'HEAD' })
      .then((r) => {
        const ct = r.headers.get('content-type') || '';
        if (!off && r.ok && ct.startsWith('video')) setSrc(LOCAL_VIDEO);
      })
      .catch(() => { /* مفيش ملف محلي، هنكمل بالرابط الأساسي */ });
    return () => { off = true; };
  }, []);
  return src;
}

export default function Scene(props: SceneProps) {
  const src = useVideoSource();
  return <SceneInner key={src} src={src} {...props} />;
}
