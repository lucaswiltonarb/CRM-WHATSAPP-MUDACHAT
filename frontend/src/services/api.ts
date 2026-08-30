import type { DashboardData, User } from '../types';
import { listStoreOrdersViaBackend } from './backend';

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_ADMIN_USER: User = {
  id: 'user-admin-techserve',
  companyId: 'company-1',
  name: 'TechServe Admin',
  email: 'contato@techserve.com.br',
  role: 'admin',
  permissions: [],
  status: 'active',
  createdAt: new Date().toISOString(),
};

const DEFAULT_COMPANY = {
  id: 'company-1',
  name: 'TechServe',
  tradeName: 'TechServe',
  email: 'contato@techserve.com.br',
  status: 'active' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const createEmptyDashboard = (): DashboardData => ({
  productivity: {
    totalConversations: 0,
    waiting: 0,
    inProgress: 0,
    finished: 0,
    pendingReply: 0,
    customerWaiting: 0,
    avgFirstResponse: 0,
    avgHandlingTime: 0,
    avgResolutionTime: 0,
    occupancyRate: 0,
    byUser: [],
    byChannel: [],
    byHour: [],
    byDayHumanAI: [],
    heatmap: [],
    byConnectionStacked: [],
    byUserStacked: [],
    dayLabels: [],
    byStatus: [],
    transferred: 0,
    reopened: 0,
    byOccurrence: [],
  },
  sales: {
    leadsGenerated: 0,
    opportunitiesCreated: 0,
    won: 0,
    lost: 0,
    totalNegotiation: 0,
    totalConverted: 0,
    conversionRate: 0,
    avgTicket: 0,
    totalSales: 0,
    totalValue: 0,
    newLeads: 0,
    recurrence: 0,
    funnel: { totalConversations: 0, totalNegotiations: 0, closedSales: 0, conversionFromNegotiations: 0 },
    periodComparison: { categories: [], current: [], previous: [] },
    salesRanking: [],
    byAgent: [],
    byFunnel: [],
    byStage: [],
    byProduct: [],
    lossReasons: [],
    avgTimeToConversion: 0,
  },
  ads: {
    leadsByOrigin: [],
    conversionsByCampaign: [],
    costPerLead: 0,
    costPerSale: 0,
    attributedRevenue: 0,
    estimatedROI: 0,
    revenueMetaAds: 0,
    newAdsLeads: 0,
    chatsByDay: [],
    chatsByHour: [],
    byChannel: [],
  },
  ai: {
    totalAIConversations: 0,
    resolvedByAI: 0,
    transferredToHuman: 0,
    autoResolutionRate: 0,
    topIntents: [],
    errors: 0,
    avgResponseTime: 0,
    creditsUsed: 0,
    automationsExecuted: 0,
    automationErrors: 0,
    followUpsSent: 0,
    autoClassifications: 0,
  },
  analysis: {
    analyzedConversations: 0,
    sentimentDistribution: [],
    satisfactionLevel: 0,
    topReasons: [],
    topQuestions: [],
    topComplaints: [],
    qualityRanking: [],
    badServiceAlerts: 0,
    npsScore: 0,
  },
});
void createEmptyDashboard;

const DEFAULT_LICENSE = {
  status: 'active',
  expiresAt: null,
  usersUsed: 1,
  usersLimit: 1,
  channelsUsed: 0,
  channelsLimit: 0,
  agentsUsed: 0,
  agentsLimit: 0,
  contactsUsed: 0,
  contactsLimit: 0,
  creditsAvailable: 0,
  creditsUsed: 0,
  history: [],
};

const DEFAULT_PLAN = { id: 'plan-base', name: 'Base', price: 0, limits: {} };

// LocalStorage persistence layer (real data only).
const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(`db_${key}`);
      if (raw) return JSON.parse(raw) as T;
    } catch {}
    return fallback;
  },
  set<T>(key: string, value: T): T {
    localStorage.setItem(`db_${key}`, JSON.stringify(value));
    return value;
  },
};

const ensureRealDbSeed = () => {
  if (localStorage.getItem('db_seeded_v2_real_data') === '1') return;

  const keep = {
    authToken: localStorage.getItem('auth_token'),
    authUser: localStorage.getItem('auth_user'),
  };

  const keys = Object.keys(localStorage);
  keys.forEach((k) => {
    if (k.startsWith('db_') || k.startsWith('followup_') || k === 'crm_stage_order') {
      localStorage.removeItem(k);
    }
  });

  store.set('users', [DEFAULT_ADMIN_USER]);
  store.set('company', DEFAULT_COMPANY);
  store.set('channels', []);
  store.set('contacts', []);
  store.set('conversations', []);
  store.set('funnels', []);
  store.set('leads', []);
  store.set('appointments', []);
  store.set('professionals', []);
  store.set('eventTypes', []);
  store.set('timeBlocks', []);
  store.set('scheduleReminderSettings', {
    enableConfirmationRequest: false,
    confirmationMessage: 'Por favor, confirme sua presenÃ§a respondendo:\n1 - Confirmar\n2 - Remarcar\n3 - Cancelar',
    reminder24h: {
      enabled: true,
      minutesBefore: 1440,
      message: 'OlÃ¡ {cliente}! Lembre-se: vocÃª tem um agendamento amanhÃ£ Ã s {hora} com {profissional}. {empresa}',
    },
    reminder2h: {
      enabled: true,
      minutesBefore: 120,
      message: 'OlÃ¡ {cliente}! Seu agendamento estÃ¡ prÃ³ximo: hoje Ã s {hora} com {profissional}. {empresa}',
    },
    reminder30m: {
      enabled: true,
      minutesBefore: 30,
      message: 'OlÃ¡ {cliente}! Seu agendamento comeÃ§a em 30 minutos Ã s {hora}. {empresa}',
    },
    feedbackReminder: {
      enabled: false,
      hoursAfter: 2,
      message: 'OlÃ¡ {cliente}! Esperamos que tenha gostado do atendimento. Sua opiniÃ£o Ã© muito importante para nÃ³s! {empresa}',
    },
  });
  store.set('campaigns', []);
  store.set('automations', []);
  store.set('aiAgents', []);
  store.set('knowledgeBase', []);
  store.set('intents', []);
  store.set('tags', []);
  store.set('classifications', []);
  store.set('occurrenceTypes', []);
  store.set('quickMessages', []);
  store.set('distribution', { enabled: false, strategy: 'round_robin', users: [] });
  store.set('audit', []);
  store.set('dashboard_data', null);
  store.set('license', DEFAULT_LICENSE);
  store.set('plan', DEFAULT_PLAN);

  if (keep.authToken) localStorage.setItem('auth_token', keep.authToken);
  if (keep.authUser) localStorage.setItem('auth_user', keep.authUser);
  localStorage.setItem('db_seeded_v2_real_data', '1');
};

