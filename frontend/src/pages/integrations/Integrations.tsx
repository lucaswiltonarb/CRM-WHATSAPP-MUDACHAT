/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { PageHeader, Modal } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { syncToBackend } from '../../services/backend';

interface Integ {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  connected: boolean;
  credentials?: Record<string, string>;
}
const DEFAULTS: Integ[] = [
  { id: 'google_calendar', name: 'Google Calendar', icon: 'ti ti-calendar', color: '#4285f4', category: 'Calendario', connected: false },
  { id: 'stripe', name: 'Stripe', icon: 'ti ti-credit-card', color: '#635bff', category: 'Pagamento', connected: false },
  { id: 'mercadopago', name: 'Mercado Pago', icon: 'ti ti-businessplan', color: '#00b1ea', category: 'Pagamento', connected: false },
  { id: 'asaas', name: 'Asaas', icon: 'ti ti-receipt-2', color: '#ec4899', category: 'Pagamento', connected: false },
  { id: 'docusign', name: 'Assinatura Digital', icon: 'ti ti-signature', color: '#ffb900', category: 'Documentos', connected: false },
  { id: 'meta_ads', name: 'Meta Ads', icon: 'ti ti-ad', color: '#1877f2', category: 'ADS', connected: false },
  { id: 'google_ads', name: 'Google Ads', icon: 'ti ti-brand-google', color: '#34a853', category: 'ADS', connected: false },
  { id: 'webhook_out', name: 'Webhooks de Saida', icon: 'ti ti-webhook', color: '#64748b', category: 'API', connected: false },
  { id: 'rest_api', name: 'API REST Externa', icon: 'ti ti-api', color: '#7c3aed', category: 'API', connected: false },
];

export default function Integrations() {
  const { notify } = useToast();
  const [items, setItems] = useState<Integ[]>([]);
  const [active, setActive] = useState<Integ | null>(null);
  const [cred, setCred] = useState<Record<string, string>>({});

  useEffect(() => {
    const raw = localStorage.getItem('integrations');
    const parsed = raw ? (JSON.parse(raw) as Integ[]) : DEFAULTS;
    setItems(parsed);
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
  const toggle = async (i: Integ) => {
    if (i.connected) {
      persist(items.map((x) => (x.id === i.id ? { ...x, connected: false } : x)));
      await syncToBackend();
      notify('Desconectado');
    } else {
      setActive(i);
      setCred(i.credentials || {});
    }
  };

  const cats = [...new Set(items.map((i) => i.category))];

  return (
    <div className="page-shell">
      <PageHeader title="Integracoes" subtitle="Conecte ferramentas externas" />
      {cats.map((cat) => (
        <div key={cat} className="mb-2">
          <h3 className="section-title">{cat}</h3>
          <div className="card-grid">
            {items
              .filter((i) => i.category === cat)
              .map((i) => (
                <div key={i.id} className="card integ-card">
                  <div className="integ-icon" style={{ background: i.color + '22', color: i.color }}>
                    <i className={i.icon} />
                  </div>
                  <h4>{i.name}</h4>
                  <span className={`badge bg-light-${i.connected ? 'success' : 'secondary'} text-${i.connected ? 'success' : 'secondary'}`}>{i.connected ? 'Conectado' : 'Nao conectado'}</span>
                  <button className={`btn btn-sm ${i.connected ? 'btn-light-danger' : 'btn-primary'} mt-1`} onClick={() => void toggle(i)}>
                    {i.connected ? 'Desconectar' : 'Conectar'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}

      {active && (
        <Modal
          open
          onClose={() => setActive(null)}
          title={`Conectar ${active.name}`}
          footer={
            <>
              <button className="btn btn-light-secondary" onClick={() => setActive(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={() => void connect()}>
                Conectar
              </button>
            </>
          }
        >
          <div className="form-group">
            <label>API Key / Token</label>
            <input value={cred.apiKey || ''} onChange={(e) => setCred({ ...cred, apiKey: e.target.value })} />
          </div>
          {active.id === 'asaas' && (
            <>
              <div className="form-group">
                <label>Base URL</label>
                <input value={cred.baseUrl || 'https://sandbox.asaas.com/api/v3'} onChange={(e) => setCred({ ...cred, baseUrl: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Webhook Token (opcional)</label>
                <input value={cred.webhookToken || ''} onChange={(e) => setCred({ ...cred, webhookToken: e.target.value })} />
              </div>
              <div className="form-group">
                <label>CPF/CNPJ padrao (sandbox)</label>
                <input value={cred.defaultCpfCnpj || ''} onChange={(e) => setCred({ ...cred, defaultCpfCnpj: e.target.value })} />
              </div>
            </>
          )}
          <div className="form-group">
            <label>Secret (opcional)</label>
            <input type="password" value={cred.secret || ''} onChange={(e) => setCred({ ...cred, secret: e.target.value })} />
          </div>
          <div className="form-group">
            <label>URL de callback / webhook</label>
            <input value={cred.url || ''} onChange={(e) => setCred({ ...cred, url: e.target.value })} />
          </div>
          <p className="text-xs text-muted">As credenciais sao armazenadas localmente para esta demonstracao.</p>
        </Modal>
      )}
    </div>
  );
}


