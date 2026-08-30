import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { AIAgent } from '../../types';
import { PageHeader, EmptyState, LoadingState, Modal, FieldLabel, FormSection } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { AGENT_AVATARS, avatarSrc } from '../../assets/agentAvatars';

const STEPS = ['Identidade', 'Objetivo', 'Empresa', 'Contexto', 'Mensagens', 'Pronto'];

const HINTS = {
  name: 'Nome interno do agente. Aparece nas listas e relatórios — o cliente não vê este nome.',
  avatar: 'Foto exibida nos cards e no simulador. Ajuda a equipe a identificar cada agente rapidamente.',
  objective: 'Descreva em uma frase o que este agente precisa alcançar em cada conversa.',
  area: 'Segmento em que a empresa atua. A IA usa isso para escolher o vocabulário certo.',
  tone: 'Define o estilo das respostas: mais formal, mais próximo ou mais direto.',
  description: 'Contexto sobre a empresa, produtos e diferenciais que a IA deve conhecer.',
  instructions: 'Regras específicas: o que sempre fazer e o que nunca fazer durante o atendimento.',
  greeting: 'Primeira mensagem enviada quando o contato inicia a conversa.',
  transfer: 'Situações em que o agente deve parar e passar a conversa para um atendente humano.',
};

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

  const reset = () => { setStep(0); setForm({ tone: 'profissional', channels: [], avatar: AGENT_AVATARS[0].id }); };
  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const finish = async () => {
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
                    <button className="btn btn-sm btn-ghost-light" onClick={() => nav(`/ai-agents/${a.id}/config?tab=5`)}>Testar</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={wizardOpen} onClose={() => setWizardOpen(false)} title="Novo Agente" subtitle={`Passo ${step + 1} de ${STEPS.length} — ${STEPS[step]}`} size="lg"
        footer={step < 5 ? <>
          {step > 0 && <button className="btn btn-light-secondary" onClick={back}>Voltar</button>}
          {step < 4 && <button className="btn btn-primary" onClick={next} disabled={step === 0 && !form.name}>Próximo</button>}
          {step === 4 && <button className="btn btn-success" onClick={next}>Finalizar</button>}
        </> : <button className="btn btn-primary" onClick={finish}>Concluir e criar</button>}>

        <div className="wizard-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`wizard-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <span className="wizard-dot">{i < step ? <i className="ti ti-check" /> : i + 1}</span>
              <span className="wizard-step-label">{s}</span>
            </div>
          ))}
        </div>

        {step === 0 && (
          <FormSection title="Identidade do agente">
            <div className="form-group">
              <FieldLabel hint={HINTS.name} required>Nome do agente</FieldLabel>
              <input autoFocus value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Assistente de Vendas" />
            </div>
            <div className="form-group">
              <FieldLabel hint={HINTS.avatar}>Foto do agente</FieldLabel>
              <div className="avatar-picker">
                {AGENT_AVATARS.map(av => (
                  <button key={av.id} type="button" className={`avatar-option ${form.avatar === av.id ? 'on' : ''}`}
                    onClick={() => setForm({ ...form, avatar: av.id })} title={av.label}>
                    <img src={av.src} alt={av.label} />
                    {form.avatar === av.id && <span className="avatar-check"><i className="ti ti-check" /></span>}
                  </button>
                ))}
              </div>
            </div>
          </FormSection>
        )}

        {step === 1 && (
          <FormSection title="Objetivo">
            <div className="form-group">
              <FieldLabel hint={HINTS.objective}>O que este agente deve alcançar</FieldLabel>
              <textarea rows={4} value={form.objective || ''} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Atender, qualificar e agendar reuniões com leads que chegam pelo WhatsApp." />
            </div>
          </FormSection>
        )}

        {step === 2 && (
          <FormSection title="Informações da empresa" columns={2}>
            <div className="form-group">
              <FieldLabel hint={HINTS.area}>Área de atuação</FieldLabel>
              <input value={form.area || ''} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex: Clínica odontológica" />
            </div>
            <div className="form-group">
              <FieldLabel hint={HINTS.tone}>Tom de comunicação</FieldLabel>
              <select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                <option value="profissional">Profissional</option>
                <option value="amigável">Amigável</option>
                <option value="formal">Formal</option>
                <option value="descontraído">Descontraído</option>
              </select>
            </div>
          </FormSection>
        )}

        {step === 3 && (
          <FormSection title="Contexto e regras">
            <div className="form-group">
              <FieldLabel hint={HINTS.description}>Descrição e contexto</FieldLabel>
              <textarea rows={4} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <FieldLabel hint={HINTS.instructions}>Instruções personalizadas</FieldLabel>
              <textarea rows={3} value={form.instructions || ''} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
            </div>
          </FormSection>
        )}

        {step === 4 && (
          <FormSection title="Mensagens">
            <div className="form-group">
              <FieldLabel hint={HINTS.greeting}>Mensagem de apresentação</FieldLabel>
              <textarea rows={3} value={form.greetingMessage || ''} onChange={(e) => setForm({ ...form, greetingMessage: e.target.value })} placeholder="Olá! Sou o assistente virtual..." />
            </div>
            <div className="form-group">
              <FieldLabel hint={HINTS.transfer}>Quando transferir para humano</FieldLabel>
              <textarea rows={3} value={form.transferRules || ''} onChange={(e) => setForm({ ...form, transferRules: e.target.value })} placeholder="Quando o cliente pedir atendente humano..." />
            </div>
          </FormSection>
        )}

        {step === 5 && (
          <div className="wizard-success">
            <div className="wizard-success-avatar"><img src={avatarSrc(form.avatar) || AGENT_AVATARS[0].src} alt="" /></div>
            <h3>{form.name} está pronto para configurar!</h3>
            <p className="text-muted">Dentro do agente você define base de conhecimento, intenções, follow-up e testa no simulador.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
