import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader, EmptyState, LoadingState, Modal, ConfirmDialog } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import FunnelsSettings from '../settings/FunnelsSettings';
import ClassificationsSettings from '../settings/ClassificationsSettings';

const COLORS = ['#5d87ff', '#13deb9', '#ffae1f', '#fa896b', '#539bff', '#7c3aed', '#ec4899', '#64748b'];

function ColorEntityPage({ title, subtitle, icon, apiObj, withDeleted }: { title: string; subtitle: string; icon: string; apiObj: any; withDeleted?: boolean }) {
  const { notify } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  const load = () => apiObj.list().then((d: any[]) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) { notify('Informe o nome', 'warning'); return; }
    if (editing) { const u = await apiObj.update(editing.id, form); setItems(p => p.map(x => x.id === editing.id ? u : x)); notify('Atualizado'); }
    else { const c = await apiObj.create(form); setItems(p => [...p, c]); notify('Criado'); }
    setOpen(false);
  };
  const doDelete = async () => { if (!delId) return; await apiObj.delete(delId); notify('Removido'); load(); };

  if (loading) return <LoadingState />;
  const visible = items.filter(i => withDeleted ? (showDeleted ? i.isDeleted : !i.isDeleted) : true);

  return (
    <div className="page-shell">
      <PageHeader title={title} subtitle={subtitle}
        actions={<>{withDeleted && <button className="btn btn-light-secondary" onClick={() => setShowDeleted(s => !s)}>{showDeleted ? 'Ver ativos' : 'Ver excluídos'}</button>}<button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ color: COLORS[0] }); setOpen(true); }}><i className="ti ti-plus" /> Novo</button></>} />
      {visible.length === 0 ? <div className="card page-section-card"><EmptyState icon={icon} title="Nenhum registro" /></div> : (
        <div className="card page-section-card"><table className="data-table"><thead><tr><th>Nome</th><th>Cor</th><th>Descrição</th><th></th></tr></thead>
          <tbody>{visible.map(i => (
            <tr key={i.id}>
              <td><span className="tag-chip" style={{ background: i.color }}>{i.name}</span></td>
              <td><span className="color-dot" style={{ background: i.color }} /></td>
              <td>{i.description || '-'}</td>
              <td><div className="flex gap-1">{withDeleted && i.isDeleted ? <button className="btn btn-sm btn-light-success" onClick={async () => { await apiObj.update(i.id, { isDeleted: false }); load(); notify('Restaurado'); }}>Restaurar</button> : <><button className="icon-btn" onClick={() => { setEditing(i); setForm(i); setOpen(true); }}><i className="ti ti-edit" /></button><button className="icon-btn" onClick={() => setDelId(i.id)}><i className="ti ti-trash" /></button></>}</div></td>
            </tr>))}</tbody>
        </table></div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Editar ${title}` : `Novo ${title}`}
        footer={<><button className="btn btn-light-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Salvar</button></>}>
        <div className="form-group"><label>Nome <span className="req">*</span></label><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="form-group"><label>Cor</label><div className="flex gap-1">{COLORS.map(c => <button key={c} type="button" className={`color-dot ${form.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />)}</div></div>
        <div className="form-group"><label>Descrição</label><textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      </Modal>
      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Excluir" message="Deseja excluir este registro?" />
    </div>
  );
}

export const TagsPage = () => <ColorEntityPage title="Tags" subtitle="Etiquetas para contatos, conversas e leads" icon="ti ti-tag" apiObj={api.tags} />;
export const ClassificationsPage = () => <ClassificationsSettings />;
export const OccurrencesPage = () => <ColorEntityPage title="Tipos de Ocorrência" subtitle="Usados ao finalizar atendimentos" icon="ti ti-clipboard-list" apiObj={api.occurrenceTypes} withDeleted />;
export const FunnelsPage = () => <FunnelsSettings />;

const MSG_TYPES = [
  { value: 'text', label: 'Texto simples' },
  { value: 'text_buttons', label: 'Texto com botões' },
  { value: 'text_action_buttons', label: 'Texto com botões de ação' },
  { value: 'image_buttons', label: 'Botões com imagem' },
  { value: 'video_buttons', label: 'Botões com vídeo' },
  { value: 'list', label: 'Lista de opções' },
  { value: 'otp', label: 'Botão OTP' },
  { value: 'pix', label: 'Botão PIX' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'location', label: 'Localização' },
  { value: 'attachment', label: 'Anexo' },
];

