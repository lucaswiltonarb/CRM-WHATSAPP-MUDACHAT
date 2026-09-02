// Polls the backend for inbound (lead) / outbound (automation) messages and
// materializes them into the SPA's local store: saves the contact and bumps the
// conversation to the top of the Atendimento list.

import { backendUrl } from './backend';
import { dbKey } from './saas';
import type { Conversation, Contact, Message, Lead, Funnel } from '../types';

export type InboundEvent = {
  id: string;
  ts: number;
  instance: string;
  channelId?: string;
  number: string;
  name?: string;
  direction: 'in' | 'out';
  text: string;
  /** canal de origem do evento; ausente = WhatsApp */
  platform?: 'whatsapp' | 'instagram';
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const onlyDigits = (s: string) => String(s || '').replace(/\D/g, '');

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(dbKey(key));
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}
function write<T>(key: string, value: T): void {
  try { localStorage.setItem(dbKey(key), JSON.stringify(value)); } catch { /* ignore */ }
}

export async function fetchEvents(since: number): Promise<{ now: number; events: InboundEvent[] } | null> {
  try {
    const res = await fetch(`${backendUrl()}/api/events?since=${since}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Idempotent (dedupes by event id). Returns the up-to-date conversation list.
export function applyInboundEvents(events: InboundEvent[]): { conversations: Conversation[]; changed: boolean } {
  let conversations = read<Conversation[]>('conversations', []);
  let contacts = read<Contact[]>('contacts', []);
  const channels = read<any[]>('channels', []);
  const seen = new Set(read<string[]>('inbound_seen', []));
  let changed = false;

  for (const ev of events) {
    if (!ev || seen.has(ev.id)) continue;
    seen.add(ev.id);
    changed = true;
    const now = new Date(ev.ts || Date.now()).toISOString();
    const isInstagram = ev.platform === 'instagram';
    const origin = isInstagram ? 'Instagram' : 'WhatsApp';
    const digits = onlyDigits(ev.number);
    const displayPhone = ev.number?.startsWith('+') ? ev.number : `+${digits}`;
    // no Instagram o identificador e o IGSID, nao um telefone
    const fallbackName = isInstagram ? (ev.name ? `@${ev.name}` : ev.number) : displayPhone;

    // ---- contact (saved into the contacts list) ----
    let contact = isInstagram
      ? contacts.find((c) => String((c.customFields as any)?.igsid || '') === String(ev.number))
      : contacts.find((c) => digits.length > 0 && onlyDigits(c.phone || '') === digits);
    if (!contact) {
      contact = {
        id: uid(), companyId: 'company-1',
        name: (ev.name && ev.name.trim()) ? (isInstagram ? `@${ev.name.trim()}` : ev.name.trim()) : fallbackName,
        phone: isInstagram ? '' : displayPhone,
        origin, channelOrigin: ev.channelId,
        tags: [], customFields: isInstagram ? { igsid: ev.number } : {}, status: 'active',
        lastInteraction: now, createdAt: now, updatedAt: now,
      } as Contact;
      contacts = [contact, ...contacts];
    } else {
      const next: Contact = { ...contact, lastInteraction: now, updatedAt: now };
      const placeholder = isInstagram ? String(ev.number) : (next.phone || '');
      if (ev.name && ev.name.trim() && next.name === placeholder) {
        next.name = isInstagram ? `@${ev.name.trim()}` : ev.name.trim();
      }
      contact = next;
      contacts = contacts.map((c) => (c.id === next.id ? next : c));
    }

    // ---- conversation (created/bumped to the top) ----
    const channel = channels.find((c) => c.id === ev.channelId);
    let conv = conversations.find((c) => c.contactId === contact!.id && c.channelId === ev.channelId);
    const isNewContact = !conv;
    if (!conv) {
      conv = {
        id: uid(), companyId: 'company-1', contactId: contact.id, contact,
        channelId: ev.channelId || '', channel, status: 'waiting',
        tags: [], origin, isFavorite: false, isAI: false,
        metadata: {}, createdAt: now, updatedAt: now,
      } as Conversation;
      conversations = [conv, ...conversations];
    }

    // ---- lead in default funnel (only on the very first inbound message of a new contact) ----
    if (isNewContact && ev.direction === 'in') {
      const funnels = read<Funnel[]>('funnels', []);
      const defaultFunnel = funnels.find((f) => f.status === 'active') || funnels[0];
      if (defaultFunnel) {
        const firstStage = defaultFunnel.stages.slice().sort((a, b) => a.order - b.order)[0];
        if (firstStage) {
          let leads = read<Lead[]>('leads', []);
          if (!leads.some((l) => l.contactId === contact.id)) {
            const lead: Lead = {
              id: uid(), companyId: 'company-1', funnelId: defaultFunnel.id, stageId: firstStage.id,
              contactId: contact.id, contact, conversationId: conv.id,
              title: contact.name, origin, value: 0,
              tags: [], status: 'open', activities: [],
              createdAt: now, updatedAt: now,
            } as Lead;
            leads = [lead, ...leads];
            write('leads', leads);
          }
        }
      }
    }

    // ---- message ----
    const msg: Message = {
      id: ev.id, conversationId: conv.id,
      senderType: ev.direction === 'in' ? 'contact' : 'ai',
      type: 'text', content: ev.text || '', isRead: ev.direction !== 'in',
      createdAt: now,
    };
    const mkey = `messages_${conv.id}`;
    const arr = read<Message[]>(mkey, []);
    if (!arr.some((m) => m.id === msg.id)) { arr.push(msg); write(mkey, arr); }

    const updatedConv: Conversation = {
      ...conv, contact, channel, lastMessage: msg, updatedAt: now,
      ...(ev.direction === 'in'
        ? { waitingSince: conv.waitingSince || now, status: conv.status === 'finished' ? 'reopened' : conv.status }
        : {}),
    };
    conversations = [updatedConv, ...conversations.filter((c) => c.id !== updatedConv.id)];
  }

  if (changed) {
    write('contacts', contacts);
    write('conversations', conversations);
    write('inbound_seen', Array.from(seen).slice(-3000));
  }
  return { conversations, changed };
}
