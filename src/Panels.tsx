import { useState, type FormEvent } from 'react';
import type { Product } from './data';
import {
  PROVIDER_NAME, findOrder, isPhone, orderStatus, resetPassword, signIn, signUp, socialSignIn,
  type Account, type Order, type Provider,
} from './auth';
import type { Dict, Lang } from './i18n';
import Thumb from './Thumb';

export interface CartLine { p: Product; qty: number }

export function CartDrawer({ t, lang, lines, total, onClose, onQty, onRemove, onCheckout }: {
  t: Dict; lang: Lang; lines: CartLine[]; total: number;
  onClose: () => void; onQty: (id: number, delta: number) => void;
  onRemove: (id: number) => void; onCheckout: () => void;
}) {
  const count = lines.reduce((n, l) => n + l.qty, 0);
  return (
    <>
      <div className="dim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={t.cartTitle}>
        <div className="drawer-head">
          <h3>{t.cartTitle} ({count})</h3>
          <button type="button" className="x-btn" aria-label={t.close} onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="drawer-body">
          {lines.length === 0 && <p className="none">{t.cartEmpty}</p>}
          {lines.map(({ p, qty }) => (
            <div className="line-item" key={p.id}>
              <Thumb p={p} />
              <div>
                <h4>{p.name[lang]}</h4>
                <div className="p">{p.price} {t.currency}</div>
                <div className="qty">
                  <button type="button" aria-label="-" onClick={() => onQty(p.id, -1)}><i className="fa-solid fa-minus" /></button>
                  <span>{qty}</span>
                  <button type="button" aria-label="+" onClick={() => onQty(p.id, 1)}><i className="fa-solid fa-plus" /></button>
                </div>
              </div>
              <button type="button" className="trash" aria-label={t.remove} onClick={() => onRemove(p.id)}><i className="fa-solid fa-trash" /></button>
            </div>
          ))}
        </div>
        <div className="drawer-foot">
          <div className="row"><span>{t.subtotal}</span><b>{total} {t.currency}</b></div>
          <div className="row"><span>{t.shipping}</span><b className="free-t">{t.free}</b></div>
          <div className="row big"><span>{t.total}</span><b>{total} {t.currency}</b></div>
          <button type="button" className="primary" disabled={lines.length === 0} onClick={onCheckout}>{t.checkout}</button>
        </div>
      </aside>
    </>
  );
}

export interface CheckoutData { name: string; phone: string; address: string; payment: string }

