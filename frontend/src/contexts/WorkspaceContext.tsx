import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FeatureKey, LimitKey, SaasPlan, Workspace, WorkspaceIntegrations, WorkspaceTheme, WorkspaceUsage } from '../types/saas';
import { DEFAULT_THEME } from '../types/saas';
import * as saas from '../services/saas';

interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaces: Workspace[];
  plan: SaasPlan | null;
  theme: WorkspaceTheme;
  usage: WorkspaceUsage;
  /** o recurso esta liberado no plano do workspace ativo? */
  can: (key: FeatureKey) => boolean;
  /** limite numerico do plano (-1 = ilimitado) */
  limitOf: (key: LimitKey) => number;
  /** ja bateu o limite? */
  reached: (key: LimitKey, current: number) => boolean;
  /** tipos de conexao permitidos pelo plano */
  connectionTypes: string[];
  /** credenciais externas do workspace (uazapi etc), definidas no administrativo */
  integrations: WorkspaceIntegrations;
  switchWorkspace: (id: string) => void;
  saveTheme: (theme: Partial<WorkspaceTheme>) => void;
  refresh: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

/* ------------------------------------------------------------------ *
 * Cor: utilitarios
 * ------------------------------------------------------------------ */

function toRgb(hex: string): [number, number, number] {
  const clean = String(hex || '').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full || '000000', 16);
  if (Number.isNaN(int)) return [0, 0, 0];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

const triplet = (hex: string) => toRgb(hex).join(', ');
const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')}`;

/** luminancia relativa (WCAG) */
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const isLight = (hex: string) => luminance(hex) > 0.45;

/** mistura duas cores; t=0 devolve a, t=1 devolve b */
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/**
 * Adapta uma cor escolhida pelo cliente ao modo em uso.
 * O valor salvo nunca muda; o ajuste acontece so em runtime.
 */
function forMode(hex: string, dark: boolean, kind: 'surface' | 'accent'): string {
  if (!dark) return hex;
  if (kind === 'surface') {
    // superficie clara personalizada vira uma versao escura equivalente
    return isLight(hex) ? mix(hex, '#101214', 0.9) : hex;
  }
  // acentos escuros demais ficam ilegiveis sobre fundo escuro
  return luminance(hex) < 0.22 ? mix(hex, '#ffffff', 0.45) : hex;
}

/** par de gradiente derivado da cor configurada */
function gradientPair(primary: string, dark: boolean): [string, string] {
  const start = dark ? mix(primary, '#000000', 0.25) : mix(primary, '#ffffff', 0.28);
  const end = dark ? mix(primary, '#000000', 0.42) : mix(primary, '#000000', 0.08);
  return [start, end];
}

/* ------------------------------------------------------------------ *
 * Aplicacao do tema
 * ------------------------------------------------------------------ */

/** variaveis inline escritas por applyTheme — limpas antes de cada aplicacao */
const MANAGED_VARS = [
  '--lf-primary', '--lf-primary-rgb', '--lf-primary-start', '--lf-primary-end',
  '--lf-primary-solid', '--lf-primary-soft', '--lf-primary-gradient', '--lf-on-primary',
  '--lf-success', '--lf-success-rgb', '--lf-warning', '--lf-warning-rgb',
  '--lf-danger', '--lf-danger-rgb',
  '--lf-surface-rail', '--lf-surface-shell', '--lf-surface-board', '--lf-surface-card',
  '--lf-radius-card', '--lf-radius-control', '--lf-radius-panel',
  '--lf-sidebar-text', '--lf-sidebar-text-strong',
];

