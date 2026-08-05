import { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConfirmDialog, EmptyState, LoadingState, Modal, PageHeader } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import type { Funnel } from '../../types';

const DEFAULT_STAGE_TEMPLATES = [
  { name: 'Lead Neutro', color: '#D3D3D3', description: 'Leads que demonstram algum interesse, mas precisam de mais nutrição.' },
  { name: 'Lead Frio', color: '#ADD8E6', description: 'Leads com baixa qualificação, sem orçamento ou necessidade imediata.' },
  { name: 'Lead Quente', color: '#FFB6C1', description: 'Leads qualificados com forte intenção de compra e boa adequação ao produto.' },
  { name: 'Contato Inicial', color: '#FFFACD', description: 'Primeiro contato para introdução e levantamento de necessidades.' },
];

function SortableFunnelCard({
  funnel,
  onEdit,
  onDelete,
}: {
  funnel: Funnel;
  onEdit: (funnel: Funnel) => void;
  onDelete: (funnel: Funnel) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: funnel.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`crm-config-card ${isDragging ? 'dragging' : ''}`}>
      <button className="crm-drag-handle" type="button" {...attributes} {...listeners}>
        <i className="ti ti-grip-vertical" />
      </button>
      <div className="crm-config-icon crm-config-icon-funnel">
        <i className="ti ti-layout-grid" />
      </div>
      <div className="crm-config-body">
        <div className="crm-config-topline">
          <h3>{funnel.name}</h3>
          <div className="flex gap-1 flex-wrap">
            {funnel.workflowV2Enabled ? <span className="badge bg-light-primary text-primary">Workflow ativo</span> : null}
            {funnel.showCustomerBase ? <span className="badge bg-light-secondary text-secondary">Base de clientes</span> : null}
          </div>
        </div>
        <p>{funnel.description || 'Sem descrição cadastrada.'}</p>
        <div className="crm-config-meta">
          <span>Ordem: {funnel.order || 1}</span>
          <span>{(funnel.stages || []).length} etapas</span>
          <span>Criado em: {new Date(funnel.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
      <div className="crm-config-actions">
        <button className="icon-btn" onClick={() => onEdit(funnel)}><i className="ti ti-pencil" /></button>
        <button className="icon-btn" onClick={() => onDelete(funnel)}><i className="ti ti-trash" /></button>
      </div>
    </div>
  );
}

export default function FunnelsSettings() {
  const { notify } = useToast();
  const [items, setItems] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Funnel | null>(null);
  const [deleteItem, setDeleteItem] = useState<Funnel | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    workflowV2Enabled: true,
    showCustomerBase: false,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = async () => {
    const list: Funnel[] = await api.funnels.list();
    setItems([...list].sort((a, b) => (a.order || 0) - (b.order || 0)));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => [...items].sort((a, b) => (a.order || 0) - (b.order || 0)), [items]);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      workflowV2Enabled: true,
      showCustomerBase: false,
    });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (funnel: Funnel) => {
    setEditing(funnel);
    setForm({
      name: funnel.name,
      description: funnel.description || '',
      workflowV2Enabled: !!funnel.workflowV2Enabled,
      showCustomerBase: !!funnel.showCustomerBase,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      notify('Informe o nome do funil.', 'warning');
      return;
    }

    if (editing) {
      const updated = await api.funnels.update(editing.id, {
        ...editing,
        name: form.name.trim(),
        description: form.description.trim(),
        workflowV2Enabled: form.workflowV2Enabled,
        showCustomerBase: form.showCustomerBase,
      });
      setItems((current) => current.map((item) => item.id === editing.id ? updated : item));
      notify('Funil atualizado com sucesso.');
    } else {
      const created = await api.funnels.create({
        name: form.name.trim(),
        description: form.description.trim(),
        workflowV2Enabled: form.workflowV2Enabled,
        showCustomerBase: form.showCustomerBase,
        stages: DEFAULT_STAGE_TEMPLATES.map((stage, index) => ({
          id: `stage-${Date.now()}-${index}`,
          funnelId: '',
          name: stage.name,
          color: stage.color,
          description: stage.description,
          order: index + 1,
        })),
      });
      const stages = created.stages.map((stage: any) => ({ ...stage, funnelId: created.id }));
      const finalCreated = await api.funnels.update(created.id, { ...created, stages });
      const existingClassifications = await api.classifications.list();
      await Promise.all(stages.map((stage: any) => api.classifications.create({
        ...stage,
        funnelId: finalCreated.id,
        order: existingClassifications.filter((item: any) => item.funnelId === finalCreated.id).length + stage.order,
      })));
      setItems((current) => [...current, finalCreated].sort((a, b) => (a.order || 0) - (b.order || 0)));
      notify('Funil criado com sucesso.');
    }

    setOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    await api.funnels.delete(deleteItem.id);
    setItems((current) => current.filter((item) => item.id !== deleteItem.id));
    notify('Funil removido com sucesso.');
  };

  const onDragEnd = async ({ active, over }: any) => {
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((item) => item.id === active.id);
    const newIndex = sorted.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex).map((item, index) => ({ ...item, order: index + 1 }));
    setItems(reordered);
    await api.funnels.reorder(reordered.map((item) => item.id));
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader
        title="Funis de Vendas"
        subtitle="Gerencie os funis do seu CRM"
        actions={<button className="btn btn-primary" onClick={openCreate}><i className="ti ti-plus" /> Novo Funil</button>}
      />

      {sorted.length === 0 ? (
        <div className="card page-section-card">
          <EmptyState icon="ti ti-layout-grid" title="Nenhum funil cadastrado" description="Crie o primeiro funil para organizar seu CRM." />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sorted.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="crm-config-list">
              {sorted.map((funnel) => (
                <SortableFunnelCard key={funnel.id} funnel={funnel} onEdit={openEdit} onDelete={setDeleteItem} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar Funil' : 'Novo Funil'}
        size="lg"
        footer={<><button className="btn btn-light-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>{editing ? 'Salvar' : 'Criar Funil'}</button></>}
      >
        <div className="form-group">
          <label>Nome do Funil <span className="req">*</span></label>
          <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Ex: Funil de Vendas, Pós-Venda..." />
        </div>
        <div className="form-group">
          <label>Descrição (opcional)</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Adicione uma descrição para este funil..." />
        </div>
        <div className="crm-switch-card crm-switch-card-pink">
          <div>
            <strong>Workflow avançado (Kanban)</strong>
            <p>Campos personalizados, checklists e validação ao mover cards. Configure em Classificações.</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={form.workflowV2Enabled} onChange={(e) => setForm((current) => ({ ...current, workflowV2Enabled: e.target.checked }))} />
            <span className="slider" />
          </label>
        </div>
        <div className="crm-switch-card">
          <div>
            <strong>Mostrar Base de Clientes</strong>
            <p>Exibe a coluna "Base de Clientes" no Kanban para este funil.</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={form.showCustomerBase} onChange={(e) => setForm((current) => ({ ...current, showCustomerBase: e.target.checked }))} />
            <span className="slider" />
          </label>
        </div>
        <div className="crm-tip-box">
          <strong>💡 Dica:</strong> Após criar o funil, você poderá adicionar e reordenar etapas em <strong>Configurações &gt; Classificações</strong>.
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={confirmDelete} title="Excluir funil" message="Deseja realmente excluir este funil?" />
    </div>
  );
}

