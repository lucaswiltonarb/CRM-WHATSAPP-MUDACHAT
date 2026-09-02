import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import type { Channel } from '../../types';
import { PageHeader, EmptyState, LoadingState, Modal, ConfirmDialog } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import * as evo from '../../services/evolution';
import * as uaz from '../../services/uazapi';
import * as ig from '../../services/instagram';
import { backendUrl } from '../../services/backend';
import { syncToBackend } from '../../services/backend';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  whatsapp_official: { label: 'WhatsApp API Oficial (Meta)', icon: 'ti ti-brand-whatsapp', color: '#075e54' },
  whatsapp_evolution: { label: 'WhatsApp (Evolution API)', icon: 'ti ti-brand-whatsapp', color: '#25d366' },
  whatsapp_uazapi: { label: 'WhatsApp (UAZAPI)', icon: 'ti ti-brand-whatsapp', color: '#12b886' },
  whatsapp_twilio: { label: 'WhatsApp (Twilio)', icon: 'ti ti-brand-whatsapp', color: '#f22f46' },
  instagram: { label: 'Instagram', icon: 'ti ti-brand-instagram', color: '#e1306c' },
  facebook: { label: 'Facebook', icon: 'ti ti-brand-facebook', color: '#1877f2' },
  webchat: { label: 'Webchat', icon: 'ti ti-world', color: '#5d87ff' },
};

