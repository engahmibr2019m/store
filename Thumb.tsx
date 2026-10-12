import type { Product } from './data';

/** صورة المنتج: صورة حقيقية لو موجودة، وإلا مربع بلون المنتج وأيقونته */
export default function Thumb({ p, alt = '' }: { p: Product; alt?: string }) {
  if (p.img) return <img src={p.img} alt={alt} loading="lazy" />;
  return (
    <div
      className="ph"
      role="img"
      aria-label={alt}
      style={{ background: `linear-gradient(150deg, ${p.hex}, #0b0b0f 150%)`, color: p.ink }}
    >
      <i className={`fa-solid ${p.icon}`} />
    </div>
  );
}
