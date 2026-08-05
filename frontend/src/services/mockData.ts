import type {
  Company, User, Contact, Tag, Classification, OccurrenceType,
  Conversation, Message, Funnel, Lead, Appointment, Professional,
  EventType, Campaign, Automation, AIAgent, KnowledgeBase, Intent,
  QuickMessage, Channel, License, Plan, AuditLog, AutoDistribution,
  DashboardData,
} from '../types';

export const mockCompany: Company = {
  id: 'company-1',
  name: 'TechServe Solutions',
  tradeName: 'TechServe',
  document: '12.345.678/0001-90',
  phone: '(11) 3456-7890',
  email: 'contato@techserve.com.br',
  website: 'https://techserve.com.br',
  address: 'Av. Paulista, 1000',
  city: 'São Paulo',
  state: 'SP',
  country: 'Brasil',
  status: 'active',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2026-06-01T10:00:00Z',
};

export const mockUsers: User[] = [
  { id: 'user-1', companyId: 'company-1', name: 'Carlos Almeida', email: 'carlos@techserve.com.br', phone: '(11) 99999-0001', role: 'admin', permissions: [], status: 'active', lastLogin: '2026-06-17T08:30:00Z', createdAt: '2025-01-15T10:00:00Z' },
  { id: 'user-2', companyId: 'company-1', name: 'Fernanda Lima', email: 'fernanda@techserve.com.br', phone: '(11) 99999-0002', role: 'supervisor', permissions: [], status: 'active', lastLogin: '2026-06-17T08:00:00Z', createdAt: '2025-02-10T10:00:00Z' },
  { id: 'user-3', companyId: 'company-1', name: 'Bruno Santos', email: 'bruno@techserve.com.br', phone: '(11) 99999-0003', role: 'agent', permissions: [], status: 'active', lastLogin: '2026-06-17T09:00:00Z', createdAt: '2025-03-01T10:00:00Z' },
  { id: 'user-4', companyId: 'company-1', name: 'Juliana Costa', email: 'juliana@techserve.com.br', phone: '(11) 99999-0004', role: 'agent', permissions: [], status: 'busy', lastLogin: '2026-06-17T09:15:00Z', createdAt: '2025-03-05T10:00:00Z' },
  { id: 'user-5', companyId: 'company-1', name: 'Rafael Oliveira', email: 'rafael@techserve.com.br', phone: '(11) 99999-0005', role: 'agent', permissions: [], status: 'away', lastLogin: '2026-06-17T07:45:00Z', createdAt: '2025-04-10T10:00:00Z' },
  { id: 'user-6', companyId: 'company-1', name: 'Patrícia Souza', email: 'patricia@techserve.com.br', phone: '(11) 99999-0006', role: 'agent', permissions: [], status: 'active', lastLogin: '2026-06-17T08:50:00Z', createdAt: '2025-05-01T10:00:00Z' },
  { id: 'user-7', companyId: 'company-1', name: 'Diego Martins', email: 'diego@techserve.com.br', phone: '(11) 99999-0007', role: 'commercial', permissions: [], status: 'active', lastLogin: '2026-06-17T08:20:00Z', createdAt: '2025-05-15T10:00:00Z' },
  { id: 'user-8', companyId: 'company-1', name: 'Camila Rocha', email: 'camila@techserve.com.br', phone: '(11) 99999-0008', role: 'professional', permissions: [], status: 'active', lastLogin: '2026-06-17T08:10:00Z', createdAt: '2025-06-01T10:00:00Z' },
];

export const mockTags: Tag[] = [
  { id: 'tag-1', companyId: 'company-1', name: 'Novo', color: '#2172DB' },
  { id: 'tag-2', companyId: 'company-1', name: 'VIP', color: '#FAAC50' },
  { id: 'tag-3', companyId: 'company-1', name: 'Urgente', color: '#EF4444' },
  { id: 'tag-4', companyId: 'company-1', name: 'Follow-up', color: '#0691A9' },
  { id: 'tag-5', companyId: 'company-1', name: 'Promoção', color: '#34B478' },
  { id: 'tag-6', companyId: 'company-1', name: 'Reclamação', color: '#F15094' },
  { id: 'tag-7', companyId: 'company-1', name: 'Indicação', color: '#9333EA' },
  { id: 'tag-8', companyId: 'company-1', name: 'Retorno', color: '#78736E' },
  { id: 'tag-9', companyId: 'company-1', name: 'Cancelamento', color: '#DC2626' },
  { id: 'tag-10', companyId: 'company-1', name: 'Potencial', color: '#059669' },
];

export const mockClassifications: Classification[] = [
  { id: 'class-1', companyId: 'company-1', name: 'Quente', color: '#EF4444' },
  { id: 'class-2', companyId: 'company-1', name: 'Morno', color: '#FAAC50' },
  { id: 'class-3', companyId: 'company-1', name: 'Frio', color: '#2172DB' },
  { id: 'class-4', companyId: 'company-1', name: 'Qualificado', color: '#34B478' },
  { id: 'class-5', companyId: 'company-1', name: 'Desqualificado', color: '#78736E' },
];

