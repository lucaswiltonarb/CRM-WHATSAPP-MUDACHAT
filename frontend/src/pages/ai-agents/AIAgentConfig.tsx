import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { AIAgent } from '../../types';
import { ConfirmDialog, LoadingState, PageHeader } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import AgentForm from './AgentForm';

const TABS = ['Configuração', 'Treinamento', 'Integrações', 'Avançado', 'Simulador'];

export default function AIAgentConfig() {
  const { id } = useParams();
  const nav = useNavigate();
  const { notify } = useToast();
  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<any>({});
  const [chat, setChat] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => { api.channels.list().then(setChannels); api.aiAgents.getById(id!).then((a) => { if (!a) { nav('/ai-agents'); return; } setAgent(a); setForm(a); setLoading(false); }); }, [id]);

  const save = async () => { const u = await api.aiAgents.update(id!, form); setAgent(u); await api.audit.log('Agente IA editado', 'Agentes IA', 'AIAgent', id!); notify('Configurações salvas'); };
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const remove = async () => {
    await api.aiAgents.remove(id!);
    await api.audit.log('Agente IA removido', 'Agentes IA', 'AIAgent', id!);
    notify('Agente removido');
    nav('/ai-agents');
  };

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input; setChat(c => [...c, { role: 'user', text: userMsg }]); setInput('');
    setTimeout(() => setChat(c => [...c, { role: 'ai', text: form.greetingMessage && c.length === 1 ? form.greetingMessage : `(${form.tone || 'profissional'}) Entendi sobre "${userMsg}". Como posso ajudar mais?` }]), 400);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader title={agent!.name} subtitle="Configuração do agente de IA"
        actions={<><button className="btn btn-light-secondary" onClick={() => nav('/ai-agents')}>Voltar</button><button className="btn btn-light-danger" onClick={() => setConfirmDel(true)}><i className="ti ti-trash" /> Remover</button><button className="btn btn-primary" onClick={save}>Salvar</button></>} />

      <div className="tab-nav">{TABS.map((t, i) => <button key={t} className={`tab-btn ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>)}</div>

      <div className="card" style={{ padding: '1.25rem' }}>
        {tab === 0 && <AgentForm value={form} onChange={setForm} channels={channels} />}
        {tab === 1 && <>
          <div className="flex gap-1 mb-2"><button className="btn btn-light-primary" onClick={() => nav('/ai-agents/knowledge')}><i className="ti ti-book" /> Base de Conhecimento</button><button className="btn btn-light-primary" onClick={() => nav('/ai-agents/intents')}><i className="ti ti-target" /> Intenções</button></div>
          <div className="form-group"><label>Status do treinamento</label><select value={form.trainingStatus || 'pending'} onChange={(e) => set('trainingStatus', e.target.value)}><option value="pending">Pendente</option><option value="training">Treinando</option><option value="ready">Treinado</option></select></div>
          <div className="form-group"><label>Campos que o agente deve coletar (um por linha)</label><textarea rows={3} value={(form.collectFields || []).join('\n')} onChange={(e) => set('collectFields', e.target.value.split('\n').filter(Boolean))} placeholder={'nome\nemail\nnecessidade'} /></div>
        </>}
        {tab === 2 && <>
          <div className="form-group"><label>Ações permitidas (uma por linha)</label><textarea rows={3} value={(form.allowedActions || []).join('\n')} onChange={(e) => set('allowedActions', e.target.value.split('\n').filter(Boolean))} placeholder={'agendar\ncriar_lead\ntransferir'} /></div>
          <div className="form-group"><label>Integrações permitidas</label><textarea rows={2} value={(form.allowedIntegrations || []).join('\n')} onChange={(e) => set('allowedIntegrations', e.target.value.split('\n').filter(Boolean))} /></div>
        </>}
        {tab === 3 && <>
          <div className="form-group"><label>Limite de mensagens por dia</label><input type="number" value={form.limitPerDay || 0} onChange={(e) => set('limitPerDay', +e.target.value)} /></div>
          <div className="form-group"><label>Mensagem de fallback</label><textarea value={form.fallbackMessage || ''} onChange={(e) => set('fallbackMessage', e.target.value)} /></div>
          <div className="form-group"><label>Mensagem de transferência</label><textarea value={form.transferMessage || ''} onChange={(e) => set('transferMessage', e.target.value)} /></div>
          <div className="danger-zone">
            <div>
              <h4>Remover agente</h4>
              <p>Esta ação exclui o agente e sua base de conhecimento e intenções. Não pode ser desfeita.</p>
            </div>
            <button className="btn btn-danger" onClick={() => setConfirmDel(true)}><i className="ti ti-trash" /> Remover agente</button>
          </div>
        </>}
        {tab === 4 && <div className="sim-chat">
          <div className="sim-messages">{chat.length === 0 ? <p className="text-muted text-center">Envie uma mensagem para testar o agente.</p> : chat.map((m, i) => <div key={i} className={`chat-bubble ${m.role === 'user' ? 'out' : 'in'}`}>{m.text}</div>)}</div>
          <div className="sim-input"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Digite uma mensagem de teste..." /><button className="btn btn-primary" onClick={send}><i className="ti ti-send" /></button></div>
        </div>}
      </div>

      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={remove}
        title="Remover agente" message={`Deseja realmente remover o agente "${agent!.name}"? Esta ação não pode ser desfeita.`} />
    </div>
  );
}



