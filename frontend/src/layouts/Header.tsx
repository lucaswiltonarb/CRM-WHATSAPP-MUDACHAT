import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function Header({ onToggleSidebar, onToggleMobile }: { onToggleSidebar: () => void; onToggleMobile: () => void }) {
  const { user, logout } = useAuth();
  const { workspaces, workspace, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem('theme-mode') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const isPlatformOwner = user?.role === 'super_admin';

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('theme-mode', dark ? 'dark' : 'light');
  }, [dark]);

  const notifications = [
    { id: 1, icon: 'ti ti-message', text: 'Nova conversa aguardando atendimento', time: '2 min' },
    { id: 2, icon: 'ti ti-trophy', text: 'Lead "Plano Business" foi marcado como ganho', time: '15 min' },
    { id: 3, icon: 'ti ti-calendar', text: 'Agendamento confirmado para amanhã', time: '1 h' },
    { id: 4, icon: 'ti ti-robot', text: 'Agente IA resolveu 12 conversas hoje', time: '2 h' },
  ];

  return (
    <header className="header-main">
      <div className="header-left">
        <button className="icon-btn header-toggle desktop-only" onClick={onToggleSidebar}><i className="ti ti-menu-2" /></button>
        <button className="icon-btn header-toggle mobile-only" onClick={onToggleMobile}><i className="ti ti-menu-2" /></button>
        <div className="header-search">
          <i className="ti ti-search" />
          <input placeholder="Buscar conversas, contatos, leads..." />
        </div>
        {isPlatformOwner && (
          <div className="header-dropdown ws-switcher">
            <button className="ws-chip" onClick={() => setWsOpen((o) => !o)} title="Trocar de workspace">
              <i className="ti ti-building-store" />
              <span className="desktop-only">{workspace?.name || 'Workspace'}</span>
              <i className="ti ti-chevron-down desktop-only" />
            </button>
            {wsOpen && (
              <div className="dropdown-panel ws-panel" onMouseLeave={() => setWsOpen(false)}>
                <div className="dropdown-head"><span>Workspaces</span><span className="badge bg-light-primary text-primary">{workspaces.length}</span></div>
                <div className="ws-panel-list app-scroll">
                  {workspaces.map((w) => (
                    <button
                      key={w.id}
                      className={`dropdown-link ${w.id === workspace?.id ? 'active' : ''}`}
                      onClick={() => { setWsOpen(false); if (w.id !== workspace?.id) switchWorkspace(w.id); }}
                    >
                      <i className={w.id === workspace?.id ? 'ti ti-circle-check-filled' : 'ti ti-circle'} />
                      <span className="ws-panel-name">{w.name}</span>
                    </button>
                  ))}
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-link" onClick={() => { navigate('/admin/workspaces'); setWsOpen(false); }}>
                  <i className="ti ti-settings" /> Gerenciar workspaces
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="header-right">
        <button className="icon-btn" onClick={() => setDark((d) => !d)} title="Tema">
          <i className={dark ? 'ti ti-sun' : 'ti ti-moon'} />
        </button>
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
              <button className="dropdown-link" onClick={() => { navigate('/settings/license'); setMenuOpen(false); }}><i className="ti ti-license" /> Licença & Planos</button>
              <div className="dropdown-divider" />
              <button className="dropdown-link danger" onClick={async () => { await logout(); navigate('/login'); }}><i className="ti ti-logout" /> Sair</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
