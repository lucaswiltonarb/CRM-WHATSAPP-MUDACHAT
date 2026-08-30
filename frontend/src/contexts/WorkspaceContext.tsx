import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FeatureKey, LimitKey, SaasPlan, Workspace, WorkspaceTheme, WorkspaceUsage } from '../types/saas';
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
  switchWorkspace: (id: string) => void;
  saveTheme: (theme: Partial<WorkspaceTheme>) => void;
  refresh: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

/* ---------- aplicacao do tema em CSS custom properties ---------- */

function hexToRgbTriplet(hex: string): string {
  const clean = String(hex || '').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full || '000000', 16);
  if (Number.isNaN(int)) return '0, 0, 0';
  return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
}

function rgba(hex: string, alpha: number): string {
  return `rgba(${hexToRgbTriplet(hex)}, ${alpha})`;
}

/** luminancia relativa simples para decidir texto claro/escuro */
function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgbTriplet(hex).split(',').map((n) => Number(n.trim()));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export function applyTheme(theme: WorkspaceTheme) {
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);

  set('--primary', hexToRgbTriplet(theme.primary));
  set('--primary-hex', theme.primary);
  set('--secondary', hexToRgbTriplet(theme.secondary));
  set('--secondary-hex', theme.secondary);
  set('--success', hexToRgbTriplet(theme.success));
  set('--success-hex', theme.success);
  set('--warning', hexToRgbTriplet(theme.warning));
  set('--warning-hex', theme.warning);
  set('--danger', hexToRgbTriplet(theme.danger));
  set('--danger-hex', theme.danger);

  set('--sidebar-bg', theme.sidebarBg);
  set('--sidebar-active', rgba(theme.primary, 0.22));
  set('--sidebar-hover', theme.sidebarMode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)');
  set('--header-bg', theme.headerBg);
  set('--bodybg-color', theme.bodyBg);
  set('--app-border-radius', `${theme.radius}px`);

  // tokens proprios usados pelo CSS novo
  set('--brand-gradient', `linear-gradient(135deg, ${theme.primary}, ${theme.success})`);
  set('--primary-soft', rgba(theme.primary, 0.12));
  set('--primary-strong', rgba(theme.primary, 0.85));

  const lightSidebar = theme.sidebarMode === 'light' || isLight(theme.sidebarBg);
  set('--sidebar-text', lightSidebar ? '#475569' : '#AAB3C5');
  set('--sidebar-text-strong', lightSidebar ? '#0F172A' : '#FFFFFF');
  set('--sidebar-text-muted', lightSidebar ? '#94A3B8' : '#8B95A7');
  set('--sidebar-border', lightSidebar ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.06)');
  document.body.classList.toggle('sidebar-light', lightSidebar);
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
