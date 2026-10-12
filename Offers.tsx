import { useEffect, useRef, useState } from 'react';
import { products } from './data';
import type { Dict } from './i18n';

/** كل شريحة: صورة الخلفية من منتج حقيقي، وزرارها يفتح صفحة المنتج (أو يمرّر لأقسام المتجر) */
const SLIDE_PRODUCT: (number | null)[] = [null, 1, 4, 5];
const BG: Record<number, string | undefined> = Object.fromEntries(
  SLIDE_PRODUCT.filter((x): x is number => x !== null).map((id) => [id, products.find((p) => p.id === id)?.img])
);
const AUTOPLAY_MS = 5500;

export default function Offers({ t, onGo }: { t: Dict; onGo: (id: string) => void }) {
  const slides = t.offers.slides;
  const [i, setI] = useState(0);
  const paused = useRef(false);
  const visible = useRef(false);
  const carousel = useRef<HTMLDivElement>(null);

  const go = (n: number) => setI((n + slides.length) % slides.length);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const element = carousel.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; }, { threshold: 0.15 });
    observer.observe(element);
    const id = window.setInterval(() => {
      if (!paused.current && visible.current && !document.hidden) setI((x) => (x + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => { clearInterval(id); observer.disconnect(); };
  }, [slides.length]);

  return (
    <section id="products" className="wrap offers-wrap">
      <div className="offers-layout">
      <div
        ref={carousel}
        className="offers"
        role="region"
        aria-roledescription="carousel"
        aria-label={t.offers.tab}
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; }}
        onFocus={() => { paused.current = true; }}
        onBlur={() => { paused.current = false; }}
      >
        <span className="offers-tab">{t.offers.tab}</span>
        <div className="offers-nav">
          <button type="button" className="pill" aria-label={t.offers.prev} onClick={() => go(i - 1)}>
            <i className="fa-solid fa-chevron-left" />
          </button>
          <button type="button" className="pill" aria-label={t.offers.next} onClick={() => go(i + 1)}>
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>

        {slides.map((s, n) => {
          const pid = SLIDE_PRODUCT[n];
          const img = pid !== null && pid !== undefined ? BG[pid] : undefined;
          const on = n === i;
          return (
            <div key={s.title} className={`slide ${on ? 'on' : ''}`} aria-hidden={!on} aria-roledescription="slide">
              <div className="slide-bg" style={img ? { backgroundImage: `url(${img})` } : undefined} />
              <div className="slide-body">
                <h2>{s.title}</h2>
                <p>{s.sub}</p>
                {pid === null || pid === undefined ? (
                  <button type="button" className="cta" tabIndex={on ? 0 : -1} onClick={() => onGo('categories')}>{s.cta}</button>
                ) : (
                  <a className="cta" href={`#/product/${pid}`} tabIndex={on ? 0 : -1}>{s.cta}</a>
                )}
              </div>
            </div>
          );
        })}

        <div className="offers-dots">
          {slides.map((s, n) => (
            <button key={s.title} type="button" className={n === i ? 'act' : ''}
              aria-label={`${t.offers.go} ${n + 1}`} aria-current={n === i} onClick={() => go(n)} />
          ))}
        </div>
      </div>
      <aside className="offers-intro">
        <span className="offers-intro-kicker">STYLO · {t.offers.tab}</span>
        <h2>{t.offers.slides[0].title}</h2>
        <p>{t.fAbout}</p>
      </aside>
      </div>
    </section>
  );
}
