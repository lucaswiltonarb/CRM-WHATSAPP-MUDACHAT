import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { listStoreOrdersViaBackend } from '../../services/backend';
import type { Appointment, Contact, Conversation, Message } from '../../types';
import { EmptyState, LoadingState, PageHeader } from '../../components/common';

type TabKey = 'geral' | 'historico' | 'agendamentos' | 'compras' | 'anotacoes';
const normalizePhone = (value?: string | null) => String(value || '').replace(/\D/g, '');

export default function ContactProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<Contact | null>(null);
  const [tab, setTab] = useState<TabKey>('geral');
  const [history, setHistory] = useState<Message[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState('');
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const c = ((await api.contacts.list()) as Contact[]).find((x) => x.id === id) || null;
      if (!c) {
        setLoading(false);
        return;
      }
      setContact(c);
      setNotes(c.notes || '');

      const convs = (await api.conversations.list() as Conversation[]).filter((x: Conversation) => x.contactId === c.id);
      const allMsgs: Message[] = [];
      for (const conv of convs) {
        const msgs = await api.conversations.getMessages(conv.id);
        allMsgs.push(...msgs);
      }
      allMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setHistory(allMsgs);

      const aps = (await api.schedule.getAppointments()) as Appointment[];
      setAppointments((aps || []).filter((a) => a.contactId === c.id));
      const backendOrders = await listStoreOrdersViaBackend();
      const contactPhone = normalizePhone(c.phone);
      const nextOrders = (backendOrders.ok ? backendOrders.orders : []).filter((order: any) => {
        const orderPhone = normalizePhone(order.customerPhone || order.phone || order.number);
        return order.contactId === c.id || (!!contactPhone && orderPhone === contactPhone);
      });
      setOrders(nextOrders);

      setLoading(false);
    })();
  }, [id]);

  const saveGeneral = async () => {
    if (!contact) return;
    const upd = await api.contacts.update(contact.id, contact);
    setContact(upd);
  };

  const saveNotes = async () => {
    if (!contact) return;
    const upd = await api.contacts.update(contact.id, { notes });
    setContact(upd);
  };

  const startConversation = async () => {
    if (!contact) return;
    const conversations = (await api.conversations.list()) as Conversation[];
    let conv = conversations.find((x: Conversation) => x.contactId === contact.id);
    if (!conv) {
      conv = await api.conversations.create({
        contactId: contact.id,
        contact,
        channelId: contact.channelOrigin || '',
        origin: contact.origin || 'Contato',
        status: 'waiting',
        tags: contact.tags || [],
      });
    }
    if (conv) navigate('/chat', { state: { conversationId: conv.id } });
  };

  if (loading) return <LoadingState />;
  if (!contact) return <EmptyState icon="ti ti-user-off" title="Contato não encontrado" />;

  return (
    <div>
      <PageHeader
        title={contact.name}
        subtitle={`${contact.phone || '-'} · ${contact.email || '-'}`}
        actions={
          <>
            <button className="btn btn-light-secondary" onClick={() => navigate('/contacts')}>
              <i className="ti ti-arrow-left" /> Voltar
            </button>
            <button className="btn btn-primary" onClick={startConversation}>
              <i className="ti ti-message" /> Iniciar conversa
            </button>
          </>
        }
      />

      <div className="card card-pad">
        <div className="tab-nav mb-2">
          <button className={`tab-btn ${tab === 'geral' ? 'active' : ''}`} onClick={() => setTab('geral')}>Geral</button>
          <button className={`tab-btn ${tab === 'historico' ? 'active' : ''}`} onClick={() => setTab('historico')}>Histórico</button>
          <button className={`tab-btn ${tab === 'agendamentos' ? 'active' : ''}`} onClick={() => setTab('agendamentos')}>Agendamentos</button>
          <button className={`tab-btn ${tab === 'compras' ? 'active' : ''}`} onClick={() => setTab('compras')}>Compras</button>
          <button className={`tab-btn ${tab === 'anotacoes' ? 'active' : ''}`} onClick={() => setTab('anotacoes')}>Anotações</button>
        </div>

        {tab === 'geral' && (
          <>
            <div className="form-row">
              <div className="form-group"><label>Email</label><input value={contact.email || ''} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></div>
              <div className="form-group"><label>Documento</label><input value={contact.document || ''} onChange={(e) => setContact({ ...contact, document: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Empresa</label><input value={contact.company || ''} onChange={(e) => setContact({ ...contact, company: e.target.value })} /></div>
              <div className="form-group"><label>Cargo</label><input value={contact.position || ''} onChange={(e) => setContact({ ...contact, position: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Cidade</label><input value={contact.city || ''} onChange={(e) => setContact({ ...contact, city: e.target.value })} /></div>
              <div className="form-group"><label>Estado</label><input value={contact.state || ''} onChange={(e) => setContact({ ...contact, state: e.target.value })} /></div>
            </div>
            <button className="btn btn-primary" onClick={saveGeneral}>Salvar dados</button>
          </>
        )}

        {tab === 'historico' && (
          history.length === 0 ? <EmptyState icon="ti ti-history" title="Sem histórico de conversa" /> : (
            <div className="flex flex-col gap-1" style={{ maxHeight: 420, overflowY: 'auto' }}>
              {history.map((m) => (
                <div key={m.id} className={`chat-bubble-row ${m.senderType === 'contact' ? 'left' : 'right'}`}>
                  <div className={`chat-bubble ${m.senderType === 'ai' ? 'ai' : m.senderType === 'contact' ? 'in' : 'out'}`}>
                    {m.senderType === 'ai' && <span className="bubble-tag"><i className="ti ti-robot" /> IA</span>}
                    <p>{m.content}</p>
                    <span className="bubble-time">{new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'agendamentos' && (
          appointments.length === 0 ? <EmptyState icon="ti ti-calendar-off" title="Sem agendamentos" /> : (
            <table className="data-table">
              <thead><tr><th>Título</th><th>Início</th><th>Status</th></tr></thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.title || '-'}</td>
                    <td>{a.startDate ? new Date(a.startDate).toLocaleString('pt-BR') : '-'}</td>
                    <td>{a.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'compras' && (
          orders.length === 0 ? <EmptyState icon="ti ti-shopping-cart-off" title="Sem compras registradas" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Pedido</th><th>Produto</th><th>Status</th><th>Total</th><th>Data</th><th /></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="clickable-row" onClick={() => navigate(`/store/orders/${o.id}`)}>
                      <td>#{o.id}</td>
                      <td>{o.productName || '-'}</td>
                      <td>{o.status === 'paid' ? 'Pago' : o.status === 'pending' ? 'Pendente' : o.status === 'shipped' ? 'Enviado' : 'Cancelado'}</td>
                      <td>{Number(o.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td>{new Date(o.createdAt).toLocaleString('pt-BR')}</td>
                      <td><i className="ti ti-chevron-right" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'anotacoes' && (
          <div className="form-group">
            <label>Anotações do contato</label>
            <textarea rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="mt-1">
              <button className="btn btn-primary" onClick={saveNotes}>Salvar anotações</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}