export const mockOccurrenceTypes: OccurrenceType[] = [
  { id: 'occ-1', companyId: 'company-1', name: 'Suporte Técnico', color: '#2172DB', isDeleted: false },
  { id: 'occ-2', companyId: 'company-1', name: 'Dúvida', color: '#0691A9', isDeleted: false },
  { id: 'occ-3', companyId: 'company-1', name: 'Reclamação', color: '#EF4444', isDeleted: false },
  { id: 'occ-4', companyId: 'company-1', name: 'Vendas', color: '#34B478', isDeleted: false },
  { id: 'occ-5', companyId: 'company-1', name: 'Outros', color: '#78736E', isDeleted: false },
];

const firstNames = ['Ana', 'João', 'Maria', 'Pedro', 'Lucas', 'Beatriz', 'Gabriel', 'Larissa', 'Mateus', 'Sofia', 'Rodrigo', 'Isabela', 'Felipe', 'Carolina', 'Thiago', 'Mariana', 'Gustavo', 'Letícia', 'André', 'Vanessa', 'Marcelo', 'Renata', 'Eduardo', 'Priscila', 'Vinícius'];
const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Lima', 'Carvalho', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Araújo', 'Ribeiro', 'Gomes'];
const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Recife', 'Fortaleza'];
const states = ['SP', 'RJ', 'MG', 'PR', 'RS', 'BA', 'PE', 'CE'];
const origins = ['WhatsApp', 'Instagram', 'Facebook', 'Site', 'Indicação', 'Anúncio Google', 'Anúncio Meta'];

export const mockContacts: Contact[] = Array.from({ length: 25 }, (_, i) => {
  const fn = firstNames[i % firstNames.length];
  const ln = lastNames[i % lastNames.length];
  const cityIdx = i % cities.length;
  return {
    id: `contact-${i + 1}`,
    companyId: 'company-1',
    name: `${fn} ${ln}`,
    phone: `(11) 9${String(8000 + i).padStart(4, '0')}-${String(1000 + i).padStart(4, '0')}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@email.com`,
    document: `${String(100 + i).padStart(3, '0')}.${String(200 + i).padStart(3, '0')}.${String(300 + i).padStart(3, '0')}-${String(i % 100).padStart(2, '0')}`,
    company: i % 3 === 0 ? `Empresa ${ln} Ltda` : undefined,
    position: i % 3 === 0 ? 'Gerente' : undefined,
    city: cities[cityIdx],
    state: states[cityIdx],
    country: 'Brasil',
    origin: origins[i % origins.length],
    channelOrigin: origins[i % 3],
    responsibleId: mockUsers[2 + (i % 4)].id,
    tags: [mockTags[i % mockTags.length], mockTags[(i + 3) % mockTags.length]],
    classification: mockClassifications[i % mockClassifications.length],
    notes: i % 4 === 0 ? 'Cliente interessado em planos premium.' : undefined,
    customFields: {},
    status: i % 10 === 9 ? 'archived' : 'active',
    lastInteraction: `2026-06-${String(17 - (i % 15)).padStart(2, '0')}T${String(8 + (i % 10)).padStart(2, '0')}:30:00Z`,
    createdAt: `2026-0${1 + (i % 5)}-${String(1 + (i % 27)).padStart(2, '0')}T10:00:00Z`,
    updatedAt: `2026-06-${String(17 - (i % 15)).padStart(2, '0')}T10:00:00Z`,
  };
});

const convStatuses: Conversation['status'][] = ['waiting', 'in_progress', 'ai_handling', 'finished', 'transferred', 'reopened', 'waiting', 'in_progress', 'finished', 'in_progress', 'ai_handling', 'waiting', 'finished', 'in_progress', 'lost'];

export const mockChannels: Channel[] = [
  { id: 'channel-1', companyId: 'company-1', type: 'whatsapp_unofficial', name: 'WhatsApp Vendas', status: 'connected', provider: 'evolution_api', credentials: {}, defaultAgentId: 'user-3', autoMessages: { greeting: 'Olá! Bem-vindo à TechServe. Como podemos ajudar?' }, lastSync: '2026-06-17T09:00:00Z', createdAt: '2025-06-01T10:00:00Z', updatedAt: '2026-06-17T09:00:00Z' },
  { id: 'channel-2', companyId: 'company-1', type: 'instagram', name: 'Instagram Oficial', status: 'disconnected', provider: 'meta', credentials: {}, autoMessages: {}, createdAt: '2025-07-01T10:00:00Z', updatedAt: '2026-06-10T10:00:00Z' },
  { id: 'channel-3', companyId: 'company-1', type: 'webchat', name: 'Chat do Site', status: 'connected', provider: 'webchat', credentials: {}, autoMessages: { greeting: 'Olá! Tire suas dúvidas aqui.' }, lastSync: '2026-06-17T09:30:00Z', createdAt: '2025-08-01T10:00:00Z', updatedAt: '2026-06-17T09:30:00Z' },
];

