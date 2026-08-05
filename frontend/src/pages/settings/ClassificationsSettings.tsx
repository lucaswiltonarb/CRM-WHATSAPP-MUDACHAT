import { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConfirmDialog, EmptyState, LoadingState, Modal, PageHeader } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import type { Classification, Funnel } from '../../types';

const COLORS = ['#D3D3D3', '#ADD8E6', '#FFB6C1', '#FFFACD', '#B0E0E6', '#F4A261', '#C4B5FD', '#FCA5A5'];

function SortableClassificationCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Classification;
  onEdit: (item: Classification) => void;
  onDelete: (item: Classification) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`crm-config-card ${isDragging ? 'dragging' : ''}`}>
      <button className="crm-drag-handle" type="button" {...attributes} {...listeners}>
        <i className="ti ti-grip-vertical" />
      </button>
      <div className="crm-stage-color" style={{ background: item.color }} />
      <div className="crm-config-body">
        <div className="crm-config-topline">
          <h3>{item.name}</h3>
          <div className="flex gap-1 flex-wrap">
            {item.followUpEnabled ? <span className="badge bg-light-primary text-primary">Follow-up</span> : null}
          </div>
        </div>
        <p>{item.description || 'Sem descrição cadastrada.'}</p>
        <div className="crm-config-meta">
          <span>Ordem: {item.order || 1}</span>
          <span className="crm-color-pill">{item.color}</span>
        </div>
      </div>
      <div className="crm-config-actions">
        <button type="button" className="btn btn-sm btn-light-primary" onClick={() => onEdit(item)}><i className="ti ti-list-check" /> Campos</button>
        <button className="icon-btn" onClick={() => onEdit(item)}><i className="ti ti-pencil" /></button>
        <button className="icon-btn" onClick={() => onDelete(item)}><i className="ti ti-trash" /></button>
      </div>
    </div>
  );
}

