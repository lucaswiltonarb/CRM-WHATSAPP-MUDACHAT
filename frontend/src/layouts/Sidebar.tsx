import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  label: string;
  icon: string;
  path?: string;
  children?: { label: string; path: string }[];
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Dashboard', icon: 'ti ti-layout-dashboard', path: '/dashboard' },
      { label: 'Atendimento', icon: 'ti ti-messages', path: '/chat' },
      { label: 'Agenda', icon: 'ti ti-calendar', path: '/schedule' },
      { label: 'Contatos', icon: 'ti ti-users', path: '/contacts' },
      { label: 'Campanhas', icon: 'ti ti-speakerphone', path: '/campaigns' },
      { label: 'Loja', icon: 'ti ti-shopping-bag', path: '/store' },
      { label: 'Automacoes', icon: 'ti ti-sitemap', path: '/automations' },
      { label: 'CRM / Funil', icon: 'ti ti-layout-kanban', path: '/crm' },
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
          { label: 'Licenca', path: '/settings/license' },
          { label: 'Turnos de Trabalho', path: '/settings/shifts' },
          { label: 'Usuarios', path: '/settings/users' },
          { label: 'Conexoes', path: '/connections' },
        ],
      },
      {
        label: 'Agente de IA',
        icon: 'ti ti-robot',
        children: [
          { label: 'Agentes', path: '/ai-agents' },
          { label: 'Base de Conhecimento', path: '/ai-agents/knowledge' },
          { label: 'Intencoes', path: '/ai-agents/intents' },
          { label: 'Follow-up', path: '/ai-agents/followup' },
          { label: 'Distribuicao Automatica', path: '/settings/distribution' },
          { label: 'Integracoes', path: '/integrations' },
        ],
      },
      {
        label: 'Agenda',
        icon: 'ti ti-calendar-cog',
        children: [
          { label: 'Bloqueios de Horario', path: '/settings/schedule/blocks' },
          { label: 'Lembretes Automaticos', path: '/settings/schedule/reminders' },
          { label: 'Tipos de Eventos', path: '/settings/schedule/event-types' },
        ],
      },
      {
        label: 'CRM',
        icon: 'ti ti-layout-kanban',
        children: [
          { label: 'Funis de Vendas', path: '/settings/crm/funnels' },
          { label: 'Classificacoes', path: '/registers/classifications' },
          { label: 'Tags', path: '/registers/tags' },
          { label: 'Tipos de Ocorrências', path: '/registers/occurrences' },
          { label: 'Mensagens Rapidas', path: '/registers/quick-messages' },
        ],
      },
      { label: 'Relatorios', icon: 'ti ti-report-analytics', path: '/reports' },
      { label: 'Auditoria', icon: 'ti ti-history', path: '/audit' },
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

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }: { collapsed: boolean; mobileOpen: boolean; onCloseMobile: () => void }) {
  const { company } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}
      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand" onClick={() => navigate('/dashboard')}>
          <div className="brand-logo">
            <i className="ti ti-message-chatbot" />
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">FlowChat CRM</span>
              <span className="brand-sub">{company?.tradeName || 'SaaS'}</span>
            </div>
          )}
        </div>
        <nav className="sidebar-nav app-scroll">
          {navGroups.map((group) => (
            <div key={group.title} className="nav-group">
              {!collapsed && <div className="nav-group-title">{group.title}</div>}
              {group.items.map((item) => (
                <SidebarItem key={item.label} item={item} collapsed={collapsed} />
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}