export const mockConversations: Conversation[] = Array.from({ length: 15 }, (_, i) => {
  const contact = mockContacts[i];
  const status = convStatuses[i];
  const isAI = status === 'ai_handling';
  return {
    id: `conv-${i + 1}`,
    companyId: 'company-1',
    contactId: contact.id,
    contact,
    channelId: mockChannels[i % 3].id,
    channel: mockChannels[i % 3],
    agentId: isAI || status === 'waiting' ? undefined : mockUsers[2 + (i % 4)].id,
    agent: isAI || status === 'waiting' ? undefined : mockUsers[2 + (i % 4)],
    status,
    tags: [mockTags[i % mockTags.length]],
    classification: mockClassifications[i % mockClassifications.length],
    origin: origins[i % origins.length],
    isFavorite: i % 5 === 0,
    isAI,
    aiAgentId: isAI ? 'agent-1' : undefined,
    waitingSince: status === 'waiting' ? `2026-06-17T0${8 + (i % 2)}:${String(10 + i).padStart(2, '0')}:00Z` : undefined,
    startedAt: `2026-06-17T0${7 + (i % 3)}:00:00Z`,
    finishedAt: status === 'finished' ? `2026-06-17T0${9 + (i % 2)}:00:00Z` : undefined,
    occurrenceType: status === 'finished' ? mockOccurrenceTypes[i % mockOccurrenceTypes.length] : undefined,
    metadata: {},
    createdAt: `2026-06-17T0${7 + (i % 3)}:00:00Z`,
    updatedAt: `2026-06-17T0${9 + (i % 2)}:00:00Z`,
  };
});

const sampleMsgs = [
  'Olá, gostaria de saber mais sobre os planos.',
  'Claro! Temos três planos disponíveis. Qual seu interesse?',
  'Estou procurando algo para minha empresa.',
  'Perfeito! Para empresas recomendo o plano Business.',
  'Qual o valor?',
  'O plano Business custa R$ 299/mês com até 10 usuários.',
  'Vou pensar e retorno.',
  'Sem problemas! Fico à disposição.',
];

export const mockMessages: Message[] = [];
mockConversations.forEach((conv, ci) => {
  const count = 3 + (ci % 5);
  for (let m = 0; m < count; m++) {
    const fromContact = m % 2 === 0;
    mockMessages.push({
      id: `msg-${ci}-${m}`,
      conversationId: conv.id,
      senderId: fromContact ? conv.contactId : conv.agentId,
      senderType: fromContact ? 'contact' : conv.isAI ? 'ai' : 'user',
      type: 'text',
      content: sampleMsgs[m % sampleMsgs.length],
      isRead: true,
      createdAt: `2026-06-17T0${7 + (ci % 3)}:${String(10 + m * 3).padStart(2, '0')}:00Z`,
    });
  }
});
mockConversations.forEach((conv) => {
  const msgs = mockMessages.filter((m) => m.conversationId === conv.id);
  conv.lastMessage = msgs[msgs.length - 1];
});

export const mockFunnels: Funnel[] = [
  {
    id: 'funnel-1', companyId: 'company-1', name: 'Vendas Principal', description: 'Funil comercial principal', isDefault: true, status: 'active', createdAt: '2025-06-01T10:00:00Z',
    stages: [
      { id: 'stage-1', funnelId: 'funnel-1', name: 'Novo Lead', color: '#2172DB', order: 0 },
      { id: 'stage-2', funnelId: 'funnel-1', name: 'Qualificação', color: '#0691A9', order: 1 },
      { id: 'stage-3', funnelId: 'funnel-1', name: 'Proposta', color: '#FAAC50', order: 2 },
      { id: 'stage-4', funnelId: 'funnel-1', name: 'Negociação', color: '#9333EA', order: 3 },
      { id: 'stage-5', funnelId: 'funnel-1', name: 'Fechamento', color: '#F15094', order: 4 },
      { id: 'stage-6', funnelId: 'funnel-1', name: 'Ganho', color: '#34B478', order: 5 },
      { id: 'stage-7', funnelId: 'funnel-1', name: 'Perdido', color: '#EF4444', order: 6 },
    ],
  },
  {
    id: 'funnel-2', companyId: 'company-1', name: 'Pós-Venda', description: 'Acompanhamento de clientes', isDefault: false, status: 'active', createdAt: '2025-07-01T10:00:00Z',
    stages: [
      { id: 'stage-8', funnelId: 'funnel-2', name: 'Onboarding', color: '#2172DB', order: 0 },
      { id: 'stage-9', funnelId: 'funnel-2', name: 'Implantação', color: '#0691A9', order: 1 },
      { id: 'stage-10', funnelId: 'funnel-2', name: 'Treinamento', color: '#FAAC50', order: 2 },
      { id: 'stage-11', funnelId: 'funnel-2', name: 'Acompanhamento', color: '#9333EA', order: 3 },
      { id: 'stage-12', funnelId: 'funnel-2', name: 'Concluído', color: '#34B478', order: 4 },
    ],
  },
];

