// Meta WhatsApp Cloud API client
// Sends messages via the official Meta Graph API (WhatsApp Business Platform).

export interface MetaCloudCreds {
  phoneNumberId?: string;
  accessToken?: string;
  wabaId?: string;
  verifyToken?: string;
}

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

export function hasMetaCreds(c?: MetaCloudCreds): c is Required<Pick<MetaCloudCreds, 'phoneNumberId' | 'accessToken'>> & MetaCloudCreds {
  return !!(c && c.phoneNumberId && c.accessToken);
}

function authHeaders(accessToken: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
}

// Send a plain text message
export async function sendText(creds: MetaCloudCreds, to: string, text: string): Promise<boolean> {
  if (!hasMetaCreds(creds)) return false;
  const number = String(to).replace(/\D/g, '');
  try {
    const res = await fetch(`${GRAPH_URL}/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: authHeaders(creds.accessToken!),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: number,
        type: 'text',
        text: { body: text },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Send an interactive message with CTA URL button (e.g. payment link)
export async function sendCtaUrl(creds: MetaCloudCreds, to: string, bodyText: string, buttonText: string, url: string): Promise<boolean> {
  if (!hasMetaCreds(creds)) return false;
  const number = String(to).replace(/\D/g, '');
  try {
    const res = await fetch(`${GRAPH_URL}/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: authHeaders(creds.accessToken!),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: number,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          body: { text: bodyText },
          action: {
            name: 'cta_url',
            parameters: { display_text: buttonText, url },
          },
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Send PIX payment message with copy-paste code + optional link
export async function sendPixPayment(
  creds: MetaCloudCreds,
  to: string,
  opts: {
    productName: string;
    amount: number;
    pixCopyPaste?: string;
    invoiceUrl?: string;
    pixQrCodeBase64?: string;
  }
): Promise<boolean> {
  if (!hasMetaCreds(creds)) return false;
  const number = String(to).replace(/\D/g, '');
  const priceStr = `R$ ${opts.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Build the payment text
  const lines = [
    `✅ *Cobrança PIX*`,
    ``,
    `Produto: *${opts.productName}*`,
    `Valor: *${priceStr}*`,
    ``,
  ];

  if (opts.pixCopyPaste) {
    lines.push('🔑 *Código PIX (copie e cole):*', opts.pixCopyPaste, '');
  }
  if (opts.invoiceUrl) {
    lines.push(`🔗 Pagar online: ${opts.invoiceUrl}`, '');
  }
  lines.push('Após o pagamento, envie o comprovante aqui para confirmação ✅');

  const bodyText = lines.join('\n');

  // If there's an invoice URL, send as interactive CTA button
  if (opts.invoiceUrl) {
    return sendCtaUrl(creds, number, bodyText, '💳 Pagar agora', opts.invoiceUrl);
  }

  // Otherwise send as plain text
  return sendText(creds, number, bodyText);
}

// Send a WhatsApp order message (catalog-based, requires catalog to be set up)
export async function sendOrderMessage(
  creds: MetaCloudCreds,
  to: string,
  opts: {
    catalogId: string;
    items: { retailer_id: string; name: string; amount: { value: number; offset: number }; quantity: number }[];
    bodyText?: string;
    footerText?: string;
  }
): Promise<boolean> {
  if (!hasMetaCreds(creds) || !opts.catalogId || !opts.items.length) return false;
  const number = String(to).replace(/\D/g, '');
  try {
    const res = await fetch(`${GRAPH_URL}/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: authHeaders(creds.accessToken!),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: number,
        type: 'interactive',
        interactive: {
          type: 'order_details',
          body: { text: opts.bodyText || 'Detalhes do seu pedido:' },
          footer: { text: opts.footerText || 'Obrigado pela preferência!' },
          action: {
            name: 'review_and_pay',
            parameters: {
              reference_id: `order-${Date.now()}`,
              type: 'digital-goods',
              payment_type: 'pix',
              payment_configuration: 'pix_br',
              currency: 'BRL',
              total_amount: {
                value: opts.items.reduce((sum, i) => sum + i.amount.value * i.quantity, 0),
                offset: 100,
              },
              order: {
                items: opts.items,
                catalog_id: opts.catalogId,
              },
            },
          },
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Verify webhook token (for Meta webhook verification)
export function verifyWebhook(token: string, verifyToken: string, challenge: string): string | null {
  if (token === verifyToken) return challenge;
  return null;
}
