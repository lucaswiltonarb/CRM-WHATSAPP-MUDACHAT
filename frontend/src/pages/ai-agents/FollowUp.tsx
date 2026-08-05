import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { AIAgent } from '../../types';
import { PageHeader, LoadingState } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

export default function FollowUp() {
  const { notify } = useToast();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [agentId, setAgentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<any>({ isActive: false, delayMinutes: 60, maxAttempts: 3, intervalMinutes: 1440, messages: [{ attempt: 1, message: '' }], stopCondition: 'reply', createTask: false, moveLead: false });

  useEffect(() => { api.aiAgents.list().then((a: AIAgent[]) => { setAgents(a); if (a[0]) setAgentId(a[0].id); setLoading(false); }); }, []);
  useEffect(() => { if (agentId) { const raw = localStorage.getItem(`followup_${agentId}`); if (raw) setCfg(JSON.parse(raw)); } }, [agentId]);

  const save = () => { localStorage.setItem(`followup_${agentId}`, JSON.stringify(cfg)); notify('Follow-up salvo'); api.audit.log('Follow-up configurado', 'Agentes IA', 'FollowUp', agentId); };
  const setMsg = (i: number, v: string) => setCfg((c: any) => ({ ...c, messages: c.messages.map((m: any, idx: number) => idx === i ? { ...m, message: v } : m) }));
  const addMsg = () => setCfg((c: any) => ({ ...c, messages: [...c.messages, { attempt: c.messages.length + 1, message: '' }] }));

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader title="Follow-up Automático" subtitle="Reengajamento automático de leads"
        actions={<button className="btn btn-primary" onClick={save} disabled={!agentId}>Salvar</button>} />
      <div className="toolbar"><select className="filter-select" value={agentId} onChange={(e) => setAgentId(e.target.value)}>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>

      <div className="card page-section-card" style={{ padding: '1.25rem' }}>
        <div className="switch-row"><div><strong>Ativar follow-up</strong><p className="text-xs text-muted">Envia mensagens automáticas quando o lead não responde</p></div><label className="switch"><input type="checkbox" checked={cfg.isActive} onChange={(e) => setCfg({ ...cfg, isActive: e.target.checked })} /><span className="slider" /></label></div>
        <div className="form-row form-row-3">
          <div className="form-group"><label>Após última msg (min)</label><input type="number" value={cfg.delayMinutes} onChange={(e) => setCfg({ ...cfg, delayMinutes: +e.target.value })} /></div>
          <div className="form-group"><label>Máx. tentativas</label><input type="number" value={cfg.maxAttempts} onChange={(e) => setCfg({ ...cfg, maxAttempts: +e.target.value })} /></div>
          <div className="form-group"><label>Intervalo (min)</label><input type="number" value={cfg.intervalMinutes} onChange={(e) => setCfg({ ...cfg, intervalMinutes: +e.target.value })} /></div>
        </div>
        <label className="mb-1" style={{ display: 'block', fontWeight: 600 }}>Mensagens por tentativa</label>
        {cfg.messages.map((m: any, i: number) => <div key={i} className="form-group"><label>Tentativa {i + 1}</label><textarea value={m.message} onChange={(e) => setMsg(i, e.target.value)} placeholder="Olá, ainda está aí?" /></div>)}
        <button className="btn btn-light-primary btn-sm mb-2" onClick={addMsg}><i className="ti ti-plus" /> Adicionar tentativa</button>
        <div className="form-group"><label>Condição de parada</label><select value={cfg.stopCondition} onChange={(e) => setCfg({ ...cfg, stopCondition: e.target.value })}><option value="reply">Quando responder</option><option value="max_attempts">Atingir máximo</option><option value="manual">Manual</option></select></div>
        <div className="switch-row"><span>Criar tarefa/alerta</span><label className="switch"><input type="checkbox" checked={cfg.createTask} onChange={(e) => setCfg({ ...cfg, createTask: e.target.checked })} /><span className="slider" /></label></div>
        <div className="switch-row"><span>Mover lead no funil</span><label className="switch"><input type="checkbox" checked={cfg.moveLead} onChange={(e) => setCfg({ ...cfg, moveLead: e.target.checked })} /><span className="slider" /></label></div>
      </div>
    </div>
  );
}



