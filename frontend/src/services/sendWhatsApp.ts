// Sends a real WhatsApp text message via the connected channel.
// Supports both Evolution API and Meta Cloud API (Official).

import type { Conversation, Message } from '../types';
import * as metaCloud from './meta-cloud';
import { backendUrl } from './backend';
import { dbKey } from './saas';

export async function sendWhatsAppText(conv: Conversation, text: string): Promise<Message | null> {
  const channels = JSON.parse(localStorage.getItem(dbKey('channels')) || '[]');
  const channel = conv.channelId ? channels.find((c: any) => c.id === conv.channelId) : undefined;
  const creds = channel?.credentials;
  let sent = false;

  // Instagram: responde a DM pelo backend, usando o token da conta conectada
  if (channel?.type === 'instagram') {
    const igsid = String((conv.contact as any)?.customFields?.igsid || '');
    if (!igsid || !creds?.accessToken || !creds?.userId) return null;
    const res = await fetch(`${backendUrl()}/api/instagram/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: creds.accessToken, userId: creds.userId, to: igsid, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) throw new Error('Falha ao enviar a mensagem no Instagram');
    const nowIg = new Date().toISOString();
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId: conv.id,
      senderType: 'user',
      type: 'text',
      content: text,
      isRead: true,
      createdAt: nowIg,
    } as Message;
  }

  const number = String(conv.contact?.phone || '').replace(/\D/g, '');
  if (!number) return null;

  // Meta Cloud API (Official)
  if (channel?.type === 'whatsapp_official' && metaCloud.hasMetaCreds(creds)) {
    sent = await metaCloud.sendText(creds, number, text);
  }
  // Evolution API
  else if (creds?.serverUrl && creds?.apiKey && creds?.instanceName) {
    const url = `${creds.serverUrl.replace(/\/+$/, '')}/message/sendText/${encodeURIComponent(creds.instanceName)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: creds.apiKey },
      body: JSON.stringify({ number, text, delay: 0 }),
    });
    if (!res.ok) throw new Error(`Evolution HTTP ${res.status}`);
    sent = true;
  } else {
    return null;
  }

  if (!sent) throw new Error('Falha ao enviar mensagem');

  const now = new Date().toISOString();
  const msg: Message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    conversationId: conv.id,
    senderType: 'user',
    type: 'text',
    content: text,
    isRead: true,
    createdAt: now,
  };
  return msg;
}

// Send PIX payment via Meta Cloud API (native WhatsApp payment)
export async function sendPixViaMetaCloud(
  conv: Conversation,
  opts: { productName: string; amount: number; pixCopyPaste?: string; invoiceUrl?: string }
): Promise<boolean> {
  const channels = JSON.parse(localStorage.getItem(dbKey('channels')) || '[]');
  const channel = conv.channelId ? channels.find((c: any) => c.id === conv.channelId) : undefined;
  const creds = channel?.credentials;
  if (!channel || channel.type !== 'whatsapp_official' || !metaCloud.hasMetaCreds(creds)) return false;
  const number = String(conv.contact?.phone || '').replace(/\D/g, '');
  if (!number) return false;
  return metaCloud.sendPixPayment(creds, number, opts);
}

// Check if channel supports native Meta payments
export function isMetaOfficialChannel(channelId: string): boolean {
  const channels = JSON.parse(localStorage.getItem(dbKey('channels')) || '[]');
  const channel = channels.find((c: any) => c.id === channelId);
  return channel?.type === 'whatsapp_official' && metaCloud.hasMetaCreds(channel?.credentials);
}
