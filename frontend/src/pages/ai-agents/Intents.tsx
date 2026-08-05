import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { AIAgent, Intent } from '../../types';
import { PageHeader, EmptyState, LoadingState, Modal, ConfirmDialog } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

export default function Intents() {
  const { notify } = useToast();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [agentId, setAgentId] = useState('');
  const [items, setItems] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<Intent | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  useEffect(() => { api.aiAgents.list().then((a: AIAgent[]) => { setAgents(a); if (a[0]) setAgentId(a[0].id); setLoading(false); }); }, []);
  useEffect(() => { if (agentId) api.aiAgents.getIntents(agentId).then(setItems); }, [agentId]);

  const openNew = () => { setEditing(null); setStep(0); setForm({ name: '', description: '', examples: [], transferToHuman: false, isActive: true }); setOpen(true); };
  const save = () => {
    if (!form.name) { notify('Informe o nome', 'warning'); return; }
    if (editing) { setItems(p => p.map(i => i.id === editing.id ? { ...i, ...form } : i)); notify('Intenção atualizada'); }
    else { const it = { id: `int-${Date.now()}`, agentId, createdAt: new Date().toISOString(), ...form }; setItems(p => [it, ...p]); notify('Intenção criada'); }
    setOpen(false);
  };

  if (loading) return <LoadingState />;
  const WS = ['Detalhes gerais', 'Configurar ação', 'Dados de saída', 'Revisão'];

  return (
    <div className="page-shell">
      <PageHeader title="Intenções da IA" subtitle="O que a IA reconhece e como age"
        actions={<button className="btn btn-primary" onClick={openNew} disabled={!agentId}><i className="ti ti-plus" /> Nova Intenção</button>} />

      <div className="toolbar"><select className="filter-select" value={agentId} onChange={(e) => setAgentId(e.target.value)}>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>

      {items.length === 0 ? <div className="card page-section-card"><EmptyState icon="ti ti-target" title="Nenhuma intenção" description="Crie intenções com exemplos de frases e ações." /></div> : (
        <div className="card page-section-card">
          <table className="data-table"><thead><tr><th>Intenção</th><th>Exemplos</th><th>Ação</th><th>Transfere?</th><th>Status</th><th></th></tr></thead>
            <tbody>{items.map(i => (
              <tr key={i.id}>
                <td><strong>{i.name}</strong><div className="text-xs text-muted">{i.description}</div></td>
                <td>{i.examples.length} frases</td>
                <td>{i.action || '-'}</td>
                <td>{i.transferToHuman ? <span className="badge bg-light-warning text-warning">Sim</span> : 'Não'}</td>
                <td><span className={`badge bg-light-${i.isActive ? 'success' : 'secondary'} text-${i.isActive ? 'success' : 'secondary'}`}>{i.isActive ? 'Ativa' : 'Inativa'}</span></td>
                <td><div className="flex gap-1"><button className="icon-btn" onClick={() => { setEditing(i); setStep(0); setForm(i); setOpen(true); }}><i className="ti ti-edit" /></button><button className="icon-btn" onClick={() => setDelId(i.id)}><i className="ti ti-trash" /></button></div></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`${editing ? 'Editar' : 'Nova'} Intenção — ${WS[step]}`} size="lg"
        footer={<>{step > 0 && <button className="btn btn-light-secondary" onClick={() => setStep(s => s - 1)}>Voltar</button>}{step < 3 ? <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Próximo</button> : <button className="btn btn-success" onClick={save}>Salvar</button>}</>}>
        <div className="wizard-steps">{WS.map((s, i) => <div key={s} className={`wizard-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>{i < step ? <i className="ti ti-check" /> : i + 1}</div>)}</div>
        {step === 0 && <><div className="form-group"><label>Nome <span className="req">*</span></label><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Solicitar orçamento" /></div><div className="form-group"><label>Descrição</label><textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div className="form-group"><label>Exemplos de frases (uma por linha)</label><textarea rows={4} value={(form.examples || []).join('\n')} onChange={(e) => setForm({ ...form, examples: e.target.value.split('\n').filter(Boolean) })} placeholder={'Quero um orçamento\nQuanto custa?\nPreço'} /></div></>}
        {step === 1 && <><div className="form-group"><label>Ação relacionada</label><select value={form.action || ''} onChange={(e) => setForm({ ...form, action: e.target.value })}><option value="">Nenhuma</option><option value="create_lead">Criar lead</option><option value="schedule">Agendar</option><option value="send_message">Enviar mensagem</option><option value="webhook">Webhook</option></select></div><div className="switch-row"><span>Transferir para humano</span><label className="switch"><input type="checkbox" checked={form.transferToHuman} onChange={(e) => setForm({ ...form, transferToHuman: e.target.checked })} /><span className="slider" /></label></div>{form.action === 'webhook' && <div className="form-group"><label>URL do Webhook</label><input value={form.webhookUrl || ''} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} /></div>}</>}
        {step === 2 && <><div className="form-group"><label>Campos obrigatórios (um por linha)</label><textarea value={(form.requiredFields || []).join('\n')} onChange={(e) => setForm({ ...form, requiredFields: e.target.value.split('\n').filter(Boolean) })} /></div><div className="form-group"><label>Resposta padrão</label><textarea value={form.defaultResponse || ''} onChange={(e) => setForm({ ...form, defaultResponse: e.target.value })} /></div></>}
        {step === 3 && <div className="review-box"><p><strong>Nome:</strong> {form.name}</p><p><strong>Exemplos:</strong> {(form.examples || []).length}</p><p><strong>Ação:</strong> {form.action || 'Nenhuma'}</p><p><strong>Transfere:</strong> {form.transferToHuman ? 'Sim' : 'Não'}</p></div>}
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={() => { setItems(p => p.filter(i => i.id !== delId)); notify('Removida'); }} title="Excluir intenção" message="Deseja remover esta intenção?" />
    </div>
  );
}



