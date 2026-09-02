// Tipos do modulo administrativo geral (multi-workspace + planos).

export type ConnectionType =
  | 'whatsapp_official'
  | 'whatsapp_evolution'
  | 'whatsapp_uazapi'
  | 'whatsapp_twilio'
  | 'instagram'
  | 'facebook'
  | 'webchat';

export const CONNECTION_TYPES: { key: ConnectionType; label: string; icon: string; color: string }[] = [
  { key: 'whatsapp_official', label: 'WhatsApp API Oficial (Meta)', icon: 'ti ti-brand-whatsapp', color: '#075e54' },
  { key: 'whatsapp_evolution', label: 'WhatsApp (Evolution API)', icon: 'ti ti-brand-whatsapp', color: '#25d366' },
  { key: 'whatsapp_uazapi', label: 'WhatsApp (UAZAPI)', icon: 'ti ti-brand-whatsapp', color: '#12b886' },
  { key: 'whatsapp_twilio', label: 'WhatsApp (Twilio)', icon: 'ti ti-brand-whatsapp', color: '#f22f46' },
  { key: 'instagram', label: 'Instagram', icon: 'ti ti-brand-instagram', color: '#e1306c' },
  { key: 'facebook', label: 'Facebook', icon: 'ti ti-brand-facebook', color: '#1877f2' },
  { key: 'webchat', label: 'Webchat', icon: 'ti ti-world', color: '#5d87ff' },
];

export type FeatureKey =
  | 'dashboard'
  | 'chat'
  | 'contacts'
  | 'crm'
  | 'schedule'
  | 'campaigns'
  | 'store'
  | 'automations'
  | 'aiAgents'
  | 'connections'
  | 'integrations'
  | 'registers'
  | 'reports'
  | 'audit'
  | 'users'
  | 'customTheme'
  | 'whiteLabel'
  | 'apiAccess'
  | 'exportData';

export const FEATURE_GROUPS: { title: string; items: { key: FeatureKey; label: string; description: string; icon: string }[] }[] = [
  {
    title: 'Modulos da plataforma',
    items: [
      { key: 'dashboard', label: 'Dashboard', description: 'Paineis e indicadores', icon: 'ti ti-layout-dashboard' },
      { key: 'chat', label: 'Atendimento', description: 'Caixa de entrada e conversas', icon: 'ti ti-messages' },
      { key: 'contacts', label: 'Contatos', description: 'Base de contatos e perfis', icon: 'ti ti-users' },
      { key: 'crm', label: 'CRM / Funil', description: 'Kanban de oportunidades', icon: 'ti ti-layout-kanban' },
      { key: 'schedule', label: 'Agenda', description: 'Agendamentos e lembretes', icon: 'ti ti-calendar' },
      { key: 'campaigns', label: 'Campanhas', description: 'Disparos e listas', icon: 'ti ti-speakerphone' },
      { key: 'store', label: 'Loja', description: 'Catalogo, pedidos e cupons', icon: 'ti ti-shopping-bag' },
      { key: 'automations', label: 'Automacoes', description: 'Construtor de fluxos', icon: 'ti ti-sitemap' },
      { key: 'aiAgents', label: 'Agentes de IA', description: 'Agentes, intencoes e follow-up', icon: 'ti ti-robot' },
    ],
  },
  {
    title: 'Operacao e configuracao',
    items: [
      { key: 'connections', label: 'Conexoes', description: 'Canais e credenciais', icon: 'ti ti-plug' },
      { key: 'integrations', label: 'Integracoes', description: 'Servicos externos e webhooks', icon: 'ti ti-plug-connected' },
      { key: 'registers', label: 'Cadastros', description: 'Tags, classificacoes, mensagens rapidas', icon: 'ti ti-list-details' },
      { key: 'users', label: 'Gestao de usuarios', description: 'Equipe, turnos e distribuicao', icon: 'ti ti-user-cog' },
      { key: 'reports', label: 'Relatorios', description: 'Relatorios analiticos', icon: 'ti ti-report-analytics' },
      { key: 'audit', label: 'Auditoria', description: 'Trilha de acoes do sistema', icon: 'ti ti-history' },
    ],
  },
  {
    title: 'Recursos avancados',
    items: [
      { key: 'customTheme', label: 'Personalizacao de cores', description: 'Cliente define as cores da plataforma', icon: 'ti ti-palette' },
      { key: 'whiteLabel', label: 'White label', description: 'Nome e logo proprios na plataforma', icon: 'ti ti-badge' },
      { key: 'apiAccess', label: 'Acesso via API', description: 'Chaves e webhooks externos', icon: 'ti ti-api' },
      { key: 'exportData', label: 'Exportacao de dados', description: 'Exportar relatorios e bases', icon: 'ti ti-download' },
    ],
  },
];

