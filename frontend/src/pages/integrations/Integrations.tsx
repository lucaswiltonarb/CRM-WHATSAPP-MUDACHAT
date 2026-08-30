/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo } from 'react';
import { PageHeader, Modal, FieldLabel, FormSection, EmptyState } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { syncToBackend } from '../../services/backend';

interface Integ {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  description: string;
  connected: boolean;
  credentials?: Record<string, string>;
}

const DEFAULTS: Integ[] = [
  { id: 'google_calendar', name: 'Google Calendar', icon: 'ti ti-calendar', color: '#4285f4', category: 'Calendário', description: 'Sincronize agendamentos e disponibilidade com a agenda da equipe.', connected: false },
  { id: 'stripe', name: 'Stripe', icon: 'ti ti-credit-card', color: '#635bff', category: 'Pagamento', description: 'Receba pagamentos com cartão e acompanhe cobranças recorrentes.', connected: false },
  { id: 'mercadopago', name: 'Mercado Pago', icon: 'ti ti-businessplan', color: '#00b1ea', category: 'Pagamento', description: 'Gere links de pagamento e Pix direto das conversas.', connected: false },
  { id: 'asaas', name: 'Asaas', icon: 'ti ti-receipt-2', color: '#ec4899', category: 'Pagamento', description: 'Emita boletos e cobranças automáticas para seus clientes.', connected: false },
  { id: 'docusign', name: 'Assinatura Digital', icon: 'ti ti-signature', color: '#ffb900', category: 'Documentos', description: 'Envie contratos para assinatura eletrônica sem sair do CRM.', connected: false },
  { id: 'meta_ads', name: 'Meta Ads', icon: 'ti ti-ad', color: '#1877f2', category: 'ADS', description: 'Capture leads de campanhas do Facebook e Instagram.', connected: false },
  { id: 'google_ads', name: 'Google Ads', icon: 'ti ti-brand-google', color: '#34a853', category: 'ADS', description: 'Importe leads dos formulários e meça conversões.', connected: false },
  { id: 'webhook_out', name: 'Webhooks de Saída', icon: 'ti ti-webhook', color: '#64748b', category: 'API', description: 'Notifique sistemas externos a cada evento da plataforma.', connected: false },
  { id: 'rest_api', name: 'API REST Externa', icon: 'ti ti-api', color: '#7c3aed', category: 'API', description: 'Conecte qualquer serviço próprio através de requisições REST.', connected: false },
];

const HINTS: Record<string, string> = {
  apiKey: 'Chave pública fornecida pelo painel do serviço. Usada para autenticar as requisições da plataforma.',
  secret: 'Chave secreta usada para assinar as chamadas. Nunca compartilhe este valor.',
  url: 'Endereço que o serviço vai chamar quando houver um evento. Cole aqui a URL informada na sua conta.',
  baseUrl: 'Endpoint da API. Use o de sandbox para testes e o de produção quando for cobrar de verdade.',
  webhookToken: 'Token opcional para validar que o webhook recebido veio mesmo do serviço.',
  defaultCpfCnpj: 'Documento usado como padrão ao criar cobranças de teste no ambiente sandbox.',
};