export function CheckoutModal({ t, defaults, onClose, onSubmit, busy = false }: {
  t: Dict; defaults: { name: string; phone: string; address: string };
  onClose: () => void; onSubmit: (d: CheckoutData) => void | Promise<void>; busy?: boolean;
}) {
  const [err, setErr] = useState('');
  const [payment, setPayment] = useState<'cash' | 'vodafone' | 'instapay' | 'visa'>('cash');
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? '').trim();
    if (!isPhone(v('phone'))) { setErr(t.errPhone); return; }
    const paymentLabel = { cash: t.payCash, vodafone: t.payVodafone, instapay: t.payInstapay, visa: t.payVisa }[payment];
    onSubmit({ name: v('name'), phone: v('phone'), address: v('address'), payment: paymentLabel });
  };
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="modal">
        <div className="modal-card" role="dialog" aria-label={t.ckTitle}>
          <div className="modal-head">
            <h3>{t.ckTitle}</h3>
            <button type="button" className="x-btn" aria-label={t.close} onClick={onClose}><i className="fa-solid fa-xmark" /></button>
          </div>
          <form onSubmit={submit}>
            <div className="field"><label>{t.fName}</label><input name="name" type="text" required defaultValue={defaults.name} placeholder={t.fNamePh} autoComplete="name" /></div>
            <div className="field"><label>{t.fPhone}</label><input name="phone" type="tel" required defaultValue={defaults.phone} placeholder={t.fPhonePh} dir="ltr" autoComplete="tel" /></div>
            <div className="field"><label>{t.fAddr}</label><textarea name="address" required rows={2} defaultValue={defaults.address} placeholder={t.fAddrPh} autoComplete="street-address" /></div>
            <div className="field">
              <label>{t.fPay}</label>
              <div className="payment-options" role="radiogroup" aria-label={t.fPay}>
                {(['cash', 'vodafone', 'instapay', 'visa'] as const).map((method) => {
                  const label = { cash: t.payCash, vodafone: t.payVodafone, instapay: t.payInstapay, visa: t.payVisa }[method];
                  const icon = { cash: 'fa-money-bill-wave', vodafone: 'fa-mobile-screen-button', instapay: 'fa-bolt', visa: 'fa-credit-card' }[method];
                  return <button key={method} type="button" role="radio" aria-checked={payment === method}
                    className={`payment-choice ${payment === method ? 'selected' : ''}`} onClick={() => setPayment(method)}>
                    <i className={`fa-solid ${icon}`} /><span>{label}</span>{payment === method && <i className="fa-solid fa-circle-check payment-check" />}
                  </button>;
                })}
              </div>
            </div>
            {payment !== 'cash' && <div className="payment-details">
              {payment === 'vodafone' && <div className="field"><label>{t.payPhone}</label><input type="tel" inputMode="tel" dir="ltr" placeholder="010xxxxxxxx" autoComplete="tel" required /></div>}
              {payment === 'instapay' && <div className="field"><label>{t.payIpa}</label><input type="text" dir="ltr" placeholder="name@instapay" autoComplete="off" required /></div>}
              {payment === 'visa' && <p className="payment-demo-note"><i className="fa-solid fa-lock" /> {t.paymentDemo}</p>}
            </div>}
            {err && <p className="auth-msg err" role="alert">{err}</p>}
            <button type="submit" className="primary" style={{ marginTop: 8 }} disabled={busy}>{busy ? '…' : t.confirm}</button>
          </form>
        </div>
      </div>
    </>
  );
}

