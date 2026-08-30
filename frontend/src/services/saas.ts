// Camada global do SaaS: workspaces, planos e isolamento de dados por workspace.
//
// Os dados operacionais de cada workspace continuam no localStorage, porem com
// prefixo proprio. O workspace padrao (ws-default) mantem as chaves legadas
// (db_*) para nao perder nada do que ja existe hoje.

import type {
  ConnectionType,
  FeatureKey,
  LimitKey,
  PlanFeatures,
  PlanLimits,
  SaasPlan,
  Workspace,
  WorkspaceUsage,
} from '../types/saas';
import { DEFAULT_THEME } from '../types/saas';

export const DEFAULT_WORKSPACE_ID = 'ws-default';

const K_PLANS = 'saas_plans';
const K_WORKSPACES = 'saas_workspaces';
const K_ACTIVE = 'saas_active_workspace';
const K_SEED = 'saas_seeded_v1';

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const slugify = (s: string) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

function readGlobal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function writeGlobal<T>(key: string, value: T): T {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  return value;
}

/* ------------------------------------------------------------------ *
 * Limites e features
 * ------------------------------------------------------------------ */

export const UNLIMITED = -1;

export const allLimits = (value: number): PlanLimits => ({
  users: value,
  connections: value,
  contacts: value,
  leads: value,
  aiAgents: value,
  automations: value,
  funnels: value,
  campaignsPerMonth: value,
  messagesPerMonth: value,
  aiCredits: value,
  storageMb: value,
});

export const allFeatures = (value: boolean): PlanFeatures => ({
  dashboard: value,
  chat: value,
  contacts: value,
  crm: value,
  schedule: value,
  campaigns: value,
  store: value,
  automations: value,
  aiAgents: value,
  connections: value,
  integrations: value,
  registers: value,
  reports: value,
  audit: value,
  users: value,
  customTheme: value,
  whiteLabel: value,
  apiAccess: value,
  exportData: value,
});

/* ------------------------------------------------------------------ *
 * Planos
 * ------------------------------------------------------------------ */

function makePlan(partial: Partial<SaasPlan> & { name: string }): SaasPlan {
  return {
    id: partial.id || uid('plan'),
    name: partial.name,
    description: partial.description || '',
    price: partial.price ?? 0,
    billingPeriod: partial.billingPeriod || 'monthly',
    trialDays: partial.trialDays ?? 0,
    color: partial.color || '#2172DB',
    highlight: partial.highlight ?? false,
    status: partial.status || 'active',
    limits: { ...allLimits(0), ...(partial.limits || {}) },
    features: { ...allFeatures(false), ...(partial.features || {}) },
    connectionTypes: partial.connectionTypes || ['whatsapp_evolution'],
    createdAt: partial.createdAt || now(),
    updatedAt: now(),
  };
}

const DEFAULT_PLANS: SaasPlan[] = [
  makePlan({
    id: 'plan-starter',
    name: 'Starter',
    description: 'Para quem esta comecando a operar no WhatsApp.',
    price: 97,
    trialDays: 7,
    color: '#0691A9',
    limits: {
      ...allLimits(0),
      users: 2,
      connections: 1,
      contacts: 1000,
      leads: 500,
      aiAgents: 0,
      automations: 3,
      funnels: 1,
      campaignsPerMonth: 2,
      messagesPerMonth: 3000,
      aiCredits: 0,
      storageMb: 500,
    },
    features: {
      ...allFeatures(false),
      dashboard: true,
      chat: true,
      contacts: true,
      crm: true,
      connections: true,
      registers: true,
      users: true,
    },
    connectionTypes: ['whatsapp_evolution'],
  }),
  makePlan({
    id: 'plan-pro',
    name: 'Profissional',
    description: 'Operacao completa com automacoes e IA.',
    price: 297,
    trialDays: 7,
    color: '#2172DB',
    highlight: true,
    limits: {
      ...allLimits(0),
      users: 10,
      connections: 5,
      contacts: 20000,
      leads: 10000,
      aiAgents: 3,
      automations: 25,
      funnels: 5,
      campaignsPerMonth: 20,
      messagesPerMonth: 50000,
      aiCredits: 5000,
      storageMb: 5000,
    },
    features: {
      ...allFeatures(true),
      whiteLabel: false,
      apiAccess: false,
    },
    connectionTypes: ['whatsapp_evolution', 'whatsapp_official', 'instagram', 'webchat'],
  }),
  makePlan({
    id: 'plan-enterprise',
    name: 'Enterprise',
    description: 'Sem limites, white label e acesso via API.',
    price: 897,
    trialDays: 0,
    color: '#7C3AED',
    limits: allLimits(UNLIMITED),
    features: allFeatures(true),
    connectionTypes: ['whatsapp_evolution', 'whatsapp_official', 'whatsapp_twilio', 'instagram', 'facebook', 'webchat'],
  }),
];

