// Login com Instagram (Instagram API with Instagram Login).
//
// O fluxo roda em popup: o usuario clica em "Entrar com Instagram", autoriza na
// pagina do proprio Instagram e o backend troca o code por um token de longa
// duracao. O App Secret nunca passa pelo navegador.

import { backendUrl } from './backend';

export interface InstagramAppConfig {
  configured: boolean;
  appId: string;
  redirectUri: string;
  scopes: string;
  /** token usado pela Meta para validar a URL do webhook */
  verifyToken: string;
  /** URL que recebe as mensagens do Instagram */
  webhookUrl: string;
  hasSecret: boolean;
  fromEnv: boolean;
}

export interface InstagramAccount {
  accessToken: string;
  userId: string;
  username: string;
  name?: string;
  profilePicture?: string;
  accountType?: string;
  expiresIn?: number;
  connectedAt?: string;
}

const randomState = () => `ig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export async function getAppConfig(): Promise<InstagramAppConfig> {
  const res = await fetch(`${backendUrl()}/api/integrations/instagram/config`);
  const d = await res.json();
  return {
    configured: !!d.configured,
    appId: d.appId || '',
    redirectUri: d.redirectUri || '',
    scopes: d.scopes || '',
    verifyToken: d.verifyToken || '',
    webhookUrl: d.webhookUrl || '',
    hasSecret: !!d.hasSecret,
    fromEnv: !!d.fromEnv,
  };
}

export async function saveAppConfig(cfg: {
  appId: string;
  appSecret?: string;
  redirectUri: string;
  scopes?: string;
  verifyToken?: string;
}): Promise<InstagramAppConfig> {
  const res = await fetch(`${backendUrl()}/api/integrations/instagram/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  });
  const d = await res.json();
  return {
    configured: !!d.configured,
    appId: d.appId || '',
    redirectUri: d.redirectUri || '',
    scopes: d.scopes || '',
    verifyToken: d.verifyToken || '',
    webhookUrl: d.webhookUrl || '',
    hasSecret: !!d.hasSecret,
    fromEnv: !!d.fromEnv,
  };
}

/**
 * Abre o popup de autorizacao e resolve quando o Instagram devolver a conta.
 * Combina duas estradas: postMessage (rapido) e polling no backend (fallback
 * para navegadores que bloqueiam a comunicacao entre janelas).
 */
export function loginWithInstagram(timeoutMs = 180000): Promise<InstagramAccount> {
  return new Promise(async (resolve, reject) => {
    const state = randomState();

    let authUrl = '';
    try {
      const res = await fetch(`${backendUrl()}/api/instagram/auth-url?state=${encodeURIComponent(state)}`);
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || 'App do Instagram nao configurado.');
      authUrl = d.url;
    } catch (e: any) {
      reject(new Error(e?.message || 'Nao foi possivel iniciar o login do Instagram.'));
      return;
    }

    const w = 600;
    const h = 760;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(authUrl, 'instagram-login', `width=${w},height=${h},left=${left},top=${top}`);

    if (!popup) {
      reject(new Error('O navegador bloqueou a janela de login. Libere os pop-ups para este site e tente de novo.'));
      return;
    }

    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      clearInterval(poll);
      clearTimeout(timer);
      try {
        popup.close();
      } catch {}
      fn();
    };

    const handleResult = (payload: any) => {
      if (!payload) return;
      if (payload.ok) {
        finish(() => resolve(payload as InstagramAccount));
      } else {
        finish(() => reject(new Error(payload.error || 'Autorizacao negada.')));
      }
    };

    const onMessage = (ev: MessageEvent) => {
      const data: any = ev.data;
      if (data && data.source === 'leadflow-instagram') handleResult(data.payload);
    };
    window.addEventListener('message', onMessage);

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${backendUrl()}/api/instagram/result?state=${encodeURIComponent(state)}`);
        const d = await res.json();
        if (d.ready) handleResult(d.result);
      } catch {}
      if (popup.closed && !done) {
        // da uma ultima chance ao backend antes de desistir
        setTimeout(async () => {
          if (done) return;
          try {
            const res = await fetch(`${backendUrl()}/api/instagram/result?state=${encodeURIComponent(state)}`);
            const d = await res.json();
            if (d.ready) {
              handleResult(d.result);
              return;
            }
          } catch {}
          finish(() => reject(new Error('Janela fechada antes de concluir a autorizacao.')));
        }, 1200);
      }
    }, 1500);

    const timer = setTimeout(() => {
      finish(() => reject(new Error('Tempo esgotado aguardando a autorizacao do Instagram.')));
    }, timeoutMs);
  });
}

export async function sendDirectMessage(account: InstagramAccount, to: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl()}/api/instagram/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: account.accessToken, userId: account.userId, to, text }),
    });
    const d = await res.json();
    return !!d.ok;
  } catch {
    return false;
  }
}
