// Bridge between the SPA (localStorage "DB") and the webhook/automation backend.
// The backend receives Evolution webhooks and runs the automation flows, so it needs
// a copy of the connected instances (credentials) and the automation definitions.

import { dbKey } from './saas';

const DEFAULT_BACKEND = 'http://localhost:5174';

type ChannelCredential = {
  instanceName?: string;
  serverUrl?: string;
  apiKey?: string;
};

type LocalChannel = {
  id: string;
  type?: string;
  provider?: string;
  credentials?: ChannelCredential;
};

type BackendSyncInstance = {
  channelId: string;
  serverUrl: string;
  apiKey: string;
  instanceName: string;
};

type BackendSyncResponse = { ok: boolean; webhookUrl?: string; error?: string };

export type BackendStoreProduct = {
  id: string;
  name: string;
  price: number;
};

type BackendIgAccount = {
  channelId: string;
  userId: string;
  username: string;
  accessToken: string;
};

type BackendSyncPayload = {
  instances: BackendSyncInstance[];
  igAccounts: BackendIgAccount[];
  automations: unknown[];
  integrations: Record<string, unknown>;
  products: BackendStoreProduct[];
};

const emptyObj = (): Record<string, unknown> => ({});
const emptyProducts = (): BackendStoreProduct[] => [];

export function backendUrl(): string {
  try {
    return (localStorage.getItem('backend_url') || (process.env.REACT_APP_BACKEND_URL as string) || DEFAULT_BACKEND).replace(/\/+$/, '');
  } catch {
    return DEFAULT_BACKEND;
  }
}

function readDb<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(dbKey(key));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function safeParseObject(raw: string | null): Record<string, unknown> {
  if (!raw) return emptyObj();
  try {
    const val = JSON.parse(raw);
    if (!val || typeof val !== 'object') return emptyObj();
    // integrations is stored as Integ[] — convert to { [id]: credentials }
    if (Array.isArray(val)) {
      const obj: Record<string, unknown> = {};
      for (const item of val) {
        if (item && typeof item === 'object' && item.id && item.connected && item.credentials) {
          obj[item.id] = item.credentials;
        }
      }
      return obj;
    }
    return val as Record<string, unknown>;
  } catch {
    return emptyObj();
  }
}

function safeParseProducts(raw: string | null): BackendStoreProduct[] {
  if (!raw) return emptyProducts();
  try {
    const val = JSON.parse(raw);
    if (!Array.isArray(val)) return emptyProducts();
    return val
      .filter((p) => p && typeof p === 'object')
      .map((p) => {
        const obj = p as Record<string, unknown>;
        return {
          id: String(obj.id || ''),
          name: String(obj.name || ''),
          price: Number(obj.price || 0),
        };
      })
      .filter((p) => p.id && p.name);
  } catch {
    return emptyProducts();
  }
}