export function listPlans(): SaasPlan[] {
  seed();
  return readGlobal<SaasPlan[]>(K_PLANS, []);
}

export function getPlan(id?: string | null): SaasPlan | null {
  if (!id) return null;
  return listPlans().find((p) => p.id === id) || null;
}

export function savePlan(data: Partial<SaasPlan> & { name: string }): SaasPlan {
  const list = listPlans();
  const idx = data.id ? list.findIndex((p) => p.id === data.id) : -1;
  if (idx >= 0) {
    const merged: SaasPlan = {
      ...list[idx],
      ...data,
      limits: { ...list[idx].limits, ...(data.limits || {}) },
      features: { ...list[idx].features, ...(data.features || {}) },
      connectionTypes: data.connectionTypes || list[idx].connectionTypes,
      updatedAt: now(),
    };
    list[idx] = merged;
    writeGlobal(K_PLANS, list);
    return merged;
  }
  const created = makePlan(data);
  writeGlobal(K_PLANS, [...list, created]);
  return created;
}

export function deletePlan(id: string): { ok: boolean; error?: string } {
  const used = listWorkspaces().filter((w) => w.planId === id);
  if (used.length) return { ok: false, error: `Plano em uso por ${used.length} workspace(s).` };
  writeGlobal(K_PLANS, listPlans().filter((p) => p.id !== id));
  return { ok: true };
}

export function duplicatePlan(id: string): SaasPlan | null {
  const src = getPlan(id);
  if (!src) return null;
  const copy = makePlan({ ...src, id: undefined, name: `${src.name} (copia)`, highlight: false });
  writeGlobal(K_PLANS, [...listPlans(), copy]);
  return copy;
}

/* ------------------------------------------------------------------ *
 * Workspaces
 * ------------------------------------------------------------------ */

export function listWorkspaces(): Workspace[] {
  seed();
  return readGlobal<Workspace[]>(K_WORKSPACES, []);
}

export function getWorkspace(id?: string | null): Workspace | null {
  if (!id) return null;
  return listWorkspaces().find((w) => w.id === id) || null;
}

export function saveWorkspace(data: Partial<Workspace> & { name: string }): Workspace {
  const list = listWorkspaces();
  const idx = data.id ? list.findIndex((w) => w.id === data.id) : -1;
  if (idx >= 0) {
    const merged: Workspace = {
      ...list[idx],
      ...data,
      slug: data.slug || list[idx].slug,
      theme: { ...(list[idx].theme || {}), ...(data.theme || {}) },
      featureOverrides: { ...(list[idx].featureOverrides || {}), ...(data.featureOverrides || {}) },
      limitOverrides: { ...(list[idx].limitOverrides || {}), ...(data.limitOverrides || {}) },
      updatedAt: now(),
    };
    list[idx] = merged;
    writeGlobal(K_WORKSPACES, list);
    return merged;
  }
  const plans = listPlans();
  const created: Workspace = {
    id: data.id || uid('ws'),
    name: data.name,
    slug: data.slug || slugify(data.name),
    ownerName: data.ownerName || '',
    ownerEmail: data.ownerEmail || '',
    ownerPhone: data.ownerPhone || '',
    document: data.document || '',
    planId: data.planId || plans[0]?.id || '',
    status: data.status || 'trial',
    trialEndsAt: data.trialEndsAt ?? null,
    expiresAt: data.expiresAt ?? null,
    notes: data.notes || '',
    theme: data.theme || {},
    featureOverrides: data.featureOverrides || {},
    limitOverrides: data.limitOverrides || {},
    createdAt: now(),
    updatedAt: now(),
  };
  writeGlobal(K_WORKSPACES, [...list, created]);
  bootstrapWorkspaceData(created);
  return created;
}

