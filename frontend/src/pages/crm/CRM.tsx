/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragOverlay, closestCorners } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { api } from '../../services/api';
import { syncCrmFunnelViaBackend } from '../../services/backend';
import type { Funnel, Lead, Contact } from '../../types';
import { PageHeader, LoadingState, Modal } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

const fmtR = (n?: number) => 'R$ ' + (n || 0).toLocaleString('pt-BR');
const alpha = (hex: string, value: number) => {
  const safe = hex.replace('#', '');
  const normalized = safe.length === 3 ? safe.split('').map((char) => char + char).join('') : safe;
  const numeric = parseInt(normalized, 16);
  const red = (numeric >> 16) & 255;
  const green = (numeric >> 8) & 255;
  const blue = numeric & 255;
  return `rgba(${red}, ${green}, ${blue}, ${value})`;
};

type StatusFilter = 'all' | 'won' | 'lost' | 'open';
type MetricRange = 'yesterday' | 'today' | '7d' | '30d' | 'month' | 'custom';
type DateFilterMode = 'activity' | 'created';

function LeadCard({ lead, onClick, onDelete }: { lead: Lead; onClick: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { type: 'card', stageId: lead.stageId },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.45 : 1 } : undefined;
  const overdue = lead.expectedCloseDate && new Date(lead.expectedCloseDate) < new Date() && lead.status === 'open';
  const contactName = lead.contact?.name || lead.title;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`kanban-card ${isDragging ? 'dragging' : ''}`} onClick={onClick}>
      <div className="kanban-card-top">
        <span className="kanban-card-title">{contactName}</span>
        <div className="kanban-card-actions" onClick={(event) => event.stopPropagation()}>
          {overdue && <i className="ti ti-alert-circle" style={{ color: '#ef4444' }} title="Atrasado" />}
          <button className="icon-btn icon-btn-sm" title="Excluir oportunidade" onClick={onDelete}><i className="ti ti-trash" /></button>
        </div>
      </div>
      {lead.title !== contactName && <div className="kanban-card-subtitle">{lead.title}</div>}
      <div className="kanban-card-meta">
        <span className="text-xs text-muted"><i className="ti ti-source-branch" /> {lead.origin || 'CRM'}</span>
      </div>
      {!!lead.tags?.length && <div className="flex flex-wrap gap-1 mt-1">{lead.tags.map((tag) => <span key={tag.id} className="tag-chip" style={{ background: tag.color, fontSize: '.62rem' }}>{tag.name}</span>)}</div>}
    </div>
  );
}

