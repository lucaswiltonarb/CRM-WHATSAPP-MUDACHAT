// Real Evolution API client (called directly from the browser).
// Requires the Evolution server to allow CORS (default CORS_ORIGIN=* in most deployments).

export interface EvoCreds {
  serverUrl?: string;
  apiKey?: string;
  instanceName?: string;
}

export interface EvoQr {
  base64?: string; // data URI PNG of the QR code
  code?: string; // raw pairing string
  pairingCode?: string;
}

export type EvoState = 'open' | 'connecting' | 'close' | 'unknown';

function normalizeBase64(b64?: string): string | undefined {
  if (!b64) return undefined;
  return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
}

function base(serverUrl: string): string {
  return serverUrl.replace(/\/+$/, '');
}

function headers(apiKey: string): HeadersInit {
  return { 'Content-Type': 'application/json', apikey: apiKey };
}

export function hasCreds(c?: EvoCreds): c is Required<EvoCreds> {
  return !!(c && c.serverUrl && c.apiKey && c.instanceName);
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

// Creates the instance (idempotent: ignores "already exists/in use" errors).
export async function createInstance(c: Required<EvoCreds>): Promise<{ qr?: EvoQr }> {
  const res = await fetch(`${base(c.serverUrl)}/instance/create`, {
    method: 'POST',
    headers: headers(c.apiKey),
    body: JSON.stringify({
      instanceName: c.instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }),
  });
  const data = await safeJson(res);
  if (!res.ok) {
    const msg = String(data?.message || data?.error || data?.response?.message || '');
    const exists = res.status === 403 || res.status === 409 || /already|use|exist/i.test(msg);
    if (!exists) {
      throw new Error(msg || `Falha ao criar instância (HTTP ${res.status})`);
    }
    return {};
  }
  const qc = data?.qrcode || data?.qr || {};
  return { qr: { base64: normalizeBase64(qc.base64), code: qc.code, pairingCode: qc.pairingCode } };
}

// Fetches a fresh QR code / pairing code for the instance.
export async function connectInstance(c: Required<EvoCreds>): Promise<EvoQr> {
  const res = await fetch(`${base(c.serverUrl)}/instance/connect/${encodeURIComponent(c.instanceName)}`, {
    headers: headers(c.apiKey),
  });
  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(String(data?.message || data?.error || `Falha ao gerar QR (HTTP ${res.status})`));
  }
  return {
    base64: normalizeBase64(data?.base64 || data?.qrcode?.base64),
    code: data?.code || data?.qrcode?.code,
    pairingCode: data?.pairingCode || data?.qrcode?.pairingCode,
  };
}

export async function connectionState(c: Required<EvoCreds>): Promise<EvoState> {
  const res = await fetch(`${base(c.serverUrl)}/instance/connectionState/${encodeURIComponent(c.instanceName)}`, {
    headers: headers(c.apiKey),
  });
  const data = await safeJson(res);
  if (!res.ok) return 'unknown';
  return (data?.instance?.state as EvoState) || (data?.state as EvoState) || 'unknown';
}

export async function logoutInstance(c: Required<EvoCreds>): Promise<void> {
  try {
    await fetch(`${base(c.serverUrl)}/instance/logout/${encodeURIComponent(c.instanceName)}`, {
      method: 'DELETE',
      headers: headers(c.apiKey),
    });
  } catch {
    /* ignore */
  }
}

// Sends a text message (used by the automation engine).
export async function sendText(c: Required<EvoCreds>, number: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${base(c.serverUrl)}/message/sendText/${encodeURIComponent(c.instanceName)}`, {
      method: 'POST',
      headers: headers(c.apiKey),
      body: JSON.stringify({ number, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
