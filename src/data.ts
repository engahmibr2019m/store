export type Cat = 'men' | 'women' | 'accessories';
export type Bi = { ar: string; en: string; fr: string };

export interface Product {
  id: number;
  cat: Cat;
  price: number; // EGP
  rating?: number;
  sold?: number;
  name: Bi;
  desc: Bi;
  /** صورة حقيقية. لو مفيش، الكرت بيعرض مربع بلون المنتج وأيقونته */
  img?: string;
  hex?: string;
  ink?: string;
  icon?: string;
}

/** عدد الكروت في كل قسم. غيّر الرقم ده لو عايز أكتر أو أقل */
export const PER_CAT = 50;

const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=600`;

/* صور عرض حقيقية للكروت المولّدة، موزعة حسب القسم بدل مربعات اللون المؤقتة. */
const CATEGORY_PHOTOS: Record<Cat, string[]> = {
  men: [
    'photo-1618354691373-d851c5c3a990', 'photo-1521572163474-6864f9cf17ab',
    'photo-1591047139829-d91aecb6caea', 'photo-1551028719-00167b16eac5',
    'photo-1602810318383-e386cc2a3ccf', 'photo-1509631179647-0177331693ae',
  ],
  women: [
    'photo-1539109136881-3be0616acf4b', 'photo-1595777457583-95e059d581b8',
    'photo-1483985988355-763728e1935b', 'photo-1490481651871-ab68de25d43d',
    'photo-1548624149-f7b4cd5b0c8a', 'photo-1594633312681-425c7b97ccd1',
  ],
  accessories: [
    'photo-1511499767150-a48a237f0083', 'photo-1523275335684-37898b6baf30',
    'photo-1584917865442-de89df76afd3', 'photo-1548036328-c9fa89d128fa',
    'photo-1523170335258-f5ed11844a49', 'photo-1553062407-98eeb64c6a62',
  ],
};

/* المنتجات الأصلية من ملف الـ HTML بتاعك (بصورها الحقيقية) */
const originals: Product[] = [
  { id: 1, cat: 'men', price: 650, rating: 4.8, sold: 620, img: u('photo-1551028719-00167b16eac5'),
    name: { ar: 'جاكيت شتوي أنيق', en: 'Elegant Winter Jacket', fr: "Veste d’hiver élégante" },
    desc: { ar: 'جاكيت شتوي فاخر مصمم خصيصاً ليمنحك الدفء والأناقة في الأيام الباردة.', en: 'A premium winter jacket designed to keep you warm and stylish on cold days.', fr: 'Une veste d’hiver élégante et haut de gamme, conçue pour vous garder au chaud avec style.' } },
  { id: 2, cat: 'women', price: 850, rating: 4.7, sold: 510, img: u('photo-1539109136881-3be0616acf4b'),
    name: { ar: 'معطف نسائي عصري', en: "Modern Women's Coat", fr: 'Manteau moderne pour femme' },
    desc: { ar: 'معطف نسائي بتصميم راقي يناسب الخروج اليومي والمناسبات الخاصة.', en: 'A refined women’s coat that suits everyday wear and special occasions.', fr: 'Un manteau raffiné pour le quotidien comme pour les occasions spéciales.' } },
  { id: 3, cat: 'men', price: 320, rating: 4.6, sold: 740, img: u('photo-1602810318383-e386cc2a3ccf'),
    name: { ar: 'قميص كاجوال قطن', en: 'Cotton Casual Shirt', fr: 'Chemise décontractée en coton' },
    desc: { ar: 'قميص قطني مريح ومناسب للإطلالات اليومية الكاجوال.', en: 'A comfortable cotton shirt, perfect for everyday casual looks.', fr: 'Une chemise en coton confortable, parfaite pour un style décontracté au quotidien.' } },
  { id: 4, cat: 'women', price: 950, rating: 4.9, sold: 390, img: u('photo-1595777457583-95e059d581b8'),
    name: { ar: 'فستان سهرة أنيق', en: 'Elegant Evening Dress', fr: 'Robe de soirée élégante' },
    desc: { ar: 'فستان بتصميم عصري يبرز أناقتك ويضفي لمسة من الجاذبية.', en: 'A modern dress that highlights your elegance with a touch of allure.', fr: 'Une robe au design moderne qui souligne votre élégance.' } },
  { id: 5, cat: 'accessories', price: 220, rating: 4.5, sold: 860, img: u('photo-1511499767150-a48a237f0083'),
    name: { ar: 'نظارة شمسية كلاسيكية', en: 'Classic Sunglasses', fr: 'Lunettes de soleil classiques' },
    desc: { ar: 'نظارة شمسية أنيقة توفر حماية كاملة من الأشعة فوق البنفسجية.', en: 'Stylish sunglasses with full UV protection.', fr: 'Des lunettes de soleil élégantes offrant une protection complète contre les UV.' } },
  { id: 6, cat: 'men', price: 450, rating: 4.7, sold: 570, img: u('photo-1509631179647-0177331693ae'),
    name: { ar: 'هودي رجالي فضفاض', en: "Men's Oversized Hoodie", fr: 'Sweat à capuche oversize pour homme' },
    desc: { ar: 'هودي مريح بخامة عالية الجودة لتوفير أقصى درجات الراحة.', en: 'A cozy hoodie in high-quality fabric for maximum comfort.', fr: 'Un sweat à capuche confortable, confectionné dans un tissu de qualité.' } },
  { id: 7, cat: 'women', price: 580, rating: 4.8, sold: 680, img: u('photo-1584917865442-de89df76afd3'),
    name: { ar: 'حقيبة يد نسائية فاخرة', en: 'Luxury Women’s Handbag', fr: 'Sac à main de luxe pour femme' },
    desc: { ar: 'حقيبة يد جلدية عملية وعصرية تكمل إطلالتك المميزة.', en: 'A practical, modern leather handbag that completes your look.', fr: 'Un sac à main en cuir, pratique et moderne, pour parfaire votre tenue.' } },
  // الملف المرسل انقطع عند هذا المنتج، فالسعر والصورة والوصف هنا تقدير مني
  { id: 8, cat: 'accessories', price: 480, rating: 4.6, sold: 440, img: u('photo-1523275335684-37898b6baf30'),
    name: { ar: 'ساعة يد معدنية', en: 'Metal Wristwatch', fr: 'Montre-bracelet en métal' },
    desc: { ar: 'ساعة يد معدنية أنيقة تضيف لمسة راقية لإطلالتك.', en: 'An elegant metal wristwatch that adds a refined touch to your outfit.', fr: 'Une montre-bracelet en métal qui apporte une touche raffinée à votre tenue.' } },
];

/* ---------- توليد باقي الكروت (بدون صور حقيقية، استبدلها بصورك) ---------- */
interface TypeDef { ar: string; en: string; fr: string; g: 'm' | 'f'; price: number; icon: string }
interface ColorDef { en: string; m: string; f: string; fr: string; hex: string; ink: string }

const COLORS: ColorDef[] = [
  { en: 'Black',    m: 'أسود',  f: 'سوداء', fr: 'noir', hex: '#26262b', ink: '#f1f1f4' },
  { en: 'Navy',     m: 'كحلي',  f: 'كحلية', fr: 'bleu marine', hex: '#223357', ink: '#e8ecf6' },
  { en: 'Gray',     m: 'رمادي', f: 'رمادية', fr: 'gris', hex: '#70747d', ink: '#ffffff' },
  { en: 'White',    m: 'أبيض',  f: 'بيضاء',  fr: 'blanc', hex: '#e6e6ec', ink: '#26262b' },
  { en: 'Olive',    m: 'زيتي',  f: 'زيتية',  fr: 'olive', hex: '#5f6f3c', ink: '#f2f5e8' },
  { en: 'Beige',    m: 'بيج',   f: 'بيج',    fr: 'beige', hex: '#cdb99a', ink: '#3a3226' },
  { en: 'Burgundy', m: 'عنابي', f: 'عنابية', fr: 'bordeaux', hex: '#74223f', ink: '#fbe9ef' },
];

const TYPES: Record<Cat, TypeDef[]> = {
  men: [
    { ar: 'تيشيرت قطن',   en: 'Cotton T-Shirt', fr: 'T-shirt en coton', g: 'm', price: 180, icon: 'fa-shirt' },
    { ar: 'تيشيرت بولو',  en: 'Polo Shirt', fr: 'Polo', g: 'm', price: 260, icon: 'fa-shirt' },
    { ar: 'قميص كلاسيك',  en: 'Classic Shirt', fr: 'Chemise classique', g: 'm', price: 340, icon: 'fa-user-tie' },
    { ar: 'هودي',         en: 'Hoodie', fr: 'Sweat à capuche', g: 'm', price: 450, icon: 'fa-shirt' },
    { ar: 'سويت شيرت',    en: 'Sweatshirt', fr: 'Sweat-shirt', g: 'm', price: 380, icon: 'fa-shirt' },
    { ar: 'جاكيت',        en: 'Jacket', fr: 'Veste', g: 'm', price: 650, icon: 'fa-shirt' },
    { ar: 'معطف',         en: 'Coat', fr: 'Manteau', g: 'm', price: 900, icon: 'fa-user-tie' },
    { ar: 'بنطلون جينز',  en: 'Denim Jeans', fr: 'Jean', g: 'm', price: 420, icon: 'fa-shirt' },
    { ar: 'بنطلون تشينو', en: 'Chino Pants', fr: 'Pantalon chino', g: 'm', price: 380, icon: 'fa-shirt' },
    { ar: 'بنطلون رياضي', en: 'Jogger Pants', fr: 'Jogging', g: 'm', price: 320, icon: 'fa-shirt' },
    { ar: 'شورت',         en: 'Shorts', fr: 'Short', g: 'm', price: 210, icon: 'fa-shirt' },
    { ar: 'سويتر صوف',    en: 'Wool Sweater', fr: 'Pull en laine', g: 'm', price: 520, icon: 'fa-shirt' },
  ],
  women: [
    { ar: 'فستان سهرة',   en: 'Evening Dress', fr: 'Robe de soirée', g: 'm', price: 950, icon: 'fa-person-dress' },
    { ar: 'فستان كاجوال', en: 'Casual Dress', fr: 'Robe décontractée', g: 'm', price: 560, icon: 'fa-person-dress' },
    { ar: 'بلوزة أنيقة',  en: 'Elegant Blouse', fr: 'Blouse élégante', g: 'f', price: 340, icon: 'fa-shirt' },
    { ar: 'تنورة ميدي',   en: 'Midi Skirt', fr: 'Jupe midi', g: 'f', price: 380, icon: 'fa-person-dress' },
    { ar: 'عباية عصرية',  en: 'Modern Abaya', fr: 'Abaya moderne', g: 'f', price: 780, icon: 'fa-person-dress' },
    { ar: 'كارديجان',     en: 'Cardigan', fr: 'Cardigan', g: 'm', price: 480, icon: 'fa-shirt' },
    { ar: 'معطف شتوي',    en: 'Winter Coat', fr: 'Manteau d’hiver', g: 'm', price: 850, icon: 'fa-shirt' },
    { ar: 'بنطلون واسع',  en: 'Wide-Leg Pants', fr: 'Pantalon large', g: 'm', price: 420, icon: 'fa-shirt' },
    { ar: 'جاكيت نسائي',  en: "Women's Jacket", fr: 'Veste pour femme', g: 'm', price: 620, icon: 'fa-shirt' },
    { ar: 'إيشارب حرير',  en: 'Silk Scarf', fr: 'Foulard en soie', g: 'm', price: 190, icon: 'fa-ribbon' },
  ],
  accessories: [
    { ar: 'نظارة شمسية', en: 'Sunglasses', fr: 'Lunettes de soleil', g: 'f', price: 220, icon: 'fa-glasses' },
    { ar: 'ساعة يد',     en: 'Wristwatch', fr: 'Montre-bracelet', g: 'f', price: 480, icon: 'fa-clock' },
    { ar: 'حزام جلد',    en: 'Leather Belt', fr: 'Ceinture en cuir', g: 'm', price: 190, icon: 'fa-ribbon' },
    { ar: 'محفظة جلد',   en: 'Leather Wallet', fr: 'Portefeuille en cuir', g: 'f', price: 260, icon: 'fa-wallet' },
    { ar: 'كاب قطن',     en: 'Cotton Cap', fr: 'Casquette en coton', g: 'm', price: 150, icon: 'fa-hat-cowboy' },
    { ar: 'حقيبة ظهر',   en: 'Backpack', fr: 'Sac à dos', g: 'f', price: 420, icon: 'fa-bag-shopping' },
    { ar: 'ربطة عنق',    en: 'Necktie', fr: 'Cravate', g: 'f', price: 140, icon: 'fa-user-tie' },
    { ar: 'أسورة معدنية', en: 'Metal Bracelet', fr: 'Bracelet en métal', g: 'f', price: 170, icon: 'fa-ring' },
  ],
};

const generate = (cat: Cat): Product[] => {
  const types = TYPES[cat];
  const need = PER_CAT - originals.filter((p) => p.cat === cat).length;
  return Array.from({ length: Math.max(0, need) }, (_, n) => {
    const ti = n % types.length;
    const k = Math.floor(n / types.length);
    const ty = types[ti];
    const c = COLORS[(k + ti * 2) % COLORS.length];
    const ar = `${ty.ar} ${ty.g === 'm' ? c.m : c.f}`;
    const en = `${c.en} ${ty.en}`;
    const fr = `${ty.fr} — coloris ${c.fr}`;
    return {
      id: 0,
      cat,
      price: ty.price + ((n * 7) % 5) * 20,
      rating: Number((4.1 + (((n * 7 + ti * 3) % 9) * 0.1)).toFixed(1)),
      sold: Math.max(12, 500 - n * 3 + ti * 11),
      img: u(CATEGORY_PHOTOS[cat][(ti + k) % CATEGORY_PHOTOS[cat].length]),
      name: { ar, en, fr },
      desc: {
        ar: `${ar} بخامة عالية الجودة وتصميم عصري يناسب إطلالتك.`,
        en: `${en} in high-quality fabric with a modern design that fits your look.`,
        fr: `${fr}, confectionné dans un tissu de qualité avec un style moderne pour compléter votre tenue.`,
      },
      hex: c.hex,
      ink: c.ink,
      icon: ty.icon,
    };
  });
};

const CATS: Cat[] = ['men', 'women', 'accessories'];
const lists = CATS.map((cat) => [...originals.filter((p) => p.cat === cat), ...generate(cat)]);

/* ترتيب متداخل (رجالي، نسائي، إكسسوارات) عشان قسم "الكل" يبقى متنوع */
export const products: Product[] = [];
let nextId = 101;
for (let k = 0; k < PER_CAT; k++) {
  for (const list of lists) {
    const item = list[k];
    if (!item) continue;
    if (item.id === 0) item.id = nextId++;
    products.push(item);
  }
}