function Column({
  stage,
  leads,
  onCardClick,
  onAdd,
  onDeleteLead,
  onDeleteStage,
  onSaveStage,
}: {
  stage: any;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onAdd: () => void;
  onDeleteLead: (lead: Lead) => void;
  onDeleteStage: () => void;
  onSaveStage: (stageId: string, patch: { name?: string; description?: string }) => Promise<void>;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: stage.id, data: { type: 'stage', stageId: stage.id } });
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: `col-${stage.id}`, data: { type: 'column', stageId: stage.id } });
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [nameValue, setNameValue] = useState(stage.name || '');
  const [descriptionValue, setDescriptionValue] = useState(stage.description || '');
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.55 : 1 } : undefined;
  const stageLight = alpha(stage.color || '#2172DB', 0.11);
  const stageBorder = alpha(stage.color || '#2172DB', 0.32);

  useEffect(() => {
    setNameValue(stage.name || '');
    setDescriptionValue(stage.description || '');
  }, [stage.name, stage.description]);

  const saveName = async () => {
    const nextName = nameValue.trim();
    if (!nextName || nextName === stage.name) {
      setNameValue(stage.name || '');
      setEditingName(false);
      return;
    }
    await onSaveStage(stage.id, { name: nextName });
    setEditingName(false);
  };

  const saveDescription = async () => {
    const nextDescription = descriptionValue.trim();
    if (nextDescription === (stage.description || '')) {
      setDescriptionValue(stage.description || '');
      setEditingDescription(false);
      return;
    }
    await onSaveStage(stage.id, { description: nextDescription });
    setEditingDescription(false);
  };

  return (
    <div className={`kanban-col ${isOver ? 'over' : ''} ${isDragging ? 'dragging' : ''}`} style={{ ...style, '--stage-color': stage.color, '--stage-bg': stageLight, '--stage-border': stageBorder } as React.CSSProperties}>
      <div className="kanban-col-head">
        <div className="kanban-col-head-left">
          <button ref={setDragRef} className="crm-drag-handle" type="button" title="Arrastar etapa" {...attributes} {...listeners}>
            <i className="ti ti-grip-vertical" />
          </button>
          <div className="kanban-col-title-wrap">
            <span className="kanban-dot" style={{ background: stage.color }} />
            {editingName ? (
              <div className="crm-stage-title-edit" onClick={(event) => event.stopPropagation()}>
                <input className="crm-stage-title-input" value={nameValue} onChange={(event) => setNameValue(event.target.value)} autoFocus />
                <button className="crm-stage-edit-btn save" type="button" title="Salvar alteração" onClick={saveName}>
                  <i className="ti ti-check" />
                </button>
                <button
                  className="crm-stage-edit-btn cancel"
                  type="button"
                  title="Cancelar"
                  onClick={() => {
                    setNameValue(stage.name || '');
                    setEditingName(false);
                  }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
            ) : (
              <button className="kanban-col-name crm-stage-title-button" type="button" title="Clique para editar o nome" onClick={() => setEditingName(true)}>
                {stage.name}
                <i className="ti ti-pencil" />
              </button>
            )}
          </div>
        </div>
        <div className="kanban-col-head-right">
          <button className="icon-btn icon-btn-sm kanban-head-action pink" type="button" title="Adicionar oportunidade" onClick={onAdd}><i className="ti ti-plus" /></button>
          <span className="badge bg-light-secondary">{leads.length}</span>
          <button className="icon-btn icon-btn-sm kanban-head-action muted" type="button" title="Excluir etapa" onClick={onDeleteStage}><i className="ti ti-trash" /></button>
        </div>
      </div>
      <div className="kanban-col-desc">
        {editingDescription ? (
          <div className="crm-stage-desc-edit" onClick={(event) => event.stopPropagation()}>
            <textarea className="crm-stage-desc-input" value={descriptionValue} onChange={(event) => setDescriptionValue(event.target.value)} placeholder="Descrição da etapa..." autoFocus />
            <div className="crm-stage-desc-actions">
              <button className="crm-stage-edit-btn save" type="button" title="Salvar" onClick={saveDescription}>
                <i className="ti ti-check" />
              </button>
              <button
                className="crm-stage-edit-btn cancel"
                type="button"
                title="Cancelar"
                onClick={() => {
                  setDescriptionValue(stage.description || '');
                  setEditingDescription(false);
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
          </div>
        ) : (
          <button className="crm-stage-desc-button" type="button" title="Clique para editar a descrição" onClick={() => setEditingDescription(true)}>
            {stage.description || 'Adicionar descrição da etapa...'}
          </button>
        )}
      </div>
      <div ref={setDropRef} className="kanban-col-body app-scroll">
        {leads.length === 0 ? <div className="kanban-empty">Nenhum chat nesta coluna</div> : leads.map((lead) => <LeadCard key={lead.id} lead={lead} onClick={() => onCardClick(lead)} onDelete={() => onDeleteLead(lead)} />)}
      </div>
    </div>
  );
}

export default function CRM() {
  const { notify } = useToast();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [funnelId, setFunnelId] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stageOrder, setStageOrder] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'card' | 'column' | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newStageId, setNewStageId] = useState<string>('');
  const [view, setView] = useState<'kanban' | 'dash'>('kanban');
  const [form, setForm] = useState<any>({});
  const [metricRange, setMetricRange] = useState<MetricRange>('7d');
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('activity');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stageToDelete, setStageToDelete] = useState<any | null>(null);
  const periodRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const defaultStages = [
    { id: 'stage-neutral', name: 'Lead Neutro', color: '#27c498', order: 1, description: 'Leads que demonstram algum interesse, mas precisam de mais nutrição.' },
    { id: 'stage-cold', name: 'Lead Frio', color: '#60a5fa', order: 2, description: 'Leads com baixa qualificação, sem orçamento ou necessidade imediata.' },
    { id: 'stage-hot', name: 'Lead Quente', color: '#fb7185', order: 3, description: 'Leads qualificados com forte intenção de compra e boa adequação ao produto.' },
    { id: 'stage-contact', name: 'Contato Inicial', color: '#f59e0b', order: 4, description: 'Primeiro contato para introdução e levantamento de necessidades.' },
    { id: 'stage-solution', name: 'Apresentação da Solução', color: '#38bdf8', order: 5, description: 'Demonstração detalhada do produto ou serviço para o lead.' },
    { id: 'stage-negotiation', name: 'Proposta e Negociação', color: '#a78bfa', order: 6, description: 'Envio da proposta e discussão de termos e valores.' },
    { id: 'stage-closing', name: 'Fechamento', color: '#f97316', order: 7, description: 'Momento final de decisão do lead sobre a proposta apresentada.' },
  ];

  useEffect(() => {
    api.funnels.list().then(async (items: Funnel[]) => {
      if (items.length > 0) {
        const ordered = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
        setFunnels(ordered);
        setFunnelId((current) => current || ordered[0]?.id || '');
        return;
      }

      const created = await api.funnels.create({
        name: 'Funil Principal',
        description: 'Pipeline de vendas principal',
        workflowV2Enabled: true,
        stages: defaultStages,
        isDefault: true,
      });
      const stages = created.stages.map((stage: any) => ({ ...stage, funnelId: created.id }));
      const finalCreated = await api.funnels.update(created.id, { ...created, stages });
      await Promise.all(stages.map((stage: any) => api.classifications.create({
        ...stage,
        funnelId: finalCreated.id,
        order: stage.order,
      })));
      setFunnels([finalCreated]);
      setFunnelId(finalCreated.id);
      notify('Funil principal criado automaticamente.');
    }).catch(() => {
      setLoading(false);
      notify('Não foi possível carregar o CRM.', 'error');
    });
    api.contacts.list().then((items: Contact[]) => setContacts(items));
    try {
      const raw = localStorage.getItem('crm_stage_order');
      if (raw) setStageOrder(JSON.parse(raw));
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!funnelId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.funnels.getLeads(funnelId).then((items) => {
      setLeads(items);
      setLoading(false);
    }).catch(() => {
      setLeads([]);
      setLoading(false);
      notify('Não foi possível carregar as oportunidades.', 'error');
    });
  }, [funnelId]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!periodRef.current?.contains(event.target as Node)) setPeriodOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const funnel = funnels.find((item) => item.id === funnelId);
  const orderedStages = (() => {
    if (!funnel) return [];
    const order = stageOrder[funnel.id] || funnel.stages.map((stage) => stage.id);
    const map = new Map(funnel.stages.map((stage) => [stage.id, stage]));
    return order.map((id) => map.get(id)).filter(Boolean) as any[];
  })();

  const searchedLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const value = search.toLowerCase();
    return leads.filter((lead) => `${lead.contact?.name || ''} ${lead.title || ''} ${lead.contact?.phone || ''}`.toLowerCase().includes(value));
  }, [leads, search]);

  const visibleLeads = useMemo(() => {
    if (statusFilter === 'all') return searchedLeads;
    if (statusFilter === 'won') return searchedLeads.filter((lead) => lead.status === 'won');
    if (statusFilter === 'lost') return searchedLeads.filter((lead) => lead.status === 'lost');
    return searchedLeads.filter((lead) => lead.status === 'open' || lead.status === 'reopened');
  }, [searchedLeads, statusFilter]);

  const leadsByRange = visibleLeads.filter((lead) => {
    const sourceDate = dateFilterMode === 'created' ? lead.createdAt : lead.updatedAt || lead.createdAt;
    const dt = new Date(sourceDate || '1970-01-01T00:00:00.000Z');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    if (metricRange === 'today') return dt >= todayStart && dt < tomorrowStart;

    if (metricRange === 'yesterday') {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(todayStart.getDate() - 1);
      return dt >= yesterdayStart && dt < todayStart;
    }

    if (metricRange === '7d' || metricRange === '30d') {
      const start = new Date(todayStart);
      start.setDate(todayStart.getDate() - (metricRange === '7d' ? 6 : 29));
      return dt >= start && dt < tomorrowStart;
    }

    if (metricRange === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return dt >= monthStart && dt < tomorrowStart;
    }

    if (metricRange === 'custom') {
      if (!customFrom && !customTo) return true;
      const fromDate = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
      const toDate = customTo ? new Date(`${customTo}T23:59:59`) : null;
      if (fromDate && dt < fromDate) return false;
      if (toDate && dt > toDate) return false;
      return true;
    }

    return true;
  });

  const metricRangeLabel =
    metricRange === 'yesterday'
      ? 'Ontem'
      : metricRange === 'today'
        ? 'Hoje'
        : metricRange === '7d'
          ? 'Últimos 7 dias'
          : metricRange === '30d'
            ? 'Últimos 30 dias'
            : metricRange === 'month'
              ? 'Este mês'
              : 'Personalizado';

  const totalConversations = leadsByRange.length;
  const totalNegotiations = leadsByRange.length;
  const closedSales = leadsByRange.filter((lead) => lead.status === 'won').length;
  const closedValue = leadsByRange.filter((lead) => lead.status === 'won').reduce((sum, lead) => sum + (lead.value || 0), 0);
  const conversionPct = totalNegotiations ? Math.round((closedSales / totalNegotiations) * 100) : 0;
  const avgTicket = closedSales ? Math.round(closedValue / closedSales) : 0;

  const totalWonValue = searchedLeads.filter((lead) => lead.status === 'won').reduce((sum, lead) => sum + (lead.value || 0), 0);
  const totalLostValue = searchedLeads.filter((lead) => lead.status === 'lost').reduce((sum, lead) => sum + (lead.value || 0), 0);
  const totalOpenValue = searchedLeads.filter((lead) => lead.status === 'open' || lead.status === 'reopened').reduce((sum, lead) => sum + (lead.value || 0), 0);

  const stageStats = orderedStages.map((stage: any) => ({
    id: stage.id,
    name: stage.name,
    count: leadsByRange.filter((lead) => lead.stageId === stage.id).length,
    value: leadsByRange.filter((lead) => lead.stageId === stage.id).reduce((sum, lead) => sum + (lead.value || 0), 0),
  }));

  const saveStage = async (stageId: string, patch: { name?: string; description?: string }) => {
    if (!funnel) return;
    const nextStages = funnel.stages.map((stage: any) => (stage.id === stageId ? { ...stage, ...patch } : stage));
    const updatedFunnel = await api.funnels.update(funnel.id, { ...funnel, stages: nextStages });
    const updatedClassification = await api.classifications.update(stageId, patch);
    if (!updatedClassification) {
      const sourceStage = nextStages.find((stage: any) => stage.id === stageId);
      if (sourceStage) {
        await api.classifications.create({
          ...sourceStage,
          id: stageId,
          funnelId: funnel.id,
          order: sourceStage.order,
        });
      }
    }
    const syncResult = await syncCrmFunnelViaBackend({ funnel: updatedFunnel });
    if (!syncResult?.ok) {
      notify(`Etapa atualizada localmente, mas falhou ao salvar no banco: ${syncResult?.error || 'erro desconhecido'}`, 'error');
      return;
    }
    setFunnels((current) => current.map((item) => (item.id === funnel.id ? updatedFunnel : item)));
    await api.audit.log('Etapa atualizada', 'CRM', 'FunnelStage', stageId, patch);
    notify('Etapa atualizada.');
  };

  const handleBoardWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const element = boardRef.current;
    if (!element) return;
    if (element.scrollWidth <= element.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    element.scrollLeft += event.deltaY;
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveType((event.active.data?.current?.type || 'card') as 'card' | 'column');
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveType(null);
    const type = event.active.data?.current?.type as 'card' | 'column' | undefined;
    const overId = event.over?.id as string | undefined;
    if (!overId || !funnel || !type) return;

    if (type === 'column') {
      const draggedStageId = event.active.data?.current?.stageId as string;
      const targetStageId = String(event.over?.data?.current?.stageId || overId).replace('col-', '');
      if (!draggedStageId || !targetStageId || draggedStageId === targetStageId) return;

      const current = stageOrder[funnel.id] || funnel.stages.map((stage) => stage.id);
      const from = current.indexOf(draggedStageId);
      const to = current.indexOf(targetStageId);
      if (from === -1 || to === -1) return;

      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, draggedStageId);
      const nextOrder = { ...stageOrder, [funnel.id]: next };
      setStageOrder(nextOrder);
      try { localStorage.setItem('crm_stage_order', JSON.stringify(nextOrder)); } catch {}
      await api.audit.log('Etapa reordenada', 'CRM', 'Funnel', funnel.id);
      notify('Etapa reordenada.');
      return;
    }

    const leadId = event.active.id as string;
    const overLead = leads.find((lead) => lead.id === overId);
    const stageId = String(event.over?.data?.current?.stageId || overLead?.stageId || overId);
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || !stageId || lead.stageId === stageId) return;

    setLeads((current) => current.map((item) => item.id === leadId ? { ...item, stageId } : item));
    await api.funnels.moveLead(leadId, stageId);
    await api.audit.log('Lead movido no funil', 'CRM', 'Lead', leadId, { stageId });
    notify('Lead movido.');
  };

  const openNewForStage = (stageId: string) => {
    setNewStageId(stageId);
    setForm({});
    setNewOpen(true);
  };

  const saveNew = async () => {
    const contact = contacts.find((item) => item.id === form.contactId);
    if (!contact) { notify('Selecione um contato.', 'warning'); return; }
    const stageId = newStageId || funnel?.stages[0]?.id;
    if (!stageId) { notify('Etapa não encontrada.', 'warning'); return; }
    const title = form.title?.trim() || contact.name;
    const created = await api.funnels.createLead({
      title,
      funnelId,
      stageId,
      contactId: contact.id,
      contact,
      value: Number(form.value) || 0,
      product: form.product || '',
      origin: form.origin || 'CRM',
      notes: form.notes || '',
    });
    setLeads((current) => [created, ...current]);
    await api.audit.log('Lead criado', 'CRM', 'Lead', created.id);
    setNewOpen(false);
    setNewStageId('');
    setForm({});
    notify('Oportunidade criada.');
  };

  const deleteLead = async (lead: Lead) => {
    if (!confirm(`Excluir oportunidade "${lead.title || lead.contact?.name}"?`)) return;
    await api.funnels.deleteLead(lead.id);
    setLeads((current) => current.filter((item) => item.id !== lead.id));
    if (editLead?.id === lead.id) setEditLead(null);
    await api.audit.log('Lead excluído', 'CRM', 'Lead', lead.id);
    notify('Oportunidade excluída.');
  };

  const deleteStage = async () => {
    if (!stageToDelete || !funnel) return;
    const nextStages = funnel.stages
      .filter((stage) => stage.id !== stageToDelete.id)
      .map((stage, index) => ({ ...stage, order: index + 1 }));

    const affectedLeads = leads.filter((lead) => lead.stageId === stageToDelete.id);
    if (affectedLeads.length) {
      await Promise.all(affectedLeads.map((lead) => api.funnels.updateLead(lead.id, { stageId: '' })));
    }

    const updatedFunnel = await api.funnels.update(funnel.id, { ...funnel, stages: nextStages });
    await api.classifications.delete(stageToDelete.id);
    setFunnels((current) => current.map((item) => item.id === funnel.id ? updatedFunnel : item));
    setLeads((current) => current.map((lead) => lead.stageId === stageToDelete.id ? { ...lead, stageId: '' } : lead));

    const currentOrder = stageOrder[funnel.id] || funnel.stages.map((stage) => stage.id);
    const nextOrder = currentOrder.filter((id) => id !== stageToDelete.id);
    const updatedOrder = { ...stageOrder, [funnel.id]: nextOrder };
    setStageOrder(updatedOrder);
    try { localStorage.setItem('crm_stage_order', JSON.stringify(updatedOrder)); } catch {}

    await api.audit.log('Etapa excluída', 'CRM', 'FunnelStage', stageToDelete.id, { funnelId: funnel.id });
    setStageToDelete(null);
    notify('Etapa excluída. Os chats ficaram sem classificação.');
  };

  const updateLead = async (data: any) => {
    if (!editLead) return;
    const updated = await api.funnels.updateLead(editLead.id, data);
    setLeads((current) => current.map((item) => item.id === editLead.id ? updated : item));
    setEditLead(null);
    notify('Oportunidade atualizada.');
  };

  if (loading && !funnel) return <LoadingState />;

  return (
    <div className="crm-page">
      <PageHeader
        title="CRM / Funil de Vendas"
        subtitle="Gerencie suas oportunidades em Kanban"
        actions={
          <>
            <div className="crm-funnel-tabs">
              {funnels.map((item) => <button key={item.id} className={`crm-funnel-tab ${item.id === funnelId ? 'active' : ''}`} onClick={() => setFunnelId(item.id)}>{item.name}</button>)}
            </div>
            <div className="search-box crm-search-box"><i className="ti ti-search" /><input placeholder="Pesquisar nome ou número..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="crm-period-filter" ref={periodRef}>
              <button type="button" className={`filter-select crm-period-trigger ${periodOpen ? 'open' : ''}`} onClick={() => setPeriodOpen((current) => !current)}>
                {metricRangeLabel}
                <i className={`ti ${periodOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
              </button>
              {periodOpen ? (
                <div className="crm-period-dropdown">
                  <p className="crm-period-title">Período</p>
                  <p className="crm-period-subtitle">Filtrar por:</p>
                  <div className="crm-period-mode-row">
                    <button type="button" className={`crm-period-chip ${dateFilterMode === 'activity' ? 'active' : ''}`} onClick={() => setDateFilterMode('activity')}>Última atividade</button>
                    <button type="button" className={`crm-period-chip ${dateFilterMode === 'created' ? 'active' : ''}`} onClick={() => setDateFilterMode('created')}>Data de criação</button>
                  </div>
                  <p className="crm-period-subtitle">Intervalo:</p>
                  <div className="crm-period-options">
                    <button type="button" className={`crm-period-option ${metricRange === 'yesterday' ? 'active' : ''}`} onClick={() => { setMetricRange('yesterday'); setPeriodOpen(false); }}>Ontem</button>
                    <button type="button" className={`crm-period-option ${metricRange === 'today' ? 'active' : ''}`} onClick={() => { setMetricRange('today'); setPeriodOpen(false); }}>Hoje</button>
                    <button type="button" className={`crm-period-option ${metricRange === '7d' ? 'active' : ''}`} onClick={() => { setMetricRange('7d'); setPeriodOpen(false); }}>Últimos 7 dias</button>
                    <button type="button" className={`crm-period-option ${metricRange === '30d' ? 'active' : ''}`} onClick={() => { setMetricRange('30d'); setPeriodOpen(false); }}>Últimos 30 dias</button>
                    <button type="button" className={`crm-period-option ${metricRange === 'month' ? 'active' : ''}`} onClick={() => { setMetricRange('month'); setPeriodOpen(false); }}>Este mês</button>
                    <button type="button" className={`crm-period-option ${metricRange === 'custom' ? 'active' : ''}`} onClick={() => setMetricRange('custom')}>Personalizado</button>
                  </div>
                  {metricRange === 'custom' ? (
                    <div className="crm-period-custom">
                      <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                      <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => setPeriodOpen(false)}>Aplicar</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="crm-view-toggle" role="group" aria-label="Modo de visualização do funil">
              <button type="button" aria-pressed={view === 'kanban'} className={`crm-view-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}><i className="ti ti-layout-grid" /><span>Kanban</span></button>
              <button type="button" aria-pressed={view === 'dash'} className={`crm-view-btn ${view === 'dash' ? 'active' : ''}`} onClick={() => setView('dash')}><i className="ti ti-chart-bar" /><span>Dashboard</span></button>
            </div>
            <button className="btn btn-primary" onClick={() => setNewOpen(true)}><i className="ti ti-plus" /> Nova Oportunidade</button>
          </>
        }
      />

      <div className="crm-summary-cards">
        <button type="button" className={`crm-summary-card success ${statusFilter === 'won' ? 'active' : ''}`} onClick={() => setStatusFilter((current) => current === 'won' ? 'all' : 'won')}>
          <div className="crm-summary-icon"><i className="ti ti-trophy" /></div>
          <div><p>Total ganho</p><strong>{fmtR(totalWonValue)}</strong></div>
        </button>
        <button type="button" className={`crm-summary-card danger ${statusFilter === 'lost' ? 'active' : ''}`} onClick={() => setStatusFilter((current) => current === 'lost' ? 'all' : 'lost')}>
          <div className="crm-summary-icon"><i className="ti ti-circle-x" /></div>
          <div><p>Total perdido</p><strong>{fmtR(totalLostValue)}</strong></div>
        </button>
        <button type="button" className={`crm-summary-card warning ${statusFilter === 'open' ? 'active' : ''}`} onClick={() => setStatusFilter((current) => current === 'open' ? 'all' : 'open')}>
          <div className="crm-summary-icon"><i className="ti ti-arrow-up-right" /></div>
          <div><p>Em aberto</p><strong>{fmtR(totalOpenValue)}</strong></div>
        </button>
      </div>

      {view === 'kanban' ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div ref={boardRef} className="kanban-board app-scroll" onWheel={handleBoardWheel}>
            {orderedStages.map((stage) => (
              <Column
                key={stage.id}
                stage={stage}
                leads={visibleLeads.filter((lead) => lead.stageId === stage.id)}
                onCardClick={setEditLead}
                onAdd={() => openNewForStage(stage.id)}
                onDeleteLead={deleteLead}
                onDeleteStage={() => setStageToDelete(stage)}
                onSaveStage={saveStage}
              />
            ))}
          </div>
          <DragOverlay>
            {activeId && activeType === 'column' ? (
              <div className="kanban-col dragging crm-col-overlay">
                <div className="kanban-col-head">
                  <div className="kanban-col-head-left">
                    <button className="crm-drag-handle" type="button"><i className="ti ti-grip-vertical" /></button>
                    <span className="kanban-col-name">
                      <span className="kanban-dot" style={{ background: orderedStages.find((item: any) => `col-${item.id}` === activeId)?.color }} />
                      {orderedStages.find((item: any) => `col-${item.id}` === activeId)?.name}
                    </span>
                  </div>
                </div>
              </div>
            ) : activeId ? (
              <div className="kanban-card dragging"><span className="kanban-card-title">{leads.find((lead) => lead.id === activeId)?.contact?.name || leads.find((lead) => lead.id === activeId)?.title}</span></div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(33,114,219,.12)', color: '#2172DB' }}><i className="ti ti-headset" /></div><div className="stat-info"><span className="stat-value">{totalConversations}</span><span className="stat-label">Atendimentos</span></div></div>
            <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(6,145,169,.12)', color: '#0691A9' }}><i className="ti ti-layout-kanban" /></div><div className="stat-info"><span className="stat-value">{totalNegotiations}</span><span className="stat-label">Negociações</span></div></div>
            <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(52,180,120,.12)', color: '#34B478' }}><i className="ti ti-trophy" /></div><div className="stat-info"><span className="stat-value">{closedSales}</span><span className="stat-label">Vendas fechadas</span></div></div>
            <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(147,51,234,.12)', color: '#9333EA' }}><i className="ti ti-percentage" /></div><div className="stat-info"><span className="stat-value">{conversionPct}%</span><span className="stat-label">Conversão</span></div></div>
            <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(250,172,80,.12)', color: '#FAAC50' }}><i className="ti ti-cash" /></div><div className="stat-info"><span className="stat-value">{fmtR(closedValue)}</span><span className="stat-label">Receita fechada</span></div></div>
            <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(236,72,153,.12)', color: '#EC4899' }}><i className="ti ti-receipt-2" /></div><div className="stat-info"><span className="stat-value">{fmtR(avgTicket)}</span><span className="stat-label">Ticket médio</span></div></div>
          </div>
          <div className="card">
            <div className="card-pad">
              <h4 className="chart-title">Funil por etapa</h4>
              <table className="data-table">
                <thead>
                  <tr><th>Etapa</th><th>Qtd.</th><th>Valor total</th></tr>
                </thead>
                <tbody>
                  {stageStats.map((stage) => (
                    <tr key={stage.id}><td>{stage.name}</td><td>{stage.count}</td><td>{fmtR(stage.value)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal open={newOpen} onClose={() => { setNewOpen(false); setNewStageId(''); setForm({}); }} title={newStageId ? `Adicionar em ${funnel?.stages.find((stage) => stage.id === newStageId)?.name}` : 'Nova Oportunidade'} size="md"
        footer={<><button className="btn btn-light-secondary" onClick={() => { setNewOpen(false); setNewStageId(''); setForm({}); }}>Cancelar</button><button className="btn btn-primary" onClick={saveNew}>Criar</button></>}>
        <div className="form-group"><label>Contato <span className="req">*</span></label><select value={form.contactId || ''} onChange={(e) => setForm({ ...form, contactId: e.target.value })}><option value="">Selecione</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name} {contact.phone ? `(${contact.phone})` : ''}</option>)}</select></div>
        <div className="form-group"><label>Título / oportunidade</label><input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Plano Business (deixe em branco para usar o nome do contato)" /></div>
        <div className="form-row">
          <div className="form-group"><label>Valor (R$)</label><input type="number" value={form.value || ''} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
          <div className="form-group"><label>Produto / serviço</label><input value={form.product || ''} onChange={(e) => setForm({ ...form, product: e.target.value })} /></div>
        </div>
        <div className="form-group"><label>Origem</label><input value={form.origin || ''} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></div>
        <div className="form-group"><label>Observações</label><textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </Modal>

      <Modal open={!!stageToDelete} onClose={() => setStageToDelete(null)} title="Excluir Coluna" size="sm"
        footer={<><button className="btn btn-light-secondary" onClick={() => setStageToDelete(null)}>Cancelar</button><button className="btn btn-danger" onClick={deleteStage}><i className="ti ti-trash" /> Excluir Coluna</button></>}>
        <div className="crm-delete-stage-dialog">
          <p>Tem certeza que deseja excluir a coluna <strong>"{stageToDelete?.name}"</strong>?</p>
          <div className="crm-delete-stage-alert">⚠️ Atenção: os chats desta coluna não serão excluídos, apenas ficarão sem classificação.</div>
        </div>
      </Modal>

      {editLead && <LeadDetail lead={editLead} stages={funnel?.stages || []} onClose={() => setEditLead(null)} onSave={updateLead} onDelete={() => deleteLead(editLead)} />}
    </div>
  );
}

function LeadDetail({ lead, stages, onClose, onSave, onDelete }: { lead: Lead; stages: any[]; onClose: () => void; onSave: (data: any) => void; onDelete: () => void }) {
  const [form, setForm] = useState<any>({ ...lead });

  return (
    <Modal open onClose={onClose} title={lead.title} size="lg"
      footer={<>
        <button className="btn btn-light-danger" onClick={onDelete}><i className="ti ti-trash" /> Excluir</button>
        <button className="btn btn-light-danger" onClick={() => onSave({ status: 'lost', lostAt: new Date().toISOString() })}><i className="ti ti-x" /> Marcar perdido</button>
        <button className="btn btn-success" onClick={() => onSave({ status: 'won', wonAt: new Date().toISOString() })}><i className="ti ti-trophy" /> Marcar ganho</button>
        <button className="btn btn-primary" onClick={() => onSave({ value: Number(form.value), notes: form.notes, stageId: form.stageId, product: form.product })}>Salvar</button>
      </>}>
      <div className="form-row">
        <div className="form-group"><label>Etapa</label><select value={form.stageId} onChange={(e) => setForm({ ...form, stageId: e.target.value })}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></div>
        <div className="form-group"><label>Valor (R$)</label><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Produto</label><input value={form.product || ''} onChange={(e) => setForm({ ...form, product: e.target.value })} /></div>
        <div className="form-group"><label>Contato</label><input value={form.contact?.name || ''} disabled /></div>
      </div>
      <div className="form-group"><label>Observações</label><textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      <div className="lead-status-badge">Status atual: <span className={`badge bg-light-${form.status === 'won' ? 'success' : form.status === 'lost' ? 'danger' : 'primary'} text-${form.status === 'won' ? 'success' : form.status === 'lost' ? 'danger' : 'primary'}`}>{form.status === 'won' ? 'Ganho' : form.status === 'lost' ? 'Perdido' : 'Aberto'}</span></div>
    </Modal>
  );
}