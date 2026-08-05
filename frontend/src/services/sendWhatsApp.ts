// Sends a real WhatsApp text message via the connected Evolution API instance
// attached to the conversation's channel.

import type { Conversation, Message } from '../types';

export async function sendWhatsAppText(conv: Conversation, text: string): Promise<Message | null> {
  const channels = JSON.parse(localStorage.getItem('db_channels') || '[]');
  const channel = conv.channelId ? channels.find((c: any) => c.id === conv.channelId) : undefined;
  const creds = channel?.credentials;
  if (!creds?.serverUrl || !creds?.apiKey || !creds?.instanceName) return null;

  const url = `${creds.serverUrl.replace(/\/+$/, '')}/message/sendText/${encodeURIComponent(creds.instanceName)}`;
  const number = String(conv.contact?.phone || '').replace(/\D/g, '');
  if (!number) return null;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: creds.apiKey },
    body: JSON.stringify({ number, text, delay: 0 }),
  });
  if (!res.ok) throw new Error(`Evolution HTTP ${res.status}`);

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
