// Sends a real WhatsApp text message via the connected channel.
// Supports both Evolution API and Meta Cloud API (Official).

import type { Conversation, Message } from '../types';
import * as metaCloud from './meta-cloud';

export async function sendWhatsAppText(conv: Conversation, text: string): Promise<Message | null> {
  const channels = JSON.parse(localStorage.getItem('db_channels') || '[]');
  const channel = conv.channelId ? channels.find((c: any) => c.id === conv.channelId) : undefined;
  const creds = channel?.credentials;
  const number = String(conv.contact?.phone || '').replace(/\D/g, '');
  if (!number) return null;

  let sent = false;

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
  const channels = JSON.parse(localStorage.getItem('db_channels') || '[]');
  const channel = conv.channelId ? channels.find((c: any) => c.id === conv.channelId) : undefined;
  const creds = channel?.credentials;
  if (!channel || channel.type !== 'whatsapp_official' || !metaCloud.hasMetaCreds(creds)) return false;
  const number = String(conv.contact?.phone || '').replace(/\D/g, '');
  if (!number) return false;
  return metaCloud.sendPixPayment(creds, number, opts);
}

// Check if channel supports native Meta payments
export function isMetaOfficialChannel(channelId: string): boolean {
  const channels = JSON.parse(localStorage.getItem('db_channels') || '[]');
  const channel = channels.find((c: any) => c.id === channelId);
  return channel?.type === 'whatsapp_official' && metaCloud.hasMetaCreds(channel?.credentials);
}