ensureRealDbSeed();

const uid = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const readStoreOrders = () => {
  try {
    const raw = localStorage.getItem('db_store_orders');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const api = {
  auth: {
    async login(email: string, _password: string) {
      await delay();
      const users = store.get<User[]>('users', [DEFAULT_ADMIN_USER]);
      const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || users[0];
      const token = `mock-token-${user.id}`;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      return { user, token, company: store.get('company', DEFAULT_COMPANY) };
    },
    async logout() {
      await delay(100);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      return true;
    },
    async getCurrentUser() {
      await delay(100);
      const raw = localStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) : null;
    },
  },

  dashboard: {
    async getData(filters?: any) {
      await delay();

      const convs = store.get<any[]>('conversations', []);
      const leads = store.get<any[]>('leads', []);
      const users = store.get<any[]>('users', []);
      const backendOrders = await listStoreOrdersViaBackend();
      const storeOrders = (backendOrders.ok ? backendOrders.orders : readStoreOrders()) as any[];
      try {
        localStorage.setItem('db_store_orders', JSON.stringify(storeOrders));
      } catch {}
      const channels = store.get<any[]>('channels', []);

      const range = (() => {
        const now = new Date();
        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        const f = filters?.datePreset || 'last_7_days';
        if (f === 'today') return { from: startOfDay(now), to: endOfDay(now) };
        if (f === 'yesterday') {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          return { from: startOfDay(y), to: endOfDay(y) };
        }
        if (f === 'last_30_days') {
          const d = new Date(now);
          d.setDate(d.getDate() - 29);
          return { from: startOfDay(d), to: endOfDay(now) };
        }
        if (f === 'this_month') {
          const d = new Date(now.getFullYear(), now.getMonth(), 1);
          return { from: startOfDay(d), to: endOfDay(now) };
        }
        if (f === 'previous_month') {
          const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          return { from: startOfDay(from), to };
        }
        if (f === 'custom' && filters?.from && filters?.to) {
          return { from: startOfDay(new Date(filters.from)), to: endOfDay(new Date(filters.to)) };
        }
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        return { from: startOfDay(d), to: endOfDay(now) };
      })();

      const dayKeys: string[] = [];
      {
        const cur = new Date(range.from);
        while (cur <= range.to) {
          dayKeys.push(cur.toISOString().slice(0, 10));
          cur.setDate(cur.getDate() + 1);
        }
      }
      const dayLabels = dayKeys.map((d) => {
        const dt = new Date(`${d}T00:00:00`);
        return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      });

      const selectedUserIds = Array.isArray(filters?.userIds) && filters.userIds.length ? new Set<string>(filters.userIds) : null;
      const selectedConnectionIds = Array.isArray(filters?.connectionIds) && filters.connectionIds.length ? new Set<string>(filters.connectionIds) : null;

      const inRange = (dateLike: any) => {
        if (!dateLike) return false;
        const dt = new Date(dateLike);
        if (Number.isNaN(dt.getTime())) return false;
        return dt >= range.from && dt <= range.to;
      };
      const convBase = convs.filter((c) => {
        const byDate = inRange(c.startedAt || c.createdAt || c.updatedAt);
        if (!byDate) return false;
        if (selectedConnectionIds && !selectedConnectionIds.has(String(c.channelId || ''))) return false;
        if (selectedUserIds && !selectedUserIds.has(String(c.agentId || ''))) return false;
        return true;
      });
      const leadsBase = leads.filter((l) => {
        const byDate = inRange(l.createdAt || l.updatedAt);
        if (!byDate) return false;
        if (selectedUserIds && !selectedUserIds.has(String(l.responsibleId || ''))) return false;
        return true;
      });

      const firstResponseTimes = convBase
        .map((c) => {
          const msgs = store.get<any[]>(`messages_${c.id}`, []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          const firstCustomer = msgs.find((m) => m.senderType === 'contact');
          const firstHuman = msgs.find((m) => m.senderType === 'user');
          if (!firstCustomer || !firstHuman) return null;
          const delta = Math.max(0, Math.round((new Date(firstHuman.createdAt).getTime() - new Date(firstCustomer.createdAt).getTime()) / 1000));
          return delta;
        })
        .filter((v) => typeof v === 'number') as number[];
      const avgFirstResponse = firstResponseTimes.length ? Math.round(firstResponseTimes.reduce((s, v) => s + v, 0) / firstResponseTimes.length) : 0;
      const handlingTimes = convBase
        .map((c) => {
          if (!c.startedAt || !c.finishedAt) return null;
          return Math.max(0, Math.round((new Date(c.finishedAt).getTime() - new Date(c.startedAt).getTime()) / 1000));
        })
        .filter((v) => typeof v === 'number') as number[];
      const avgHandlingTime = handlingTimes.length ? Math.round(handlingTimes.reduce((s, v) => s + v, 0) / handlingTimes.length) : 0;

      const byUser = users
        .filter((u) => !selectedUserIds || selectedUserIds.has(String(u.id)))
        .slice(0, 8)
        .map((u) => ({ userId: u.id, name: u.name, count: convBase.filter((c) => c.agentId === u.id).length }));

      const byChannel = channels
        .filter((ch) => !selectedConnectionIds || selectedConnectionIds.has(String(ch.id)))
        .slice(0, 8)
        .map((ch) => ({ channel: ch.name || ch.id, count: convBase.filter((c) => c.channelId === ch.id).length }));

      const byHour = Array.from({ length: 24 }).map((_, h) => ({
        hour: h,
        count: convBase.filter((c) => new Date(c.startedAt || c.createdAt || c.updatedAt).getHours() === h).length,
      }));

      const dayHumanAI = dayKeys.map((d) => {
        const human = convBase.filter((c) => (c.startedAt || c.createdAt || '').slice(0, 10) === d && !c.isAI).length;
        const ai = convBase.filter((c) => (c.startedAt || c.createdAt || '').slice(0, 10) === d && c.isAI).length;
        return { date: d, human, ai };
      });

      const heatmap = Array.from({ length: 7 }).flatMap((_, day) =>
        Array.from({ length: 24 }).map((_, hour) => ({
          day,
          hour,
          count: convBase.filter((c) => {
            const dt = new Date(c.startedAt || c.createdAt || c.updatedAt);
            return dt.getDay() === day && dt.getHours() === hour;
          }).length,
        })),
      );

      const topConnections = channels
        .map((c) => ({ id: c.id, name: c.name || c.id, total: convBase.filter((x) => x.channelId === c.id).length }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 7);
      const byConnectionStacked = topConnections.map((ch) => ({
        name: ch.name,
        data: dayKeys.map((d) => convBase.filter((c) => c.channelId === ch.id && (c.startedAt || c.createdAt || '').slice(0, 10) === d).length),
      }));

      const topUsers = users
        .map((u) => ({ id: u.id, name: u.name, total: convBase.filter((x) => x.agentId === u.id).length }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      const byUserStacked = topUsers.map((u) => ({
        name: u.name,
        data: dayKeys.map((d) => convBase.filter((c) => c.agentId === u.id && (c.startedAt || c.createdAt || '').slice(0, 10) === d).length),
      }));

      const totalNegotiation = leadsBase.reduce((s, l) => s + Number(l.value || 0), 0);
      const wonLeads = leadsBase.filter((l) => l.status === 'won');
      const totalConverted = wonLeads.reduce((s, l) => s + Number(l.value || 0), 0);
      const conversionRate = leadsBase.length ? Math.round((wonLeads.length / leadsBase.length) * 100) : 0;
      const paidStoreOrders = storeOrders.filter((item: any) => item.status === 'paid');
      const storeRevenue = paidStoreOrders.reduce((sum, item) => sum + Number(item.total || item.amount || 0), 0);
      const totalSalesCount = wonLeads.length + paidStoreOrders.length;
      const totalSalesValue = totalConverted + storeRevenue;
      const avgTicket = totalSalesCount ? Math.round(totalSalesValue / totalSalesCount) : 0;

      const leadSalesRanking = users
        .map((u) => {
          const userWon = wonLeads.filter((l) => l.responsibleId === u.id);
          return { userId: u.id, name: u.name, count: userWon.length, value: userWon.reduce((s, l) => s + Number(l.value || 0), 0) };
        })
        .filter((x) => x.count > 0 || x.value > 0);
      const storeSalesRanking = paidStoreOrders.reduce((map: Map<string, { userId: string; name: string; count: number; value: number }>, order: any) => {
        const key = String(order.agentId || 'sem-atendente');
        const current = map.get(key) || { userId: key, name: order.agentName || 'Sem atendente', count: 0, value: 0 };
        current.count += 1;
        current.value += Number(order.total || order.amount || 0);
        map.set(key, current);
        return map;
      }, new Map());
      const salesRanking = [...leadSalesRanking].reduce((map: Map<string, { userId: string; name: string; count: number; value: number }>, item) => {
        map.set(item.userId, { ...item });
        return map;
      }, new Map());
      const storeSalesRankingList = Array.from(storeSalesRanking.values()) as { userId: string; name: string; count: number; value: number }[];
      storeSalesRankingList.forEach((item) => {
        const current = salesRanking.get(item.userId) || { userId: item.userId, name: item.name, count: 0, value: 0 };
        current.count += item.count;
        current.value += item.value;
        current.name = current.name || item.name;
        salesRanking.set(item.userId, current);
      });
      const salesRankingList = Array.from(salesRanking.values()).filter((x) => x.count > 0 || x.value > 0).sort((a, b) => b.value - a.value);
      const byProduct: { name: string; count: number }[] = Array.from(paidStoreOrders.reduce((map: Map<string, { name: string; count: number }>, order: any) => {
        const key = String(order.productId || order.productName || 'produto');
        const current = map.get(key) || { name: order.productName || 'Produto', count: 0 };
        current.count += 1;
        map.set(key, current);
        return map;
      }, new Map()).values());

      const previousPeriod = (() => {
        const span = range.to.getTime() - range.from.getTime();
        const prevTo = new Date(range.from.getTime() - 1);
        const prevFrom = new Date(prevTo.getTime() - span);
        return { from: prevFrom, to: prevTo };
      })();
      const inPrev = (dateLike: any) => {
        if (!dateLike) return false;
        const dt = new Date(dateLike);
        if (Number.isNaN(dt.getTime())) return false;
        return dt >= previousPeriod.from && dt <= previousPeriod.to;
      };
      const categories = dayLabels;
      const currentLine = dayKeys.map((d) => wonLeads.filter((l) => (l.wonAt || l.updatedAt || '').slice(0, 10) === d).reduce((s, l) => s + Number(l.value || 0), 0));
      const prevDayKeys = dayKeys.map((_, idx) => {
        const dt = new Date(range.from);
        dt.setDate(dt.getDate() - dayKeys.length + idx);
        return dt.toISOString().slice(0, 10);
      });
      const prevWon = leads.filter((l) => l.status === 'won' && inPrev(l.wonAt || l.updatedAt));
      const prevLine = prevDayKeys.map((d) => prevWon.filter((l) => (l.wonAt || l.updatedAt || '').slice(0, 10) === d).reduce((s, l) => s + Number(l.value || 0), 0));

      const adsConvs = convBase.filter((c) => String(c.origin || '').toLowerCase().includes('ads') || String(c.origin || '').toLowerCase().includes('meta') || String(c.origin || '').toLowerCase().includes('ctwa'));
      const adsWon = wonLeads.filter((l) => String(l.origin || '').toLowerCase().includes('ads') || String(l.origin || '').toLowerCase().includes('meta') || String(l.origin || '').toLowerCase().includes('ctwa'));
      const revenueMetaAds = adsWon.reduce((s, l) => s + Number(l.value || 0), 0);
      const newAdsLeads = leadsBase.filter((l) => String(l.origin || '').toLowerCase().includes('ads') || String(l.origin || '').toLowerCase().includes('meta') || String(l.origin || '').toLowerCase().includes('ctwa')).length;
      const chatsByDay = dayKeys.map((d) => ({ date: d, count: adsConvs.filter((c) => (c.createdAt || '').slice(0, 10) === d).length }));
      const chatsByHour = Array.from({ length: 24 }).map((_, h) => ({ hour: h, count: adsConvs.filter((c) => new Date(c.createdAt || c.updatedAt).getHours() === h).length }));

      const result = {
        productivity: {
          totalConversations: convBase.length,
          waiting: convBase.filter((c) => c.status === 'waiting').length,
          inProgress: convBase.filter((c) => c.status === 'in_progress').length,
          finished: convBase.filter((c) => c.status === 'finished').length,
          pendingReply: convBase.filter((c) => c.status !== 'finished').filter((c) => {
            const msgs = store.get<any[]>(`messages_${c.id}`, []);
            if (!msgs.length) return false;
            const last = msgs.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            return last?.senderType === 'contact';
          }).length,
          customerWaiting: convs.filter((c) => c.status === 'waiting' && !c.isAI && !c.isGroup).length,
          avgFirstResponse,
          avgHandlingTime,
          avgResolutionTime: avgHandlingTime,
          occupancyRate: convBase.length ? Math.min(100, Math.round((convBase.filter((c) => c.status === 'in_progress').length / Math.max(1, users.length)) * 100)) : 0,
          byUser,
          byChannel,
          byHour,
          byDayHumanAI: dayHumanAI,
          heatmap,
          byConnectionStacked,
          byUserStacked,
          dayLabels,
          byStatus: [
            { status: 'Aguardando', count: convBase.filter((c) => c.status === 'waiting').length },
            { status: 'Atendendo', count: convBase.filter((c) => c.status === 'in_progress').length },
            { status: 'IA', count: convBase.filter((c) => c.status === 'ai_handling').length },
            { status: 'Finalizada', count: convBase.filter((c) => c.status === 'finished').length },
          ],
          transferred: convBase.filter((c) => c.status === 'transferred').length,
          reopened: convBase.filter((c) => c.status === 'reopened').length,
          byOccurrence: [],
        },
        sales: {
          leadsGenerated: leadsBase.length,
          opportunitiesCreated: leadsBase.length,
          won: wonLeads.length,
          lost: leadsBase.filter((l) => l.status === 'lost').length,
          totalNegotiation,
          totalConverted,
          conversionRate,
          avgTicket,
          totalSales: totalSalesCount,
          totalValue: totalSalesValue,
          newLeads: leadsBase.length,
          recurrence: leadsBase.length ? Math.round((leadsBase.filter((l) => Number(l.activities?.length || 0) > 1).length / leadsBase.length) * 100) : 0,
          funnel: {
            totalConversations: convBase.length,
            totalNegotiations: leadsBase.length,
            closedSales: wonLeads.length,
            conversionFromNegotiations: leadsBase.length ? Math.round((wonLeads.length / leadsBase.length) * 100) : 0,
          },
          periodComparison: {
            categories,
            current: currentLine,
            previous: prevLine,
          },
          salesRanking: salesRankingList,
          byAgent: salesRankingList.map((x) => ({ name: x.name, value: x.value, count: x.count })),
          byFunnel: [],
          byStage: [],
          byProduct,
          lossReasons: [],
          avgTimeToConversion: 0,
        },
        ads: {
          leadsByOrigin: [{ origin: 'Meta Ads', count: newAdsLeads }],
          conversionsByCampaign: [],
          costPerLead: 0,
          costPerSale: 0,
          attributedRevenue: revenueMetaAds,
          estimatedROI: 0,
          revenueMetaAds,
          newAdsLeads,
          chatsByDay,
          chatsByHour,
          byChannel: [{ channel: 'Meta Ads', leads: newAdsLeads, conversions: adsWon.length, cost: 0 }],
        },
        ai: {
          totalAIConversations: convBase.filter((c) => c.isAI).length,
          resolvedByAI: convBase.filter((c) => c.isAI && c.status === 'finished').length,
          transferredToHuman: convBase.filter((c) => c.status === 'transferred').length,
          autoResolutionRate: convBase.length ? Math.round((convBase.filter((c) => c.isAI && c.status === 'finished').length / convBase.length) * 100) : 0,
          topIntents: [],
          errors: 0,
          avgResponseTime: 0,
          creditsUsed: 0,
          automationsExecuted: 0,
          automationErrors: 0,
          followUpsSent: 0,
          autoClassifications: 0,
        },
        analysis: {
          analyzedConversations: convBase.length,
          sentimentDistribution: [],
          satisfactionLevel: 0,
          topReasons: [],
          topQuestions: [],
          topComplaints: [],
          qualityRanking: [],
          badServiceAlerts: 0,
          npsScore: 0,
        },
      };
      return result;
    },
  },

  conversations: {
    async list(_filters?: any) {
      await delay();
      return store.get('conversations', []);
    },
    async getById(id: string) {
      await delay(100);
      return store.get('conversations', []).find((c: any) => c.id === id);
    },
    async getMessages(conversationId: string) {
      await delay(100);
      const extra = store.get<any[]>(`messages_${conversationId}`, []);
      return extra;
    },
    async sendMessage(conversationId: string, message: any) {
      await delay(100);
      const msg = { id: uid(), conversationId, senderType: 'user', type: 'text', isRead: true, createdAt: new Date().toISOString(), ...message };
      const extra = store.get<any[]>(`messages_${conversationId}`, []);
      store.set(`messages_${conversationId}`, [...extra, msg]);
      return msg;
    },
    async create(data: any) {
      await delay(100);
      const list = store.get('conversations', []);
      const created = { id: uid(), companyId: 'company-1', status: 'waiting', isFavorite: false, isAI: false, metadata: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
      store.set('conversations', [created, ...list]);
      return created;
    },
    async updateStatus(id: string, status: string) {
      await delay(100);
      const list = store.get('conversations', []);
      const updated = list.map((c: any) => (c.id === id ? { ...c, status } : c));
      store.set('conversations', updated);
      return updated.find((c: any) => c.id === id);
    },
    async transfer(id: string, userId: string) {
      await delay(100);
      const list = store.get('conversations', []);
      const updated = list.map((c: any) => (c.id === id ? { ...c, agentId: userId, status: 'transferred' } : c));
      store.set('conversations', updated);
      return updated.find((c: any) => c.id === id);
    },
    async update(id: string, data: any) {
      await delay(100);
      const list = store.get('conversations', []);
      const updated = list.map((c: any) => (c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c));
      store.set('conversations', updated);
      return updated.find((c: any) => c.id === id);
    },
    async delete(id: string) {
      await delay(100);
      const list = store.get('conversations', []);
      store.set('conversations', list.filter((c: any) => c.id !== id));
      localStorage.removeItem(`messages_${id}`);
      return true;
    },
  },

  contacts: {
    async list(_filters?: any) {
      await delay();
      return store.get('contacts', []);
    },
    async getById(id: string) {
      await delay(100);
      return store.get('contacts', []).find((c: any) => c.id === id);
    },
    async create(data: any) {
      await delay();
      const list = store.get('contacts', []);
      const created = { id: uid(), companyId: 'company-1', tags: [], customFields: {}, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
      store.set('contacts', [created, ...list]);
      return created;
    },
    async update(id: string, data: any) {
      await delay();
      const list = store.get('contacts', []);
      const updated = list.map((c: any) => (c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c));
      store.set('contacts', updated);
      return updated.find((c: any) => c.id === id);
    },
    async delete(id: string) {
      await delay();
      const list = store.get('contacts', []);
      store.set('contacts', list.filter((c: any) => c.id !== id));
      return true;
    },
    async import(_file: File) {
      await delay(800);
      return { imported: 12, errors: 0 };
    },
    async export(_filters?: any) {
      await delay(500);
      return store.get('contacts', []);
    },
  },

  funnels: {
    async list() {
      await delay();
      return store.get('funnels', []);
    },
    async getById(id: string) {
      await delay(100);
      return store.get('funnels', []).find((f: any) => f.id === id);
    },
    async create(data: any) {
      await delay();
      const list = store.get('funnels', []);
      const created = {
        id: uid(),
        companyId: 'company-1',
        stages: [],
        isDefault: false,
        workflowV2Enabled: false,
        showCustomerBase: false,
        order: list.length + 1,
        status: 'active',
        createdAt: new Date().toISOString(),
        ...data,
      };
      store.set('funnels', [...list, created]);
      return created;
    },
    async update(id: string, data: any) {
      await delay();
      const list = store.get('funnels', []);
      const updated = list.map((item: any) => (item.id === id ? { ...item, ...data } : item));
      store.set('funnels', updated);
      return updated.find((item: any) => item.id === id);
    },
    async delete(id: string) {
      await delay();
      const list = store.get('funnels', []);
      store.set('funnels', list.filter((item: any) => item.id !== id));
      const leads = store.get('leads', []);
      store.set('leads', leads.filter((lead: any) => lead.funnelId !== id));
      const classifications = store.get('classifications', []);
      store.set('classifications', classifications.filter((item: any) => item.funnelId !== id));
      return true;
    },
    async reorder(ids: string[]) {
      await delay(80);
      const list = store.get('funnels', []);
      const map = new Map(list.map((item: any) => [item.id, item]));
      const ordered = ids.map((id, index) => ({ ...map.get(id), order: index + 1 })).filter(Boolean);
      const extras = list.filter((item: any) => !ids.includes(item.id));
      const next = [...ordered, ...extras.map((item: any, index: number) => ({ ...item, order: ordered.length + index + 1 }))];
      store.set('funnels', next);
      return next;
    },
    async getLeads(funnelId?: string) {
      await delay();
      const leads = store.get('leads', []);
      return funnelId ? leads.filter((l: any) => l.funnelId === funnelId) : leads;
    },
    async moveLead(leadId: string, stageId: string) {
      await delay(80);
      const list = store.get('leads', []);
      const funnelList = store.get('funnels', []);
      const rawUser = localStorage.getItem('auth_user');
      const me = rawUser ? JSON.parse(rawUser) : DEFAULT_ADMIN_USER;
      const updated = list.map((l: any) => {
        if (l.id !== leadId) return l;
        const funnel = (funnelList as any[]).find((f: any) => f.id === l.funnelId);
        const stage = funnel?.stages?.find((s: any) => s.id === stageId);
        return {
          ...l,
          stageId,
          lastMovedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          activities: [
            ...(l.activities || []),
            {
              id: uid(),
              leadId,
              userId: me.id,
              type: 'stage_change',
              description: `Movido para ${stage?.name || stageId}`,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });
      store.set('leads', updated);
      const moved = updated.find((l: any) => l.id === leadId);

      const autos = store.get('automations', []);
      const patchedAutos = autos.map((a: any) => {
        if (!a.isActive) return a;
        const start = (a.blocks || []).find((b: any) => b.type === 'start');
        if (!start) return a;
        if (start.config?.trigger !== 'deal_moved') return a;
        const expectedStage = start.config?.triggerStageId || '';
        if (expectedStage && expectedStage !== stageId) return a;
        return { ...a, executionCount: Number(a.executionCount || 0) + 1, lastExecutedAt: new Date().toISOString() };
      });
      store.set('automations', patchedAutos);

      return moved;
    },
    async createLead(data: any) {
      await delay();
      const list = store.get('leads', []);
      const created = { id: uid(), companyId: 'company-1', tags: [], activities: [], status: 'open', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastMovedAt: new Date().toISOString(), ...data };
      store.set('leads', [created, ...list]);

      const autos = store.get('automations', []);
      const patchedAutos = autos.map((a: any) => {
        if (!a.isActive) return a;
        const start = (a.blocks || []).find((b: any) => b.type === 'start');
        if (!start) return a;
        if (start.config?.trigger !== 'deal_created') return a;
        const expectedStage = start.config?.triggerStageId || '';
        if (expectedStage && expectedStage !== created.stageId) return a;
        return { ...a, executionCount: Number(a.executionCount || 0) + 1, lastExecutedAt: new Date().toISOString() };
      });
      store.set('automations', patchedAutos);

      return created;
    },
    async updateLead(id: string, data: any) {
      await delay();
      const list = store.get('leads', []);
      const prev = list.find((l: any) => l.id === id);
      const updated = list.map((l: any) => (l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l));
      store.set('leads', updated);
      const nowLead = updated.find((l: any) => l.id === id);

      if (prev && nowLead && (prev as any).status !== 'won' && (nowLead as any).status === 'won') {
        const autos = store.get('automations', []);
        const patchedAutos = autos.map((a: any) => {
          if (!a.isActive) return a;
          const start = (a.blocks || []).find((b: any) => b.type === 'start');
          if (!start) return a;
          if (start.config?.trigger !== 'deal_won') return a;
          return { ...a, executionCount: Number(a.executionCount || 0) + 1, lastExecutedAt: new Date().toISOString() };
        });
        store.set('automations', patchedAutos);
      }
      if (prev && nowLead && (prev as any).status !== 'lost' && (nowLead as any).status === 'lost') {
        const autos = store.get('automations', []);
        const patchedAutos = autos.map((a: any) => {
          if (!a.isActive) return a;
          const start = (a.blocks || []).find((b: any) => b.type === 'start');
          if (!start) return a;
          if (start.config?.trigger !== 'deal_lost') return a;
          return { ...a, executionCount: Number(a.executionCount || 0) + 1, lastExecutedAt: new Date().toISOString() };
        });
        store.set('automations', patchedAutos);
      }

      return nowLead;
    },
    async deleteLead(id: string) {
      await delay();
      const list = store.get('leads', []);
      store.set('leads', list.filter((l: any) => l.id !== id));
      return true;
    },
  },

  schedule: {
    async getAppointments(_filters?: any) {
      await delay();
      return store.get('appointments', []);
    },
    async create(data: any) {
      await delay();
      const list = store.get('appointments', []);
      const created = { id: uid(), companyId: 'company-1', status: 'scheduled', isRecurring: false, notifyWhatsApp: true, reminders: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
      store.set('appointments', [...list, created]);
      return created;
    },
    async update(id: string, data: any) {
      await delay();
      const list = store.get('appointments', []);
      const updated = list.map((a: any) => (a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a));
      store.set('appointments', updated);
      return updated.find((a: any) => a.id === id);
    },
    async delete(id: string) {
      await delay();
      const list = store.get('appointments', []);
      store.set('appointments', list.filter((a: any) => a.id !== id));
      return true;
    },
    async getProfessionals() {
      await delay(100);
      return store.get('professionals', []);
    },
    async getEventTypes() {
      await delay(100);
      return store.get('eventTypes', []);
    },
    async createEventType(data: any) {
      await delay();
      const list = store.get('eventTypes', []);
      const created = { id: uid(), companyId: 'company-1', status: 'active', duration: 60, ...data };
      store.set('eventTypes', [created, ...list]);
      return created;
    },
    async updateEventType(id: string, data: any) {
      await delay();
      const list = store.get('eventTypes', []);
      const updated = list.map((item: any) => (item.id === id ? { ...item, ...data } : item));
      store.set('eventTypes', updated);
      return updated.find((item: any) => item.id === id);
    },
    async deleteEventType(id: string) {
      await delay();
      const list = store.get('eventTypes', []);
      store.set('eventTypes', list.filter((item: any) => item.id !== id));
      return true;
    },
    async getTimeBlocks() {
      await delay(100);
      return store.get('timeBlocks', []);
    },
    async createTimeBlock(data: any) {
      await delay();
      const list = store.get('timeBlocks', []);
      const created = {
        id: uid(),
        companyId: 'company-1',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
      };
      store.set('timeBlocks', [created, ...list]);
      return created;
    },
    async updateTimeBlock(id: string, data: any) {
      await delay();
      const list = store.get('timeBlocks', []);
      const updated = list.map((item: any) => (item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item));
      store.set('timeBlocks', updated);
      return updated.find((item: any) => item.id === id);
    },
    async deleteTimeBlock(id: string) {
      await delay();
      const list = store.get('timeBlocks', []);
      store.set('timeBlocks', list.filter((item: any) => item.id !== id));
      return true;
    },
    async getReminderSettings() {
      await delay(100);
      return store.get('scheduleReminderSettings', {
        enableConfirmationRequest: false,
        confirmationMessage: 'Por favor, confirme sua presenÃ§a respondendo:\n1 - Confirmar\n2 - Remarcar\n3 - Cancelar',
        reminder24h: { enabled: true, minutesBefore: 1440, message: 'OlÃ¡ {cliente}! Lembre-se: vocÃª tem um agendamento amanhÃ£ Ã s {hora} com {profissional}. {empresa}' },
        reminder2h: { enabled: true, minutesBefore: 120, message: 'OlÃ¡ {cliente}! Seu agendamento estÃ¡ prÃ³ximo: hoje Ã s {hora} com {profissional}. {empresa}' },
        reminder30m: { enabled: true, minutesBefore: 30, message: 'OlÃ¡ {cliente}! Seu agendamento comeÃ§a em 30 minutos Ã s {hora}. {empresa}' },
        feedbackReminder: { enabled: false, hoursAfter: 2, message: 'OlÃ¡ {cliente}! Esperamos que tenha gostado do atendimento. Sua opiniÃ£o Ã© muito importante para nÃ³s! {empresa}' },
      });
    },
    async updateReminderSettings(data: any) {
      await delay();
      const current = store.get('scheduleReminderSettings', {});
      const updated = { ...current, ...data };
      store.set('scheduleReminderSettings', updated);
      return updated;
    },
  },

  campaigns: {
    async list() {
      await delay();
      return store.get('campaigns', []);
    },
    async create(data: any) {
      await delay();
      const list = store.get('campaigns', []);
      const created = { id: uid(), companyId: 'company-1', variables: [], status: 'draft', metrics: { total: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, leadsCreated: 0 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
      store.set('campaigns', [created, ...list]);
      return created;
    },
    async update(id: string, data: any) {
      await delay();
      const list = store.get('campaigns', []);
      const updated = list.map((c: any) => (c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c));
      store.set('campaigns', updated);
      return updated.find((c: any) => c.id === id);
    },
    async send(id: string) {
      await delay(500);
      return this.update(id, { status: 'sending', startedAt: new Date().toISOString() });
    },
  },

  automations: {
    async list() {
      await delay();
      return store.get('automations', []);
    },
    async getById(id: string) {
      await delay(100);
      return store.get('automations', []).find((a: any) => a.id === id);
    },
    async create(data: any) {
      await delay();
      const list = store.get('automations', []);
      const created = { id: uid(), companyId: 'company-1', isActive: false, blocks: [], connections: [], executionCount: 0, errorCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
      store.set('automations', [...list, created]);
      return created;
    },
    async update(id: string, data: any) {
      await delay();
      const list = store.get('automations', []);
      const updated = list.map((a: any) => (a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a));
      store.set('automations', updated);
      return updated.find((a: any) => a.id === id);
    },
    async toggle(id: string) {
      await delay(100);
      const list = store.get('automations', []);
      const updated = list.map((a: any) => (a.id === id ? { ...a, isActive: !a.isActive } : a));
      store.set('automations', updated);
      return updated.find((a: any) => a.id === id);
    },
    async delete(id: string) {
      await delay();
      const list = store.get('automations', []);
      store.set('automations', list.filter((a: any) => a.id !== id));
      return true;
    },
  },

  aiAgents: {
    async list() {
      await delay();
      return store.get('aiAgents', []);
    },
    async getById(id: string) {
      await delay(100);
      return store.get('aiAgents', []).find((a: any) => a.id === id);
    },
    async create(data: any) {
      await delay();
      const list = store.get('aiAgents', []);
      const created = { id: uid(), companyId: 'company-1', channels: [], trainingStatus: 'pending', isActive: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
      store.set('aiAgents', [...list, created]);
      return created;
    },
    async update(id: string, data: any) {
      await delay();
      const list = store.get('aiAgents', []);
      const updated = list.map((a: any) => (a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a));
      store.set('aiAgents', updated);
      return updated.find((a: any) => a.id === id);
    },
    async remove(id: string) {
      await delay();
      const list = store.get('aiAgents', []);
      store.set('aiAgents', list.filter((a: any) => a.id !== id));
      store.set('knowledgeBase', store.get('knowledgeBase', []).filter((k: any) => k.agentId !== id));
      store.set('intents', store.get('intents', []).filter((i: any) => i.agentId !== id));
      return true;
    },
    async getKnowledgeBase(agentId: string) {
      await delay(100);
      return store.get('knowledgeBase', []).filter((k: any) => k.agentId === agentId);
    },
    async getIntents(agentId: string) {
      await delay(100);
      return store.get('intents', []).filter((i: any) => i.agentId === agentId);
    },
  },

  channels: {
    async list() {
      await delay();
      return store.get('channels', []);
    },
    async create(data: any) {
      await delay();
      const list = store.get('channels', []);
      const created = { id: uid(), companyId: 'company-1', status: 'disconnected', credentials: {}, autoMessages: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
      store.set('channels', [...list, created]);
      return created;
    },
    async update(id: string, data: any) {
      await delay();
      const list = store.get('channels', []);
      const updated = list.map((c: any) => (c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c));
      store.set('channels', updated);
      return updated.find((c: any) => c.id === id);
    },
    async connect(id: string) {
      await delay(600);
      const qrCode = `2@${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      const list = store.get('channels', []);
      const updated = list.map((c: any) => (c.id === id ? { ...c, status: 'connecting', qrCode } : c));
      store.set('channels', updated);
      return { qrCode, channel: updated.find((c: any) => c.id === id) };
    },
    async confirmConnection(id: string) {
      await delay(400);
      const list = store.get('channels', []);
      const updated = list.map((c: any) => (c.id === id ? { ...c, status: 'connected', lastSync: new Date().toISOString(), qrCode: undefined } : c));
      store.set('channels', updated);
      return updated.find((c: any) => c.id === id);
    },
    async disconnect(id: string) {
      await delay(300);
      const list = store.get('channels', []);
      const updated = list.map((c: any) => (c.id === id ? { ...c, status: 'disconnected' } : c));
      store.set('channels', updated);
      return updated.find((c: any) => c.id === id);
    },
  },

  tags: {
    async list() { await delay(100); return store.get('tags', []); },
    async create(data: any) { await delay(); const list = store.get('tags', []); const created = { id: uid(), companyId: 'company-1', ...data }; store.set('tags', [...list, created]); return created; },
    async update(id: string, data: any) { await delay(); const list = store.get('tags', []); const updated = list.map((t: any) => (t.id === id ? { ...t, ...data } : t)); store.set('tags', updated); return updated.find((t: any) => t.id === id); },
    async delete(id: string) { await delay(); const list = store.get('tags', []); store.set('tags', list.filter((t: any) => t.id !== id)); return true; },
  },

  classifications: {
    async list() { await delay(100); return store.get('classifications', []); },
    async create(data: any) {
      await delay();
      const list = store.get('classifications', []);
      const created = { id: uid(), companyId: 'company-1', order: list.filter((item: any) => item.funnelId === data.funnelId).length + 1, ...data };
      store.set('classifications', [...list, created]);
      const funnels = store.get('funnels', []);
      const updatedFunnels = funnels.map((funnel: any) => funnel.id === data.funnelId
        ? { ...funnel, stages: [...(funnel.stages || []), { ...created, funnelId: data.funnelId }] }
        : funnel);
      store.set('funnels', updatedFunnels);
      return created;
    },
    async update(id: string, data: any) {
      await delay();
      const list = store.get('classifications', []);
      const current: any = list.find((item: any) => item.id === id);
      const updated = list.map((c: any) => (c.id === id ? { ...c, ...data } : c));
      store.set('classifications', updated);
      const saved: any = updated.find((c: any) => c.id === id);
      const funnels = store.get('funnels', []);
      const updatedFunnels = funnels.map((funnel: any) => {
        const stages = (funnel.stages || []).filter((stage: any) => stage.id !== id);
        if (saved?.funnelId === funnel.id) stages.push({ ...saved, id, funnelId: funnel.id });
        return (funnel.id === current?.funnelId || funnel.id === saved?.funnelId) ? { ...funnel, stages } : funnel;
      });
      store.set('funnels', updatedFunnels);
      return saved;
    },
    async delete(id: string) {
      await delay();
      const list = store.get('classifications', []);
      const target: any = list.find((item: any) => item.id === id);
      store.set('classifications', list.filter((c: any) => c.id !== id));
      const funnels = store.get('funnels', []);
      store.set('funnels', funnels.map((funnel: any) => funnel.id === target?.funnelId ? { ...funnel, stages: (funnel.stages || []).filter((stage: any) => stage.id !== id) } : funnel));
      return true;
    },
    async reorder(funnelId: string, ids: string[]) {
      await delay(80);
      const list = store.get('classifications', []);
      const scoped = list.filter((item: any) => item.funnelId === funnelId);
      const map = new Map(scoped.map((item: any) => [item.id, item]));
      const ordered = ids.map((id, index) => ({ ...map.get(id), order: index + 1 })).filter(Boolean);
      const rest = list.filter((item: any) => item.funnelId !== funnelId);
      const next = [...rest, ...ordered];
      store.set('classifications', next);
      const funnels = store.get('funnels', []);
      store.set('funnels', funnels.map((funnel: any) => funnel.id === funnelId ? { ...funnel, stages: ordered } : funnel));
      return ordered;
    },
  },

  occurrenceTypes: {
    async list() { await delay(100); return store.get('occurrenceTypes', []); },
    async create(data: any) { await delay(); const list = store.get('occurrenceTypes', []); const created = { id: uid(), companyId: 'company-1', isDeleted: false, ...data }; store.set('occurrenceTypes', [...list, created]); return created; },
    async update(id: string, data: any) { await delay(); const list = store.get('occurrenceTypes', []); const updated = list.map((o: any) => (o.id === id ? { ...o, ...data } : o)); store.set('occurrenceTypes', updated); return updated.find((o: any) => o.id === id); },
    async delete(id: string) { await delay(); const list = store.get('occurrenceTypes', []); const updated = list.map((o: any) => (o.id === id ? { ...o, isDeleted: true } : o)); store.set('occurrenceTypes', updated); return true; },
  },

  quickMessages: {
    async list() { await delay(100); return store.get('quickMessages', []); },
    async create(data: any) { await delay(); const list = store.get('quickMessages', []); const created = { id: uid(), companyId: 'company-1', messageType: 'text', scope: 'global', category: 'Sem categoria', ...data }; store.set('quickMessages', [...list, created]); return created; },
    async update(id: string, data: any) { await delay(); const list = store.get('quickMessages', []); const updated = list.map((q: any) => (q.id === id ? { ...q, ...data } : q)); store.set('quickMessages', updated); return updated.find((q: any) => q.id === id); },
    async delete(id: string) { await delay(); const list = store.get('quickMessages', []); store.set('quickMessages', list.filter((q: any) => q.id !== id)); return true; },
  },

  settings: {
    async getCompany() { await delay(100); return store.get('company', DEFAULT_COMPANY); },
    async updateCompany(data: any) { await delay(); const c = { ...store.get('company', DEFAULT_COMPANY), ...data, updatedAt: new Date().toISOString() }; store.set('company', c); return c; },
    async getLicense() { await delay(100); return store.get('license', DEFAULT_LICENSE); },
    async getPlan() { await delay(100); return store.get('plan', DEFAULT_PLAN); },
    async getUsers() { await delay(100); return store.get('users', [DEFAULT_ADMIN_USER]); },
    async createUser(data: any) { await delay(); const list = store.get('users', [DEFAULT_ADMIN_USER]); const created = { id: uid(), companyId: 'company-1', permissions: [], status: 'active', createdAt: new Date().toISOString(), ...data }; store.set('users', [...list, created]); return created; },
    async updateUser(id: string, data: any) { await delay(); const list = store.get('users', [DEFAULT_ADMIN_USER]); const updated = list.map((u: any) => (u.id === id ? { ...u, ...data } : u)); store.set('users', updated); return updated.find((u: any) => u.id === id); },
    async deleteUser(id: string) { await delay(); const list = store.get('users', [DEFAULT_ADMIN_USER]); store.set('users', list.filter((u: any) => u.id !== id)); return true; },
    async getProfessionals() { await delay(100); return store.get('professionals', []); },
    async getEventTypes() { await delay(100); return store.get('eventTypes', []); },
    async getDistribution() { await delay(100); return store.get('distribution', { enabled: false, strategy: 'round_robin', users: [] }); },
    async updateDistribution(data: any) { await delay(); const d = { ...store.get('distribution', { enabled: false, strategy: 'round_robin', users: [] }), ...data }; store.set('distribution', d); return d; },
  },

  reports: {
    async generate(_type: string, _filters: any) {
      await delay();
      return api.dashboard.getData(_filters);
    },
    async export(_type: string, _format: string, _filters: any) {
      await delay(500);
      return { url: '#', success: true };
    },
  },

  audit: {
    async list(_filters?: any) {
      await delay();
      return store.get('audit', []);
    },
    async log(action: string, module: string, entityType: string, entityId: string, details: any = {}) {
      const list = store.get('audit', []);
      const raw = localStorage.getItem('auth_user');
      const user = raw ? JSON.parse(raw) : DEFAULT_ADMIN_USER;
      const entry = { id: uid(), companyId: 'company-1', userId: user.id, user, action, module, entityType, entityId, details, ipAddress: '192.168.1.1', createdAt: new Date().toISOString() };
      store.set('audit', [entry, ...list].slice(0, 200));
      return entry;
    },
  },
};

export default api;



