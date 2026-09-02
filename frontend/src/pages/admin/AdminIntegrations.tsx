import { useEffect, useState } from 'react';
import { PageHeader, LoadingState } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import * as ig from '../../services/instagram';

const STEPS: { title: string; body: string[] }[] = [
  {
    title: '1. Crie o app na Meta',
    body: [
      'Acesse developers.facebook.com/apps e clique em "Criar app".',
      'Em "Casos de uso", escolha **Outro** e depois o tipo **Empresa (Business)**.',
      'De um nome ao app (ex.: LeadFlow CRM), informe o e-mail de contato e crie.',
    ],
  },
  {
    title: '2. Adicione o produto Instagram',
    body: [
      'No painel do app, procure o card **Instagram** e clique em "Configurar".',
      'Escolha a opcao **API do Instagram com login do Instagram** (Instagram API with Instagram Login).',
      'Essa e a opcao que abre a tela de login do proprio Instagram, sem exigir Pagina do Facebook.',
    ],
  },
  {
    title: '3. Copie as credenciais',
    body: [
      'Va em **Instagram > Configuracao da API com login do Instagram**.',
      'Na secao "Configuracoes do app do Instagram" copie o **ID do app do Instagram** e a **Chave secreta do app do Instagram**.',
      'Atencao: use o ID do app do **Instagram**, que e diferente do ID do app do Facebook.',
    ],
  },
  {
    title: '4. Registre a URL de redirecionamento',
    body: [
      'Ainda na configuracao do login, abra **Configurar o login do Instagram para empresas**.',
      'Em "URI de redirecionamento do OAuth autorizado", cole exatamente a URL que aparece aqui ao lado e salve.',
      'Se a URL nao bater caractere por caractere, a Meta recusa o login.',
    ],
  },
  {
    title: '5. Permissoes e testes',
    body: [
      'As permissoes usadas sao: instagram_business_basic, instagram_business_manage_messages e instagram_business_manage_comments.',
      'Em **Funcoes > Testadores do Instagram**, convide as contas que vao testar antes da revisao e aceite o convite em instagram.com > Configuracoes > Apps e sites > Convites de testador.',
      'A conta conectada precisa ser **Comercial ou Criador** e, para receber mensagens, ter as mensagens da API habilitadas em Configuracoes > Privacidade > Mensagens.',
    ],
  },
  {
    title: '6. Ative o webhook das mensagens',
    body: [
      'Ainda em **Instagram > Configuracao da API**, va ate a secao **Webhooks** e clique em "Configurar webhooks".',
      'Cole a **URL de callback** e o **Token de verificacao** que aparecem ao lado, e clique em Verificar e salvar.',
      'Assine os campos **messages** e **messaging_postbacks**. Sem isso as DMs nao chegam no Atendimento.',
      'Em Configuracoes da conta do Instagram, ative **Permitir acesso a mensagens** (Configuracoes > Privacidade > Mensagens > Aplicativos conectados).',
    ],
  },
  {
    title: '7. Publique o app',
    body: [
      'Enquanto o app estiver em desenvolvimento, so contas de teste conseguem autorizar.',
      'Para atender clientes reais, envie o app para **Analise do app** solicitando as permissoes acima e depois mude o app para o modo **Ativo**.',
      'Depois de publicado, qualquer cliente da plataforma consegue conectar o proprio Instagram por este mesmo app global.',
    ],
  },
];

function renderBody(text: string) {
  // suporte simples a **negrito** dentro dos passos
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>));
}

