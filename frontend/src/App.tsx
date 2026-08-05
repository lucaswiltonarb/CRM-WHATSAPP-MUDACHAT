import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/auth/Login';
import { LoadingState } from './components/common';

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
import ScheduleBlocksSettings from './pages/settings/ScheduleBlocksSettings';
import ScheduleRemindersSettings from './pages/settings/ScheduleRemindersSettings';
import ScheduleEventTypesSettings from './pages/settings/ScheduleEventTypesSettings';
import Reports from './pages/reports/Reports';
import Audit from './pages/reports/Audit';

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

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="chat" element={<Chat />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="contacts/:id" element={<ContactProfile />} />
              <Route path="crm" element={<CRM />} />
              <Route path="settings/crm/funnels" element={<FunnelsPage />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="store" element={<Store />} />
              <Route path="store/orders/:id" element={<StoreOrderDetails />} />
              <Route path="automations" element={<Automations />} />
              <Route path="automations/:id/builder" element={<AutomationBuilder />} />
              <Route path="ai-agents" element={<AIAgents />} />
              <Route path="ai-agents/:id/config" element={<AIAgentConfig />} />
              <Route path="ai-agents/knowledge" element={<KnowledgeBase />} />
              <Route path="ai-agents/intents" element={<Intents />} />
              <Route path="ai-agents/followup" element={<FollowUp />} />
              <Route path="connections" element={<Connections />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="registers/tags" element={<TagsPage />} />
              <Route path="registers/classifications" element={<ClassificationsPage />} />
              <Route path="registers/occurrences" element={<OccurrencesPage />} />
              <Route path="registers/quick-messages" element={<QuickMessagesPage />} />
              <Route path="settings/company" element={<CompanySettings />} />
              <Route path="settings/users" element={<UsersSettings />} />
              <Route path="settings/shifts" element={<ShiftsSettings />} />
              <Route path="settings/schedule/blocks" element={<ScheduleBlocksSettings />} />
              <Route path="settings/schedule/reminders" element={<ScheduleRemindersSettings />} />
              <Route path="settings/schedule/event-types" element={<ScheduleEventTypesSettings />} />
              <Route path="settings/distribution" element={<DistributionSettings />} />
              <Route path="settings/license" element={<LicenseSettings />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit" element={<Audit />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