export default function ClassificationsSettings() {
  const { notify } = useToast();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Classification | null>(null);
  const [deleteItem, setDeleteItem] = useState<Classification | null>(null);
  const [selectedFunnelId, setSelectedFunnelId] = useState('');
  const [form, setForm] = useState({
    name: '',
    funnelId: '',
    description: '',
    color: COLORS[0],
    isDefaultOnStart: false,
    isDefaultOnFinish: false,
    isDefaultOnTransfer: false,
    followUpEnabled: false,
    followupResponseStageId: '',
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = async () => {
    const [funnelList, stageList]: [Funnel[], Classification[]] = await Promise.all([api.funnels.list(), api.classifications.list()]);
    const sortedFunnels = [...funnelList].sort((a, b) => (a.order || 0) - (b.order || 0));
    setFunnels(sortedFunnels);
    setSelectedFunnelId((current) => current || sortedFunnels[0]?.id || '');
    setClassifications(stageList);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () => classifications
      .filter((item) => item.funnelId === selectedFunnelId)
      .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [classifications, selectedFunnelId],
  );

  const activeFunnel = funnels.find((item) => item.id === selectedFunnelId);

  const resetForm = () => {
    setForm({
      name: '',
      funnelId: selectedFunnelId || funnels[0]?.id || '',
      description: '',
      color: COLORS[0],
      isDefaultOnStart: false,
      isDefaultOnFinish: false,
      isDefaultOnTransfer: false,
      followUpEnabled: false,
      followupResponseStageId: '',
    });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (item: Classification) => {
    setEditing(item);
    setForm({
      name: item.name,
      funnelId: item.funnelId || '',
      description: item.description || '',
      color: item.color || COLORS[0],
      isDefaultOnStart: !!item.isDefaultOnStart,
      isDefaultOnFinish: !!item.isDefaultOnFinish,
      isDefaultOnTransfer: !!item.isDefaultOnTransfer,
      followUpEnabled: !!item.followUpEnabled,
      followupResponseStageId: item.followupResponseStageId || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.funnelId) {
      notify('Informe o nome e o funil da classificação.', 'warning');
      return;
    }

    const nextOrder = classifications.filter((item) => item.funnelId === form.funnelId && item.id !== editing?.id).length + 1;
    const payload = {
      name: form.name.trim(),
      funnelId: form.funnelId,
      description: form.description.trim(),
      color: form.color,
      order: editing?.order || nextOrder,
      isDefaultOnStart: form.isDefaultOnStart,
      isDefaultOnFinish: form.isDefaultOnFinish,
      isDefaultOnTransfer: form.isDefaultOnTransfer,
      followUpEnabled: form.followUpEnabled,
      followupResponseStageId: form.followupResponseStageId || '',
    };

    if (editing) {
      const updated = await api.classifications.update(editing.id, payload);
      setClassifications((current) => current.map((item) => item.id === editing.id ? updated : item));
      notify('Classificação atualizada com sucesso.');
    } else {
      const created = await api.classifications.create(payload);
      setClassifications((current) => [...current, created]);
      notify('Classificação criada com sucesso.');
    }

    setOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    await api.classifications.delete(deleteItem.id);
    setClassifications((current) => current.filter((item) => item.id !== deleteItem.id));
    notify('Classificação removida com sucesso.');
  };

  const onDragEnd = async ({ active, over }: any) => {
    if (!over || active.id === over.id || !selectedFunnelId) return;
    const oldIndex = visible.findIndex((item) => item.id === active.id);
    const newIndex = visible.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(visible, oldIndex, newIndex).map((item, index) => ({ ...item, order: index + 1 }));
    setClassifications((current) => {
      const rest = current.filter((item) => item.funnelId !== selectedFunnelId);
      return [...rest, ...reordered];
    });
    await api.classifications.reorder(selectedFunnelId, reordered.map((item) => item.id));
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader
        title="Classificações"
        subtitle="Gerencie as etapas (colunas) do funil. Com workflow ativo, use o botão Campos em cada etapa para cadastrar campos personalizados, checklists e regras."
        actions={<button className="btn btn-primary" onClick={openCreate}><i className="ti ti-plus" /> Nova Classificação</button>}
      />

      <div className="crm-funnel-highlight">
        <select className="filter-select" value={selectedFunnelId} onChange={(e) => setSelectedFunnelId(e.target.value)}>
          {funnels.map((funnel) => (
            <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
          ))}
        </select>
        {activeFunnel?.workflowV2Enabled ? <span className="badge bg-light-primary text-primary">Workflow ativo</span> : null}
        <span className="text-sm text-muted">({visible.length} classificações)</span>
      </div>

      {visible.length === 0 ? (
        <div className="card page-section-card">
          <EmptyState icon="ti ti-category" title="Nenhuma classificação cadastrada" description="Crie a primeira etapa deste funil." />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="crm-config-list">
              {visible.map((item) => (
                <SortableClassificationCard key={item.id} item={item} onEdit={openEdit} onDelete={setDeleteItem} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar Classificação' : 'Nova Classificação'}
        size="lg"
        footer={<><button className="btn btn-light-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>{editing ? 'Salvar' : 'Criar Classificação'}</button></>}
      >
        <div className="form-group">
          <label>Nome <span className="req">*</span></label>
          <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Ex: Lead Quente, Cliente VIP..." />
        </div>
        <div className="form-group">
          <label>Funil <span className="req">*</span></label>
          <select value={form.funnelId} onChange={(e) => setForm((current) => ({ ...current, funnelId: e.target.value }))}>
            <option value="">Selecione um funil...</option>
            {funnels.map((funnel) => (
              <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Descrição (opcional)</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Adicione uma descrição para esta classificação..." />
        </div>
        <div className="form-group">
          <label>Ordem</label>
          <input value={editing?.order || classifications.filter((item) => item.funnelId === form.funnelId).length + 1} disabled />
        </div>

        <div className="switch-row">
          <div>
            <strong>Padrão ao iniciar atendimento</strong>
            <p className="text-muted text-sm">Ao iniciar um atendimento, o chat será classificado nesta etapa.</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={form.isDefaultOnStart} onChange={(e) => setForm((current) => ({ ...current, isDefaultOnStart: e.target.checked }))} />
            <span className="slider" />
          </label>
        </div>
        <div className="switch-row">
          <div>
            <strong>Padrão ao finalizar atendimento</strong>
            <p className="text-muted text-sm">Ao finalizar um atendimento, o chat será classificado nesta etapa.</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={form.isDefaultOnFinish} onChange={(e) => setForm((current) => ({ ...current, isDefaultOnFinish: e.target.checked }))} />
            <span className="slider" />
          </label>
        </div>
        <div className="switch-row">
          <div>
            <strong>Padrão ao transferir atendimento</strong>
            <p className="text-muted text-sm">Ao transferir um atendimento, o chat será classificado nesta etapa.</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={form.isDefaultOnTransfer} onChange={(e) => setForm((current) => ({ ...current, isDefaultOnTransfer: e.target.checked }))} />
            <span className="slider" />
          </label>
        </div>
        <div className="switch-row">
          <div>
            <strong>Ativar follow-up nesta classificação</strong>
            <p className="text-muted text-sm">Inicia ciclo de follow-up ao mover o chat para esta etapa.</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={form.followUpEnabled} onChange={(e) => setForm((current) => ({ ...current, followUpEnabled: e.target.checked }))} />
            <span className="slider" />
          </label>
        </div>
        <div className="form-group">
          <label>Próxima etapa quando cliente responder (opcional)</label>
          <select value={form.followupResponseStageId} onChange={(e) => setForm((current) => ({ ...current, followupResponseStageId: e.target.value }))}>
            <option value="">Manter na mesma classificação</option>
            {classifications.filter((item) => item.funnelId === form.funnelId && item.id !== editing?.id).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Preview</label>
          <div className="crm-stage-preview">
            <div className="crm-stage-color" style={{ background: form.color }} />
            <div>
              <div className="fw-semibold">{form.name || 'Nome da Classificação'}</div>
              <div className="crm-color-pill">{form.color}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {COLORS.map((color) => (
              <button key={color} type="button" className={`color-dot ${form.color === color ? 'on' : ''}`} style={{ background: color }} onClick={() => setForm((current) => ({ ...current, color }))} />
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={confirmDelete} title="Excluir classificação" message="Deseja realmente excluir esta classificação?" />
    </div>
  );
}

