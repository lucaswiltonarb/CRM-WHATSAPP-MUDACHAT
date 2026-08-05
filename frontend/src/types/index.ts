// ========== AUTH & COMPANY ==========
export interface Company {
  id: string;
  name: string;
  tradeName?: string;
  document?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  logo?: string;
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  shiftId?: string;
  teamId?: string;
  channels?: string[];
  funnels?: string[];
  status: 'active' | 'inactive' | 'away' | 'busy';
  lastLogin?: string;
  createdAt: string;
}

export type UserRole = 'super_admin' | 'admin' | 'supervisor' | 'agent' | 'commercial' | 'professional' | 'custom';

export interface Permission {
  module: string;
  actions: ('view' | 'create' | 'edit' | 'delete' | 'export')[];
  scope: 'all' | 'team' | 'own';
}

export interface WorkShift {
  id: string;
  companyId: string;
  name: string;
  days: number[]; // 0-6
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  users: string[];
}

// ========== CONTACTS ==========
export interface Contact {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  company?: string;
  position?: string;
  city?: string;
  state?: string;
  country?: string;
  origin?: string;
  channelOrigin?: string;
  responsibleId?: string;
  responsible?: User;
  walletId?: string;
  tags: Tag[];
  classification?: Classification;
  notes?: string;
  customFields: Record<string, any>;
  status: 'active' | 'archived' | 'blocked';
  lastInteraction?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== CONVERSATIONS / CHAT ==========
export interface Conversation {
  id: string;
  companyId: string;
  contactId: string;
  contact: Contact;
  channelId: string;
  channel?: Channel;
  agentId?: string;
  agent?: User;
  teamId?: string;
  status: ConversationStatus;
  tags: Tag[];
  classification?: Classification;
  origin?: string;
  campaignId?: string;
  leadId?: string;
  funnelId?: string;
  appointmentId?: string;
  isFavorite: boolean;
  isAI: boolean;
  aiAgentId?: string;
  lastMessage?: Message;
  waitingSince?: string;
  startedAt?: string;
  finishedAt?: string;
  occurrenceType?: OccurrenceType;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type ConversationStatus = 'waiting' | 'in_progress' | 'ai_handling' | 'transferred' | 'finished' | 'reopened' | 'lost' | 'archived';

export interface Message {
  id: string;
  conversationId: string;
  senderId?: string;
  senderType: 'user' | 'contact' | 'ai' | 'system';
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'sticker' | 'contact_card' | 'internal_note';
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  replyTo?: string;
  isRead: boolean;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

// ========== CRM / FUNNEL ==========
export interface Funnel {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  stages: FunnelStage[];
  isDefault: boolean;
  order?: number;
  workflowV2Enabled?: boolean;
  showCustomerBase?: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface FunnelStage {
  id: string;
  funnelId: string;
  name: string;
  color: string;
  order: number;
  description?: string;
  isDefaultOnStart?: boolean;
  isDefaultOnFinish?: boolean;
  isDefaultOnTransfer?: boolean;
  followUpEnabled?: boolean;
  followupResponseStageId?: string;
  leadsCount?: number;
  totalValue?: number;
}

export interface Lead {
  id: string;
  companyId: string;
  funnelId: string;
  stageId: string;
  contactId: string;
  contact?: Contact;
  conversationId?: string;
  responsibleId?: string;
  responsible?: User;
  title: string;
  value?: number;
  product?: string;
  origin?: string;
  tags: Tag[];
  classification?: Classification;
  expectedCloseDate?: string;
  status: 'open' | 'won' | 'lost' | 'reopened';
  lossReason?: string;
  notes?: string;
  activities: LeadActivity[];
  nextActivity?: string;
  lastMovedAt?: string;
  wonAt?: string;
  lostAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  userId: string;
  user?: User;
  type: 'note' | 'call' | 'email' | 'meeting' | 'task' | 'stage_change' | 'value_change' | 'status_change';
  description: string;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
}

// ========== SCHEDULE / AGENDA ==========
export interface Appointment {
  id: string;
  companyId: string;
  contactId: string;
  contact?: Contact;
  professionalId: string;
  professional?: Professional;
  eventTypeId?: string;
  eventType?: EventType;
  title: string;
  startDate: string;
  endDate: string;
  location?: string;
  notes?: string;
  status: AppointmentStatus;
  color?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  notifyWhatsApp: boolean;
  reminders: Reminder[];
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no_show' | 'waiting_confirmation';

export interface Professional {
  id: string;
  companyId: string;
  userId?: string;
  name: string;
  specialty?: string;
  availability: AvailabilitySlot[];
  status: 'active' | 'inactive';
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface EventType {
  id: string;
  companyId: string;
  name: string;
  duration: number; // minutes
  color: string;
  description?: string;
  defaultPrice?: number;
  status: 'active' | 'inactive';
}

export interface TimeBlock {
  id: string;
  companyId: string;
  professionalId: string;
  professional?: Professional;
  startDate: string;
  endDate: string;
  reason?: string;
  type?: 'vacation' | 'break' | 'unavailable' | 'personal' | 'other';
  notes?: string;
  status?: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  appointmentId: string;
  type: 'whatsapp' | 'email' | 'internal';
  minutesBefore: number;
  sent: boolean;
  sentAt?: string;
}

export interface ScheduleReminderConfigItem {
  enabled: boolean;
  minutesBefore?: number;
  hoursAfter?: number;
  message: string;
}

export interface ScheduleReminderSettings {
  enableConfirmationRequest: boolean;
  confirmationMessage: string;
  reminder24h: ScheduleReminderConfigItem;
  reminder2h: ScheduleReminderConfigItem;
  reminder30m: ScheduleReminderConfigItem;
  feedbackReminder: ScheduleReminderConfigItem;
}

// ========== CAMPAIGNS ==========
export interface Campaign {
  id: string;
  companyId: string;
  name: string;
  channelId?: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
  variables: string[];
  audienceType: 'manual' | 'csv' | 'classification' | 'tag' | 'wallet' | 'inactivity' | 'origin' | 'funnel' | 'stage' | 'previous_campaign' | 'custom_field';
  audienceCriteria: Record<string, any>;
  audienceCount?: number;
  status: CampaignStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  metrics: CampaignMetrics;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed' | 'cancelled';

export interface CampaignMetrics {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  leadsCreated: number;
}

// ========== AUTOMATIONS ==========
export interface Automation {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  channelId?: string;
  isActive: boolean;
  blocks: AutomationBlock[];
  connections: AutomationConnection[];
  executionCount: number;
  errorCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationBlock {
  id: string;
  automationId: string;
  type: AutomationBlockType;
  label: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

export type AutomationBlockType =
  | 'start'
  | 'message'
  | 'condition'
  | 'wait'
  | 'crm_action'
  | 'menu'
  | 'randomizer'
  | 'auto_action'
  | 'ai'
  | 'webhook'
  | 'tag'
  | 'transfer';

export interface AutomationConnection {
  id: string;
  automationId: string;
  sourceBlockId: string;
  targetBlockId: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface AutomationExecution {
  id: string;
  automationId: string;
  contactId: string;
  conversationId?: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentBlockId?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  logs: AutomationLog[];
}

export interface AutomationLog {
  id: string;
  executionId: string;
  blockId: string;
  blockType: string;
  action: string;
  result?: string;
  error?: string;
  timestamp: string;
}

// ========== AI AGENTS ==========
export interface AIAgent {
  id: string;
  companyId: string;
  name: string;
  objective: string;
  description?: string;
  behavior?: string;
  tone?: string;
  rules?: string;
  instructions?: string;
  transferRules?: string;
  channels: string[];
  schedule?: { days: number[]; startTime: string; endTime: string };
  limitPerDay?: number;
  fallbackMessage?: string;
  greetingMessage?: string;
  offHoursMessage?: string;
  transferMessage?: string;
  collectFields?: string[];
  allowedActions?: string[];
  allowedIntegrations?: string[];
  trainingStatus: 'pending' | 'training' | 'ready' | 'failed';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBase {
  id: string;
  agentId: string;
  type: 'faq' | 'document' | 'text' | 'url' | 'procedure';
  category: string;
  title: string;
  content: string;
  url?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Intent {
  id: string;
  agentId: string;
  name: string;
  description?: string;
  examples: string[];
  action?: string;
  outputFields?: Record<string, any>;
  requiredFields?: string[];
  defaultResponse?: string;
  transferToHuman: boolean;
  webhookUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface TrainingSession {
  id: string;
  agentId: string;
  userId: string;
  messages: { role: 'user' | 'assistant'; content: string; rating?: 'good' | 'bad' }[];
  status: 'in_progress' | 'approved' | 'pending_review';
  createdAt: string;
}

export interface FollowUp {
  id: string;
  agentId: string;
  isActive: boolean;
  delayMinutes: number;
  maxAttempts: number;
  intervalMinutes: number;
  messages: { attempt: number; message: string }[];
  stopCondition: 'reply' | 'max_attempts' | 'manual';
  channelId?: string;
  createTask: boolean;
  moveLead: boolean;
  targetStageId?: string;
}

// ========== CHANNELS ==========
export interface Channel {
  id: string;
  companyId: string;
  type: ChannelType;
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  provider?: 'evolution_api' | 'twilio' | 'meta' | 'webchat';
  credentials: Record<string, any>;
  defaultAgentId?: string;
  defaultTeamId?: string;
  defaultAIAgentId?: string;
  defaultFunnelId?: string;
  autoMessages: {
    greeting?: string;
    offHours?: string;
    queue?: string;
  };
  schedule?: { days: number[]; startTime: string; endTime: string };
  lastSync?: string;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChannelType = 'whatsapp_official' | 'whatsapp_unofficial' | 'instagram' | 'facebook' | 'webchat' | 'email' | 'telegram';

// ========== GENERAL REGISTERS ==========
export interface Tag {
  id: string;
  companyId: string;
  name: string;
  color: string;
  description?: string;
}

export interface Classification {
  id: string;
  companyId: string;
  name: string;
  color: string;
  description?: string;
  funnelId?: string;
  order?: number;
  isDefaultOnStart?: boolean;
  isDefaultOnFinish?: boolean;
  isDefaultOnTransfer?: boolean;
  followUpEnabled?: boolean;
  followupResponseStageId?: string;
}

export interface OccurrenceType {
  id: string;
  companyId: string;
  name: string;
  color: string;
  description?: string;
  isDeleted: boolean;
}

export interface QuickMessage {
  id: string;
  companyId: string;
  title: string;
  category?: string;
  shortcut?: string;
  message: string;
  messageType: 'text' | 'text_buttons' | 'text_action_buttons' | 'image_buttons' | 'video_buttons' | 'list' | 'otp' | 'pix' | 'carousel' | 'location' | 'attachment';
  scope: 'global' | 'personal' | 'specific_user';
  userId?: string;
  mediaUrl?: string;
  targetScopeLabel?: string;
  attachmentName?: string;
}

export interface DocumentTemplate {
  id: string;
  companyId: string;
  name: string;
  content: string;
  variables: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

// ========== INTEGRATIONS ==========
export interface Integration {
  id: string;
  companyId: string;
  type: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  credentials: Record<string, any>;
  config: Record<string, any>;
  lastSync?: string;
  createdAt: string;
}

export interface WebhookConfig {
  id: string;
  companyId: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers: Record<string, string>;
  events: string[];
  isActive: boolean;
  lastTriggered?: string;
}

// ========== LICENSE / PLANS ==========
export interface Plan {
  id: string;
  name: string;
  maxUsers: number;
  maxChannels: number;
  maxAgents: number;
  maxContacts: number;
  maxCampaigns: number;
  aiCredits: number;
  price: number;
  features: string[];
}

export interface License {
  id: string;
  companyId: string;
  planId: string;
  plan?: Plan;
  status: 'active' | 'expired' | 'suspended' | 'trial';
  startDate: string;
  endDate: string;
  creditsTotal: number;
  creditsUsed: number;
}

// ========== AUDIT ==========
export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  user?: User;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

// ========== REPORTS ==========
export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  channelId?: string;
  userId?: string;
  teamId?: string;
  funnelId?: string;
  campaignId?: string;
  origin?: string;
  status?: string;
  agentId?: string;
  tagId?: string;
  classificationId?: string;
}

export interface DashboardData {
  productivity: ProductivityMetrics;
  sales: SalesMetrics;
  ads: AdsMetrics;
  ai: AIMetrics;
  analysis: AnalysisMetrics;
}

export interface ProductivityMetrics {
  totalConversations: number;
  waiting: number;
  inProgress: number;
  finished: number;
  pendingReply?: number;
  customerWaiting?: number;
  avgFirstResponse: number;
  avgHandlingTime: number;
  avgResolutionTime: number;
  occupancyRate: number;
  byUser: { userId: string; name: string; count: number }[];
  byChannel: { channel: string; count: number }[];
  byHour: { hour: number; count: number }[];
  byDayHumanAI?: { date: string; human: number; ai: number }[];
  heatmap?: { day: number; hour: number; count: number }[];
  byConnectionStacked?: { name: string; data: number[] }[];
  byUserStacked?: { name: string; data: number[] }[];
  dayLabels?: string[];
  byStatus: { status: string; count: number }[];
  transferred: number;
  reopened: number;
  byOccurrence: { type: string; count: number }[];
}

export interface SalesMetrics {
  leadsGenerated: number;
  opportunitiesCreated: number;
  won: number;
  lost: number;
  totalNegotiation: number;
  totalConverted: number;
  conversionRate: number;
  avgTicket: number;
  totalSales?: number;
  totalValue?: number;
  newLeads?: number;
  recurrence?: number;
  funnel?: {
    totalConversations: number;
    totalNegotiations: number;
    closedSales: number;
    conversionFromNegotiations: number;
  };
  periodComparison?: {
    categories: string[];
    current: number[];
    previous: number[];
  };
  salesRanking?: { userId: string; name: string; count: number; value: number }[];
  byAgent: { name: string; value: number; count: number }[];
  byFunnel: { name: string; value: number }[];
  byStage: { name: string; count: number; value: number }[];
  byProduct: { name: string; count: number }[];
  lossReasons: { reason: string; count: number }[];
  avgTimeToConversion: number;
}

export interface AdsMetrics {
  leadsByOrigin: { origin: string; count: number }[];
  conversionsByCampaign: { campaign: string; count: number }[];
  costPerLead: number;
  costPerSale: number;
  attributedRevenue: number;
  estimatedROI: number;
  revenueMetaAds?: number;
  newAdsLeads?: number;
  chatsByDay?: { date: string; count: number }[];
  chatsByHour?: { hour: number; count: number }[];
  byChannel: { channel: string; leads: number; conversions: number; cost: number }[];
}

export interface AIMetrics {
  totalAIConversations: number;
  resolvedByAI: number;
  transferredToHuman: number;
  autoResolutionRate: number;
  topIntents: { intent: string; count: number }[];
  errors: number;
  avgResponseTime: number;
  creditsUsed: number;
  automationsExecuted: number;
  automationErrors: number;
  followUpsSent: number;
  autoClassifications: number;
}

export interface AnalysisMetrics {
  analyzedConversations: number;
  sentimentDistribution: { sentiment: string; count: number }[];
  satisfactionLevel: number;
  topReasons: { reason: string; count: number }[];
  topQuestions: { question: string; count: number }[];
  topComplaints: { complaint: string; count: number }[];
  qualityRanking: { userId: string; name: string; score: number }[];
  badServiceAlerts: number;
  npsScore?: number;
}

// ========== DISTRIBUTION ==========
export interface AutoDistribution {
  id: string;
  companyId: string;
  isActive: boolean;
  rule: 'round_robin' | 'least_busy' | 'by_schedule' | 'by_channel' | 'by_tag' | 'by_funnel' | 'by_wallet';
  exceptions: Record<string, any>;
}

// ========== EMBED WIDGET ==========
export interface WidgetConfig {
  id: string;
  companyId: string;
  isActive: boolean;
  channelId?: string;
  agentId?: string;
  aiAgentId?: string;
  initialMessage: string;
  offHoursMessage: string;
  embedCode: string;
  theme: Record<string, any>;
}
