import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { User } from '../../types';
import { PageHeader, EmptyState, Modal, ConfirmDialog } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function ShiftsSettings() {
  const { notify } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  useEffect(() => { setItems(JSON.parse(localStorage.getItem('shifts') || '[]')); api.settings.getUsers().then(setUsers); }, []);
  const persist = (list: any[]) => { setItems(list); localStorage.setItem('shifts', JSON.stringify(list)); };

  const openNew = () => { setEditing(null); setForm({ name: '', days: [1, 2, 3, 4, 5], start: '08:00', end: '18:00', breakMin: 60, userIds: [] }); setOpen(true); };
  const save = () => {
    if (!form.name) { notify('Informe o nome', 'warning'); return; }
    if (editing) persist(items.map(s => s.id === editing.id ? { ...s, ...form } : s));
    else persist([...items, { id: `shift-${Date.now()}`, ...form }]);
    notify('Turno salvo'); setOpen(false);
  };
  const toggleDay = (d: number) => setForm((f: any) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x: number) => x !== d) : [...f.days, d] }));
  const toggleUser = (id: string) => setForm((f: any) => ({ ...f, userIds: f.userIds.includes(id) ? f.userIds.filter((x: string) => x !== id) : [...f.userIds, id] }));

  return (
    <div className="page-shell">
      <PageHeader title="Turnos de Trabalho" subtitle="Horários e equipes"
        actions={<button className="btn btn-primary" onClick={openNew}><i className="ti ti-plus" /> Novo Turno</button>} />
      {items.length === 0 ? <div className="card"><EmptyState icon="ti ti-clock-hour-4" title="Nenhum turno" description="Crie turnos para organizar a equipe." /></div> : (
        <div className="card-grid">{items.map(s => (
          <div key={s.id} className="card">
            <div className="flex justify-between items-start"><h3 className="m-0">{s.name}</h3><div className="flex gap-1"><button className="icon-btn" onClick={() => { setEditing(s); setForm(s); setOpen(true); }}><i className="ti ti-edit" /></button><button className="icon-btn" onClick={() => setDelId(s.id)}><i className="ti ti-trash" /></button></div></div>
            <p className="text-sm text-muted mt-1"><i className="ti ti-clock" /> {s.start} - {s.end} · {s.breakMin}min intervalo</p>
            <div className="flex gap-1 mt-1">{WEEKDAYS.map((d, i) => <span key={i} className={`day-pill ${s.days.includes(i) ? 'on' : ''}`}>{d}</span>)}</div>
            <p className="text-xs text-muted mt-1">{s.userIds.length} usuários vinculados</p>
          </div>
        ))}</div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar Turno' : 'Novo Turno'} size="lg"
        footer={<><button className="btn btn-light-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Salvar</button></>}>
        <div className="form-group"><label>Nome <span className="req">*</span></label><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Comercial Manhã" /></div>
        <div className="form-row form-row-3"><div className="form-group"><label>Início</label><input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div><div className="form-group"><label>Fim</label><input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div><div className="form-group"><label>Intervalo (min)</label><input type="number" value={form.breakMin} onChange={(e) => setForm({ ...form, breakMin: +e.target.value })} /></div></div>
        <div className="form-group"><label>Dias da semana</label><div className="flex gap-1">{WEEKDAYS.map((d, i) => <button key={i} type="button" className={`day-pill ${form.days?.includes(i) ? 'on' : ''}`} onClick={() => toggleDay(i)}>{d}</button>)}</div></div>
        <div className="form-group"><label>Usuários</label><div className="flex flex-wrap gap-1">{users.map(u => <button key={u.id} type="button" className={`tag-select ${form.userIds?.includes(u.id) ? 'on' : ''}`} onClick={() => toggleUser(u.id)}>{u.name}</button>)}</div></div>
      </Modal>
      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={() => { persist(items.filter(s => s.id !== delId)); notify('Removido'); }} title="Excluir turno" message="Deseja remover este turno?" />
    </div>
  );
}