const products = ['Plano Starter', 'Plano Business', 'Plano Enterprise', 'Consultoria', 'Integração API'];

export const mockLeads: Lead[] = Array.from({ length: 20 }, (_, i) => {
  const stageIdx = i % 7;
  const status: Lead['status'] = stageIdx === 5 ? 'won' : stageIdx === 6 ? 'lost' : 'open';
  const contact = mockContacts[i % mockContacts.length];
  return {
    id: `lead-${i + 1}`,
    companyId: 'company-1',
    funnelId: 'funnel-1',
    stageId: `stage-${stageIdx + 1}`,
    contactId: contact.id,
    contact,
    responsibleId: mockUsers[6].id,
    responsible: mockUsers[6],
    title: `${contact.name} - ${products[i % products.length]}`,
    value: 500 + (i * 350),
    product: products[i % products.length],
    origin: origins[i % origins.length],
    tags: [mockTags[i % mockTags.length]],
    classification: mockClassifications[i % mockClassifications.length],
    expectedCloseDate: `2026-0${6 + (i % 3)}-${String(10 + (i % 18)).padStart(2, '0')}T10:00:00Z`,
    status,
    lossReason: status === 'lost' ? ['Preço alto', 'Sem orçamento', 'Escolheu concorrente'][i % 3] : undefined,
    notes: i % 3 === 0 ? 'Cliente demonstrou bastante interesse.' : undefined,
    activities: [],
    lastMovedAt: `2026-06-${String(10 + (i % 7)).padStart(2, '0')}T10:00:00Z`,
    wonAt: status === 'won' ? `2026-06-${String(10 + (i % 7)).padStart(2, '0')}T10:00:00Z` : undefined,
    lostAt: status === 'lost' ? `2026-06-${String(10 + (i % 7)).padStart(2, '0')}T10:00:00Z` : undefined,
    createdAt: `2026-05-${String(1 + (i % 27)).padStart(2, '0')}T10:00:00Z`,
    updatedAt: `2026-06-${String(10 + (i % 7)).padStart(2, '0')}T10:00:00Z`,
  };
});

export const mockProfessionals: Professional[] = [
  { id: 'prof-1', companyId: 'company-1', userId: 'user-8', name: 'Camila Rocha', specialty: 'Consultor de Atendimento', availability: [{ dayOfWeek: 1, startTime: '08:00', endTime: '18:00' }], status: 'active' },
  { id: 'prof-2', companyId: 'company-1', name: 'Dr. Ricardo Mendes', specialty: 'Especialista Técnico', availability: [{ dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }], status: 'active' },
  { id: 'prof-3', companyId: 'company-1', name: 'Aline Ferreira', specialty: 'Onboarding', availability: [{ dayOfWeek: 3, startTime: '08:00', endTime: '16:00' }], status: 'active' },
];

export const mockEventTypes: EventType[] = [
  { id: 'evt-1', companyId: 'company-1', name: 'Reunião Comercial', duration: 60, color: '#2172DB', status: 'active' },
  { id: 'evt-2', companyId: 'company-1', name: 'Demonstração', duration: 45, color: '#34B478', status: 'active' },
  { id: 'evt-3', companyId: 'company-1', name: 'Suporte Técnico', duration: 30, color: '#FAAC50', status: 'active' },
  { id: 'evt-4', companyId: 'company-1', name: 'Onboarding', duration: 90, color: '#9333EA', status: 'active' },
];

export const mockAppointments: Appointment[] = Array.from({ length: 10 }, (_, i) => {
  const day = 15 + (i % 7);
  const hour = 8 + (i % 8);
  const contact = mockContacts[i];
  const statuses: Appointment['status'][] = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'waiting_confirmation', 'scheduled', 'confirmed', 'completed', 'scheduled'];
  return {
    id: `appt-${i + 1}`,
    companyId: 'company-1',
    contactId: contact.id,
    contact,
    professionalId: mockProfessionals[i % 3].id,
    professional: mockProfessionals[i % 3],
    eventTypeId: mockEventTypes[i % 4].id,
    eventType: mockEventTypes[i % 4],
    title: `${mockEventTypes[i % 4].name} - ${contact.name}`,
    startDate: `2026-06-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`,
    endDate: `2026-06-${String(day).padStart(2, '0')}T${String(hour + 1).padStart(2, '0')}:00:00`,
    location: i % 2 === 0 ? 'Sala 101' : 'Online - Google Meet',
    notes: i % 3 === 0 ? 'Levar proposta comercial.' : undefined,
    status: statuses[i],
    color: mockEventTypes[i % 4].color,
    isRecurring: false,
    notifyWhatsApp: true,
    reminders: [],
    createdAt: '2026-06-10T10:00:00Z',
    updatedAt: '2026-06-15T10:00:00Z',
  };
});

