import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`app-wrapper ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="app-content">
        <Header onToggleSidebar={() => setCollapsed((c) => !c)} onToggleMobile={() => setMobileOpen((o) => !o)} />
        <main className="app-main app-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