export function QuickMessagesPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>(['Sem categoria']);

  const load = () => api.quickMessages.list().then((d) => {
    setItems(d);
    setCategories(Array.from(new Set(['Sem categoria', ...d.map((item: any) => item.category).filter(Boolean)])));
    setLoading(false);
  });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.message) { notify('Preencha a mensagem', 'warning'); return; }
    const payload = { ...form, title: form.title || 'Resposta rápida', category: form.category || 'Sem categoria' };
    if (editing) { const u = await api.quickMessages.update(editing.id, payload); setItems(p => p.map(x => x.id === editing.id ? u : x)); notify('Atualizada'); }
    else { const c = await api.quickMessages.create(payload); setItems(p => [...p, c]); notify('Criada'); }
    setOpen(false);
  };

  const doDelete = async () => {
    if (!delId) return;
    await api.quickMessages.delete(delId);
    setItems(p => p.filter(x => x.id !== delId));
    notify('Removida');
  };

  if (loading) return <LoadingState />;
  const visible = items.filter(i => !search || `${i.title} ${i.message} ${i.shortcut}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-shell">
      <PageHeader title="Mensagens Rápidas" subtitle="Respostas pré-definidas com atalhos"
        actions={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ messageType: 'text', scope: 'global', category: 'Sem categoria' }); setOpen(true); }}><i className="ti ti-plus" /> Nova Resposta</button>} />
      <div className="toolbar"><div className="search-box"><i className="ti ti-search" /><input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
      {visible.length === 0 ? <div className="card"><EmptyState icon="ti ti-message-circle" title="Nenhuma mensagem rápida" /></div> : (
        <div className="card"><table className="data-table"><thead><tr><th>Título</th><th>Atalho</th><th>Categoria</th><th>Tipo</th><th>Escopo</th><th></th></tr></thead>
          <tbody>{visible.map(q => (
            <tr key={q.id}><td><strong>{q.title}</strong><div className="text-xs text-muted">{q.message?.slice(0, 50)}</div></td><td>{q.shortcut ? <code>/{q.shortcut}</code> : '-'}</td><td>{q.category}</td><td><span className="badge bg-light-primary text-primary">{MSG_TYPES.find((item) => item.value === q.messageType)?.label || q.messageType}</span></td><td>{q.scope}</td><td><div className="flex gap-1"><button className="icon-btn" onClick={() => { setEditing(q); setForm(q); setOpen(true); }}><i className="ti ti-edit" /></button><button className="icon-btn" onClick={() => setDelId(q.id)}><i className="ti ti-trash" /></button></div></td></tr>
          ))}</tbody></table></div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar Mensagem' : 'Nova Resposta Rápida'} size="xl"
        footer={<><button className="btn btn-light-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>{editing ? 'Salvar' : 'Criar Resposta'}</button></>}>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Quem pode usar esta resposta?</label>
            <select value={form.scope || 'global'} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              <option value="global">Global â€” todos os atendentes</option>
              <option value="personal">Só para mim</option>
              <option value="specific_user">Usuário específico</option>
            </select>
            <p className="text-xs text-muted mt-1">Visível para toda a equipe da empresa.</p>
          </div>
          <div className="form-group">
            <label>Tipo de mensagem</label>
            <select value={form.messageType || 'text'} onChange={(e) => setForm({ ...form, messageType: e.target.value })}>
              {MSG_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Título (opcional)</label>
            <input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Saudação Bom dia" />
          </div>
          <div className="form-group">
            <label>Categoria</label>
            <select value={form.category || 'Sem categoria'} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Atalhos (separados por vírgula)</label>
            <input value={form.shortcut || ''} onChange={(e) => setForm({ ...form, shortcut: e.target.value })} placeholder="Ex: bomdia, ola, oi" />
            <p className="text-xs text-muted mt-1">Digite /atalho no chat para usar.</p>
          </div>
        </div>
        <div className="form-group"><label>Mensagem <span className="req">*</span></label><textarea rows={4} value={form.message || ''} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Digite a mensagem da resposta rápida..." /></div>
        <div className="form-group"><label>Anexo (opcional)</label><div className="quick-upload-box"><i className="ti ti-upload" /><p>Clique para selecionar um arquivo</p><small>Imagem, vídeo, áudio ou documento (máx. 50MB)</small></div></div>
      </Modal>
      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Excluir mensagem" message="Deseja excluir esta mensagem rápida?" />
    </div>
  );
}
