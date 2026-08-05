import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { AIAgent } from '../../types';
import { PageHeader, EmptyState, LoadingState, Modal } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

const STEPS = ['Nome do agente', 'Objetivo', 'Informações da empresa', 'Descrição e contexto', 'Configurações', 'Sucesso'];

export default function AIAgents() {
  const { notify } = useToast();
  const nav = useNavigate();
  const [items, setItems] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<any>({});

  const load = () => api.aiAgents.list().then((a) => { setItems(a); setLoading(false); });
  useEffect(() => { load(); }, []);

  const reset = () => { setStep(0); setForm({ tone: 'profissional', channels: [] }); };
  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const finish = async () => {
    const a = await api.aiAgents.create(form);
    await api.audit.log('Agente IA criado', 'Agentes IA', 'AIAgent', a.id);
    setItems(p => [...p, a]); notify('Agente criado'); setWizardOpen(false);
  };

  const toggle = async (a: AIAgent) => { const u = await api.aiAgents.update(a.id, { isActive: !a.isActive }); setItems(p => p.map(x => x.id === a.id ? u : x)); };

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader title="Agentes de IA" subtitle="Crie e configure agentes inteligentes"
        actions={<button className="btn btn-primary" onClick={() => { reset(); setWizardOpen(true); }}><i className="ti ti-plus" /> Novo Agente</button>} />

      <div className="flex gap-1 mb-2 flex-wrap">
        <button className="btn btn-light-secondary btn-sm" onClick={() => nav('/ai-agents/knowledge')}><i className="ti ti-book" /> Base de Conhecimento</button>
        <button className="btn btn-light-secondary btn-sm" onClick={() => nav('/ai-agents/intents')}><i className="ti ti-target" /> Intenções</button>
        <button className="btn btn-light-secondary btn-sm" onClick={() => nav('/ai-agents/followup')}><i className="ti ti-repeat" /> Follow-up</button>
      </div>

      {items.length === 0 ? <div className="card"><EmptyState icon="ti ti-robot" title="Nenhum agente de IA" description="Crie seu primeiro agente inteligente." action={<button className="btn btn-primary" onClick={() => { reset(); setWizardOpen(true); }}>Criar agente</button>} /></div> : (
        <div className="card-grid">
          {items.map(a => (
            <div key={a.id} className="card agent-card">
              <div className="flex justify-between items-start">
                <div className="agent-avatar"><i className="ti ti-robot" /></div>
                <label className="switch"><input type="checkbox" checked={a.isActive} onChange={() => toggle(a)} /><span className="slider" /></label>
              </div>
              <h3 className="agent-name">{a.name}</h3>
              <p className="agent-obj">{a.objective}</p>
              <div className="flex gap-1 items-center mt-1">
                <span className={`badge bg-light-${a.trainingStatus === 'ready' ? 'success' : a.trainingStatus === 'training' ? 'warning' : 'secondary'} text-${a.trainingStatus === 'ready' ? 'success' : a.trainingStatus === 'training' ? 'warning' : 'secondary'}`}>{a.trainingStatus === 'ready' ? 'Treinado' : a.trainingStatus === 'training' ? 'Treinando' : 'Pendente'}</span>
                {a.tone && <span className="badge bg-light-info text-info">{a.tone}</span>}
              </div>
              <div className="flex gap-1 mt-1"><button className="btn btn-sm btn-primary" onClick={() => nav(`/ai-agents/${a.id}/config`)}><i className="ti ti-settings" /> Configurar</button></div>
            </div>
          ))}
        </div>
      )}

      <Modal open={wizardOpen} onClose={() => setWizardOpen(false)} title={`Novo Agente â€” ${STEPS[step]}`} size="lg"
        footer={step < 5 ? <>
          {step > 0 && <button className="btn btn-light-secondary" onClick={back}>Voltar</button>}
          {step < 4 && <button className="btn btn-primary" onClick={next} disabled={step === 0 && !form.name}>Próximo</button>}
          {step === 4 && <button className="btn btn-success" onClick={() => { next(); }}>Finalizar</button>}
        </> : <button className="btn btn-primary" onClick={finish}>Concluir e criar</button>}>
        <div className="wizard-steps">{STEPS.map((s, i) => <div key={s} className={`wizard-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>{i < step ? <i className="ti ti-check" /> : i + 1}</div>)}</div>
        {step === 0 && <div className="form-group"><label>Nome do agente <span className="req">*</span></label><input autoFocus value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Assistente de Vendas" /></div>}
        {step === 1 && <div className="form-group"><label>Objetivo</label><textarea value={form.objective || ''} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Atender, qualificar e agendar..." /></div>}
        {step === 2 && <><div className="form-group"><label>Área de atuação</label><input value={form.area || ''} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div><div className="form-group"><label>Tom de comunicação</label><select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}><option value="profissional">Profissional</option><option value="amigável">Amigável</option><option value="formal">Formal</option><option value="descontraído">Descontraído</option></select></div></>}
        {step === 3 && <><div className="form-group"><label>Descrição e contexto</label><textarea rows={4} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div className="form-group"><label>Instruções personalizadas</label><textarea rows={3} value={form.instructions || ''} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></div></>}
        {step === 4 && <><div className="form-group"><label>Mensagem de apresentação</label><textarea value={form.greetingMessage || ''} onChange={(e) => setForm({ ...form, greetingMessage: e.target.value })} placeholder="Olá! Sou o assistente virtual..." /></div><div className="form-group"><label>Quando transferir para humano</label><textarea value={form.transferRules || ''} onChange={(e) => setForm({ ...form, transferRules: e.target.value })} placeholder="Quando o cliente pedir atendente humano..." /></div></>}
        {step === 5 && <div className="wizard-success"><div className="wizard-success-icon"><i className="ti ti-circle-check" /></div><h3>Agente pronto para configurar!</h3><p className="text-muted">Próximos passos: adicionar base de conhecimento, criar intenções e ativar em um canal.</p></div>}
      </Modal>
    </div>
  );
}



