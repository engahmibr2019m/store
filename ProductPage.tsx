import { useEffect, useRef, useState } from 'react';
import { products } from './data';
import type { Dict, Lang } from './i18n';
import Thumb from './Thumb';
import { Card } from './Store';

/** صفحة المنتج: بتفتح فوق الصفحة الرئيسية (الرابط #/product/رقم) وبتعرض بيانات الكرت كاملة */
export default function ProductPage({
  t, lang, id, liked, cartCount, wishCount, onClose, onHome, onAdd, onWish, onCart, onWishList,
}: {
  t: Dict; lang: Lang; id: number; liked: boolean; cartCount: number; wishCount: number;
  onClose: () => void; onHome: () => void;
  onAdd: (id: number, qty: number) => void; onWish: (id: number) => void;
  onCart: () => void; onWishList: () => void;
}) {
  const p = products.find((x) => x.id === id);
  const ratingValue = (p?.rating ?? 4.8).toFixed(1);
  const ratingDisplay = lang === 'fr' ? ratingValue.replace('.', ',') : ratingValue;
  const [qty, setQty] = useState(1);
  const box = useRef<HTMLDivElement>(null);

  // كل منتج جديد يبدأ من فوق وبكمية 1
  useEffect(() => { box.current?.scrollTo(0, 0); setQty(1); }, [id]);

  const same = p ? products.filter((x) => x.cat === p.cat) : [];
  const at = p ? same.findIndex((x) => x.id === p.id) : 0;
  const related = p ? [1, 2, 3, 4].map((k) => same[(at + k) % same.length]).filter((x) => x.id !== p.id) : [];

  return (
    <div className="pdp" ref={box} role="dialog" aria-label={p ? p.name[lang] : t.pdp.notFound}>
      <div className="pdp-bar">
        <button type="button" className="pill pdp-back" onClick={onClose}>
          <i className="fa-solid fa-arrow-left flip" /> {t.pdp.back}
        </button>
        <span className="pdp-logo">STYLO.</span>
        <div className="pdp-actions">
          <button type="button" className="icon-btn" aria-label={t.wishLabel} onClick={onWishList}>
            <i className="fa-regular fa-heart" />
            {wishCount > 0 && <span className="badge">{wishCount}</span>}
          </button>
          <button type="button" className="cart-btn" aria-label={t.cartLabel} onClick={onCart}>
            <i className="fa-solid fa-bag-shopping" />
            <b>{cartCount}</b>
          </button>
        </div>
      </div>

      {!p ? (
        <div className="pdp-empty">
          <p>{t.pdp.notFound}</p>
          <button type="button" className="cta" onClick={onHome}>{t.pdp.home}</button>
        </div>
      ) : (
        <div className="pdp-main">
          <nav className="crumbs" aria-label="breadcrumb">
            <a href="#" onClick={(e) => { e.preventDefault(); onHome(); }}>{t.pdp.home}</a>
            <i className="fa-solid fa-chevron-left flip" />
            <span>{t.sections[p.cat]}</span>
            <i className="fa-solid fa-chevron-left flip" />
            <b>{p.name[lang]}</b>
          </nav>

          <div className="pdp-grid">
            <div className="pdp-media"><Thumb p={p} alt={p.name[lang]} /></div>

            <div className="pdp-info">
              <span className="card-cat">{t.cats[p.cat]}</span>
              <h1>{p.name[lang]}</h1>
                <div className="pdp-rating" aria-label={lang === 'ar' ? `التقييم ${ratingDisplay} من 5` : lang === 'fr' ? `Note : ${ratingDisplay} sur 5` : `Rated ${ratingDisplay} out of 5`}>
                <span className="pdp-stars" aria-hidden="true">★★★★★</span>
                <b>{ratingDisplay}</b><span>{lang === 'ar' ? '(١٢٤ تقييم)' : lang === 'fr' ? '(124 avis)' : '(124 ratings)'}</span>
              </div>
              <div className="pdp-price">{p.price} {t.currency}</div>
              <p className="pdp-desc">{p.desc[lang]}</p>

              <dl className="pdp-facts">
                <div><dt>{t.pdp.code}</dt><dd dir="ltr">STY-P{p.id}</dd></div>
                <div><dt>{t.pdp.category}</dt><dd>{t.cats[p.cat]}</dd></div>
                <div><dt>{t.pdp.stock}</dt><dd className="ok">{t.pdp.inStock}</dd></div>
              </dl>

              <div className="pdp-buy">
                <div className="qty-box" aria-label={t.pdp.qty}>
                  <button type="button" aria-label="-" onClick={() => setQty((q) => Math.max(1, q - 1))}><i className="fa-solid fa-minus" /></button>
                  <span>{qty}</span>
                  <button type="button" aria-label="+" onClick={() => setQty((q) => Math.min(20, q + 1))}><i className="fa-solid fa-plus" /></button>
                </div>
                <button type="button" className="primary pdp-add" onClick={() => onAdd(p.id, qty)}>
                  {t.add} <small>{p.price * qty} {t.currency}</small>
                </button>
                <button type="button" className={`x-btn pdp-heart ${liked ? 'on' : ''}`} aria-pressed={liked}
                  aria-label={t.pdp.addWish} onClick={() => onWish(p.id)}>
                  <i className={`${liked ? 'fa-solid' : 'fa-regular'} fa-heart`} />
                </button>
              </div>

              <ul className="pdp-notes">
                <li><i className="fa-solid fa-truck-fast" /> {t.pdp.free}</li>
                <li><i className="fa-solid fa-rotate-left" /> {t.pdp.returns}</li>
              </ul>
            </div>
          </div>

          <section className="pdp-reviews" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <h2>{lang === 'ar' ? 'تقييمات وآراء العملاء' : lang === 'fr' ? 'Avis des clients' : 'Customer reviews'}</h2>
            <div className="review-summary"><strong>{ratingDisplay}</strong><span className="pdp-stars">★★★★★</span><span>{lang === 'ar' ? 'من ٥ · ١٢٤ تقييم' : lang === 'fr' ? 'sur 5 · 124 avis' : 'out of 5 · 124 ratings'}</span></div>
            <article className="review-card"><div className="pdp-stars">★★★★★</div><b>{lang === 'ar' ? 'خامة ممتازة وشكل أنيق' : lang === 'fr' ? 'Très belle qualité et élégant' : 'Great quality and style'}</b><p>{lang === 'ar' ? 'المنتج مطابق للوصف ومريح في الاستخدام، والتوصيل كان سريع.' : lang === 'fr' ? 'L’article est conforme à la description, confortable et livré rapidement.' : 'Just as described, comfortable to wear, and delivered quickly.'}</p><small>{lang === 'ar' ? 'تقييم عميل' : lang === 'fr' ? 'Avis client vérifié' : 'Verified customer'}</small></article>
            <article className="review-card"><div className="pdp-stars">★★★★☆</div><b>{lang === 'ar' ? 'جودة جيدة جداً' : lang === 'fr' ? 'Très bonne qualité' : 'Very good quality'}</b><p>{lang === 'ar' ? 'مقاس مضبوط وخامة جميلة، أنصح به.' : lang === 'fr' ? 'La taille convient parfaitement et la matière est agréable. Je recommande.' : 'Fits well and the material feels great. Recommended.'}</p><small>{lang === 'ar' ? 'تقييم عميل' : lang === 'fr' ? 'Avis client vérifié' : 'Verified customer'}</small></article>
          </section>

          {related.length > 0 && (
            <section className="pdp-rel">
              <h2>{t.pdp.related}</h2>
              <div className="results">
                {related.map((r) => <Card key={r.id} p={r} t={t} lang={lang} onAdd={(productId) => onAdd(productId, 1)} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
