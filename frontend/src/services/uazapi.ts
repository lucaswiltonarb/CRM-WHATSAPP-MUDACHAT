// Cliente da uazapi (uazapiGO v2).
// As chamadas passam pelo proxy do backend para evitar bloqueio de CORS no navegador.
//
// Autenticacao (docs.uazapi.com):
//   - header `admintoken` -> endpoints administrativos (criar instancia)
//   - header `token`      -> endpoints da instancia (conectar, status, enviar)

import { backendUrl } from './backend';

export interface UazCreds {
  /** host da uazapi, ex.: https://minhaempresa.uazapi.com */
  serverUrl?: string;
  /** token administrativo do servidor (fica na configuracao do workspace) */
  adminToken?: string;
  /** token da instancia, gerado ao criar a instancia */
  token?: string;
  /** nome da instancia na uazapi */
  instanceName?: string;
}

export type UazStatus = 'connected' | 'connecting' | 'disconnected' | 'hibernated' | 'unknown';

export interface UazInstance {
  id?: string;
  token?: string;
  name?: string;
  status?: UazStatus;
  qrcode?: string;
  paircode?: string;
  profileName?: string;
  profilePicUrl?: string;
  owner?: string;
}

interface ProxyResult<T = any> {
  ok: boolean;
  status?: number;
  data?: T;
  error?: string;
}

export function hasAdminCreds(c?: UazCreds): boolean {
  return !!(c && c.serverUrl && c.adminToken);
}

export function hasInstanceCreds(c?: UazCreds): boolean {
  return !!(c && c.serverUrl && c.token);
}

export function normalizeQr(qr?: string): string | undefined {
  if (!qr) return undefined;
  return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
}

async function proxy<T = any>(opts: {
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string;
  admintoken?: string;
  body?: unknown;
}): Promise<ProxyResult<T>> {
  try {
    const res = await fetch(`${backendUrl()}/api/uazapi/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: opts.baseUrl,
        path: opts.path,
        method: opts.method || 'GET',
        token: opts.token,
        admintoken: opts.admintoken,
        body: opts.body,
      }),
    });
    const json = await res.json();
    return json as ProxyResult<T>;
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Falha de comunicacao com o servidor' };
  }
}

function fail(r: ProxyResult): string {
  const d: any = r.data || {};
  return String(d.error || d.message || d.response || r.error || `Erro HTTP ${r.status || ''}`).trim();
}

/** Cria a instancia na uazapi (usa o admintoken do workspace) e devolve o token dela. */
export async function createInstance(c: UazCreds, name: string): Promise<UazInstance> {
  const r = await proxy<any>({
    baseUrl: c.serverUrl!,
    path: '/instance/create',
    method: 'POST',
    admintoken: c.adminToken,
    body: { name, adminField01: 'leadflow-crm' },
  });
  if (!r.ok) throw new Error(fail(r));
  const d: any = r.data || {};
  const inst = d.instance || {};
  return {
    id: inst.id,
    token: d.token || inst.token,
    name: d.name || inst.name || name,
    status: inst.status,
  };
}

/** Inicia a conexao: sem telefone gera QR code, com telefone gera codigo de pareamento. */
export async function connectInstance(c: UazCreds, phone?: string): Promise<UazInstance> {
  const r = await proxy<any>({
    baseUrl: c.serverUrl!,
    path: '/instance/connect',
    method: 'POST',
    token: c.token,
    body: phone ? { phone: String(phone).replace(/\D/g, '') } : {},
  });
  if (!r.ok) throw new Error(fail(r));
  const d: any = r.data || {};
  const inst = d.instance || {};
  return {
    id: inst.id,
    name: inst.name,
    status: inst.status || (d.connected ? 'connected' : 'connecting'),
    qrcode: normalizeQr(inst.qrcode || d.qrcode),
    paircode: inst.paircode || d.paircode,
    profileName: inst.profileName,
    owner: inst.owner,
  };
}

export async function instanceStatus(c: UazCreds): Promise<UazInstance> {
  const r = await proxy<any>({
    baseUrl: c.serverUrl!,
    path: '/instance/status',
    method: 'GET',
    token: c.token,
  });
  if (!r.ok) throw new Error(fail(r));
  const d: any = r.data || {};
  const inst = d.instance || {};
  const st = d.status || {};
  return {
    id: inst.id,
    name: inst.name,
    status: (inst.status as UazStatus) || (st.connected ? 'connected' : 'disconnected'),
    qrcode: normalizeQr(inst.qrcode),
    paircode: inst.paircode,
    profileName: inst.profileName,
    profilePicUrl: inst.profilePicUrl,
    owner: inst.owner || st?.jid?.user,
  };
}

export async function disconnectInstance(c: UazCreds): Promise<boolean> {
  const r = await proxy({ baseUrl: c.serverUrl!, path: '/instance/disconnect', method: 'POST', token: c.token });
  return !!r.ok;
}

export async function deleteInstance(c: UazCreds): Promise<boolean> {
  const r = await proxy({ baseUrl: c.serverUrl!, path: '/instance', method: 'DELETE', token: c.token });
  return !!r.ok;
}

/** Aponta o webhook da instancia para o backend do CRM. */
export async function setWebhook(c: UazCreds, url: string): Promise<boolean> {
  const r = await proxy({
    baseUrl: c.serverUrl!,
    path: '/webhook',
    method: 'POST',
    token: c.token,
    body: {
      enabled: true,
      url,
      events: ['messages', 'connection'],
      excludeMessages: ['fromMe'],
      action: 'add',
    },
  });
  return !!r.ok;
}

export async function sendText(c: UazCreds, number: string, text: string): Promise<boolean> {
  const r = await proxy({
    baseUrl: c.serverUrl!,
    path: '/send/text',
    method: 'POST',
    token: c.token,
    body: { number: String(number).replace(/\D/g, ''), text },
  });
  return !!r.ok;
}

/** Testa as credenciais administrativas listando as instancias do servidor. */
export async function testAdminCreds(c: UazCreds): Promise<{ ok: boolean; count?: number; error?: string }> {
  const r = await proxy<any>({
    baseUrl: c.serverUrl!,
    path: '/instance/all',
    method: 'GET',
    admintoken: c.adminToken,
  });
  if (!r.ok) return { ok: false, error: fail(r) };
  const d: any = r.data;
  const list = Array.isArray(d) ? d : d?.instances || [];
  return { ok: true, count: Array.isArray(list) ? list.length : 0 };
}