// Collects Evolution instances (with credentials) + automations from localStorage
// and pushes them to the backend, which (re)registers the webhook on each instance.
export async function syncToBackend(): Promise<BackendSyncResponse> {
  const channels = readDb<LocalChannel>('channels');
  const automations = readDb<unknown>('automations');
  const integrations = safeParseObject(localStorage.getItem('integrations'));
  const products = safeParseProducts(localStorage.getItem('db_store_products'));

  const instances: BackendSyncInstance[] = channels
    .filter(
      (c) =>
        (c.type === 'whatsapp_evolution' || c.provider === 'evolution_api') &&
        !!c.credentials?.instanceName &&
        !!c.credentials?.serverUrl &&
        !!c.credentials?.apiKey,
    )
    .map((c) => ({
      channelId: c.id,
      serverUrl: String(c.credentials?.serverUrl || ''),
      apiKey: String(c.credentials?.apiKey || ''),
      instanceName: String(c.credentials?.instanceName || ''),
    }));

  const igAccounts: BackendIgAccount[] = channels
    .filter((c: any) => c.type === 'instagram' && c.credentials?.accessToken && c.credentials?.userId)
    .map((c: any) => ({
      channelId: c.id,
      userId: String(c.credentials?.userId || ''),
      username: String(c.credentials?.username || ''),
      accessToken: String(c.credentials?.accessToken || ''),
    }));

  const payload: BackendSyncPayload = { instances, igAccounts, automations, integrations, products };

  try {
    const res = await fetch(`${backendUrl()}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { webhookUrl?: string };
    return { ok: true, webhookUrl: data?.webhookUrl };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'backend indisponível';
    return { ok: false, error: message };
  }
}

export async function sendCatalogViaBackend(payload: { instanceName: string; number: string; products?: BackendStoreProduct[] }) {
  const res = await fetch(`${backendUrl()}/api/store/send-catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function createPaymentViaBackend(payload: {
  instanceName: string;
  number: string;
  customerName?: string;
  productId?: string;
  amount?: number;
  description?: string;
  method?: 'PIX' | 'CARD';
  conversationId?: string;
  contactId?: string;
  channelId?: string;
  agentId?: string;
  agentName?: string;
  originalAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  couponType?: string;
  couponValue?: number | string;
}) {
  const res = await fetch(`${backendUrl()}/api/payments/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function listStoreOrdersViaBackend() {
  try {
    const res = await fetch(`${backendUrl()}/api/store/orders`);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, orders: [] };
    }
    const data = await res.json();
    return { ok: !!data?.ok, orders: Array.isArray(data?.orders) ? data.orders : [], error: data?.error };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'backend indisponível', orders: [] };
  }
}

export async function getStoreOrderDetailsViaBackend(orderId: string) {
  try {
    const res = await fetch(`${backendUrl()}/api/store/orders/${orderId}`);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return res.json();
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'backend indisponível' };
  }
}

export async function listStoreProductsViaBackend() {
  try {
    const res = await fetch(`${backendUrl()}/api/store/products`);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, products: [] };
    }
    const data = await res.json();
    return { ok: !!data?.ok, products: Array.isArray(data?.products) ? data.products : [], error: data?.error };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'backend indisponível', products: [] };
  }
}

export async function createStoreProductViaBackend(payload: unknown) {
  const res = await fetch(`${backendUrl()}/api/store/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateStoreProductViaBackend(id: string, payload: unknown) {
  const res = await fetch(`${backendUrl()}/api/store/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteStoreProductViaBackend(id: string) {
  const res = await fetch(`${backendUrl()}/api/store/products/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function listStoreCouponsViaBackend() {
  try {
    const res = await fetch(`${backendUrl()}/api/store/coupons`);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, coupons: [] };
    }
    const data = await res.json();
    return { ok: !!data?.ok, coupons: Array.isArray(data?.coupons) ? data.coupons : [], error: data?.error };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'backend indisponível', coupons: [] };
  }
}

export async function createStoreCouponViaBackend(payload: unknown) {
  const res = await fetch(`${backendUrl()}/api/store/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateStoreCouponViaBackend(id: string, payload: unknown) {
  const res = await fetch(`${backendUrl()}/api/store/coupons/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteStoreCouponViaBackend(id: string) {
  const res = await fetch(`${backendUrl()}/api/store/coupons/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function getStoreSettingsViaBackend() {
  try {
    const res = await fetch(`${backendUrl()}/api/store/settings`);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, settings: null };
    }
    const data = await res.json();
    return { ok: !!data?.ok, settings: data?.settings || null, error: data?.error };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'backend indisponível', settings: null };
  }
}

export async function updateStoreSettingsViaBackend(payload: unknown) {
  const res = await fetch(`${backendUrl()}/api/store/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteStoreOrderViaBackend(id: string) {
  const res = await fetch(`${backendUrl()}/api/store/orders/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function syncCrmFunnelViaBackend(payload: { funnel: unknown; leads?: unknown[] }) {
  try {
    const res = await fetch(`${backendUrl()}/api/crm/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return res.json();
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'backend indisponível' };
  }
}