export function deleteWorkspace(id: string): { ok: boolean; error?: string } {
  if (id === DEFAULT_WORKSPACE_ID) return { ok: false, error: 'O workspace principal nao pode ser excluido.' };
  writeGlobal(K_WORKSPACES, listWorkspaces().filter((w) => w.id !== id));
  purgeWorkspaceData(id);
  if (activeWorkspaceId() === id) setActiveWorkspace(DEFAULT_WORKSPACE_ID);
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Isolamento de dados por workspace
 * ------------------------------------------------------------------ */

export function activeWorkspaceId(): string {
  try {
    return localStorage.getItem(K_ACTIVE) || DEFAULT_WORKSPACE_ID;
  } catch {
    return DEFAULT_WORKSPACE_ID;
  }
}

export function setActiveWorkspace(id: string) {
  try {
    localStorage.setItem(K_ACTIVE, id);
  } catch {}
}

/** prefixo das chaves de dados de um workspace */
export function wsPrefix(id: string): string {
  return id === DEFAULT_WORKSPACE_ID ? '' : `ws_${id}__`;
}

/** chave final no localStorage para o workspace ativo */
export function dbKey(key: string): string {
  return `${wsPrefix(activeWorkspaceId())}db_${key}`;
}

/** chave crua (sem o prefixo db_) do workspace ativo — usada por chaves legadas */
export function rawKey(key: string): string {
  return `${wsPrefix(activeWorkspaceId())}${key}`;
}

export function readWorkspaceDb<T>(wsId: string, key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${wsPrefix(wsId)}db_${key}`);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function bootstrapWorkspaceData(ws: Workspace) {
  const p = wsPrefix(ws.id);
  const seedIfEmpty = (key: string, value: unknown) => {
    const full = `${p}db_${key}`;
    if (localStorage.getItem(full) === null) localStorage.setItem(full, JSON.stringify(value));
  };
  const owner = {
    id: `user-${ws.id}`,
    companyId: ws.id,
    name: ws.ownerName || ws.name,
    email: ws.ownerEmail,
    role: 'admin',
    permissions: [],
    status: 'active',
    createdAt: now(),
  };
  seedIfEmpty('users', [owner]);
  seedIfEmpty('company', {
    id: ws.id,
    name: ws.name,
    tradeName: ws.name,
    email: ws.ownerEmail,
    phone: ws.ownerPhone || '',
    document: ws.document || '',
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
  });
  [
    'channels', 'contacts', 'conversations', 'funnels', 'leads', 'appointments',
    'professionals', 'eventTypes', 'timeBlocks', 'campaigns', 'automations',
    'aiAgents', 'knowledgeBase', 'intents', 'tags', 'classifications',
    'occurrenceTypes', 'quickMessages', 'audit',
  ].forEach((k) => seedIfEmpty(k, []));
  seedIfEmpty('distribution', { enabled: false, strategy: 'round_robin', users: [] });
  seedIfEmpty('dashboard_data', null);
  // marca como semeado para o ensureRealDbSeed nao limpar
  localStorage.setItem(`${p}db_seeded_v2_real_data`, '1');
}

function purgeWorkspaceData(id: string) {
  const p = wsPrefix(id);
  if (!p) return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(p))
    .forEach((k) => localStorage.removeItem(k));
}

/* ------------------------------------------------------------------ *
 * Plano efetivo (plano + overrides do workspace)
 * ------------------------------------------------------------------ */

export interface EffectivePlan {
  plan: SaasPlan | null;
  features: PlanFeatures;
  limits: PlanLimits;
  connectionTypes: ConnectionType[];
}

export function effectivePlan(ws: Workspace | null): EffectivePlan {
  const plan = ws ? getPlan(ws.planId) : null;
  const base: EffectivePlan = {
    plan,
    features: plan ? { ...plan.features } : allFeatures(true),
    limits: plan ? { ...plan.limits } : allLimits(UNLIMITED),
    connectionTypes: plan ? [...plan.connectionTypes] : ['whatsapp_evolution', 'whatsapp_official', 'whatsapp_twilio', 'instagram', 'facebook', 'webchat'],
  };
  if (!ws) return base;
  // workspace suspenso: mantem apenas leitura do dashboard
  if (ws.status === 'suspended' || ws.status === 'canceled') {
    return { ...base, features: { ...allFeatures(false), dashboard: true }, limits: allLimits(0) };
  }
  return {
    ...base,
    features: { ...base.features, ...(ws.featureOverrides || {}) },
    limits: { ...base.limits, ...(ws.limitOverrides || {}) },
  };
}

export const isUnlimited = (n: number) => n === UNLIMITED;

export function limitLabel(n: number, unit?: string): string {
  if (isUnlimited(n)) return 'Ilimitado';
  if (n === 0) return 'Bloqueado';
  return unit ? `${n.toLocaleString('pt-BR')} ${unit}` : n.toLocaleString('pt-BR');
}

export function limitReached(limits: PlanLimits, key: LimitKey, current: number): boolean {
  const max = limits[key];
  if (isUnlimited(max)) return false;
  return current >= max;
}

export function hasFeature(features: PlanFeatures, key: FeatureKey): boolean {
  return features[key] !== false;
}

/* ------------------------------------------------------------------ *
 * Uso por workspace
 * ------------------------------------------------------------------ */

export function workspaceUsage(id: string): WorkspaceUsage {
  const count = (key: string) => {
    const v = readWorkspaceDb<unknown[]>(id, key, []);
    return Array.isArray(v) ? v.length : 0;
  };
  return {
    users: count('users'),
    connections: count('channels'),
    contacts: count('contacts'),
    leads: count('leads'),
    aiAgents: count('aiAgents'),
    automations: count('automations'),
    funnels: count('funnels'),
  };
}

/* ------------------------------------------------------------------ *
 * Seed inicial
 * ------------------------------------------------------------------ */

let seeded = false;

export function seed() {
  if (seeded) return;
  seeded = true;
  try {
    if (localStorage.getItem(K_SEED) === '1') return;
    writeGlobal(K_PLANS, DEFAULT_PLANS);
    const legacyCompany = (() => {
      try {
        const raw = localStorage.getItem('db_company');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
    const main: Workspace = {
      id: DEFAULT_WORKSPACE_ID,
      name: legacyCompany?.name || 'Workspace Principal',
      slug: 'principal',
      ownerName: legacyCompany?.tradeName || 'Administrador',
      ownerEmail: legacyCompany?.email || '',
      planId: 'plan-enterprise',
      status: 'active',
      trialEndsAt: null,
      expiresAt: null,
      notes: 'Workspace principal criado automaticamente com os dados existentes.',
      theme: { ...DEFAULT_THEME },
      featureOverrides: {},
      limitOverrides: {},
      createdAt: now(),
      updatedAt: now(),
    };
    writeGlobal(K_WORKSPACES, [main]);
    localStorage.setItem(K_ACTIVE, DEFAULT_WORKSPACE_ID);
    localStorage.setItem(K_SEED, '1');
  } catch {}
}

seed();
