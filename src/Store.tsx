import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { products, type Cat, type Product } from './data';
import type { Dict, Lang } from './i18n';
import Thumb from './Thumb';
import Offers from './Offers';

export type InfoKind = 'returns' | 'help' | 'shipping' | 'track';
const SUPPORT_KINDS: InfoKind[] = ['help', 'track', 'shipping'];
const SECTIONS: Cat[] = ['men', 'women', 'accessories'];
const dl = (s: string) => ({ '--d': s }) as CSSProperties;
type ViewMode = 'horizontal' | 'vertical';
type SortMode = 'default' | 'price-asc' | 'price-desc' | 'popular' | 'rating';

function sortProducts(items: Product[], sort: SortMode) {
  const copy = [...items];
  if (sort === 'price-asc') return copy.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') return copy.sort((a, b) => b.price - a.price);
  if (sort === 'popular') return copy.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
  if (sort === 'rating') return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return copy;
}

/** ظهور العناصر مع السكرول */
function useRevealAll(dep: unknown) {
  useEffect(() => {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}

/** الكرت: صورة المنتج وتحتها شريط الاسم والسعر. الضغط بيفتح صفحة المنتج. */
export function Card({ p, t, lang, onAdd }: { p: Product; t: Dict; lang: Lang; onAdd: (id: number) => void }) {
  return (
    <div className="pc-shell" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <a className="pc" href={`#/product/${p.id}`}>
        <div className="pc-img"><Thumb p={p} alt={p.name[lang]} /></div>
        <div className="pc-bar">
          <span className="pc-name">{p.name[lang]}</span>
          <b className="pc-price">{p.price} {t.currency}</b>
        </div>
      </a>
      <button type="button" className="primary pc-buy-button" onClick={() => onAdd(p.id)}>
        <i className="fa-solid fa-bag-shopping" /> {t.add}
      </button>
    </div>
  );
}

function ProductListCard({ p, t, lang, onAdd }: { p: Product; t: Dict; lang: Lang; onAdd: (id: number) => void }) {
  return (
    <article className="product-list-card" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <a className="product-list-image" href={`#/product/${p.id}`} aria-label={p.name[lang]}>
        <Thumb p={p} alt={p.name[lang]} />
      </a>
      <div className="product-list-info">
        <div className="product-list-copy">
          <span className="card-cat">{t.cats[p.cat]}</span>
          <a className="product-list-name" href={`#/product/${p.id}`}><h3>{p.name[lang]}</h3></a>
          <p>{p.desc[lang]}</p>
          <div className="product-list-rating"><span aria-hidden="true">★★★★★</span><b>{(p.rating ?? 4.8).toFixed(1)}</b></div>
        </div>
        <div className="product-list-buy">
          <b className="product-list-price">{p.price} {t.currency}</b>
          <button type="button" className="primary" onClick={() => onAdd(p.id)}><i className="fa-solid fa-bag-shopping" /> {t.add}</button>
        </div>
      </div>
    </article>
  );
}

/** صف أفقي يدوي التصفح من غير حركة تلقائية. */
function Row({ items, t, lang, onAdd }: { items: Product[]; t: Dict; lang: Lang; onAdd: (id: number) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    const el = track.current;
    if (!el) return;
    const step = Math.max(260, el.clientWidth * 0.72);
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    el.scrollBy({ left: direction * step, behavior });
  };
  return (
    <div className="row-shell">
      <div className="row-nav" dir="ltr">
        <button type="button" className="pill" aria-label={t.prevItems} onClick={() => move(-1)}><i className="fa-solid fa-chevron-left" /></button>
        <button type="button" className="pill" aria-label={t.nextItems} onClick={() => move(1)}><i className="fa-solid fa-chevron-right" /></button>
      </div>
      <div className="mq" dir="ltr" ref={track}>
        <div className="mq-track">
          {items.map((p) => <Card key={p.id} p={p} t={t} lang={lang} onAdd={onAdd} />)}
        </div>
      </div>
    </div>
  );
}

interface Props {
  t: Dict;
  lang: Lang;
  query: string;
  onGo: (id: string) => void;
  onInfo: (k: InfoKind) => void;
  onAdd: (id: number) => void;
  priceVersion: string;
}

function Store({ t, lang, query, onGo, onInfo, onAdd, priceVersion }: Props) {
  const [view, setView] = useState<ViewMode>('vertical');
  const [sort, setSort] = useState<SortMode>('default');
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const q = query.trim().toLowerCase();
  useEffect(() => { setVisibleCounts({}); }, [q, sort, view]);
  const results = useMemo<Product[]>(
    () => (q ? sortProducts(products.filter((p) => [p.name.ar, p.name.en, p.name.fr].some((name) => name.toLowerCase().includes(q))), sort) : []),
    [q, sort, priceVersion]
  );
  const bySection = useMemo(
    () => SECTIONS.map((c) => ({ cat: c, items: sortProducts(products.filter((p) => p.cat === c), sort) })),
    [priceVersion, sort]
  );

  useRevealAll(q);

  return (
    <main className="store">
      <Offers t={t} onGo={onGo} />
      <div className="product-controls wrap" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="view-control">
          <span>{t.viewMode}</span>
          <div className="view-toggle" role="group" aria-label={t.viewMode}>
            <button type="button" aria-pressed={view === 'horizontal'} className={view === 'horizontal' ? 'active' : ''}
              onClick={() => setView('horizontal')}><i className="fa-solid fa-arrows-left-right" /> {t.viewHorizontal}</button>
            <button type="button" aria-pressed={view === 'vertical'} className={view === 'vertical' ? 'active' : ''}
              onClick={() => setView('vertical')}><i className="fa-solid fa-arrows-up-down" /> {t.viewVertical}</button>
          </div>
        </div>
        <label className="sort-control"><span>{t.sortBy}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} aria-label={t.sortBy}>
            <option value="default">{t.sortDefault}</option>
            <option value="price-asc">{t.sortPriceAsc}</option>
            <option value="price-desc">{t.sortPriceDesc}</option>
            <option value="popular">{t.sortPopular}</option>
            <option value="rating">{t.sortRating}</option>
          </select>
        </label>
      </div>

      {q ? (
        <section id="categories" className="wrap">
          <div className="sec-line reveal"><h2>{t.results}</h2><i /><span>{results.length} {t.secCount}</span></div>
          {results.length === 0 ? (
            <p className="empty">{t.noResults}</p>
          ) : (
            view === 'horizontal' ? <Row items={results} t={t} lang={lang} onAdd={onAdd} /> : <>
              <div className="product-list">{results.slice(0, visibleCounts.results ?? 5).map((p) => <ProductListCard key={p.id} p={p} t={t} lang={lang} onAdd={onAdd} />)}</div>
              {results.length > (visibleCounts.results ?? 5) && <button className="more" type="button" onClick={() => setVisibleCounts((counts) => ({ ...counts, results: (counts.results ?? 5) + 5 }))}>{t.loadMore}</button>}
            </>
          )}
        </section>
      ) : (
        <div id="categories">
          {bySection.map(({ cat, items }, n) => (
            <section key={cat} id={`sec-${cat}`} className="wrap sec-row">
              <div className="sec-line reveal" style={dl(`${n * 0.05}s`)}>
                <h2>{t.sections[cat]}</h2>
                <i />
                <span>{items.length} {t.secCount}</span>
              </div>
              {view === 'horizontal'
                ? <Row items={items} t={t} lang={lang} onAdd={onAdd} />
                : <>
                  <div className="product-list">{items.slice(0, visibleCounts[cat] ?? 5).map((p) => <ProductListCard key={p.id} p={p} t={t} lang={lang} onAdd={onAdd} />)}</div>
                  {items.length > (visibleCounts[cat] ?? 5) && <button className="more" type="button" onClick={() => setVisibleCounts((counts) => ({ ...counts, [cat]: (counts[cat] ?? 5) + 5 }))}>{t.loadMore}</button>}
                </>}
            </section>
          ))}
        </div>
      )}

      <footer id="footer" className="footer">
        <div className="footer-grid">
          <div className="reveal">
            <h3>STYLO.</h3>
            <p>{t.fAbout}</p>
          </div>
          <div className="reveal" style={dl('0.08s')}>
            <h4>{t.fQuick}</h4>
            <ul>
              <li><a href="#" onClick={(e) => { e.preventDefault(); onGo('top'); }}>{t.nav[0]}</a></li>
              <li><a href="#products" onClick={(e) => { e.preventDefault(); onGo('products'); }}>{t.nav[1]}</a></li>
              <li><a href="#categories" onClick={(e) => { e.preventDefault(); onGo('categories'); }}>{t.nav[2]}</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); onInfo('returns'); }}>{t.fReturns}</a></li>
            </ul>
          </div>
          <div className="reveal" style={dl('0.16s')}>
            <h4>{t.fSupport}</h4>
            <ul>
              {t.fSupportLinks.map((l, i) => (
                <li key={l}><a href="#" onClick={(e) => { e.preventDefault(); onInfo(SUPPORT_KINDS[i]); }}>{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="copy">{t.rights}</div>
      </footer>
    </main>
  );
}

export default memo(Store);

