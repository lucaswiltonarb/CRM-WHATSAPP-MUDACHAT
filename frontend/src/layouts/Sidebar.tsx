import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import type { FeatureKey } from '../types/saas';

interface NavChild {
  label: string;
  path: string;
  feature?: FeatureKey;
}

interface NavItem {
  label: string;
  icon: string;
  path?: string;
  feature?: FeatureKey;
  children?: NavChild[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
  /** grupo visivel apenas para o dono da plataforma */
  adminOnly?: boolean;
}

const navGroups: NavGroup[] = [
  {
    title: 'Administrativo Geral',
    adminOnly: true,
    items: [
      { label: 'Visao Geral', icon: 'ti ti-shield-cog', path: '/admin' },
      { label: 'Workspaces', icon: 'ti ti-building-store', path: '/admin/workspaces' },
      { label: 'Planos', icon: 'ti ti-package', path: '/admin/plans' },
      { label: 'Integracoes', icon: 'ti ti-plug-connected', path: '/admin/integrations' },
    ],
  },
  {
    title: 'Principal',
    items: [
      { label: 'Dashboard', icon: 'ti ti-layout-dashboard', path: '/dashboard', feature: 'dashboard' },
      { label: 'Atendimento', icon: 'ti ti-messages', path: '/chat', feature: 'chat' },
      { label: 'Agenda', icon: 'ti ti-calendar', path: '/schedule', feature: 'schedule' },
      { label: 'Contatos', icon: 'ti ti-users', path: '/contacts', feature: 'contacts' },
      { label: 'Campanhas', icon: 'ti ti-speakerphone', path: '/campaigns', feature: 'campaigns' },
      { label: 'Loja', icon: 'ti ti-shopping-bag', path: '/store', feature: 'store' },
      { label: 'Automacoes', icon: 'ti ti-sitemap', path: '/automations', feature: 'automations' },
      { label: 'CRM / Funil', icon: 'ti ti-layout-kanban', path: '/crm', feature: 'crm' },
    ],
  },
  {
    title: 'Configuracoes',
    items: [
      {
        label: 'Empresa',
        icon: 'ti ti-building',
        children: [
          { label: 'Dados da Empresa', path: '/settings/company' },
          { label: 'Aparencia', path: '/settings/appearance', feature: 'customTheme' },
          { label: 'Licenca', path: '/settings/license' },
          { label: 'Turnos de Trabalho', path: '/settings/shifts', feature: 'users' },
          { label: 'Usuarios', path: '/settings/users', feature: 'users' },
          { label: 'Conexoes', path: '/connections', feature: 'connections' },
        ],
      },
      {
        label: 'Agente de IA',
        icon: 'ti ti-robot',
        children: [
          { label: 'Agentes', path: '/ai-agents', feature: 'aiAgents' },
          { label: 'Base de Conhecimento', path: '/ai-agents/knowledge', feature: 'aiAgents' },
          { label: 'Intencoes', path: '/ai-agents/intents', feature: 'aiAgents' },
          { label: 'Follow-up', path: '/ai-agents/followup', feature: 'aiAgents' },
          { label: 'Distribuicao Automatica', path: '/settings/distribution', feature: 'users' },
          { label: 'Integracoes', path: '/integrations', feature: 'integrations' },
        ],
      },
      {
        label: 'Agenda',
        icon: 'ti ti-calendar-cog',
        feature: 'schedule',
        children: [
          { label: 'Bloqueios de Horario', path: '/settings/schedule/blocks', feature: 'schedule' },
          { label: 'Lembretes Automaticos', path: '/settings/schedule/reminders', feature: 'schedule' },
          { label: 'Tipos de Eventos', path: '/settings/schedule/event-types', feature: 'schedule' },
        ],
      },
      {
        label: 'CRM',
        icon: 'ti ti-layout-kanban',
        children: [
          { label: 'Funis de Vendas', path: '/settings/crm/funnels', feature: 'crm' },
          { label: 'Classificacoes', path: '/registers/classifications', feature: 'registers' },
          { label: 'Tags', path: '/registers/tags', feature: 'registers' },
          { label: 'Tipos de Ocorrencias', path: '/registers/occurrences', feature: 'registers' },
          { label: 'Mensagens Rapidas', path: '/registers/quick-messages', feature: 'registers' },
        ],
      },
      { label: 'Relatorios', icon: 'ti ti-report-analytics', path: '/reports', feature: 'reports' },
      { label: 'Auditoria', icon: 'ti ti-history', path: '/audit', feature: 'audit' },
    ],
  },
];

function SidebarItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  if (item.children) {
    return (
      <div className="nav-group-item">
        <button className={`nav-link nav-parent ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)}>
          <i className={item.icon} />
          {!collapsed && <span className="nav-label">{item.label}</span>}
          {!collapsed && <i className={`ti ti-chevron-down nav-arrow ${open ? 'rotate' : ''}`} />}
        </button>
        {open && !collapsed && (
          <div className="nav-submenu">
            {item.children.map((c) => (
              <NavLink key={c.path} to={c.path} className={({ isActive }) => `nav-sublink ${isActive ? 'active' : ''}`}>
                <span className="nav-dot" />
                {c.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <NavLink to={item.path || '/dashboard'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title={item.label}>
      <i className={item.icon} />
      {!collapsed && <span className="nav-label">{item.label}</span>}
    </NavLink>
  );
}

/** Card do workspace no topo da sidebar (padrão Proofline: WorkspaceSwitcher). */
function WorkspaceCard({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const { workspaces, workspace, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isPlatformOwner = user?.role === 'super_admin';
  const initials = (workspace?.name || 'WS').slice(0, 2).toUpperCase();

  if (collapsed) {
    return (
      <div className="ws-card" style={{ justifyContent: 'center', margin: '0 8px 16px', padding: '8px' }} title={workspace?.name}>
        <div className="ws-card-glyph">{initials}</div>
      </div>
    );
  }

  return (
    <div className="ws-card" onClick={() => isPlatformOwner && setOpen((o) => !o)}>
      <div className="ws-card-glyph">{initials}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ws-card-name">{workspace?.name || 'Workspace'}</span>
          <span className="ws-live-badge">Live</span>
        </div>
        <div className="ws-card-meta">Workspace ativo</div>
      </div>
      {isPlatformOwner && <i className="ti ti-chevron-down" style={{ fontSize: 14 }} />}
      {open && isPlatformOwner && (
        <div className="dropdown-panel ws-panel" style={{ left: 0, right: 0, top: 'calc(100% + 6px)' }} onMouseLeave={() => setOpen(false)}>
          <div className="dropdown-head"><span>Workspaces</span><span className="badge bg-light-primary text-primary">{workspaces.length}</span></div>
          <div className="ws-panel-list app-scroll">
            {workspaces.map((w) => (
              <button
                key={w.id}
                className={`dropdown-link ${w.id === workspace?.id ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setOpen(false); if (w.id !== workspace?.id) switchWorkspace(w.id); }}
              >
                <i className={w.id === workspace?.id ? 'ti ti-circle-check-filled' : 'ti ti-circle'} />
                <span className="ws-panel-name">{w.name}</span>
              </button>
            ))}
          </div>
          <div className="dropdown-divider" />
          <button className="dropdown-link" onClick={(e) => { e.stopPropagation(); navigate('/admin/workspaces'); setOpen(false); }}>
            <i className="ti ti-settings" /> Gerenciar workspaces
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }: { collapsed: boolean; mobileOpen: boolean; onCloseMobile: () => void }) {
  const { company, user } = useAuth();
  const { can, theme, workspace } = useWorkspace();
  const navigate = useNavigate();
  const isPlatformOwner = user?.role === 'super_admin';

  // remove do menu tudo que o plano do workspace nao libera
  const groups = navGroups
    .filter((g) => !g.adminOnly || isPlatformOwner)
    .map((g) => ({
      ...g,
      items: g.items
        .filter((i) => !i.feature || can(i.feature))
        .map((i) => (i.children ? { ...i, children: i.children.filter((c) => !c.feature || can(c.feature)) } : i))
        .filter((i) => !i.children || i.children.length > 0),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}
      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand" onClick={() => navigate('/dashboard')}>
          <div className="brand-logo">
            {theme.logoUrl ? <img src={theme.logoUrl} alt="" className="brand-logo-img" /> : <i className="ti ti-message-chatbot" />}
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">{theme.brandName || 'LeadFlow CRM'}</span>
              <span className="brand-sub">{workspace?.name || company?.tradeName || 'SaaS'}</span>
            </div>
          )}
        </div>
        <WorkspaceCard collapsed={collapsed} />
        <div className="sidebar-divider" />
        <nav className="sidebar-nav app-scroll">
          {groups.map((group) => (
            <div key={group.title} className={`nav-group ${group.adminOnly ? 'nav-group-admin' : ''}`}>
              {!collapsed && <div className="nav-group-title">{group.title}</div>}
              {group.items.map((item) => (
                <SidebarItem key={item.label} item={item} collapsed={collapsed} />
              ))}
            </div>
          ))}
        </nav>
        {!collapsed && <div className="sidebar-ds-signature">Proofline · design system</div>}
      </aside>
    </>
  );
}
