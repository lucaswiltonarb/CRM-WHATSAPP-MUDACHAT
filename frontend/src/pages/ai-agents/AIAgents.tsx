import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { AIAgent } from '../../types';
import { PageHeader, EmptyState, LoadingState, Modal } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { avatarSrc } from '../../assets/agentAvatars';
import AgentForm, { emptyAgent } from './AgentForm';

export default function AIAgents() {
  const { notify } = useToast();
  const nav = useNavigate();
  const [items, setItems] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyAgent());
  const [channels, setChannels] = useState<any[]>([]);

  const load = () => api.aiAgents.list().then((a) => { setItems(a); setLoading(false); });
  useEffect(() => { load(); api.channels.list().then(setChannels); }, []);

  const reset = () => setForm(emptyAgent());

  const finish = async () => {
    if (!form.name?.trim()) { notify('Informe o nome do agente', 'warning'); return; }
    const a = await api.aiAgents.create(form);
    await api.audit.log('Agente IA criado', 'Agentes IA', 'AIAgent', a.id);
    setItems(p => [...p, a]); notify('Agente criado'); setWizardOpen(false);
  };

  const toggle = async (a: AIAgent) => {
    const u = await api.aiAgents.update(a.id, { isActive: !a.isActive });
    setItems(p => p.map(x => x.id === a.id ? u : x));
  };

  // Ativos primeiro — quem está rodando aparece no começo da grade.
  const ordered = useMemo(
    () => [...items].sort((a, b) => Number(b.isActive) - Number(a.isActive)),
    [items],
  );

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader title="Agentes de IA" subtitle="Crie e configure agentes inteligentes"
        actions={<button className="btn btn-primary" onClick={() => { reset(); setWizardOpen(true); }}><i className="ti ti-plus" /> Novo Agente</button>} />

      {items.length === 0 ? (
        <div className="card"><EmptyState icon="ti ti-robot" title="Nenhum agente de IA" description="Crie seu primeiro agente inteligente. Base de conhecimento, intenções e follow-up são configurados dentro dele." action={<button className="btn btn-primary" onClick={() => { reset(); setWizardOpen(true); }}>Criar agente</button>} /></div>
      ) : (
        <div className="agent-grid">
          {ordered.map(a => {
            const src = avatarSrc(a.avatar);
            const trained = a.trainingStatus === 'ready' ? 'Treinado' : a.trainingStatus === 'training' ? 'Treinando' : 'Pendente';
            return (
              <article key={a.id} className={`agent-card ${a.isActive ? 'is-active' : ''}`}>
                <div className="agent-card-head">
                  {a.isActive && <span className="agent-flag">ATIVO</span>}
                  <label className="switch" title={a.isActive ? 'Desativar agente' : 'Ativar agente'}>
                    <input type="checkbox" checked={a.isActive} onChange={() => toggle(a)} /><span className="slider" />
                  </label>
                </div>
                <div className="agent-portrait">
                  <span className="agent-glow" aria-hidden="true" />
                  <img src={src} alt={a.name} />
                </div>
                <div className="agent-panel">
                  <h3 className="agent-name">{a.name}</h3>
                  <p className="agent-role">{a.area || 'Assistente virtual'}</p>
                  <p className="agent-meta">{a.tone || trained}</p>
                  <div className="agent-card-actions">
                    <button className="btn btn-sm btn-primary" onClick={() => nav(`/ai-agents/${a.id}/config`)}>Configurar</button>
                    <button className="btn btn-sm btn-ghost-light" onClick={() => nav(`/ai-agents/${a.id}/config?tab=4`)}>Testar</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Novo agente IA"
        size="xl"
        className="agent-modal"
        footer={
          <>
            <button className="btn btn-light-secondary" onClick={() => setWizardOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={finish} disabled={!form.name}>Criar agente</button>
          </>
        }
      >
        <div className="modal-tabs">
          <button className="modal-tab active" type="button"><i className="ti ti-settings" /> Configuracao</button>
          <button className="modal-tab" type="button" disabled title="Disponivel depois de criar o agente"><i className="ti ti-arrow-right" /> Testar</button>
          <button className="modal-tab" type="button" disabled title="Disponivel depois de criar o agente"><i className="ti ti-history" /> Historico</button>
        </div>
        <AgentForm value={form} onChange={setForm} channels={channels} />
      </Modal>
    </div>
  );
}