export default function Integrations() {
  const { notify } = useToast();
  const [items, setItems] = useState<Integ[]>([]);
  const [active, setActive] = useState<Integ | null>(null);
  const [cred, setCred] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    const raw = localStorage.getItem('integrations');
    const saved = raw ? (JSON.parse(raw) as Integ[]) : [];
    // Mescla com os defaults para trazer descrições/categorias novas sem perder o que já foi conectado.
    setItems(DEFAULTS.map((d) => ({ ...d, ...saved.find((s) => s.id === d.id), name: d.name, icon: d.icon, color: d.color, category: d.category, description: d.description })));
  }, []);

  const persist = (list: Integ[]) => {
    setItems(list);
    localStorage.setItem('integrations', JSON.stringify(list));
  };

  const connect = async () => {
    if (!active) return;
    const list = items.map((i) => (i.id === active.id ? { ...i, connected: true, credentials: cred } : i));
    persist(list);
    await syncToBackend();
    api.audit.log('Integracao conectada', 'Integracoes', 'Integration', active.id);
    setActive(null);
    notify(`${active.name} conectado`);
  };

  const disconnect = async (i: Integ) => {
    persist(items.map((x) => (x.id === i.id ? { ...x, connected: false } : x)));
    await syncToBackend();
    notify('Desconectado');
  };

  const openConfig = (i: Integ) => { setActive(i); setCred(i.credentials || {}); };

  const categories = useMemo(() => ['all', ...new Set(DEFAULTS.map((i) => i.category))], []);

  const filtered = items.filter((i) => {
    if (category !== 'all' && i.category !== category) return false;
    if (status === 'connected' && !i.connected) return false;
    if (status === 'available' && i.connected) return false;
    if (search && !`${i.name} ${i.description} ${i.category}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const connectedCount = items.filter((i) => i.connected).length;

  return (
    <div className="page-shell">
      <PageHeader title="Integrações" subtitle={`Conecte ferramentas externas · ${connectedCount} de ${items.length} ativas`} />

      <div className="integ-toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input placeholder="Buscar integração..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'Todas as categorias' : c}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos os status</option>
          <option value="connected">Conectadas</option>
          <option value="available">Disponíveis</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon="ti ti-plug-connected-x" title="Nenhuma integração encontrada" description="Ajuste a busca ou os filtros para ver outras opções." /></div>
      ) : (
        <div className="integ-grid">
          {filtered.map((i) => (
            <article key={i.id} className={`integ-card ${i.connected ? 'is-connected' : ''}`}>
              <header className="integ-card-head">
                <div className="integ-icon" style={{ background: `${i.color}1a`, color: i.color }}>
                  <i className={i.icon} />
                </div>
                <span className="integ-cat">{i.category}</span>
              </header>
              <h4 className="integ-name">{i.name}</h4>
              <p className="integ-desc">{i.description}</p>
              <footer className="integ-card-foot">
                <span className={`integ-status ${i.connected ? 'on' : ''}`}>
                  <span className="dot" />{i.connected ? 'Conectado' : 'Não conectado'}
                </span>
                {i.connected ? (
                  <div className="integ-actions">
                    <button className="btn btn-sm btn-light-secondary" onClick={() => openConfig(i)}><i className="ti ti-settings" /> Gerenciar</button>
                    <button className="btn btn-sm btn-light-danger" onClick={() => void disconnect(i)}>Desconectar</button>
                  </div>
                ) : (
                  <button className="btn btn-sm btn-primary" onClick={() => openConfig(i)}>Conectar</button>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}

      {active && (
        <Modal
          open
          onClose={() => setActive(null)}
          title={`Conectar ${active.name}`}
          subtitle={active.description}
          footer={
            <>
              <button className="btn btn-light-secondary" onClick={() => setActive(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => void connect()}>{active.connected ? 'Salvar' : 'Conectar'}</button>
            </>
          }
        >
          <FormSection title="Credenciais" columns={2}>
            <div className="form-group span-all">
              <FieldLabel hint={HINTS.apiKey} required>API Key / Token</FieldLabel>
              <input value={cred.apiKey || ''} onChange={(e) => setCred({ ...cred, apiKey: e.target.value })} placeholder="pk_live_..." />
            </div>
            <div className="form-group span-all">
              <FieldLabel hint={HINTS.secret}>Secret</FieldLabel>
              <input type="password" value={cred.secret || ''} onChange={(e) => setCred({ ...cred, secret: e.target.value })} placeholder="••••••••" />
            </div>
          </FormSection>

          {active.id === 'asaas' && (
            <FormSection title="Configuração Asaas" columns={2}>
              <div className="form-group span-all">
                <FieldLabel hint={HINTS.baseUrl}>Base URL</FieldLabel>
                <input value={cred.baseUrl || 'https://sandbox.asaas.com/api/v3'} onChange={(e) => setCred({ ...cred, baseUrl: e.target.value })} />
              </div>
              <div className="form-group">
                <FieldLabel hint={HINTS.webhookToken}>Webhook Token</FieldLabel>
                <input value={cred.webhookToken || ''} onChange={(e) => setCred({ ...cred, webhookToken: e.target.value })} />
              </div>
              <div className="form-group">
                <FieldLabel hint={HINTS.defaultCpfCnpj}>CPF/CNPJ padrão</FieldLabel>
                <input value={cred.defaultCpfCnpj || ''} onChange={(e) => setCred({ ...cred, defaultCpfCnpj: e.target.value })} />
              </div>
            </FormSection>
          )}

          <FormSection title="Retorno">
            <div className="form-group">
              <FieldLabel hint={HINTS.url}>URL de callback / webhook</FieldLabel>
              <input value={cred.url || ''} onChange={(e) => setCred({ ...cred, url: e.target.value })} placeholder="https://..." />
            </div>
          </FormSection>

          <p className="modal-note"><i className="ti ti-lock" /> As credenciais são armazenadas localmente para esta demonstração.</p>
        </Modal>
      )}
    </div>
  );
}