export function applyTheme(theme: WorkspaceTheme) {
  const root = document.documentElement;
  const dark = document.body.classList.contains('dark');

  // nao vazar cores entre workspaces: remove o que foi escrito antes
  MANAGED_VARS.forEach((v) => root.style.removeProperty(v));

  const set = (k: string, v: string) => root.style.setProperty(k, v);
  const defaults = DEFAULT_THEME;
  /** so grava override quando o valor difere do preset */
  const custom = (value: string, preset: string) => value && value.toLowerCase() !== preset.toLowerCase();

  /* ---- marca ---- */
  if (custom(theme.primary, defaults.primary)) {
    const primary = forMode(theme.primary, dark, 'accent');
    const [start, end] = gradientPair(theme.primary, dark);
    set('--lf-primary', primary);
    set('--lf-primary-rgb', triplet(primary));
    set('--lf-primary-start', start);
    set('--lf-primary-end', end);
    set('--lf-primary-gradient', `linear-gradient(135deg, ${start}, ${end})`);
    // acao solida precisa de texto branco legivel
    const solid = luminance(theme.primary) > 0.5 ? mix(theme.primary, '#000000', 0.35) : theme.primary;
    set('--lf-primary-solid', solid);
    set('--lf-primary-soft', `rgb(${triplet(primary)} / 10%)`);
  }

  /* ---- semanticos ---- */
  ([
    ['success', theme.success, defaults.success],
    ['warning', theme.warning, defaults.warning],
    ['danger', theme.danger, defaults.danger],
  ] as const).forEach(([name, value, preset]) => {
    if (!custom(value, preset)) return;
    const c = forMode(value, dark, 'accent');
    set(`--lf-${name}`, c);
    set(`--lf-${name}-rgb`, triplet(c));
  });

  /* ---- superficies ---- */
  if (custom(theme.sidebarBg, defaults.sidebarBg)) set('--lf-surface-rail', forMode(theme.sidebarBg, dark, 'surface'));
  if (custom(theme.headerBg, defaults.headerBg)) set('--lf-surface-shell', forMode(theme.headerBg, dark, 'surface'));
  if (custom(theme.bodyBg, defaults.bodyBg)) set('--lf-surface-board', forMode(theme.bodyBg, dark, 'surface'));

  /* ---- raio ---- */
  if (typeof theme.radius === 'number' && theme.radius !== defaults.radius) {
    set('--lf-radius-card', `${theme.radius}px`);
    set('--lf-radius-control', `${Math.min(theme.radius, 12)}px`);
    set('--lf-radius-panel', `${theme.radius + 8}px`);
  }

  /* ---- contraste do trilho lateral ---- */
  const railBg = custom(theme.sidebarBg, defaults.sidebarBg)
    ? forMode(theme.sidebarBg, dark, 'surface')
    : (dark ? '#2A2E31' : '#EEF2F5');
  const railLight = theme.sidebarMode === 'light' || isLight(railBg);
  document.body.classList.toggle('sidebar-light', railLight);
}

/* ---------------------------- provider ---------------------------- */

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [activeId, setActiveId] = useState<string>(() => saas.activeWorkspaceId());

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const workspaces = useMemo(() => saas.listWorkspaces(), [version]);
  const workspace = useMemo(
    () => workspaces.find((w) => w.id === activeId) || workspaces[0] || null,
    [workspaces, activeId],
  );

  const eff = useMemo(() => saas.effectivePlan(workspace), [workspace, version]);

  const theme = useMemo<WorkspaceTheme>(
    () => ({ ...DEFAULT_THEME, ...(workspace?.theme || {}) }),
    [workspace],
  );

  const usage = useMemo<WorkspaceUsage>(
    () => (workspace ? saas.workspaceUsage(workspace.id) : { users: 0, connections: 0, contacts: 0, leads: 0, aiAgents: 0, automations: 0, funnels: 0 }),
    [workspace, version],
  );

  useEffect(() => {
    applyTheme(theme);
    // reaplica quando o modo claro/escuro muda, para recalcular as derivacoes
    const observer = new MutationObserver(() => applyTheme(theme));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [theme]);

  const switchWorkspace = useCallback((id: string) => {
    saas.setActiveWorkspace(id);
    setActiveId(id);
    // os dados operacionais vivem em chaves prefixadas; recarregar garante
    // que todas as telas leiam o workspace novo.
    window.location.reload();
  }, []);

  const saveTheme = useCallback(
    (patch: Partial<WorkspaceTheme>) => {
      if (!workspace) return;
      const next = { ...theme, ...patch };
      saas.saveWorkspace({ id: workspace.id, name: workspace.name, theme: next });
      applyTheme(next);
      refresh();
    },
    [workspace, theme, refresh],
  );

  const value: WorkspaceContextType = {
    workspace,
    workspaces,
    plan: eff.plan,
    theme,
    usage,
    can: (key) => saas.hasFeature(eff.features, key),
    limitOf: (key) => eff.limits[key],
    reached: (key, current) => saas.limitReached(eff.limits, key, current),
    connectionTypes: eff.connectionTypes,
    integrations: saas.workspaceIntegrations(workspace),
    switchWorkspace,
    saveTheme,
    refresh,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace deve ser usado dentro de WorkspaceProvider');
  return ctx;
}