export default function Connections() {
  const { notify } = useToast();
  const { connectionTypes, limitOf, reached, integrations, workspace } = useWorkspace();
  const [igBusy, setIgBusy] = useState(false);
  const [items, setItems] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [qrModal, setQrModal] = useState<Channel | null>(null);
  const [qrData, setQrData] = useState('');
  const [qrImg, setQrImg] = useState('');
  const [qrPairing, setQrPairing] = useState('');
  const [qrError, setQrError] = useState('');
  const [qrStatus, setQrStatus] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = () => api.channels.list().then((c) => { setItems(c); setLoading(false); });
  useEffect(() => { load(); }, []);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  const closeQr = () => { stopPoll(); setQrModal(null); setQrImg(''); setQrPairing(''); setQrError(''); setQrStatus(''); setQrData(''); };

  const evoCreds = (c: Channel): evo.EvoCreds => {
    const cr: any = c.credentials || {};
    return { serverUrl: cr.serverUrl, apiKey: cr.apiKey, instanceName: cr.instanceName };
  };

  const create = async () => {
    if (!form.name || !form.type) { notify('Preencha nome e tipo', 'warning'); return; }
    if (reached('connections', items.length)) {
      notify(`Limite de conexoes do plano atingido (${limitOf('connections')}). Fale com o administrador para liberar mais.`, 'error');
      return;
    }
    if (!connectionTypes.includes(form.type)) {
      notify('Este tipo de canal nao esta liberado no seu plano.', 'error');
      return;
    }
    const c = await api.channels.create(form);
    await api.audit.log('Canal criado', 'Conexões', 'Channel', c.id);
    setItems(p => [...p, c]); setOpen(false); notify('Conexão criada');
  };

  const connectInstagram = async (c: Channel) => {
    setIgBusy(true);
    try {
      await api.channels.update(c.id, { status: 'connecting' });
      setItems(p => p.map(x => x.id === c.id ? { ...x, status: 'connecting' } : x));
      const acc = await ig.loginWithInstagram();
      const u = await api.channels.update(c.id, {
        status: 'connected',
        lastSync: new Date().toISOString(),
        credentials: {
          ...(c.credentials || {}),
          provider: 'instagram_login',
          accessToken: acc.accessToken,
          userId: acc.userId,
          username: acc.username,
          profilePicture: acc.profilePicture,
          accountType: acc.accountType,
          expiresIn: acc.expiresIn,
          connectedAt: acc.connectedAt,
        },
      });
      setItems(p => p.map(x => x.id === c.id ? u : x));
      notify(`Instagram conectado: @${acc.username || acc.userId}`);
      api.audit.log('Canal Instagram conectado', 'Conexoes', 'Channel', c.id);
      await syncToBackend();
    } catch (e: any) {
      notify(e?.message || 'Falha ao conectar o Instagram', 'error');
      await api.channels.update(c.id, { status: 'error' });
      setItems(p => p.map(x => x.id === c.id ? { ...x, status: 'error' } : x));
    } finally {
      setIgBusy(false);
    }
  };

  const startConnect = async (c: Channel) => {
    const creds = evoCreds(c);
    setQrModal(c); setQrImg(''); setQrPairing(''); setQrError(''); setQrData(''); setQrStatus('Iniciando...');

    // Meta Cloud API (Official) — no QR, just validate token
    if ((c.type as string) === 'whatsapp_official') {
      const cr: any = c.credentials || {};
      if (!cr.phoneNumberId || !cr.accessToken) {
        setQrError('Preencha o Phone Number ID e Access Token nas configurações do canal.');
        setQrStatus('');
        return;
      }
      setQrStatus('Validando credenciais Meta...');
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${cr.phoneNumberId}?access_token=${cr.accessToken}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const u = await api.channels.update(c.id, { status: 'connected', lastSync: new Date().toISOString() });
        setItems(p => p.map(x => x.id === c.id ? u : x));
        notify(`WhatsApp Oficial conectado! Número: ${data.display_phone_number || data.verified_name || cr.phoneNumberId}`);
        api.audit.log('Canal Meta Cloud conectado', 'Conexões', 'Channel', c.id);
        const sync = await syncToBackend();
        if (sync.ok) notify('Sincronizado com backend', 'success');
        closeQr();
      } catch (e: any) {
        setQrError(e?.message || 'Falha ao validar credenciais Meta. Verifique Phone Number ID e Access Token.');
        setQrStatus('');
        await api.channels.update(c.id, { status: 'error' });
        setItems(p => p.map(x => x.id === c.id ? { ...x, status: 'error' } : x));
      }
      return;
    }

    // ---- UAZAPI: cria a instancia com o admintoken do workspace e mostra o QR ----
    if ((c.type as string) === 'whatsapp_uazapi') {
      const cfg = integrations.uazapi;
      if (!cfg?.serverUrl || !cfg?.adminToken) {
        setQrError('As credenciais da UAZAPI deste workspace ainda nao foram cadastradas. Peca ao administrador da plataforma para preencher em Administrativo Geral > Workspaces > Credenciais.');
        setQrStatus('');
        return;
      }
      const cr: any = c.credentials || {};
      const slug = String(c.name || 'canal').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20);
      const instanceName = cr.instanceName || `${cfg.instancePrefix || workspace?.slug || 'crm'}-${slug}`;
      let token: string = cr.token || '';
      try {
        await api.channels.update(c.id, { status: 'connecting' });
        setItems(p => p.map(x => x.id === c.id ? { ...x, status: 'connecting' } : x));

        if (!token) {
          setQrStatus('Criando instancia na UAZAPI...');
          const created = await uaz.createInstance({ serverUrl: cfg.serverUrl, adminToken: cfg.adminToken }, instanceName);
          token = created.token || '';
          if (!token) throw new Error('A UAZAPI nao retornou o token da instancia.');
          const withToken = { ...cr, instanceName, token, serverUrl: cfg.serverUrl, provider: 'uazapi' };
          await api.channels.update(c.id, { credentials: withToken });
          setItems(p => p.map(x => x.id === c.id ? ({ ...x, credentials: withToken } as any) : x));
        }

        const creds2 = { serverUrl: cfg.serverUrl, token, instanceName };
        setQrStatus('Gerando QR Code...');
        const conn = await uaz.connectInstance(creds2);
        if (conn.qrcode) setQrImg(conn.qrcode);
        if (conn.paircode) setQrPairing(conn.paircode);
        if (!conn.qrcode && !conn.paircode && conn.status !== 'connected') {
          setQrError('A UAZAPI nao retornou QR Code. Confira o servidor e o admin token do workspace.');
        }
        setQrStatus('Aguardando leitura no WhatsApp...');

        stopPoll();
        let ticks = 0;
        pollRef.current = setInterval(async () => {
          ticks++;
          try {
            const st = await uaz.instanceStatus(creds2);
            if (st.status === 'connected') {
              stopPoll();
              await uaz.setWebhook(creds2, `${backendUrl()}/api/webhook/${encodeURIComponent(instanceName)}`);
              const u = await api.channels.update(c.id, {
                status: 'connected',
                lastSync: new Date().toISOString(),
                credentials: { ...cr, instanceName, token, serverUrl: cfg.serverUrl, provider: 'uazapi', owner: st.owner, profileName: st.profileName },
              });
              setItems(p => p.map(x => x.id === c.id ? u : x));
              notify(st.profileName ? `WhatsApp conectado via UAZAPI (${st.profileName})!` : 'WhatsApp conectado via UAZAPI!');
              api.audit.log('Canal UAZAPI conectado', 'Conexoes', 'Channel', c.id);
              const sync = await syncToBackend();
              if (!sync.ok) notify(`Conectado, mas a sincronizacao com o backend falhou (${sync.error}).`, 'warning');
              closeQr();
            } else if (st.qrcode && ticks % 4 === 0) {
              setQrImg(st.qrcode);
            }
          } catch { /* segue tentando */ }
          if (ticks > 60) { stopPoll(); setQrStatus('Tempo esgotado. Tente novamente.'); }
        }, 3000);
      } catch (e: any) {
        setQrError(e?.message || 'Falha ao conectar na UAZAPI.');
        setQrStatus('');
        await api.channels.update(c.id, { status: 'error' });
        setItems(p => p.map(x => x.id === c.id ? { ...x, status: 'error' } : x));
      }
      return;
    }

    // ---- Instagram: login OAuth na propria pagina do Instagram ----
    if ((c.type as string) === 'instagram') {
      closeQr();
      await connectInstagram(c);
      return;
    }

    // Real Evolution API flow when credentials are provided.
    if ((c.type as string) === 'whatsapp_evolution' && evo.hasCreds(creds)) {
      try {
        await api.channels.update(c.id, { status: 'connecting' });
        setItems(p => p.map(x => x.id === c.id ? { ...x, status: 'connecting' } : x));
        setQrStatus('Criando instância...');
        const created = await evo.createInstance(creds);
        let qr = created.qr;
        if (!qr || !qr.base64) { setQrStatus('Gerando QR Code...'); qr = await evo.connectInstance(creds); }
        if (qr?.base64) setQrImg(qr.base64);
        if (qr?.pairingCode) setQrPairing(qr.pairingCode);
        if (!qr?.base64 && !qr?.pairingCode) setQrError('Servidor não retornou QR Code. Verifique a instância.');
        setQrStatus('Aguardando leitura...');
        await api.audit.log('Instância Evolution criada', 'Conexões', 'Channel', c.id);

        // Poll connection state until connected.
        stopPoll();
        let ticks = 0;
        pollRef.current = setInterval(async () => {
          ticks++;
          const state = await evo.connectionState(creds);
          if (state === 'open') {
            stopPoll();
            const u = await api.channels.update(c.id, { status: 'connected', lastSync: new Date().toISOString() });
            setItems(p => p.map(x => x.id === c.id ? u : x));
            notify('WhatsApp conectado!'); api.audit.log('Canal conectado', 'Conexões', 'Channel', c.id);
            // Register the webhook on the instance + push instances/automations to the backend.
            const sync = await syncToBackend();
            if (sync.ok) notify('Webhook configurado na instância', 'success');
            else notify(`Conectado, mas o webhook não foi configurado (${sync.error}). Inicie o backend.`, 'warning');
            closeQr();
          } else if (ticks % 5 === 0) {
            // refresh QR every ~15s (codes expire)
            try { const nq = await evo.connectInstance(creds); if (nq.base64) setQrImg(nq.base64); } catch { /* ignore */ }
          }
          if (ticks > 60) { stopPoll(); setQrStatus('Tempo esgotado. Tente novamente.'); }
        }, 3000);
      } catch (e: any) {
        setQrError(e?.message || 'Não foi possível conectar à Evolution API. Verifique URL, API Key e CORS do servidor.');
        setQrStatus('');
        await api.channels.update(c.id, { status: 'error' });
        setItems(p => p.map(x => x.id === c.id ? { ...x, status: 'error' } : x));
      }
      return;
    }

    // Demo mode (no real credentials): simulate QR + connection.
    const res = await api.channels.connect(c.id);
    setQrData(res.qrCode); setQrStatus('Modo demonstração — simulando conexão...'); load();
    pollRef.current = setTimeout(async () => {
      const u = await api.channels.confirmConnection(c.id);
      setItems(p => p.map(x => x.id === c.id ? u : x));
      notify('WhatsApp conectado! (demo)'); api.audit.log('Canal conectado', 'Conexões', 'Channel', c.id);
      closeQr();
    }, 5000) as any;
  };

  const disconnect = async (c: Channel) => {
    const creds = evoCreds(c);
    if ((c.type as string) === 'whatsapp_evolution' && evo.hasCreds(creds)) { await evo.logoutInstance(creds); }
    const u = await api.channels.disconnect(c.id); setItems(p => p.map(x => x.id === c.id ? u : x)); notify('Desconectado');
  };
  const doDelete = async () => { if (!delId) return; const list = items.filter(c => c.id !== delId); setItems(list); localStorage.setItem('channels', JSON.stringify(list)); notify('Removido'); };

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader title="Conexões / Canais" subtitle="WhatsApp, Instagram, Facebook e mais"
        actions={<button data-testid="new-connection-btn" className="btn btn-primary" disabled={reached('connections', items.length)} title={reached('connections', items.length) ? 'Limite do plano atingido' : ''} onClick={() => { setForm({ type: connectionTypes[0] || 'whatsapp_official', name: '', credentials: {} }); setOpen(true); }}><i className="ti ti-plus" /> Nova Conexão</button>} />

      <div className="plan-usage-bar">
        <i className="ti ti-plug" />
        <span>Conexões: <strong>{items.length}</strong> de {limitOf('connections') === -1 ? 'ilimitadas' : limitOf('connections')} do seu plano</span>
        {reached('connections', items.length) && <span className="badge bg-light-danger text-danger">Limite atingido</span>}
      </div>

      {items.length === 0 ? <div className="card"><EmptyState icon="ti ti-plug" title="Nenhuma conexão" description="Conecte um canal de atendimento." /></div> : (
        <div className="card-grid">
          {items.map(c => { const m = TYPE_META[c.type] || TYPE_META.webchat; return (
            <div key={c.id} className="card conn-card">
              <div className="flex justify-between items-start">
                <div className="conn-icon" style={{ background: m.color + '22', color: m.color }}><i className={m.icon} /></div>
                <span className={`conn-status ${c.status}`}><span className="dot" /> {c.status === 'connected' ? 'Conectado' : c.status === 'connecting' ? 'Conectando' : 'Desconectado'}</span>
              </div>
              <h3 className="conn-name">{c.name}</h3>
              <p className="conn-type">{m.label}</p>
              {c.lastSync && <p className="text-xs text-muted">Última sincronização: {new Date(c.lastSync).toLocaleString('pt-BR')}</p>}
              <div className="flex gap-1 mt-1">
                {c.status !== 'connected' ? (
                  (c.type as string) === 'instagram'
                    ? <button className="btn btn-sm btn-instagram" disabled={igBusy} onClick={() => connectInstagram(c)}><i className="ti ti-brand-instagram" /> {igBusy ? 'Aguardando...' : 'Entrar com Instagram'}</button>
                    : <button className="btn btn-sm btn-success" onClick={() => startConnect(c)}><i className="ti ti-qrcode" /> Conectar</button>)
                  : <button className="btn btn-sm btn-light-danger" onClick={() => disconnect(c)}>Desconectar</button>}
                <button className="btn btn-sm btn-light-secondary" onClick={() => { setForm(c); setOpen(true); }}><i className="ti ti-settings" /></button>
                <button className="btn btn-sm btn-light-danger" onClick={() => setDelId(c.id)}><i className="ti ti-trash" /></button>
              </div>
            </div>
          ); })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Configurar Conexão' : 'Nova Conexão'} size="lg"
        footer={<><button className="btn btn-light-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={form.id ? async () => { const u = await api.channels.update(form.id, form); setItems(p => p.map(c => c.id === form.id ? u : c)); setOpen(false); notify('Salvo'); } : create}>Salvar</button></>}>
        <div className="form-group"><label>Tipo de Canal</label><select data-testid="channel-type-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{Object.entries(TYPE_META).filter(([k]) => connectionTypes.includes(k)).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div className="form-group"><label>Nome interno <span className="req">*</span></label><input data-testid="channel-name-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Atendimento Principal" /></div>

        {form.type === 'whatsapp_official' && <div className="cred-box"><h4>Credenciais WhatsApp API Oficial (Meta Cloud)</h4>
          <p className="text-sm text-muted" style={{marginBottom:'1rem'}}>Configure sua conta no <a href="https://business.facebook.com" target="_blank" rel="noreferrer">Meta Business</a> → WhatsApp → Configuração da API.</p>
          <div className="form-group"><label>Phone Number ID <span className="req">*</span></label><input value={form.credentials?.phoneNumberId || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, phoneNumberId: e.target.value } })} placeholder="Ex: 123456789012345" /></div>
          <div className="form-group"><label>Access Token (permanente) <span className="req">*</span></label><input type="password" value={form.credentials?.accessToken || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, accessToken: e.target.value } })} placeholder="EAAxxxxxxx..." /></div>
          <div className="form-group"><label>WABA ID (WhatsApp Business Account)</label><input value={form.credentials?.wabaId || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, wabaId: e.target.value } })} placeholder="Ex: 987654321098765" /></div>
          <div className="form-group"><label>Verify Token (para webhook)</label><input value={form.credentials?.verifyToken || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, verifyToken: e.target.value } })} placeholder="Token personalizado para validação" /></div>
          <div className="form-group"><label>Catalog ID (para pagamentos nativos)</label><input value={form.credentials?.catalogId || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, catalogId: e.target.value } })} placeholder="ID do catálogo no Commerce Manager" /></div>
          <div style={{background:'rgba(33,114,219,.08)',borderRadius:10,padding:'.8rem 1rem',fontSize:'.82rem',color:'#1e40af',marginTop:'.5rem'}}>
            <i className="ti ti-info-circle" style={{marginRight:'.4rem'}} />
            <strong>PIX nativo:</strong> Para cobranças PIX direto no WhatsApp, configure um provedor de pagamento (ex: Cielo) no Commerce Manager da Meta e informe o Catalog ID acima.
          </div>
        </div>}

        {form.type === 'whatsapp_evolution' && <div className="cred-box"><h4>Credenciais Evolution API</h4>
          <div className="form-group"><label>URL do servidor</label><input value={form.credentials?.serverUrl || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, serverUrl: e.target.value } })} placeholder="https://evolution.seudominio.com" /></div>
          <div className="form-group"><label>API Key</label><input type="password" value={form.credentials?.apiKey || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, apiKey: e.target.value } })} /></div>
          <div className="form-group"><label>Nome da Instância</label><input value={form.credentials?.instanceName || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, instanceName: e.target.value } })} placeholder="minha-instancia" /></div>
        </div>}
        {form.type === 'whatsapp_uazapi' && <div className="cred-box"><h4>Conexao via UAZAPI</h4>
          {integrations.uazapi?.serverUrl && integrations.uazapi?.adminToken ? (
            <>
              <p className="text-sm text-muted" style={{marginBottom:'1rem'}}>Este workspace ja tem credenciais UAZAPI cadastradas pelo administrador da plataforma. Basta dar um nome ao canal e clicar em <strong>Conectar</strong> para ler o QR Code.</p>
              <div className="form-group"><label>Servidor</label><input value={integrations.uazapi.serverUrl} readOnly disabled /></div>
              <div className="form-group"><label>Nome da instancia (opcional)</label><input value={form.credentials?.instanceName || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, instanceName: e.target.value } })} placeholder="deixe vazio para gerar automaticamente" /></div>
              <div className="alert-note"><i className="ti ti-info-circle" /> A instancia e o token sao criados automaticamente na UAZAPI na primeira conexao.</div>
            </>
          ) : (
            <div className="alert-note"><i className="ti ti-alert-triangle" /> As credenciais UAZAPI deste workspace ainda nao foram cadastradas. Configure em <strong>Administrativo Geral &gt; Workspaces &gt; Credenciais</strong>.</div>
          )}
        </div>}

        {form.type === 'instagram' && <div className="cred-box"><h4>Instagram</h4>
          <p className="text-sm text-muted" style={{marginBottom:'1rem'}}>A conexao e feita pelo login do proprio Instagram. Salve o canal e depois clique em <strong>Entrar com Instagram</strong> no card: uma janela do Instagram vai abrir para autorizar a conta.</p>
          <div className="alert-note"><i className="ti ti-info-circle" /> A conta precisa ser <strong>Comercial ou Criador</strong>. O app da Meta usado e o mesmo para toda a plataforma e fica em Administrativo Geral &gt; Integracoes.</div>
        </div>}

        {form.type === 'whatsapp_twilio' && <div className="cred-box"><h4>Credenciais Twilio</h4>
          <div className="form-group"><label>Account SID</label><input value={form.credentials?.accountSid || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, accountSid: e.target.value } })} /></div>
          <div className="form-group"><label>Auth Token</label><input type="password" value={form.credentials?.authToken || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, authToken: e.target.value } })} /></div>
          <div className="form-group"><label>Número WhatsApp</label><input value={form.credentials?.phoneNumber || ''} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, phoneNumber: e.target.value } })} placeholder="+5511999999999" /></div>
        </div>}

        <h4 className="mt-2">Configurações padrão</h4>
        <div className="form-row">
          <div className="form-group"><label>Agente IA padrão</label><input value={form.defaultAgentId || ''} onChange={(e) => setForm({ ...form, defaultAgentId: e.target.value })} placeholder="Opcional" /></div>
          <div className="form-group"><label>Mensagem de boas-vindas</label><input value={form.autoMessages?.welcome || ''} onChange={(e) => setForm({ ...form, autoMessages: { ...form.autoMessages, welcome: e.target.value } })} /></div>
        </div>
      </Modal>

      {qrModal && <Modal open onClose={closeQr} title={`Conectar â€” ${qrModal.name}`} size="md">
        <div className="qr-wrap">
          {qrError ? (
            <div className="alert-note" style={{ background: 'rgba(239,68,68,.12)', color: '#b91c1c' }}>
              <i className="ti ti-alert-triangle" /> {qrError}
            </div>
          ) : qrImg ? (
            <div className="qr-code" style={{ background: '#fff', padding: 12 }}>
              <img src={qrImg} alt="QR Code WhatsApp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <div className="qr-code"><i className="ti ti-qrcode" /><div className="qr-pattern">{qrData.slice(0, 64)}</div></div>
          )}
          {qrPairing && <p className="text-center">Código de pareamento: <strong style={{ fontSize: '1.2rem', letterSpacing: 2 }}>{qrPairing}</strong></p>}
          <p className="text-center">Abra o WhatsApp no celular → <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong> e escaneie o código.</p>
          {!qrError && qrStatus && <div className="flex items-center justify-center gap-1 text-muted"><div className="spinner" /> {qrStatus}</div>}
          {qrError && <div className="flex justify-center" style={{ marginTop: '.75rem' }}><button className="btn btn-primary" onClick={() => startConnect(qrModal)}>Tentar novamente</button></div>}
        </div>
      </Modal>}

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Remover conexão" message="Deseja remover esta conexão?" />
    </div>
  );
}



