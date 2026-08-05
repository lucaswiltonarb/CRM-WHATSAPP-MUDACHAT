import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog, LoadingState, Modal, PageHeader } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import type { Professional, TimeBlock } from '../../types';

const BLOCK_TYPES = [
  { value: 'vacation', label: 'Férias' },
  { value: 'break', label: 'Intervalo' },
  { value: 'unavailable', label: 'Indisponível' },
  { value: 'personal', label: 'Compromisso pessoal' },
  { value: 'other', label: 'Outro' },
] as const;

const formatDateTime = (value: string) => new Date(value).toLocaleString('pt-BR');
const toInputValue = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function ScheduleBlocksSettings() {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TimeBlock | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    professionalId: '',
    type: 'unavailable',
    reason: '',
    notes: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    Promise.all([api.schedule.getTimeBlocks(), api.schedule.getProfessionals()])
      .then(([timeBlocks, pros]) => {
        setBlocks(timeBlocks);
        setProfessionals(pros);
      })
      .finally(() => setLoading(false));
  }, []);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [blocks],
  );

  const resetForm = () => {
    setForm({
      professionalId: professionals[0]?.id || '',
      type: 'unavailable',
      reason: '',
      notes: '',
      startDate: '',
      endDate: '',
    });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (block: TimeBlock) => {
    setEditing(block);
    setForm({
      professionalId: block.professionalId,
      type: block.type || 'unavailable',
      reason: block.reason || '',
      notes: block.notes || '',
      startDate: toInputValue(block.startDate),
      endDate: toInputValue(block.endDate),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.professionalId || !form.startDate || !form.endDate || !form.reason) {
      notify('Preencha profissional, motivo e período do bloqueio.', 'warning');
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      notify('A data final deve ser maior que a inicial.', 'warning');
      return;
    }
    const professional = professionals.find((item) => item.id === form.professionalId);
    const payload = {
      professionalId: form.professionalId,
      professional,
      type: form.type as TimeBlock['type'],
      reason: form.reason,
      notes: form.notes,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    };
    if (editing) {
      const updated = await api.schedule.updateTimeBlock(editing.id, payload);
      setBlocks((current) => current.map((item) => (item.id === editing.id ? updated : item)));
      notify('Bloqueio atualizado com sucesso.');
    } else {
      const created = await api.schedule.createTimeBlock(payload);
      setBlocks((current) => [created, ...current]);
      notify('Bloqueio criado com sucesso.');
    }
    setOpen(false);
  };

  const remove = async () => {
    if (!deleteId) return;
    await api.schedule.deleteTimeBlock(deleteId);
    setBlocks((current) => current.filter((item) => item.id !== deleteId));
    setDeleteId(null);
    notify('Bloqueio removido com sucesso.');
  };

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader
        title="Bloqueios de Horário"
        subtitle="Crie bloqueios para gerenciar férias, intervalos e outros períodos indisponíveis."
        actions={<button className="btn btn-primary" onClick={openCreate}><i className="ti ti-plus" /> Novo Bloqueio</button>}
      />

      <div className="card page-section-card">
        {sortedBlocks.length === 0 ? (
          <div className="empty-panel">
            <div className="text-center text-muted">
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.6 }}>
                <i className="ti ti-calendar-off" />
              </div>
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Nenhum bloqueio cadastrado</div>
              <div>Crie bloqueios para gerenciar férias, intervalos e outros períodos indisponíveis</div>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Tipo</th>
                  <th>Motivo</th>
                  <th>Período</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedBlocks.map((block) => (
                  <tr key={block.id}>
                    <td>{block.professional?.name || 'Não informado'}</td>
                    <td>{BLOCK_TYPES.find((item) => item.value === block.type)?.label || 'Indisponível'}</td>
                    <td>
                      <div className="fw-semibold">{block.reason}</div>
                      {block.notes ? <div className="text-muted text-sm">{block.notes}</div> : null}
                    </td>
                    <td>{formatDateTime(block.startDate)} até {formatDateTime(block.endDate)}</td>
                    <td className="text-end">
                      <div className="flex gap-1 justify-end">
                        <button className="btn btn-light-primary btn-sm" onClick={() => openEdit(block)}>Editar</button>
                        <button className="btn btn-light-danger btn-sm" onClick={() => setDeleteId(block.id)}>Excluir</button>
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
        title={editing ? 'Editar Bloqueio' : 'Novo Bloqueio'}
        size="lg"
        footer={<><button className="btn btn-light-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>{editing ? 'Salvar' : 'Criar Bloqueio'}</button></>}
      >
        <div className="form-row">
          <div className="form-group">
            <label>Profissional</label>
            <select value={form.professionalId} onChange={(e) => setForm((current) => ({ ...current, professionalId: e.target.value }))}>
              <option value="">Selecione</option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>{professional.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}>
              {BLOCK_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Motivo</label>
          <input value={form.reason} onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))} placeholder="Ex: Férias coletivas, almoço, treinamento..." />
        </div>
        <div className="form-group">
          <label>Observações</label>
          <textarea rows={3} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Detalhes adicionais sobre o bloqueio..." />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Início</label>
            <input type="datetime-local" value={form.startDate} onChange={(e) => setForm((current) => ({ ...current, startDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Fim</label>
            <input type="datetime-local" value={form.endDate} onChange={(e) => setForm((current) => ({ ...current, endDate: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} title="Excluir bloqueio" message="Deseja realmente excluir este bloqueio de horário?" />
    </div>
  );
}

