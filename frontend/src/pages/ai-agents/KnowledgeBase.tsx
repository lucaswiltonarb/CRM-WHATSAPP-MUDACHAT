import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { AIAgent, KnowledgeBase as KB } from '../../types';
import { PageHeader, EmptyState, LoadingState, Modal, ConfirmDialog } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

export default function KnowledgeBase() {
  const { notify } = useToast();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [agentId, setAgentId] = useState('');
  const [items, setItems] = useState<KB[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KB | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState('');

  useEffect(() => { api.aiAgents.list().then((a: AIAgent[]) => { setAgents(a); if (a[0]) setAgentId(a[0].id); setLoading(false); }); }, []);
  useEffect(() => { if (agentId) api.aiAgents.getKnowledgeBase(agentId).then(setItems); }, [agentId]);

  const openNew = () => { setEditing(null); setForm({ type: 'faq', category: 'Geral', title: '', content: '', isActive: true }); setOpen(true); };
  const save = () => {
    if (!form.title) { notify('Informe o título', 'warning'); return; }
    if (editing) { setItems(p => p.map(k => k.id === editing.id ? { ...k, ...form } : k)); notify('Conteúdo atualizado'); }
    else { const k = { id: `kb-${Date.now()}`, agentId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...form }; setItems(p => [k, ...p]); notify('Conteúdo adicionado'); }
    setOpen(false);
  };
  const filtered = items.filter(k => !search || `${k.title} ${k.content} ${k.category}`.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader title="Base de Conhecimento" subtitle="Documentos, FAQs e conteúdos para a IA"
        actions={<button className="btn btn-primary" onClick={openNew} disabled={!agentId}><i className="ti ti-plus" /> Adicionar Conteúdo</button>} />

      <div className="toolbar">
        <select className="filter-select" value={agentId} onChange={(e) => setAgentId(e.target.value)}>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <div className="search-box"><i className="ti ti-search" /><input placeholder="Pesquisar na base..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>

      {agents.length === 0 ? <div className="card page-section-card"><EmptyState icon="ti ti-robot" title="Crie um agente primeiro" /></div> :
        filtered.length === 0 ? <div className="card page-section-card"><EmptyState icon="ti ti-book" title="Base vazia" description="Adicione FAQs, documentos e procedimentos." /></div> : (
          <div className="card-grid">
            {filtered.map(k => (
              <div key={k.id} className="card kb-card">
                <div className="flex justify-between items-start"><span className="badge bg-light-primary text-primary">{k.type.toUpperCase()}</span><div className="flex gap-1"><button className="icon-btn" onClick={() => { setEditing(k); setForm(k); setOpen(true); }}><i className="ti ti-edit" /></button><button className="icon-btn" onClick={() => setDelId(k.id)}><i className="ti ti-trash" /></button></div></div>
                <h3 className="kb-title">{k.title}</h3>
                <p className="kb-cat"><i className="ti ti-folder" /> {k.category}</p>
                <p className="kb-content">{k.content}</p>
              </div>
            ))}
          </div>
        )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar Conteúdo' : 'Adicionar Conteúdo'} size="lg"
        footer={<><button className="btn btn-light-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Salvar</button></>}>
        <div className="form-row"><div className="form-group"><label>Tipo</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="faq">FAQ</option><option value="document">Documento</option><option value="text">Texto</option><option value="procedure">Procedimento</option><option value="url">URL</option></select></div><div className="form-group"><label>Categoria</label><input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div></div>
        <div className="form-group"><label>Título <span className="req">*</span></label><input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        {form.type === 'url' ? <div className="form-group"><label>URL</label><input value={form.url || ''} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div> : <div className="form-group"><label>Conteúdo</label><textarea rows={5} value={form.content || ''} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>}
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={() => { setItems(p => p.filter(k => k.id !== delId)); notify('Removido'); }} title="Excluir conteúdo" message="Deseja remover este conteúdo da base?" />
    </div>
  );
}



