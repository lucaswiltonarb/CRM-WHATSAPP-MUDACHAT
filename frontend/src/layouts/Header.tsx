import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agent: 'Atendente',
  commercial: 'Comercial',
  professional: 'Profissional',
  custom: 'Personalizado',
};

/** rota → rótulo do breadcrumb (padrão Proofline: "<Workspace> / <Página>") */
const routeLabels: Array<[string, string]> = [
  ['/dashboard', 'Dashboard'],
  ['/chat', 'Atendimento'],
  ['/schedule', 'Agenda'],
  ['/contacts', 'Contatos'],
  ['/campaigns', 'Campanhas'],
  ['/store', 'Loja'],
  ['/automations', 'Automações'],
  ['/crm', 'CRM / Funil'],
  ['/ai-agents', 'Agente de IA'],
  ['/connections', 'Conexões'],
  ['/integrations', 'Integrações'],
  ['/registers', 'Cadastros'],
  ['/settings/crm', 'CRM'],
  ['/settings/schedule', 'Agenda'],
  ['/settings', 'Configurações'],
  ['/reports', 'Relatórios'],
  ['/audit', 'Auditoria'],
  ['/admin/workspaces', 'Workspaces'],
  ['/admin/plans', 'Planos'],
  ['/admin/integrations', 'Integrações'],
  ['/admin', 'Administrativo Geral'],
];

export default function Header({ onToggleSidebar, onToggleMobile }: { onToggleSidebar: () => void; onToggleMobile: () => void }) {
  const { user, logout } = useAuth();
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const isPlatformOwner = user?.role === 'super_admin';

  // Proofline é dark-only: o tema escuro é permanente.
  useEffect(() => {
    document.body.classList.add('dark');
    localStorage.setItem('theme-mode', 'dark');
  }, []);

  const pageLabel = routeLabels.find(([prefix]) => location.pathname.startsWith(prefix))?.[1] || 'Início';

  const notifications = [
    { id: 1, icon: 'ti ti-message', text: 'Nova conversa aguardando atendimento', time: '2 min' },
    { id: 2, icon: 'ti ti-trophy', text: 'Lead "Plano Business" foi marcado como ganho', time: '15 min' },
    { id: 3, icon: 'ti ti-calendar', text: 'Agendamento confirmado para amanhã', time: '1 h' },
    { id: 4, icon: 'ti ti-robot', text: 'Agente IA resolveu 12 conversas hoje', time: '2 h' },
  ];

  return (
    <header className="header-main">
      <div className="header-left" style={{ flex: 1, minWidth: 0 }}>
        <button className="icon-btn header-toggle desktop-only" onClick={onToggleSidebar}><i className="ti ti-menu-2" /></button>
        <button className="icon-btn header-toggle mobile-only" onClick={onToggleMobile}><i className="ti ti-menu-2" /></button>
        <div className="header-breadcrumb">
          <span className="crumb">{workspace?.name || 'Workspace'}</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">{pageLabel}</span>
        </div>
      </div>
      <div className="desktop-only" style={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
        <div className="header-search">
          <i className="ti ti-search" />
          <input placeholder="Buscar..." />
          <span className="kbd-hint">⌘K</span>
        </div>
      </div>
      <div className="header-right" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <div className="header-dropdown">
          <button className="icon-btn notif-btn" onClick={() => setNotifOpen((o) => !o)}>
            <i className="ti ti-bell" /><span className="notif-badge">{notifications.length}</span>
          </button>
          {notifOpen && (
            <div className="dropdown-panel notif-panel" onMouseLeave={() => setNotifOpen(false)}>
              <div className="dropdown-head"><span>Notificações</span><span className="badge bg-light-primary text-primary">{notifications.length} novas</span></div>
              <div className="notif-list app-scroll">
                {notifications.map((n) => (
                  <div key={n.id} className="notif-item">
                    <div className="notif-icon"><i className={n.icon} /></div>
                    <div className="notif-content"><p>{n.text}</p><span>{n.time} atrás</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="header-dropdown">
          <button className="user-chip" onClick={() => setMenuOpen((o) => !o)}>
            <div className="user-avatar">{user?.name?.charAt(0)}</div>
            <div className="user-info desktop-only">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{roleLabels[user?.role || 'agent']}</span>
            </div>
            <i className="ti ti-chevron-down desktop-only" />
          </button>
          {menuOpen && (
            <div className="dropdown-panel user-panel" onMouseLeave={() => setMenuOpen(false)}>
              <button className="dropdown-link" onClick={() => { navigate('/settings/company'); setMenuOpen(false); }}><i className="ti ti-settings" /> Configurações</button>
              {isPlatformOwner && (
                <button className="dropdown-link" onClick={() => { navigate('/admin'); setMenuOpen(false); }}><i className="ti ti-shield-cog" /> Administrativo Geral</button>
              )}
              <button className="dropdown-link" onClick={() => { navigate('/settings/appearance'); setMenuOpen(false); }}><i className="ti ti-palette" /> Aparência</button>
              <button className="dropdown-link" onClick={() => { navigate('/settings/license'); setMenuOpen(false); }}><i className="ti ti-license" /> Licença &amp; Planos</button>
              <div className="dropdown-divider" />
              <button className="dropdown-link danger" onClick={async () => { await logout(); navigate('/login'); }}><i className="ti ti-logout" /> Sair</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
