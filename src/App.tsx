import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { products } from './data';
import { api, toStoreProduct, type BackendProduct } from './api';
import { T, type Dict, type Lang } from './i18n';
import Scene from './Scene';
import Store, { type InfoKind } from './Store';
import ProductPage from './ProductPage';
import {
  AccountModal, AuthModal, CartDrawer, CheckoutModal, InfoModal, TrackModal, WishlistModal,
  type CheckoutData,
} from './Panels';
import { saveOrder, updateAccount, type Account } from './auth';

/* ---------- helpers ---------- */
function useStored<V>(key: string, init: V) {
  const [v, setV] = useState<V>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? (JSON.parse(s) as V) : init;
    } catch {
      return init;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
  }, [key, v]);
  return [v, setV] as const;
}

const ACC_KEY = 'stylo-account';
function readAccount(): Account | null {
  try {
    const s = localStorage.getItem(ACC_KEY) ?? sessionStorage.getItem(ACC_KEY);
    const account = s ? (JSON.parse(s) as Account) : null;
    return account?.token ? account : null;
  } catch {
    return null;
  }
}
function saveAccount(a: Account | null, remember?: boolean) {
  try {
    const rem = remember ?? localStorage.getItem(ACC_KEY) !== null;
    localStorage.removeItem(ACC_KEY);
    sessionStorage.removeItem(ACC_KEY);
    if (a) (rem ? localStorage : sessionStorage).setItem(ACC_KEY, JSON.stringify(a));
  } catch { /* ignore */ }
}

function goTo(id: string) {
  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  if (id === 'top') { window.scrollTo({ top: 0, behavior }); return; }
  document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
}

/** صفحة المنتج بتتفتح بالرابط  #/product/رقم  (فوق الصفحة الرئيسية، من غير ما نفقد مكان السكرول) */
const PRODUCT_HASH = /^#\/product\/(\d+)$/;
const readRoute = (): number | null => {
  const m = PRODUCT_HASH.exec(window.location.hash);
  return m ? Number(m[1]) : null;
};

// ترتيب الروابط: الرئيسية، المتجر، الأقسام، تواصل معنا
const NAV_TARGETS = ['top', 'products', 'categories', 'footer'];
const MENU_BREAKPOINT = 900;
const LANGUAGE_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
];