export const mockCampaigns: Campaign[] = [
  { id: 'camp-1', companyId: 'company-1', name: 'Promoção Junho', channelId: 'channel-1', message: 'Olá {nome}! Aproveite 20% OFF em todos os planos até o fim do mês!', variables: ['nome'], audienceType: 'tag', audienceCriteria: { tagId: 'tag-5' }, audienceCount: 150, status: 'completed', startedAt: '2026-06-01T10:00:00Z', completedAt: '2026-06-01T12:00:00Z', metrics: { total: 150, sent: 150, delivered: 142, read: 98, replied: 23, failed: 8, leadsCreated: 12 }, createdAt: '2026-05-30T10:00:00Z', updatedAt: '2026-06-01T12:00:00Z' },
  { id: 'camp-2', companyId: 'company-1', name: 'Reativação Inativos', channelId: 'channel-1', message: 'Oi {nome}, sentimos sua falta! Que tal voltar com um desconto especial?', variables: ['nome'], audienceType: 'inactivity', audienceCriteria: { days: 30 }, audienceCount: 85, status: 'sending', startedAt: '2026-06-17T08:00:00Z', metrics: { total: 85, sent: 42, delivered: 38, read: 20, replied: 5, failed: 4, leadsCreated: 3 }, createdAt: '2026-06-16T10:00:00Z', updatedAt: '2026-06-17T08:00:00Z' },
  { id: 'camp-3', companyId: 'company-1', name: 'Lançamento Enterprise', channelId: 'channel-1', message: 'Novidade! Conheça nosso plano Enterprise com recursos exclusivos.', variables: [], audienceType: 'classification', audienceCriteria: { classificationId: 'class-1' }, audienceCount: 60, status: 'scheduled', scheduledAt: '2026-06-20T09:00:00Z', metrics: { total: 60, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, leadsCreated: 0 }, createdAt: '2026-06-15T10:00:00Z', updatedAt: '2026-06-15T10:00:00Z' },
  { id: 'camp-4', companyId: 'company-1', name: 'Pesquisa Satisfação', channelId: 'channel-1', message: 'Olá! Como você avalia nosso atendimento? Responda de 0 a 10.', variables: [], audienceType: 'funnel', audienceCriteria: { funnelId: 'funnel-2' }, audienceCount: 40, status: 'draft', metrics: { total: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, leadsCreated: 0 }, createdAt: '2026-06-14T10:00:00Z', updatedAt: '2026-06-14T10:00:00Z' },
  { id: 'camp-5', companyId: 'company-1', name: 'Black Friday Antecipada', channelId: 'channel-1', message: 'Antecipamos a Black Friday para você! Descontos de até 50%.', variables: [], audienceType: 'manual', audienceCriteria: {}, audienceCount: 200, status: 'paused', startedAt: '2026-06-10T10:00:00Z', metrics: { total: 200, sent: 120, delivered: 115, read: 80, replied: 18, failed: 5, leadsCreated: 9 }, createdAt: '2026-06-08T10:00:00Z', updatedAt: '2026-06-10T11:00:00Z' },
];

export const mockAutomations: Automation[] = [
  {
    id: 'auto-1', companyId: 'company-1', name: 'Boas-vindas WhatsApp', description: 'Fluxo de saudação automática para novos contatos', channelId: 'channel-1', isActive: true,
    executionCount: 342, errorCount: 3, lastExecutedAt: '2026-06-17T09:00:00Z', createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-06-15T10:00:00Z',
    blocks: [
      { id: 'b1', automationId: 'auto-1', type: 'start', label: 'INÍCIO', config: { trigger: 'new_conversation' }, position: { x: 250, y: 50 } },
      { id: 'b2', automationId: 'auto-1', type: 'message', label: 'MENSAGEM INICIAL', config: { text: 'Olá! Bem-vindo à TechServe. Como posso ajudar?' }, position: { x: 250, y: 220 } },
      { id: 'b3', automationId: 'auto-1', type: 'condition', label: 'CONDIÇÕES', config: { field: 'time_of_day', operator: 'equals', value: 'business_hours' }, position: { x: 550, y: 220 } },
      { id: 'b4', automationId: 'auto-1', type: 'crm_action', label: 'AÇÕES CRM', config: { action: 'create_lead', funnelId: 'funnel-1', stageId: 'stage-1' }, position: { x: 400, y: 420 } },
    ],
    connections: [
      { id: 'c1', automationId: 'auto-1', sourceBlockId: 'b1', targetBlockId: 'b2' },
      { id: 'c2', automationId: 'auto-1', sourceBlockId: 'b2', targetBlockId: 'b4' },
      { id: 'c3', automationId: 'auto-1', sourceBlockId: 'b3', targetBlockId: 'b4', sourceHandle: 'yes' },
    ],
  },
  { id: 'auto-2', companyId: 'company-1', name: 'Follow-up Sem Resposta', description: 'Reengaja contatos sem resposta após 24h', channelId: 'channel-1', isActive: false, executionCount: 89, errorCount: 1, lastExecutedAt: '2026-06-14T10:00:00Z', createdAt: '2026-05-10T10:00:00Z', updatedAt: '2026-06-14T10:00:00Z', blocks: [{ id: 'b1', automationId: 'auto-2', type: 'start', label: 'INÍCIO', config: { trigger: 'no_response', delayHours: 24 }, position: { x: 250, y: 50 } }], connections: [] },
  { id: 'auto-3', companyId: 'company-1', name: 'Qualificação por Menu', description: 'Menu de opções para direcionar atendimento', channelId: 'channel-3', isActive: true, executionCount: 156, errorCount: 0, lastExecutedAt: '2026-06-17T08:30:00Z', createdAt: '2026-05-20T10:00:00Z', updatedAt: '2026-06-16T10:00:00Z', blocks: [{ id: 'b1', automationId: 'auto-3', type: 'start', label: 'INÍCIO', config: { trigger: 'new_message' }, position: { x: 250, y: 50 } }], connections: [] },
];