export type LimitKey =
  | 'users'
  | 'connections'
  | 'contacts'
  | 'leads'
  | 'aiAgents'
  | 'automations'
  | 'funnels'
  | 'campaignsPerMonth'
  | 'messagesPerMonth'
  | 'aiCredits'
  | 'storageMb';

export const LIMIT_META: { key: LimitKey; label: string; description: string; icon: string; unit?: string }[] = [
  { key: 'users', label: 'Usuarios', description: 'Atendentes e administradores do workspace', icon: 'ti ti-users' },
  { key: 'connections', label: 'Conexoes', description: 'Total de canais conectados', icon: 'ti ti-plug' },
  { key: 'contacts', label: 'Contatos', description: 'Contatos na base', icon: 'ti ti-address-book' },
  { key: 'leads', label: 'Leads', description: 'Oportunidades no CRM', icon: 'ti ti-target' },
  { key: 'aiAgents', label: 'Agentes de IA', description: 'Agentes inteligentes ativos', icon: 'ti ti-robot' },
  { key: 'automations', label: 'Automacoes', description: 'Fluxos automatizados', icon: 'ti ti-sitemap' },
  { key: 'funnels', label: 'Funis', description: 'Funis de venda no CRM', icon: 'ti ti-filter' },
  { key: 'campaignsPerMonth', label: 'Campanhas / mes', description: 'Disparos por mes', icon: 'ti ti-speakerphone' },
  { key: 'messagesPerMonth', label: 'Mensagens / mes', description: 'Mensagens enviadas por mes', icon: 'ti ti-message-2' },
  { key: 'aiCredits', label: 'Creditos de IA', description: 'Creditos mensais de IA', icon: 'ti ti-sparkles' },
  { key: 'storageMb', label: 'Armazenamento', description: 'Espaco para midias', icon: 'ti ti-database', unit: 'MB' },
];

export type PlanLimits = Record<LimitKey, number>;
export type PlanFeatures = Record<FeatureKey, boolean>;

export interface SaasPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingPeriod: 'monthly' | 'quarterly' | 'yearly';
  trialDays: number;
  color: string;
  highlight: boolean;
  status: 'active' | 'archived';
  limits: PlanLimits;
  features: PlanFeatures;
  connectionTypes: ConnectionType[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceTheme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  sidebarBg: string;
  sidebarMode: 'dark' | 'light';
  headerBg: string;
  bodyBg: string;
  radius: number;
  brandName: string;
  logoUrl: string;
}

export const DEFAULT_THEME: WorkspaceTheme = {
  primary: '#2172DB',
  secondary: '#78736E',
  success: '#34B478',
  warning: '#FAAC50',
  danger: '#EF4444',
  sidebarBg: '#0F1A2E',
  sidebarMode: 'dark',
  headerBg: '#FFFFFF',
  bodyBg: '#EEF2F5',
  radius: 12,
  brandName: 'LeadFlow CRM',
  logoUrl: '',
};

export interface UazapiCredentials {
  /** host da uazapi do cliente, ex.: https://empresa.uazapi.com */
  serverUrl: string;
  /** token administrativo do servidor (cria instancias) */
  adminToken: string;
  /** prefixo opcional para o nome das instancias criadas */
  instancePrefix?: string;
}

export interface WorkspaceIntegrations {
  uazapi?: UazapiCredentials;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  document?: string;
  planId: string;
  status: 'active' | 'trial' | 'suspended' | 'canceled';
  trialEndsAt?: string | null;
  expiresAt?: string | null;
  notes?: string;
  theme?: Partial<WorkspaceTheme>;
  /** credenciais de servicos externos, configuradas pelo administrativo geral */
  integrations?: WorkspaceIntegrations;
  /** overrides pontuais por workspace (tem prioridade sobre o plano) */
  featureOverrides?: Partial<PlanFeatures>;
  limitOverrides?: Partial<PlanLimits>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceUsage {
  users: number;
  connections: number;
  contacts: number;
  leads: number;
  aiAgents: number;
  automations: number;
  funnels: number;
}