function LanguageDropdown({ lang, t, onChange, className = '' }: {
  lang: Lang; t: Dict; onChange: (lang: Lang) => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);
  return (
    <div ref={root} className={`language-picker ${className}`} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
      <button type="button" className="language-trigger" aria-label={t.changeLanguage}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span>{LANGUAGE_OPTIONS.find((option) => option.value === lang)?.label}</span>
        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>
      {open && <div className="language-menu" role="menu">
        {LANGUAGE_OPTIONS.map((option) => (
          <button key={option.value} type="button" role="menuitemradio" aria-checked={lang === option.value}
            lang={option.value} dir={option.value === 'ar' ? 'rtl' : 'ltr'}
            className="language-option" onClick={() => { onChange(option.value); setOpen(false); }}>
            <span>{option.label}</span>{lang === option.value && <i className="fa-solid fa-check" aria-hidden="true" />}
          </button>
        ))}
      </div>}
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useStored<Lang>('stylo-lang', 'ar');
  const [priceOverrides] = useStored<Record<number, number>>('stylo-product-prices', {});
  const basePrices = useRef(new Map(products.map((p) => [p.id, p.price])));
  products.forEach((p) => { p.price = priceOverrides[p.id] ?? basePrices.current.get(p.id) ?? p.price; });
  const [cart, setCart] = useStored<Record<number, number>>('stylo-cart', {});
  const [wish, setWish] = useStored<number[]>('stylo-wish', []);
  const [account, setAccountState] = useState<Account | null>(readAccount);
  const [, setCatalogRevision] = useState(0);
  const [orderBusy, setOrderBusy] = useState(false);
  const t = T[lang];

  const paymentReturnHandled = useRef(false);
  useEffect(() => {
    if (paymentReturnHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get('payment');
    if (!paymentResult) return;
    paymentReturnHandled.current = true;
    const sessionId = params.get('session_id');
    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, '', cleanUrl);
    if (paymentResult === 'cancelled') {
      setToast(lang === 'ar' ? 'تم إلغاء الدفع. طلبك ما زال محفوظاً في انتظار الدفع.' : lang === 'fr' ? 'Paiement annulé. Votre commande reste en attente.' : 'Payment cancelled. Your order is still awaiting payment.');
      return;
    }
    if (paymentResult !== 'success' || !sessionId || !account?.token) {
      setToast(lang === 'ar' ? 'تعذر التحقق من نتيجة الدفع.' : lang === 'fr' ? 'Impossible de vérifier le paiement.' : 'Could not verify payment.');
      return;
    }
    api('/payment/confirm/' + encodeURIComponent(sessionId), { method: 'POST' }, account.token)
      .then(() => {
        setCart({});
        setToast(lang === 'ar' ? 'تم الدفع وتأكيد الطلب بنجاح.' : lang === 'fr' ? 'Paiement confirmé, merci pour votre commande.' : 'Payment confirmed. Thank you for your order.');
      })
      .catch(() => setToast(lang === 'ar' ? 'لم يتم تأكيد الدفع؛ تواصل معنا للتحقق من العملية.' : lang === 'fr' ? 'Le paiement n’a pas été confirmé. Contactez-nous pour vérifier.' : 'Payment was not confirmed. Contact support to check the transaction.'));
  }, [account, lang, setCart]);

  useEffect(() => {
    let active = true;
    api<BackendProduct[]>('/products')
      .then((rows) => {
        const remote = rows.map(toStoreProduct).filter((p): p is NonNullable<typeof p> => p !== null);
        if (active && remote.length) {
          products.splice(0, products.length, ...remote);
          setCatalogRevision((n) => n + 1);
        }
      })
      .catch(() => { /* keep the local preview catalog available while the API is stopped */ });
    return () => { active = false; };
  }, []);

  const [query, setQuery] = useState('');
  const [productId, setProductId] = useState<number | null>(readRoute);

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [info, setInfo] = useState<InfoKind | null>(null);
  const [lastOrder, setLastOrder] = useState('');
  const [toast, setToast] = useState('');
  const [active, setActive] = useState(0);
  const priceVersion = JSON.stringify(priceOverrides);

  /* لغة واتجاه الصفحة */
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = lang === 'ar' ? 'STYLO | متجر الملابس العصرية' : lang === 'fr' ? 'STYLO | Boutique de mode' : 'STYLO | Modern Fashion Store';
  }, [lang]);

  /* توست */
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), Math.max(2200, toast.length * 60));
    return () => clearTimeout(id);
  }, [toast]);

  /* التنقل بين الرئيسية وصفحة المنتج */
  const enteredFromApp = useRef(false);
  useEffect(() => {
    const onHash = () => {
      const next = readRoute();
      setProductId((prev) => {
        if (prev === null && next !== null) enteredFromApp.current = true;
        return next;
      });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /** رجوع: لو دخلنا من جوه الموقع بنستخدم رجوع المتصفح (بيرجّع مكان السكرول)، وإلا بنشيل الرابط بس */
  const closeProduct = useCallback(() => {
    if (enteredFromApp.current) {
      enteredFromApp.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setProductId(null);
    }
  }, []);
  const goHome = useCallback(() => {
    enteredFromApp.current = false;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setProductId(null);
  }, []);
  const openProduct = useCallback((id: number) => { window.location.hash = `#/product/${id}`; }, []);

  /* قفل السكرول مع النوافذ وصفحة المنتج */
  const modalOpen = menuOpen || cartOpen || checkoutOpen || wishOpen || authOpen || accountOpen || info !== null;
  const locked = modalOpen || productId !== null;
  useEffect(() => {
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [locked]);

  /* Escape + resize (ref عشان الدالة تشوف آخر حالة) */
  const stateRef = useRef({ modalOpen, productId, closeProduct });
  stateRef.current = { modalOpen, productId, closeProduct };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const s = stateRef.current;
      if (!s.modalOpen && !searchOpenRef.current && s.productId !== null) { s.closeProduct(); return; }
      setCheckoutOpen(false); setWishOpen(false); setAuthOpen(false);
      setAccountOpen(false); setInfo(null);
      setCartOpen(false); setMenuOpen(false); setSearchOpen(false);
    };
    const onResize = () => { if (window.innerWidth > MENU_BREAKPOINT) setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
  }, []);
  const searchOpenRef = useRef(false);
  searchOpenRef.current = searchOpen;

  /* الرابط النشط حسب مكان السكرول (بترتيب العناصر في الصفحة) */
  useEffect(() => {
    const on = () => {
      const y = window.scrollY + 220;
      let cur = 'top';
      for (const id of ['products', 'categories', 'footer']) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= y) cur = id;
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = 'footer';
      setActive(NAV_TARGETS.indexOf(cur));
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  /* ---------- actions ---------- */
  const addToCart = useCallback((id: number, qty = 1) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + qty }));
    setToast(t.added);
  }, [setCart, t]);

  const changeQty = useCallback((id: number, delta: number) => {
    setCart((c) => {
      const n = (c[id] || 0) + delta;
      const next = { ...c };
      if (n <= 0) delete next[id]; else next[id] = n;
      return next;
    });
  }, [setCart]);

  const removeLine = useCallback((id: number) => {
    setCart((c) => { const next = { ...c }; delete next[id]; return next; });
  }, [setCart]);

  const toggleWish = useCallback((id: number) => {
    const has = wish.includes(id);
    setWish(has ? wish.filter((x) => x !== id) : [...wish, id]);
    setToast(has ? t.wishRemoved : t.wishAdded);
  }, [wish, setWish, t]);

  /* الحساب: لو مسجل بيفتح "حسابي"، لو لأ بيفتح نافذة الدخول */
  const setAccount = (a: Account | null, remember?: boolean) => {
    saveAccount(a, remember);
    setAccountState(a);
  };
  const onSignInClick = () => { if (account) setAccountOpen(true); else setAuthOpen(true); };
  const onAuthDone = (a: Account, msg: string, remember: boolean) => {
    setAccount(a, remember);
    setAuthOpen(false);
    setToast(msg);
  };
  const onSignOut = () => {
    setAccount(null);
    setAccountOpen(false);
    setToast(t.loggedOut);
  };
  const userLabel = account ? account.name.split(' ')[0].slice(0, 12) : '';

  const lines = useMemo(
    () => products.filter((p) => cart[p.id]).map((p) => ({ p, qty: cart[p.id] })),
    [cart, priceVersion]
  );
  const total = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const cartCount = lines.reduce((n, l) => n + l.qty, 0);
  const wishItems = products.filter((p) => wish.includes(p.id));

  const onOrder = async (d: CheckoutData) => {
    if (!account?.token) {
      setCheckoutOpen(false);
      setAuthOpen(true);
      setToast(lang === 'ar' ? 'سجّل الدخول أولاً لإتمام الطلب.' : 'Sign in first to place your order.');
      return;
    }
    if (d.payment !== t.payVisa && d.payment !== t.payCash) {
      setToast(lang === 'ar' ? 'الدفع الإلكتروني المتاح حاليًا هو فيزا فقط؛ فودافون كاش وإنستا باي غير مربوطين ببوابة دفع بعد.' : lang === 'fr' ? 'Seule la carte est intégrée au paiement en ligne pour le moment.' : 'Only card payment is connected online right now. Vodafone Cash and InstaPay are not connected to a payment provider yet.');
      return;
    }
    setOrderBusy(true);
    try {
      const result = await api<{ id: number; orderNumber: string; finalAmount: number }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          shippingAddress: d.address,
          notes: `Payment method: ${d.payment}`,
          items: lines.map(({ p, qty }) => ({ productId: p.id, quantity: qty })),
        }),
      }, account.token);
      const order = saveOrder({
        total: result.finalAmount, name: d.name, phone: d.phone, address: d.address, payment: d.payment,
        lines: lines.map((l) => ({ name: l.p.name[lang], qty: l.qty, price: l.p.price })),
      }, result.orderNumber);
      updateAccount(account.email, { phone: d.phone, address: d.address });
      setAccount({ ...account, phone: d.phone, address: d.address });
      setLastOrder(order.id);
      if (d.payment === t.payVisa) {
        const checkout = await api<{ checkoutUrl: string }>('/payment/checkout', {
          method: 'POST', body: JSON.stringify({ orderId: result.id }),
        }, account.token);
        setCheckoutOpen(false);
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      setCart({});
      setCheckoutOpen(false);
      setToast(`${t.orderDone} ${t.orderNo} ${order.id}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : (lang === 'ar' ? 'تعذر إنشاء الطلب.' : 'Could not place the order.'));
    } finally { setOrderBusy(false); }
  };

  const nav = (i: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    goTo(NAV_TARGETS[i]);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="header">
        <div className="header-row">
          <a className="logo" href="#" aria-label="STYLO" onClick={nav(0)}>S</a>

          <nav className="nav-pill" aria-label={t.nav[0]}>
            {t.nav.map((label, i) => (
              <button key={label} type="button" className={`nav-link ${active === i ? 'active' : ''}`}
                aria-current={active === i ? 'page' : undefined} onClick={nav(i)}>
                {label}
              </button>
            ))}
          </nav>

          <div className="actions">
            <button type="button" className="icon-btn" aria-label={t.searchLabel}
              onClick={() => setSearchOpen((o) => !o)}>
              <i className="fa-solid fa-magnifying-glass" />
            </button>
            <button type="button" className="icon-btn" aria-label={t.wishLabel} onClick={() => setWishOpen(true)}>
              <i className="fa-regular fa-heart" />
              {wish.length > 0 && <span className="badge">{wish.length}</span>}
            </button>
            <button type="button" className="cart-btn" aria-label={t.cartLabel} onClick={() => setCartOpen(true)}>
              <i className="fa-solid fa-bag-shopping" />
              <b>{cartCount}</b>
            </button>
            <LanguageDropdown lang={lang} t={t} onChange={setLang} className="language-picker-desktop" />
            <button type="button" className="sign-in" title={account ? t.account : t.signIn} onClick={onSignInClick}>
              {account ? <><i className="fa-regular fa-user" /> {userLabel}</> : t.signIn}
            </button>
            <button type="button" className="burger" aria-label={t.menuLabel}
              aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen((o) => !o)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="searchbar">
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#777' }} />
          <input
            autoFocus
            type="text"
            value={query}
            placeholder={t.searchPh}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') goTo('categories'); }}
          />
          <button type="button" onClick={() => goTo('categories')}>{t.searchBtn}</button>
        </div>
      )}

      {menuOpen && (
        <>
          <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
          <div className="mobile-menu" id="mobile-menu">
            {t.nav.map((label, i) => (
              <button key={label} type="button" className={`m-link ${active === i ? 'active' : ''}`}
                style={{ '--i': i } as CSSProperties} onClick={nav(i)}>
                {label}
              </button>
            ))}
            <button type="button" className="m-signin" style={{ '--i': 4 } as CSSProperties}
              onClick={() => { setMenuOpen(false); onSignInClick(); }}>
              {account ? `${t.account} (${userLabel})` : t.signIn}
            </button>
            <LanguageDropdown lang={lang} t={t} onChange={(next) => { setLang(next); setMenuOpen(false); }} className="language-picker-mobile" />
          </div>
        </>
      )}

      <Scene t={t} onShop={() => goTo('products')} onCategories={() => goTo('categories')} onTop={() => goTo('top')} />

      <Store t={t} lang={lang} query={query} onGo={goTo} onInfo={setInfo} onAdd={addToCart} priceVersion={priceVersion} />

      {productId !== null && (
        <ProductPage
          t={t} lang={lang} id={productId}
          liked={wish.includes(productId)}
          cartCount={cartCount} wishCount={wish.length}
          onClose={closeProduct} onHome={goHome}
          onAdd={addToCart} onWish={toggleWish}
          onCart={() => setCartOpen(true)} onWishList={() => setWishOpen(true)}
        />
      )}

      {cartOpen && (
        <CartDrawer
          t={t} lang={lang} lines={lines} total={total}
          onClose={() => setCartOpen(false)}
          onQty={changeQty} onRemove={removeLine}
          onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
        />
      )}

      {checkoutOpen && (
        <CheckoutModal
          t={t}
          defaults={{ name: account?.name ?? '', phone: account?.phone ?? '', address: account?.address ?? '' }}
          onClose={() => setCheckoutOpen(false)}
          onSubmit={onOrder}
          busy={orderBusy}
        />
      )}

      {wishOpen && (
        <WishlistModal
          t={t} lang={lang} items={wishItems}
          onClose={() => setWishOpen(false)}
          onAdd={addToCart} onRemove={toggleWish}
          onOpen={(id) => { setWishOpen(false); openProduct(id); }}
        />
      )}

      {authOpen && <AuthModal t={t} lang={lang} onClose={() => setAuthOpen(false)} onDone={onAuthDone} />}

      {accountOpen && account && (
        <AccountModal t={t} a={account} onClose={() => setAccountOpen(false)} onSignOut={onSignOut} />
      )}

      {info && info !== 'track' && <InfoModal t={t} kind={info} onClose={() => setInfo(null)} />}
      {info === 'track' && <TrackModal t={t} initialId={lastOrder} onClose={() => setInfo(null)} />}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
