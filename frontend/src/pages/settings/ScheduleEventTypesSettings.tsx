import { useEffect, useState } from 'react';
import { ConfirmDialog, LoadingState, Modal, PageHeader } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import type { EventType } from '../../types';

const COLORS = ['#FF1B8D', '#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1', '#F97316'];

export default function ScheduleEventTypesSettings() {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<EventType[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: COLORS[0],
    duration: 60,
    defaultPrice: '',
  });

  useEffect(() => {
    api.schedule.getEventTypes()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      color: COLORS[0],
      duration: 60,
      defaultPrice: '',
    });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (item: EventType) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      color: item.color,
      duration: item.duration || 60,
      defaultPrice: item.defaultPrice != null ? String(item.defaultPrice) : '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.color) {
      notify('Preencha ao menos o nome e a cor do tipo de evento.', 'warning');
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
      duration: Number(form.duration) || 60,
      defaultPrice: form.defaultPrice ? Number(form.defaultPrice) : undefined,
    };
    if (editing) {
      const updated = await api.schedule.updateEventType(editing.id, payload);
      setItems((current) => current.map((item) => (item.id === editing.id ? updated : item)));
      notify('Tipo de evento atualizado com sucesso.');
    } else {
      const created = await api.schedule.createEventType(payload);
      setItems((current) => [created, ...current]);
      notify('Tipo de evento criado com sucesso.');
    }
    setOpen(false);
  };

  const remove = async () => {
    if (!deleteId) return;
    await api.schedule.deleteEventType(deleteId);
    setItems((current) => current.filter((item) => item.id !== deleteId));
    setDeleteId(null);
    notify('Tipo de evento removido com sucesso.');
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader
        title="Tipos de Eventos"
        subtitle="Cadastre tipos de eventos com cor, duração e valor padrão."
        actions={<button className="btn btn-primary" onClick={openCreate}><i className="ti ti-plus" /> Novo Tipo de Evento</button>}
      />

      <div className="card page-section-card">
        {items.length === 0 ? (
          <div className="empty-panel">
            <div className="text-center text-muted">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.6 }}>
                <i className="ti ti-calendar-star" />
              </div>
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Nenhum tipo de evento cadastrado</div>
              <div>Cadastre tipos de eventos com cor, duração e valor padrão</div>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Duração</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span style={{ width: 12, height: 12, borderRadius: 999, background: item.color, display: 'inline-block' }} />
                        <div>
                          <div className="fw-semibold">{item.name}</div>
                          {item.description ? <div className="text-muted text-sm">{item.description}</div> : null}
                        </div>
                      </div>
                    </td>
                    <td>{item.duration} min</td>
                    <td>{item.defaultPrice != null ? `R$ ${item.defaultPrice.toFixed(2)}` : '-'}</td>
                    <td><span className={`badge ${item.status === 'active' ? 'bg-light-success text-success' : 'bg-light-secondary text-secondary'}`}>{item.status === 'active' ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="text-end">
                      <div className="flex gap-1 justify-end">
                        <button className="btn btn-light-primary btn-sm" onClick={() => openEdit(item)}>Editar</button>
                        <button className="btn btn-light-danger btn-sm" onClick={() => setDeleteId(item.id)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar Tipo de Evento' : 'Novo Tipo de Evento'}
        size="md"
        footer={<><button className="btn btn-light-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>{editing ? 'Salvar' : 'Criar Tipo'}</button></>}
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="form-group">
            <label>Nome *</label>
            <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Ex: Consulta, Procedimento..." required />
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Descrição opcional..." />
          </div>
          <div className="form-group">
            <label>Cor *</label>
            <div className="flex items-center gap-3">
              <input className="w-20 h-10 cursor-pointer" type="color" value={form.color} onChange={(e) => setForm((current) => ({ ...current, color: e.target.value }))} />
              <input value={form.color} onChange={(e) => setForm((current) => ({ ...current, color: e.target.value }))} placeholder="#FF1B8D" />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-transform ${form.color === color ? 'scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color, boxShadow: form.color === color ? '0 0 0 2px var(--bs-primary)' : undefined }}
                  onClick={() => setForm((current) => ({ ...current, color }))}
                />
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Duração Padrão (min)</label>
              <input type="number" min="5" step="5" value={form.duration} onChange={(e) => setForm((current) => ({ ...current, duration: Number(e.target.value) || 5 }))} />
            </div>
            <div className="form-group">
              <label>Valor Padrão (R$)</label>
              <input type="number" min="0" step="0.01" value={form.defaultPrice} onChange={(e) => setForm((current) => ({ ...current, defaultPrice: e.target.value }))} placeholder="0,00" />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} title="Excluir tipo de evento" message="Deseja realmente excluir este tipo de evento?" />
    </div>
  );
}

