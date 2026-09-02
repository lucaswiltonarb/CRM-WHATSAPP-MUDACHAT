import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/auth/Login';
import { LoadingState, EmptyState } from './components/common';
import type { FeatureKey } from './types/saas';

import Dashboard from './pages/dashboard/Dashboard';
import Chat from './pages/chat/Chat';
import Contacts from './pages/contacts/Contacts';
import ContactProfile from './pages/contacts/ContactProfile';
import CRM from './pages/crm/CRM';
import Schedule from './pages/schedule/Schedule';
import Campaigns from './pages/campaigns/Campaigns';
import Store from './pages/store/Store';
import StoreOrderDetails from './pages/store/StoreOrderDetails';
import Automations from './pages/automations/Automations';
import AutomationBuilder from './pages/automations/AutomationBuilder';
import AIAgents from './pages/ai-agents/AIAgents';
import AIAgentConfig from './pages/ai-agents/AIAgentConfig';
import KnowledgeBase from './pages/ai-agents/KnowledgeBase';
import Intents from './pages/ai-agents/Intents';
import FollowUp from './pages/ai-agents/FollowUp';
import Connections from './pages/connections/Connections';
import Integrations from './pages/integrations/Integrations';
import { TagsPage, ClassificationsPage, OccurrencesPage, QuickMessagesPage, FunnelsPage } from './pages/registers/Registers';
import CompanySettings from './pages/settings/CompanySettings';
import UsersSettings from './pages/settings/UsersSettings';
import ShiftsSettings from './pages/settings/ShiftsSettings';
import DistributionSettings from './pages/settings/DistributionSettings';
import LicenseSettings from './pages/settings/LicenseSettings';
import AppearanceSettings from './pages/settings/AppearanceSettings';
import ScheduleBlocksSettings from './pages/settings/ScheduleBlocksSettings';
import ScheduleRemindersSettings from './pages/settings/ScheduleRemindersSettings';
import ScheduleEventTypesSettings from './pages/settings/ScheduleEventTypesSettings';
import Reports from './pages/reports/Reports';
import Audit from './pages/reports/Audit';
import AdminOverview from './pages/admin/AdminOverview';
import AdminWorkspaces from './pages/admin/AdminWorkspaces';
import AdminPlans from './pages/admin/AdminPlans';
import AdminIntegrations from './pages/admin/AdminIntegrations';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingState label="Carregando plataforma..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Area exclusiva do dono da plataforma */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'super_admin') {
    return (
      <div className="page-shell">
        <EmptyState icon="ti ti-shield-lock" title="Acesso restrito" description="Apenas o administrador da plataforma pode acessar esta area." />
      </div>
    );
  }
  return <>{children}</>;
}

/** Bloqueia o modulo quando o plano do workspace nao libera o recurso */
function Gated({ feature, children }: { feature: FeatureKey; children: React.ReactNode }) {
  const { can, plan } = useWorkspace();
  if (!can(feature)) {
    return (
      <div className="page-shell">
        <EmptyState
          icon="ti ti-lock"
          title="Recurso nao incluso no plano"
          description={`O plano ${plan?.name || 'atual'} nao inclui este modulo. Fale com o administrador da plataforma para liberar.`}
        />
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Gated feature="dashboard"><Dashboard /></Gated>} />
                <Route path="chat" element={<Gated feature="chat"><Chat /></Gated>} />
                <Route path="contacts" element={<Gated feature="contacts"><Contacts /></Gated>} />
                <Route path="contacts/:id" element={<Gated feature="contacts"><ContactProfile /></Gated>} />
                <Route path="crm" element={<Gated feature="crm"><CRM /></Gated>} />
                <Route path="settings/crm/funnels" element={<Gated feature="crm"><FunnelsPage /></Gated>} />
                <Route path="schedule" element={<Gated feature="schedule"><Schedule /></Gated>} />
                <Route path="campaigns" element={<Gated feature="campaigns"><Campaigns /></Gated>} />
                <Route path="store" element={<Gated feature="store"><Store /></Gated>} />
                <Route path="store/orders/:id" element={<Gated feature="store"><StoreOrderDetails /></Gated>} />
                <Route path="automations" element={<Gated feature="automations"><Automations /></Gated>} />
                <Route path="automations/:id/builder" element={<Gated feature="automations"><AutomationBuilder /></Gated>} />
                <Route path="ai-agents" element={<Gated feature="aiAgents"><AIAgents /></Gated>} />
                <Route path="ai-agents/:id/config" element={<Gated feature="aiAgents"><AIAgentConfig /></Gated>} />
                <Route path="ai-agents/knowledge" element={<Gated feature="aiAgents"><KnowledgeBase /></Gated>} />
                <Route path="ai-agents/intents" element={<Gated feature="aiAgents"><Intents /></Gated>} />
                <Route path="ai-agents/followup" element={<Gated feature="aiAgents"><FollowUp /></Gated>} />
                <Route path="connections" element={<Gated feature="connections"><Connections /></Gated>} />
                <Route path="integrations" element={<Gated feature="integrations"><Integrations /></Gated>} />
                <Route path="registers/tags" element={<Gated feature="registers"><TagsPage /></Gated>} />
                <Route path="registers/classifications" element={<Gated feature="registers"><ClassificationsPage /></Gated>} />
                <Route path="registers/occurrences" element={<Gated feature="registers"><OccurrencesPage /></Gated>} />
                <Route path="registers/quick-messages" element={<Gated feature="registers"><QuickMessagesPage /></Gated>} />
                <Route path="settings/company" element={<CompanySettings />} />
                <Route path="settings/appearance" element={<AppearanceSettings />} />
                <Route path="settings/users" element={<Gated feature="users"><UsersSettings /></Gated>} />
                <Route path="settings/shifts" element={<Gated feature="users"><ShiftsSettings /></Gated>} />
                <Route path="settings/schedule/blocks" element={<Gated feature="schedule"><ScheduleBlocksSettings /></Gated>} />
                <Route path="settings/schedule/reminders" element={<Gated feature="schedule"><ScheduleRemindersSettings /></Gated>} />
                <Route path="settings/schedule/event-types" element={<Gated feature="schedule"><ScheduleEventTypesSettings /></Gated>} />
                <Route path="settings/distribution" element={<Gated feature="users"><DistributionSettings /></Gated>} />
                <Route path="settings/license" element={<LicenseSettings />} />
                <Route path="reports" element={<Gated feature="reports"><Reports /></Gated>} />
                <Route path="audit" element={<Gated feature="audit"><Audit /></Gated>} />

                <Route path="admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
                <Route path="admin/workspaces" element={<AdminRoute><AdminWorkspaces /></AdminRoute>} />
                <Route path="admin/plans" element={<AdminRoute><AdminPlans /></AdminRoute>} />
                <Route path="admin/integrations" element={<AdminRoute><AdminIntegrations /></AdminRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
