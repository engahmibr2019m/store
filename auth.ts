import { accountFromAuth, api, type BackendAuth } from './api';

export interface Account {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  token: string;
  refreshToken: string;
  provider?: Provider;
}
export type Provider = 'google' | 'x' | 'facebook';
export const PROVIDER_NAME: Record<Provider, string> = { google: 'Google', x: 'X', facebook: 'Facebook' };

export interface OrderLine { name: string; qty: number; price: number }
export interface Order {
  id: string; date: string; total: number; lines: OrderLine[];
  name: string; phone: string; address: string; payment: string;
}
const ORDERS_KEY = 'stylo-orders';
function read<V>(key: string, fallback: V): V {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as V : fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ } }
const norm = (email: string) => email.trim().toLowerCase();
export const isPhone = (v: string) => /^(\+?\d[\d\s-]{7,16}\d)$/.test(v.trim());

export type AuthResult =
  | { ok: true; account: Account; needsVerification?: false }
  | { ok: true; needsVerification: true; message: string }
  | { ok: false; error: string };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'تعذر إكمال الطلب';
}

export async function signUp(data: { name: string; email: string; phone: string; address: string; password: string }): Promise<AuthResult> {
  const [firstName, ...last] = data.name.trim().split(/\s+/);
  try {
    const result = await api<{ message?: string }>('/auth/register', {
      method: 'POST', body: JSON.stringify({
        firstName: firstName || data.name, lastName: last.join(' ') || firstName || data.name,
        email: norm(data.email), password: data.password, phoneNumber: data.phone.trim(),
        address: data.address.trim(), city: 'Cairo', country: 'Egypt', postalCode: '',
      }),
    });
    return { ok: true, needsVerification: true, message: result.message || 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيله.' };
  } catch (error) { return { ok: false, error: errorMessage(error) }; }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const result = await api<BackendAuth>('/auth/login', { method: 'POST', body: JSON.stringify({ email: norm(email), password }) });
    return { ok: true, account: accountFromAuth(result) };
  } catch (error) { return { ok: false, error: errorMessage(error) }; }
}

export async function resetPassword(_email: string, _password: string): Promise<AuthResult> {
  return { ok: false, error: 'إعادة تعيين كلمة المرور غير متاحة بعد في الباك إند.' };
}

export async function socialSignIn(_provider: Provider): Promise<Account> {
  throw new Error('تسجيل الدخول الاجتماعي يحتاج إعداد OAuth على الخادم.');
}

export function updateAccount(_email: string, _patch: Partial<Pick<Account, 'phone' | 'address' | 'name'>>) {
  // بيانات الحساب تُدار من الخادم؛ لا نخزن كلمات مرور أو حسابات وهمية في المتصفح.
}

export function saveOrder(o: Omit<Order, 'id' | 'date'>, id?: string): Order {
  const order: Order = { ...o, id: id || `STY-${Date.now().toString().slice(-6)}`, date: new Date().toISOString() };
  write(ORDERS_KEY, [order, ...read<Order[]>(ORDERS_KEY, [])]);
  return order;
}
export function findOrder(id: string): Order | undefined {
  return read<Order[]>(ORDERS_KEY, []).find((o) => o.id.toUpperCase() === id.trim().toUpperCase());
}
export function orderStatus(o: Order): 0 | 1 | 2 {
  const hours = (Date.now() - new Date(o.date).getTime()) / 36e5;
  return hours < 24 ? 0 : hours < 72 ? 1 : 2;
}