export function ProductModal({ t, lang, p, liked, onClose, onAdd, onWish }: {
  t: Dict; lang: Lang; p: Product; liked: boolean;
  onClose: () => void; onAdd: () => void; onWish: () => void;
}) {
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="modal">
        <div className="modal-card wide" role="dialog" aria-label={p.name[lang]}>
          <div className="modal-head" style={{ marginBottom: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="x-btn" aria-label={t.close} onClick={onClose}><i className="fa-solid fa-xmark" /></button>
          </div>
          <div className="pm">
            <Thumb p={p} alt={p.name[lang]} />
            <div>
              <span className="card-cat">{t.cats[p.cat]}</span>
              <h3>{p.name[lang]}</h3>
              <p>{p.desc[lang]}</p>
              <strong className="price">{p.price} {t.currency}</strong>
              <div className="pm-btns">
                <button type="button" className="primary" onClick={onAdd}>{t.add}</button>
                <button type="button" className={`x-btn ${liked ? 'on' : ''}`} aria-pressed={liked} aria-label={t.wishLabel} onClick={onWish}>
                  <i className={`${liked ? 'fa-solid' : 'fa-regular'} fa-heart`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function WishlistModal({ t, lang, items, onClose, onAdd, onRemove, onOpen }: {
  t: Dict; lang: Lang; items: Product[];
  onClose: () => void; onAdd: (id: number) => void; onRemove: (id: number) => void; onOpen: (id: number) => void;
}) {
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="modal">
        <div className="modal-card" role="dialog" aria-label={t.wishTitle}>
          <div className="modal-head">
            <h3>{t.wishTitle}</h3>
            <button type="button" className="x-btn" aria-label={t.close} onClick={onClose}><i className="fa-solid fa-xmark" /></button>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {items.length === 0 && <p className="none">{t.wishEmpty}</p>}
            {items.map((p) => (
              <div className="line-item" key={p.id}>
                <Thumb p={p} />
                <div>
                  <h4><button type="button" className="linkish" onClick={() => onOpen(p.id)}>{p.name[lang]}</button></h4>
                  <div className="p">{p.price} {t.currency}</div>
                  <div className="qty">
                    <button type="button" className="add" style={{ width: 'auto', height: 30, color: '#000' }} onClick={() => onAdd(p.id)}>
                      <i className="fa-solid fa-plus" /> {t.add}
                    </button>
                  </div>
                </div>
                <button type="button" className="trash" aria-label={t.remove} onClick={() => onRemove(p.id)}><i className="fa-solid fa-trash" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ================= تسجيل الدخول / إنشاء حساب (لوح منزلق) ================= */

function Field({ icon, name, type = 'text', ph, ac, ltr, pass, showLabel, minLength }: {
  icon: string; name: string; type?: string; ph: string; ac?: string; ltr?: boolean;
  pass?: boolean; showLabel?: string; minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="auth-field">
      <i className={`${icon} fi`} />
      <input
        name={name}
        type={pass ? (show ? 'text' : 'password') : type}
        required
        placeholder={ph}
        autoComplete={ac}
        minLength={minLength}
        dir={ltr ? 'ltr' : undefined}
      />
      {pass && (
        <button type="button" className="eye" aria-label={showLabel} aria-pressed={show} onClick={() => setShow((x) => !x)}>
          <i className={`fa-regular ${show ? 'fa-eye-slash' : 'fa-eye'}`} />
        </button>
      )}
    </div>
  );
}

const SOCIAL: { id: Provider; icon: string }[] = [
  { id: 'google', icon: 'fa-google' },
  { id: 'x', icon: 'fa-x-twitter' },
  { id: 'facebook', icon: 'fa-facebook-f' },
];

function Social({ t, busy, onPick }: { t: Dict; busy: boolean; onPick: (p: Provider) => void }) {
  return (
    <>
      <div className="auth-or"><span>{t.orWith}</span></div>
      <div className="auth-social">
        {SOCIAL.map((s) => (
          <button key={s.id} type="button" className={`soc soc-${s.id}`} disabled={busy}
            aria-label={PROVIDER_NAME[s.id]} onClick={() => onPick(s.id)}>
            <i className={`fa-brands ${s.icon}`} />
          </button>
        ))}
      </div>
    </>
  );
}

export function AuthModal({ t, lang, onClose, onDone }: {
  t: Dict; lang: Lang; onClose: () => void;
  onDone: (a: Account, msg: string, remember: boolean) => void;
}) {
  const [up, setUp] = useState(false);
  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const flip = (toUp: boolean) => { setUp(toUp); setErr(''); setOk(''); setMode('signin'); };
  const get = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

  const submitUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!isPhone(get(f, 'phone'))) { setErr(t.errPhone); return; }
    setErr(''); setBusy(true);
    const r = await signUp({
      name: get(f, 'name'), email: get(f, 'email'), phone: get(f, 'phone'),
      address: get(f, 'address'), password: String(f.get('password') ?? ''),
    });
    setBusy(false);
    if (r.ok && 'message' in r) setOk(r.message);
    else if (r.ok) onDone(r.account, t.loggedUp, true);
    else setErr(r.error);
  };

  const submitIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const remember = f.get('remember') === 'on';
    setErr(''); setOk(''); setBusy(true);
    if (mode === 'reset') {
      const r = await resetPassword(get(f, 'email'), String(f.get('password') ?? ''));
      setBusy(false);
      if (r.ok) { setMode('signin'); setOk(t.resetDone); } else setErr(r.error);
      return;
    }
    const r = await signIn(get(f, 'email'), String(f.get('password') ?? ''));
    setBusy(false);
    if (r.ok && 'account' in r) onDone(r.account, t.loggedIn, remember);
    else if (!r.ok) setErr(r.error);
  };

  const social = async (p: Provider) => {
    setBusy(true);
    try {
      const a = await socialSignIn(p);
      onDone(a, `${t.via} ${PROVIDER_NAME[p]}`, true);
    } catch (error) {
      setErr(error instanceof Error ? error.message : t.errBad);
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="modal">
        <div className={`auth ${up ? 'right-panel-active' : ''}`} role="dialog" aria-label={up ? t.joinTitle : t.loginTitle}>
          <button type="button" className="x-btn auth-x" aria-label={t.close} onClick={onClose}><i className="fa-solid fa-xmark" /></button>

          {/* إنشاء حساب */}
          <div className="auth-fc auth-up" aria-hidden={!up}>
            <form dir={dir} className="auth-form" onSubmit={submitUp}>
              <div className="auth-inner">
                <h2 className="auth-title">{t.joinTitle}</h2>
                <p className="auth-sub">{t.joinSub}</p>
                <Field icon="fa-regular fa-user" name="name" ph={t.fName} ac="name" />
                <Field icon="fa-regular fa-envelope" name="email" type="email" ph={t.fEmail} ac="email" ltr />
                <Field icon="fa-solid fa-phone" name="phone" type="tel" ph={t.fPhonePh} ac="tel" ltr />
                <Field icon="fa-solid fa-location-dot" name="address" ph={t.fAddrPh} ac="street-address" />
                <Field icon="fa-solid fa-lock" name="password" pass ph={t.fPass} ac="new-password" showLabel={t.showPass} minLength={6} ltr />
                <label className="auth-check terms">
                  <input type="checkbox" required /> <span>{t.agreeA}<a href="#" onClick={(e) => e.preventDefault()}>{t.agreeB}</a></span>
                </label>
                {up && err && <p className="auth-msg err" role="alert">{err}</p>}
                <button type="submit" className="auth-btn" disabled={busy}>{t.signUpBtn}</button>
                <Social t={t} busy={busy} onPick={social} />
                <p className="auth-switch">
                  {t.haveAccount} <button type="button" className="auth-link strong" onClick={() => flip(false)}>{t.signIn}</button>
                </p>
              </div>
            </form>
          </div>

          {/* تسجيل الدخول */}
          <div className="auth-fc auth-in" aria-hidden={up}>
            <form dir={dir} className="auth-form" onSubmit={submitIn}>
              <div className="auth-inner">
                <h2 className="auth-title">{mode === 'signin' ? t.loginTitle : t.resetTitle}</h2>
                <p className="auth-sub">{mode === 'signin' ? t.signInSub : t.resetSub}</p>
                <Field icon="fa-regular fa-envelope" name="email" type="email" ph={t.fEmail} ac="email" ltr />
                <Field icon="fa-solid fa-lock" name="password" pass ph={mode === 'signin' ? t.fPass : t.fNewPass}
                  ac={mode === 'signin' ? 'current-password' : 'new-password'} showLabel={t.showPass}
                  minLength={mode === 'reset' ? 6 : undefined} ltr />
                {mode === 'signin' && (
                  <div className="auth-opts">
                    <label className="auth-check"><input type="checkbox" name="remember" defaultChecked /> {t.remember}</label>
                    <button type="button" className="auth-link" onClick={() => { setMode('reset'); setErr(''); setOk(''); }}>{t.forgot}</button>
                  </div>
                )}
                {!up && err && <p className="auth-msg err" role="alert">{err}</p>}
                {!up && ok && <p className="auth-msg ok" role="status">{ok}</p>}
                <button type="submit" className="auth-btn" disabled={busy}>{mode === 'signin' ? t.signIn : t.resetBtn}</button>
                {mode === 'reset' && (
                  <button type="button" className="auth-link" onClick={() => { setMode('signin'); setErr(''); }}>{t.backToSignIn}</button>
                )}
                {mode === 'signin' && <Social t={t} busy={busy} onPick={social} />}
                {mode === 'signin' && <p className="auth-switch">
                  {t.noAccount} <button type="button" className="auth-link strong" onClick={() => flip(true)}>{t.newAccount}</button>
                </p>}
              </div>
            </form>
          </div>

          {/* اللوح المتحرك */}
          <div className="auth-ovc" aria-hidden="true">
            <div className="auth-ov">
              <div className="auth-panel ov-to-signup">
                <i className="fa-solid fa-wand-magic-sparkles ov-icon" />
                <h2>{t.ovUpTitle}</h2>
                <p>{t.ovUpText}</p>
                <button type="button" className="ghost" tabIndex={up ? -1 : 0} onClick={() => flip(true)}>{t.newAccount}</button>
              </div>
              <div className="auth-panel ov-to-signin">
                <i className="fa-solid fa-bag-shopping ov-icon" />
                <h2>{t.ovInTitle}</h2>
                <p>{t.ovInText}</p>
                <button type="button" className="ghost" tabIndex={up ? 0 : -1} onClick={() => flip(false)}>{t.signIn}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ================= حسابي ================= */

export function AccountModal({ t, a, onClose, onSignOut }: {
  t: Dict; a: Account; onClose: () => void; onSignOut: () => void;
}) {
  const rows: [string, string, string][] = [
    ['fa-regular fa-user', t.fName, a.name],
    ['fa-regular fa-envelope', t.fEmail, a.email],
    ['fa-solid fa-phone', t.fPhone, a.phone],
    ['fa-solid fa-location-dot', t.fAddr, a.address],
  ];
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="modal">
        <div className="modal-card" role="dialog" aria-label={t.account}>
          <div className="modal-head">
            <h3>{t.acctInfo}</h3>
            <button type="button" className="x-btn" aria-label={t.close} onClick={onClose}><i className="fa-solid fa-xmark" /></button>
          </div>
          <div className="acct">
            {rows.map(([icon, label, value]) => (
              <div className="acct-row" key={label}>
                <i className={icon} />
                <div>
                  <small>{label}</small>
                  <span dir="auto">{value || t.notSet}</span>
                </div>
              </div>
            ))}
            {a.provider && (
              <div className="acct-row">
                <i className="fa-solid fa-link" />
                <div><small>{t.via}</small><span>{PROVIDER_NAME[a.provider]}</span></div>
              </div>
            )}
          </div>
          <button type="button" className="primary" style={{ marginTop: 20 }} onClick={onSignOut}>{t.signOut}</button>
        </div>
      </div>
    </>
  );
}

/* ================= نوافذ الفوتر ================= */

export function InfoModal({ t, kind, onClose }: {
  t: Dict; kind: 'returns' | 'help' | 'shipping'; onClose: () => void;
}) {
  const info = t.info[kind];
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="modal">
        <div className="modal-card" role="dialog" aria-label={info.title}>
          <div className="modal-head">
            <h3>{info.title}</h3>
            <button type="button" className="x-btn" aria-label={t.close} onClick={onClose}><i className="fa-solid fa-xmark" /></button>
          </div>
          <ul className="info-list">
            {info.items.map((x) => <li key={x}><i className="fa-solid fa-circle-check" /> <span>{x}</span></li>)}
          </ul>
        </div>
      </div>
    </>
  );
}

export function TrackModal({ t, initialId, onClose }: {
  t: Dict; initialId: string; onClose: () => void;
}) {
  const [id, setId] = useState(initialId);
  const [order, setOrder] = useState<Order | null | undefined>(initialId ? findOrder(initialId) ?? null : undefined);
  const search = (e: FormEvent) => { e.preventDefault(); setOrder(findOrder(id) ?? null); };
  const step = order ? orderStatus(order) : 0;

  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="modal">
        <div className="modal-card" role="dialog" aria-label={t.trackTitle}>
          <div className="modal-head">
            <h3>{t.trackTitle}</h3>
            <button type="button" className="x-btn" aria-label={t.close} onClick={onClose}><i className="fa-solid fa-xmark" /></button>
          </div>
          <form className="track-form" onSubmit={search}>
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder={t.trackPh} dir="ltr" required />
            <button type="submit" className="add" style={{ height: 46 }}>{t.trackBtn}</button>
          </form>

          {order === null && <p className="none">{t.trackNone}</p>}
          {order && (
            <div className="track-res">
              <ol className="steps">
                {t.trackSteps.map((label, i) => (
                  <li key={label} className={i <= step ? 'done' : ''}><i>{i <= step ? <i className="fa-solid fa-check" /> : null}</i><span>{label}</span></li>
                ))}
              </ol>
              <h4>{t.trackItems}</h4>
              {order.lines.map((l) => (
                <div className="row" key={l.name}><span>{l.name} × {l.qty}</span><b>{l.price * l.qty} {t.currency}</b></div>
              ))}
              <div className="row big"><span>{t.total}</span><b>{order.total} {t.currency}</b></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
