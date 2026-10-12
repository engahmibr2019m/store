import { products as previewProducts, type Product } from './data';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const FILE_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5298').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  } catch {
    throw new ApiError('تعذر الاتصال بالخادم. تأكد من تشغيل الباك إند.', 0);
  }
  if (!response.ok) {
    let message = `فشل الطلب (${response.status})`;
    try {
      const body = await response.json();
      message = body.message || body.title || body.errors?.[0]?.errorMessage || message;
    } catch { /* response has no JSON message */ }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface BackendProduct {
  id: number; name: string; description: string; price: number; discountPrice?: number | null;
  imageUrl?: string; category: string; rating?: number; reviewCount?: number;
}

const imageUrl = (value?: string) => value && value.startsWith('/') ? `${FILE_BASE}${value}` : value;
export function toStoreProduct(p: BackendProduct): Product | null {
  const category = p.category.toLowerCase();
  const cat = category.includes('women') || category.includes('نساء') ? 'women'
    : category.includes('access') || category.includes('إكسسوار') ? 'accessories'
      : category.includes('men') || category.includes('رجال') ? 'men' : null;
  if (!cat) return null;
  const preview = previewProducts.find((item) => item.id === p.id);
  const name = preview?.name ?? { ar: p.name, en: p.name, fr: p.name };
  const desc = preview?.desc ?? { ar: p.description, en: p.description, fr: p.description };
  return { id: p.id, cat, price: p.discountPrice ?? p.price, rating: p.rating, name, desc, img: imageUrl(p.imageUrl) };
}

export interface BackendUser { id: number; firstName: string; lastName: string; email: string; phoneNumber: string; address: string }
export interface BackendAuth { token: string; refreshToken: string; user: BackendUser; message?: string }
export const accountFromAuth = (result: BackendAuth) => ({
  id: result.user.id,
  name: `${result.user.firstName} ${result.user.lastName}`.trim(),
  email: result.user.email,
  phone: result.user.phoneNumber,
  address: result.user.address,
  token: result.token,
  refreshToken: result.refreshToken,
});