export const mockAIAgents: AIAgent[] = [
  { id: 'agent-1', companyId: 'company-1', name: 'Assistente Comercial', objective: 'Qualificar leads e responder dúvidas sobre planos', description: 'Agente focado em vendas e qualificação de leads', behavior: 'Cordial, objetivo e prestativo', tone: 'Profissional e amigável', rules: 'Sempre coletar nome e empresa antes de prosseguir', instructions: 'Apresentar os 3 planos quando perguntado sobre preços', transferRules: 'Transferir para humano quando o cliente pedir desconto especial', channels: ['channel-1'], limitPerDay: 500, greetingMessage: 'Olá! Sou o assistente virtual da TechServe. Como posso ajudar?', offHoursMessage: 'No momento estamos fora do horário. Retornaremos em breve!', transferMessage: 'Vou transferir você para um de nossos especialistas.', collectFields: ['nome', 'empresa', 'email'], trainingStatus: 'ready', isActive: true, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-06-10T10:00:00Z' },
  { id: 'agent-2', companyId: 'company-1', name: 'Suporte Técnico IA', objective: 'Resolver dúvidas técnicas básicas', description: 'Agente de primeiro nível de suporte', behavior: 'Paciente e técnico', tone: 'Didático', channels: ['channel-3'], trainingStatus: 'training', isActive: false, createdAt: '2026-05-15T10:00:00Z', updatedAt: '2026-06-12T10:00:00Z' },
];

export const mockKnowledgeBase: KnowledgeBase[] = [
  { id: 'kb-1', agentId: 'agent-1', type: 'faq', category: 'Planos', title: 'Quais são os planos disponíveis?', content: 'Temos 3 planos: Starter (R$99), Business (R$299) e Enterprise (sob consulta).', isActive: true, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-01T10:00:00Z' },
  { id: 'kb-2', agentId: 'agent-1', type: 'faq', category: 'Planos', title: 'Posso trocar de plano?', content: 'Sim, você pode fazer upgrade ou downgrade a qualquer momento.', isActive: true, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-01T10:00:00Z' },
  { id: 'kb-3', agentId: 'agent-1', type: 'procedure', category: 'Vendas', title: 'Processo de contratação', content: '1. Escolher plano. 2. Preencher dados. 3. Pagamento. 4. Ativação imediata.', isActive: true, createdAt: '2026-05-02T10:00:00Z', updatedAt: '2026-05-02T10:00:00Z' },
  { id: 'kb-4', agentId: 'agent-1', type: 'text', category: 'Institucional', title: 'Sobre a empresa', content: 'A TechServe é líder em soluções de atendimento inteligente.', isActive: true, createdAt: '2026-05-02T10:00:00Z', updatedAt: '2026-05-02T10:00:00Z' },
  { id: 'kb-5', agentId: 'agent-1', type: 'faq', category: 'Pagamento', title: 'Formas de pagamento', content: 'Aceitamos cartão de crédito, boleto e PIX.', isActive: true, createdAt: '2026-05-03T10:00:00Z', updatedAt: '2026-05-03T10:00:00Z' },
  { id: 'kb-6', agentId: 'agent-2', type: 'procedure', category: 'Suporte', title: 'Reset de senha', content: 'Acesse Configurações > Segurança > Redefinir senha.', isActive: true, createdAt: '2026-05-15T10:00:00Z', updatedAt: '2026-05-15T10:00:00Z' },
  { id: 'kb-7', agentId: 'agent-2', type: 'faq', category: 'Suporte', title: 'Sistema lento', content: 'Limpe o cache do navegador e verifique sua conexão.', isActive: true, createdAt: '2026-05-15T10:00:00Z', updatedAt: '2026-05-15T10:00:00Z' },
  { id: 'kb-8', agentId: 'agent-1', type: 'url', category: 'Recursos', title: 'Documentação API', content: 'Documentação completa da API', url: 'https://docs.techserve.com.br', isActive: true, createdAt: '2026-05-04T10:00:00Z', updatedAt: '2026-05-04T10:00:00Z' },
];

export const mockIntents: Intent[] = [
  { id: 'intent-1', agentId: 'agent-1', name: 'Consultar Preços', description: 'Cliente quer saber valores', examples: ['quanto custa', 'qual o preço', 'valores dos planos', 'quanto é'], action: 'send_pricing', transferToHuman: false, isActive: true, createdAt: '2026-05-01T10:00:00Z' },
  { id: 'intent-2', agentId: 'agent-1', name: 'Falar com Humano', description: 'Cliente quer atendente humano', examples: ['quero falar com atendente', 'me transfere', 'pessoa real'], action: 'transfer', transferToHuman: true, isActive: true, createdAt: '2026-05-01T10:00:00Z' },
  { id: 'intent-3', agentId: 'agent-1', name: 'Agendar Demonstração', description: 'Cliente quer agendar demo', examples: ['quero uma demonstração', 'agendar demo', 'ver o sistema'], action: 'schedule', transferToHuman: false, isActive: true, createdAt: '2026-05-02T10:00:00Z' },
  { id: 'intent-4', agentId: 'agent-1', name: 'Cancelar Serviço', description: 'Cliente quer cancelar', examples: ['quero cancelar', 'cancelar assinatura', 'parar o serviço'], action: 'transfer', transferToHuman: true, isActive: true, createdAt: '2026-05-03T10:00:00Z' },
  { id: 'intent-5', agentId: 'agent-2', name: 'Problema Técnico', description: 'Cliente relata problema', examples: ['não funciona', 'deu erro', 'está com problema'], action: 'troubleshoot', transferToHuman: false, isActive: true, createdAt: '2026-05-15T10:00:00Z' },
  { id: 'intent-6', agentId: 'agent-1', name: 'Saudação', description: 'Cliente cumprimenta', examples: ['oi', 'olá', 'bom dia', 'boa tarde'], action: 'greet', transferToHuman: false, isActive: true, createdAt: '2026-05-01T10:00:00Z' },
];

export const mockQuickMessages: QuickMessage[] = [
  { id: 'qm-1', companyId: 'company-1', title: 'Saudação', category: 'Geral', shortcut: '/oi', message: 'Olá! Como posso ajudar você hoje?', messageType: 'text', scope: 'global' },
  { id: 'qm-2', companyId: 'company-1', title: 'Agradecimento', category: 'Geral', shortcut: '/obrigado', message: 'Obrigado pelo contato! Tenha um ótimo dia.', messageType: 'text', scope: 'global' },
  { id: 'qm-3', companyId: 'company-1', title: 'Planos', category: 'Vendas', shortcut: '/planos', message: 'Temos 3 planos: Starter, Business e Enterprise. Qual seu interesse?', messageType: 'text', scope: 'global' },
  { id: 'qm-4', companyId: 'company-1', title: 'Horário', category: 'Geral', shortcut: '/horario', message: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.', messageType: 'text', scope: 'global' },
  { id: 'qm-5', companyId: 'company-1', title: 'Aguarde', category: 'Suporte', shortcut: '/aguarde', message: 'Um momento, por favor. Já vou verificar isso para você.', messageType: 'text', scope: 'global' },
  { id: 'qm-6', companyId: 'company-1', title: 'PIX Pagamento', category: 'Financeiro', shortcut: '/pix', message: 'Segue a chave PIX para pagamento:', messageType: 'pix', scope: 'global' },
  { id: 'qm-7', companyId: 'company-1', title: 'Menu Opções', category: 'Vendas', shortcut: '/menu', message: 'Escolha uma opção:', messageType: 'list', scope: 'global' },
  { id: 'qm-8', companyId: 'company-1', title: 'Despedida', category: 'Geral', shortcut: '/tchau', message: 'Foi um prazer atender você! Até logo.', messageType: 'text', scope: 'global' },
  { id: 'qm-9', companyId: 'company-1', title: 'Localização', category: 'Geral', shortcut: '/local', message: 'Estamos localizados na Av. Paulista, 1000.', messageType: 'location', scope: 'global' },
  { id: 'qm-10', companyId: 'company-1', title: 'Proposta', category: 'Vendas', shortcut: '/proposta', message: 'Segue nossa proposta comercial em anexo.', messageType: 'attachment', scope: 'personal', userId: 'user-7' },
];

export const mockPlan: Plan = {
  id: 'plan-business', name: 'Business', maxUsers: 10, maxChannels: 5, maxAgents: 3, maxContacts: 10000, maxCampaigns: 50, aiCredits: 5000, price: 299,
  features: ['Atendimento omnichannel', 'CRM completo', 'Automações ilimitadas', 'Agentes de IA', 'Relatórios avançados'],
};

export const mockLicense: License = {
  id: 'license-1', companyId: 'company-1', planId: 'plan-business', plan: mockPlan, status: 'active', startDate: '2025-06-01T00:00:00Z', endDate: '2026-12-31T23:59:59Z', creditsTotal: 5000, creditsUsed: 2340,
};

export const mockAutoDistribution: AutoDistribution = {
  id: 'dist-1', companyId: 'company-1', isActive: true, rule: 'round_robin', exceptions: {},
};

const auditActions = ['Login realizado', 'Contato criado', 'Lead movido no funil', 'Campanha enviada', 'Conversa finalizada', 'Automação criada', 'Usuário editado', 'Tag aplicada', 'Canal conectado', 'Agente IA atualizado', 'Permissão alterada', 'Conversa transferida', 'Agendamento criado', 'Lead ganho', 'Licença atualizada'];
const auditModules = ['Auth', 'Contatos', 'CRM', 'Campanhas', 'Chat', 'Automações', 'Usuários', 'Chat', 'Conexões', 'IA', 'Usuários', 'Chat', 'Agenda', 'CRM', 'Licença'];

export const mockAuditLogs: AuditLog[] = Array.from({ length: 20 }, (_, i) => ({
  id: `audit-${i + 1}`,
  companyId: 'company-1',
  userId: mockUsers[i % mockUsers.length].id,
  user: mockUsers[i % mockUsers.length],
  action: auditActions[i % auditActions.length],
  module: auditModules[i % auditModules.length],
  entityType: auditModules[i % auditModules.length],
  entityId: `entity-${i}`,
  details: {},
  ipAddress: `192.168.1.${10 + i}`,
  createdAt: `2026-06-17T${String(9 - (i % 9)).padStart(2, '0')}:${String(10 + i * 2).padStart(2, '0')}:00Z`,
}));

export const mockDashboardData: DashboardData = {
  productivity: {
    totalConversations: 1284, waiting: 12, inProgress: 34, finished: 1238,
    avgFirstResponse: 142, avgHandlingTime: 680, avgResolutionTime: 1420, occupancyRate: 78,
    byUser: mockUsers.slice(2, 6).map((u, i) => ({ userId: u.id, name: u.name, count: 320 - i * 45 })),
    byChannel: [{ channel: 'WhatsApp', count: 890 }, { channel: 'Instagram', count: 234 }, { channel: 'Webchat', count: 160 }],
    byHour: Array.from({ length: 12 }, (_, i) => ({ hour: 8 + i, count: Math.round(40 + Math.sin(i) * 30 + i * 5) })),
    byStatus: [{ status: 'Finalizado', count: 1238 }, { status: 'Em andamento', count: 34 }, { status: 'Aguardando', count: 12 }],
    transferred: 87, reopened: 23,
    byOccurrence: mockOccurrenceTypes.map((o, i) => ({ type: o.name, count: 250 - i * 40 })),
  },
  sales: {
    leadsGenerated: 456, opportunitiesCreated: 312, won: 89, lost: 67,
    totalNegotiation: 487500, totalConverted: 234800, conversionRate: 28.5, avgTicket: 2638,
    byAgent: [{ name: 'Diego Martins', value: 145000, count: 52 }, { name: 'Bruno Santos', value: 89800, count: 37 }],
    byFunnel: [{ name: 'Vendas Principal', value: 380000 }, { name: 'Pós-Venda', value: 107500 }],
    byStage: mockFunnels[0].stages.slice(0, 5).map((s, i) => ({ name: s.name, count: 80 - i * 12, value: 120000 - i * 18000 })),
    byProduct: products.map((p, i) => ({ name: p, count: 45 - i * 7 })),
    lossReasons: [{ reason: 'Preço alto', count: 28 }, { reason: 'Sem orçamento', count: 21 }, { reason: 'Escolheu concorrente', count: 18 }],
    avgTimeToConversion: 7.4,
  },
  ads: {
    leadsByOrigin: origins.map((o, i) => ({ origin: o, count: 120 - i * 15 })),
    conversionsByCampaign: mockCampaigns.map((c, i) => ({ campaign: c.name, count: 25 - i * 4 })),
    costPerLead: 12.5, costPerSale: 89.3, attributedRevenue: 187400, estimatedROI: 340,
    byChannel: [{ channel: 'Google Ads', leads: 234, conversions: 56, cost: 4200 }, { channel: 'Meta Ads', leads: 189, conversions: 41, cost: 3100 }],
  },
  ai: {
    totalAIConversations: 567, resolvedByAI: 389, transferredToHuman: 178, autoResolutionRate: 68.6,
    topIntents: mockIntents.map((it, i) => ({ intent: it.name, count: 145 - i * 20 })),
    errors: 12, avgResponseTime: 2.3, creditsUsed: 2340, automationsExecuted: 587, automationErrors: 4, followUpsSent: 234, autoClassifications: 412,
  },
  analysis: {
    analyzedConversations: 1238,
    sentimentDistribution: [{ sentiment: 'Positivo', count: 745 }, { sentiment: 'Neutro', count: 389 }, { sentiment: 'Negativo', count: 104 }],
    satisfactionLevel: 87,
    topReasons: [{ reason: 'Dúvida sobre planos', count: 234 }, { reason: 'Suporte técnico', count: 189 }, { reason: 'Negociação', count: 156 }],
    topQuestions: [{ question: 'Quanto custa?', count: 178 }, { question: 'Como funciona?', count: 145 }],
    topComplaints: [{ complaint: 'Demora no atendimento', count: 34 }, { complaint: 'Sistema lento', count: 21 }],
    qualityRanking: mockUsers.slice(2, 6).map((u, i) => ({ userId: u.id, name: u.name, score: 95 - i * 6 })),
    badServiceAlerts: 8, npsScore: 72,
  },
};