export default function AdminIntegrations() {
  const { notify } = useToast();
  const [cfg, setCfg] = useState<ig.InstagramAppConfig | null>(null);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    ig.getAppConfig()
      .then((c) => {
        setCfg(c);
        setAppId(c.appId);
        setRedirectUri(c.redirectUri);
        setVerifyToken(c.verifyToken);
      })
      .catch(() => setError('Nao foi possivel falar com o backend. Verifique se a API esta no ar.'));
  }, []);

  const save = async () => {
    if (!appId.trim()) {
      notify('Informe o ID do app do Instagram', 'warning');
      return;
    }
    setSaving(true);
    try {
      const c = await ig.saveAppConfig({
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        redirectUri: redirectUri.trim(),
        verifyToken: verifyToken.trim(),
      });
      setCfg(c);
      setVerifyToken(c.verifyToken);
      setAppSecret('');
      notify('Credenciais do app salvas');
    } catch {
      notify('Falha ao salvar as credenciais', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify('Copiado');
    } catch {
      notify('Copie manualmente', 'warning');
    }
  };

  const testLogin = async () => {
    try {
      const acc = await ig.loginWithInstagram();
      notify(`Login OK: @${acc.username || acc.userId}`);
    } catch (e: any) {
      notify(e?.message || 'Falha no login de teste', 'error');
    }
  };

  if (error) {
    return (
      <div className="page-shell">
        <PageHeader title="Integracoes da Plataforma" subtitle="App global do Instagram" />
        <div className="alert-note"><i className="ti ti-alert-triangle" /> {error}</div>
      </div>
    );
  }
  if (!cfg) return <LoadingState label="Carregando configuracao..." />;

  return (
    <div className="page-shell">
      <PageHeader
        title="Integracoes da Plataforma"
        subtitle="Credenciais globais usadas por todos os workspaces"
      />

      <div className="integ-cols">
        <div>
          <div className="card">
            <div className="cred-provider-head">
              <i className="ti ti-brand-instagram" style={{ color: '#e1306c' }} />
              <div>
                <strong>App do Instagram (global)</strong>
                <p className="text-xs text-muted">Um unico app da Meta atende todos os clientes. Cada cliente autoriza a propria conta.</p>
              </div>
              <span className={`badge bg-light-${cfg.configured ? 'success' : 'warning'} text-${cfg.configured ? 'success' : 'warning'}`}>
                {cfg.configured ? 'Configurado' : 'Pendente'}
              </span>
            </div>

            {cfg.fromEnv && (
              <div className="alert-note mb-2">
                <i className="ti ti-lock" /> As credenciais estao vindo de variaveis de ambiente do servidor (IG_APP_ID / IG_APP_SECRET) e tem prioridade sobre o que for salvo aqui.
              </div>
            )}

            <div className="form-grid-2">
              <div className="form-group span-2">
                <label>ID do app do Instagram *</label>
                <input className="form-control" value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="Ex.: 1234567890123456" />
                <p className="text-xs text-muted">Meta &gt; seu app &gt; Instagram &gt; Configuracao da API com login do Instagram.</p>
              </div>
              <div className="form-group span-2">
                <label>Chave secreta do app {cfg.hasSecret && <span className="badge bg-light-success text-success">ja salva</span>}</label>
                <input
                  className="form-control"
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={cfg.hasSecret ? 'Deixe em branco para manter a atual' : 'Cole a chave secreta'}
                />
                <p className="text-xs text-muted">Fica somente no servidor: nunca e devolvida para o navegador.</p>
              </div>
              <div className="form-group span-2">
                <label>URI de redirecionamento do OAuth</label>
                <div className="copy-row">
                  <input className="form-control" value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)} />
                  <button className="btn btn-light-secondary" onClick={() => copy(redirectUri)} title="Copiar">
                    <i className="ti ti-copy" />
                  </button>
                </div>
                <p className="text-xs text-muted">Cole este valor exatamente igual no painel da Meta.</p>
              </div>
              <div className="form-group span-2">
                <label>Permissoes solicitadas</label>
                <div className="scope-chips">
                  {(cfg.scopes || '').split(',').filter(Boolean).map((s) => (
                    <span key={s} className="plan-chip"><i className="ti ti-shield-check" /> {s.trim()}</span>
                  ))}
                </div>
              </div>
              <div className="form-group span-2">
                <label>URL de callback do webhook</label>
                <div className="copy-row">
                  <input className="form-control" value={cfg.webhookUrl} readOnly />
                  <button className="btn btn-light-secondary" onClick={() => copy(cfg.webhookUrl)} title="Copiar">
                    <i className="ti ti-copy" />
                  </button>
                </div>
                <p className="text-xs text-muted">E por aqui que as mensagens do Instagram entram no Atendimento.</p>
              </div>
              <div className="form-group span-2">
                <label>Token de verificacao do webhook</label>
                <div className="copy-row">
                  <input className="form-control" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="gerado automaticamente ao salvar" />
                  <button className="btn btn-light-secondary" onClick={() => copy(verifyToken)} title="Copiar">
                    <i className="ti ti-copy" />
                  </button>
                </div>
                <p className="text-xs text-muted">Cole o mesmo valor no campo "Token de verificacao" da Meta. Assine os campos <code>messages</code> e <code>messaging_postbacks</code>.</p>
              </div>
            </div>

            <div className="flex gap-1 mt-2">
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                <i className="ti ti-device-floppy" /> {saving ? 'Salvando...' : 'Salvar credenciais'}
              </button>
              <button className="btn btn-light-primary" onClick={testLogin} disabled={!cfg.configured}>
                <i className="ti ti-brand-instagram" /> Testar login
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="section-title">Passo a passo na Meta</h3>
          <div className="steps-list">
            {STEPS.map((s, i) => (
              <div key={s.title} className="step-card">
                <span className="step-num">{i + 1}</span>
                <div>
                  <strong>{s.title.replace(/^\d+\.\s*/, '')}</strong>
                  <ul>
                    {s.body.map((b, j) => (
                      <li key={j}>{renderBody(b)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <div className="alert-note mt-2">
            <i className="ti ti-external-link" /> Painel de apps da Meta:{' '}
            <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com/apps</a>
          </div>
        </div>
      </div>
    </div>
  );
}
