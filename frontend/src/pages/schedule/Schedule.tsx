import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Appointment, Professional, EventType, Contact, AppointmentStatus } from '../../types';
import { PageHeader, LoadingState, Modal, ConfirmDialog } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const COLORS = ['#5d87ff', '#13deb9', '#ffae1f', '#fa896b', '#539bff', '#7c3aed', '#ec4899'];
const STATUS_LABEL: Record<AppointmentStatus, string> = { scheduled: 'Agendado', confirmed: 'Confirmado', cancelled: 'Cancelado', rescheduled: 'Remarcado', completed: 'Concluído', no_show: 'Não compareceu', waiting_confirmation: 'Aguardando confirmação' };
const STATUS_CLR: Record<AppointmentStatus, string> = { scheduled: 'primary', confirmed: 'success', cancelled: 'danger', rescheduled: 'warning', completed: 'success', no_show: 'danger', waiting_confirmation: 'warning' };

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function Schedule() {
  const { notify } = useToast();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [pros, setPros] = useState<Professional[]>([]);
  const [_types, setTypes] = useState<EventType[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState<any>({});

  const load = () => Promise.all([api.schedule.getAppointments(), api.schedule.getProfessionals(), api.schedule.getEventTypes(), api.contacts.list()])
    .then(([a, p, t, c]) => { setAppts(a); setPros(p); setTypes(t); setContacts(c); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openNew = (date?: Date) => {
    const d = date || new Date();
    setEditing(null);
    setForm({ clientName: '', clientPhone: '', date: ymd(d), startTime: '08:30', endTime: '09:30', title: '', location: '', notes: '', isRecurring: false, professionalIds: pros[0] ? [pros[0].id] : [], color: COLORS[0], notifyWhatsApp: true });
    setFormOpen(true);
  };

  const openEdit = (a: Appointment) => {
    const s = new Date(a.startDate); const e = new Date(a.endDate);
    setEditing(a); setDetail(null);
    setForm({ clientName: a.contact?.name || '', clientPhone: a.contact?.phone || '', date: ymd(s), startTime: `${pad(s.getHours())}:${pad(s.getMinutes())}`, endTime: `${pad(e.getHours())}:${pad(e.getMinutes())}`, title: a.title, location: a.location || '', notes: a.notes || '', isRecurring: a.isRecurring, professionalIds: [a.professionalId], color: a.color || COLORS[0], notifyWhatsApp: a.notifyWhatsApp });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.clientName || !form.date || !form.startTime || !form.endTime) { notify('Preencha os campos obrigatórios', 'warning'); return; }
    const startDate = new Date(`${form.date}T${form.startTime}`).toISOString();
    const endDate = new Date(`${form.date}T${form.endTime}`).toISOString();
    let contact = contacts.find(c => c.name === form.clientName || (form.clientPhone && c.phone === form.clientPhone));
    if (!contact) { contact = await api.contacts.create({ name: form.clientName, phone: form.clientPhone }); setContacts(p => [contact!, ...p]); }
    const payload: any = { contactId: contact!.id, contact, professionalId: form.professionalIds[0], professional: pros.find(p => p.id === form.professionalIds[0]), title: form.title || 'Agendamento', startDate, endDate, location: form.location, notes: form.notes, isRecurring: form.isRecurring, notifyWhatsApp: form.notifyWhatsApp, color: form.color };
    if (editing) { const u = await api.schedule.update(editing.id, payload); setAppts(p => p.map(a => a.id === editing.id ? u : a)); notify('Agendamento atualizado'); }
    else { const c = await api.schedule.create(payload); setAppts(p => [...p, c]); await api.audit.log('Agendamento criado', 'Agenda', 'Appointment', c.id); notify('Agendamento criado'); }
    setFormOpen(false);
  };

  const setStatus = async (a: Appointment, status: AppointmentStatus) => { const u = await api.schedule.update(a.id, { status }); setAppts(p => p.map(x => x.id === a.id ? u : x)); setDetail(u); notify(`Status: ${STATUS_LABEL[status]}`); };
  const doDelete = async () => { if (!delId) return; await api.schedule.delete(delId); setAppts(p => p.filter(a => a.id !== delId)); notify('Agendamento removido'); };

  const apptsByDay = (d: Date) => appts.filter(a => ymd(new Date(a.startDate)) === ymd(d)).sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Build month grid
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const today = ymd(new Date());

  const weekDays = (() => { const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay()); return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; }); })();

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Calendário de agendamentos e profissionais"
        actions={<button className="btn btn-primary" onClick={() => openNew()}><i className="ti ti-plus" /> Novo Agendamento</button>} />

      <div className="cal-toolbar">
        <div className="flex items-center gap-1">
          <button className="icon-btn" onClick={() => setCursor(view === 'month' ? new Date(year, month - 1, 1) : new Date(cursor.getTime() - (view === 'week' ? 7 : 1) * 864e5))}><i className="ti ti-chevron-left" /></button>
          <button className="btn btn-light-secondary btn-sm" onClick={() => setCursor(new Date())}>Hoje</button>
          <button className="icon-btn" onClick={() => setCursor(view === 'month' ? new Date(year, month + 1, 1) : new Date(cursor.getTime() + (view === 'week' ? 7 : 1) * 864e5))}><i className="ti ti-chevron-right" /></button>
          <h2 className="cal-title">{MONTHS[month]} {year}</h2>
        </div>
        <div className="btn-group-toggle">
          {(['month', 'week', 'day'] as const).map(v => <button key={v} className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-light-secondary'}`} onClick={() => setView(v)}>{v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}</button>)}
        </div>
      </div>

      {view === 'month' && (
        <div className="card cal-card">
          <div className="cal-grid cal-head">{WD.map(d => <div key={d} className="cal-wd">{d}</div>)}</div>
          <div className="cal-grid">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="cal-cell empty" />;
              const list = apptsByDay(d);
              const isToday = ymd(d) === today;
              return (
                <div key={i} className={`cal-cell ${isToday ? 'today' : ''}`} onClick={() => openNew(d)}>
                  <span className="cal-daynum">{d.getDate()}</span>
                  <div className="cal-events">
                    {list.slice(0, 3).map(a => (
                      <div key={a.id} className="cal-event" style={{ background: a.color || COLORS[0] }} onClick={(e) => { e.stopPropagation(); setDetail(a); }}>
                        <span className="cal-event-time">{new Date(a.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span> {a.title}
                      </div>
                    ))}
                    {list.length > 3 && <div className="cal-more">+{list.length - 3} mais</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className="card cal-card">
          <div className="cal-grid cal-head">{weekDays.map(d => <div key={d.toISOString()} className="cal-wd">{WD[d.getDay()]} {d.getDate()}</div>)}</div>
          <div className="cal-grid" style={{ minHeight: 400 }}>
            {weekDays.map(d => (
              <div key={d.toISOString()} className={`cal-cell ${ymd(d) === today ? 'today' : ''}`} onClick={() => openNew(d)}>
                <div className="cal-events">{apptsByDay(d).map(a => <div key={a.id} className="cal-event" style={{ background: a.color || COLORS[0] }} onClick={(e) => { e.stopPropagation(); setDetail(a); }}><span className="cal-event-time">{new Date(a.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span> {a.title}</div>)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'day' && (
        <div className="card" style={{ padding: '1rem' }}>
          <h3 className="mb-2">{cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          {apptsByDay(cursor).length === 0 ? <p className="text-muted">Nenhum agendamento neste dia.</p> :
            apptsByDay(cursor).map(a => (
              <div key={a.id} className="day-appt" style={{ borderLeftColor: a.color || COLORS[0] }} onClick={() => setDetail(a)}>
                <div className="day-appt-time">{new Date(a.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(a.endDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                <div><strong>{a.title}</strong><div className="text-sm text-muted">{a.contact?.name} · {a.professional?.name}</div></div>
                <span className={`badge bg-light-${STATUS_CLR[a.status]} text-${STATUS_CLR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
              </div>
            ))}
        </div>
      )}

      {/* New/Edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Editar Agendamento' : 'Novo Agendamento'} size="lg"
        footer={<><button className="btn btn-light-secondary" onClick={() => setFormOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>{editing ? 'Salvar' : 'Criar Agendamento'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label>Nome do Cliente <span className="req">*</span></label><input placeholder="Ex: Maria Silva" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></div>
          <div className="form-group"><label>WhatsApp do Cliente</label><input placeholder="Ex: (11) 99999-9999" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} /></div>
        </div>
        <div className="form-row form-row-3">
          <div className="form-group"><label>Data <span className="req">*</span></label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="form-group"><label>Início <span className="req">*</span></label><input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
          <div className="form-group"><label>Fim <span className="req">*</span></label><input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
        </div>
        <div className="form-group"><label>Título do Agendamento</label><input placeholder="Ex: Consulta de Retorno" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="form-group"><label>Localização</label><input placeholder="Ex: Sala 101" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
        <div className="form-group"><label>Observações</label><textarea placeholder="Informações adicionais sobre o agendamento..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <div className="switch-row"><div><strong>Agendamento Recorrente</strong><p className="text-xs text-muted">Ative para criar agendamentos que se repetem automaticamente</p></div>
          <label className="switch"><input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} /><span className="slider" /></label></div>
        <div className="form-group"><label>Profissionais <span className="req">*</span> ({form.professionalIds?.length || 0} selecionado)</label>
          <div className="flex flex-wrap gap-1">{pros.map(p => <button key={p.id} type="button" className={`tag-select ${form.professionalIds?.includes(p.id) ? 'on' : ''}`} onClick={() => setForm((f: any) => ({ ...f, professionalIds: f.professionalIds?.includes(p.id) ? f.professionalIds.filter((x: string) => x !== p.id) : [...(f.professionalIds || []), p.id] }))}>{p.name}</button>)}</div></div>
        <div className="form-row">
          <div className="form-group"><label>Cor do Evento</label><div className="flex gap-1">{COLORS.map(c => <button key={c} type="button" className={`color-dot ${form.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />)}</div></div>
          <div className="form-group"><label>Notificar por WhatsApp</label><label className="switch"><input type="checkbox" checked={form.notifyWhatsApp} onChange={(e) => setForm({ ...form, notifyWhatsApp: e.target.checked })} /><span className="slider" /></label></div>
        </div>
      </Modal>

      {/* Detail modal */}
      {detail && <Modal open onClose={() => setDetail(null)} title={detail.title} size="md"
        footer={<><button className="btn btn-light-danger" onClick={() => { setDelId(detail.id); setDetail(null); }}>Cancelar agend.</button><button className="btn btn-light-primary" onClick={() => openEdit(detail)}>Editar</button></>}>
        <div className="detail-grid">
          <div><span className="info-label">Cliente</span><span>{detail.contact?.name}</span></div>
          <div><span className="info-label">WhatsApp</span><span>{detail.contact?.phone || '-'}</span></div>
          <div><span className="info-label">Início</span><span>{new Date(detail.startDate).toLocaleString('pt-BR')}</span></div>
          <div><span className="info-label">Fim</span><span>{new Date(detail.endDate).toLocaleString('pt-BR')}</span></div>
          <div><span className="info-label">Profissional</span><span>{detail.professional?.name || '-'}</span></div>
          <div><span className="info-label">Local</span><span>{detail.location || '-'}</span></div>
        </div>
        {detail.notes && <p className="mt-1 text-sm"><span className="info-label">Observações</span>{detail.notes}</p>}
        <div className="mt-2"><span className="info-label">Status</span>
          <div className="flex flex-wrap gap-1 mt-1">{(['confirmed', 'completed', 'rescheduled', 'no_show'] as AppointmentStatus[]).map(s => <button key={s} className={`btn btn-sm ${detail.status === s ? `btn-${STATUS_CLR[s]}` : `btn-light-${STATUS_CLR[s]}`}`} onClick={() => setStatus(detail, s)}>{STATUS_LABEL[s]}</button>)}</div></div>
      </Modal>}

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Cancelar agendamento" message="Deseja realmente cancelar/remover este agendamento?" />
    </div>
  );
}
