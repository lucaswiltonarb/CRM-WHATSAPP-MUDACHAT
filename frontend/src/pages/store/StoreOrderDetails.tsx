import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { getStoreOrderDetailsViaBackend } from '../../services/backend';
import { EmptyState, LoadingState, PageHeader } from '../../components/common';

type OrderDetails = {
  id: string;
  customerName: string;
  customerPhone?: string;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  total: number;
  amount?: number;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  productId?: string | null;
  productName?: string | null;
  productCategory?: string | null;
  paymentId?: string | null;
  paymentMethod?: string;
  agentId?: string | null;
  agentName?: string | null;
  channelId?: string | null;
  contactId?: string | null;
  conversationId?: string | null;
  invoiceUrl?: string;
  source?: string;
  discountAmount?: number;
  originalAmount?: number;
  couponCode?: string | null;
  couponType?: string | null;
  couponValue?: number | null;
};

const fmtR = (value: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR')}`;
const orderStatusLabel = (status?: string) => (
  status === 'paid' ? 'Pago' : status === 'pending' ? 'Pendente' : status === 'shipped' ? 'Enviado' : status === 'cancelled' ? 'Cancelado' : status || '-'
);
const paymentMethodLabel = (method?: string) => (
  method === 'PIX' ? 'PIX' : method === 'CARD' ? 'Cartão' : method || '-'
);

export default function StoreOrderDetails() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const result = await getStoreOrderDetailsViaBackend(id);
      if (!mounted) return;
      if (!result?.ok || !result?.order) {
        setOrder(null);
        setLoading(false);
        return;
      }
      setOrder(result.order);
      setPaymentDetails(result.paymentDetails || null);
      if (result.order.contactId) {
        try {
          const foundContact = await api.contacts.getById(result.order.contactId);
          if (mounted) setContact(foundContact || null);
        } catch {
          if (mounted) setContact(null);
        }
      }
      if (result.order.conversationId) {
        try {
          const conversations = await api.conversations.list();
          if (mounted) setConversation((conversations || []).find((item: any) => item.id === result.order.conversationId) || null);
        } catch {
          if (mounted) setConversation(null);
        }
      }
      if (mounted) setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const payment = paymentDetails?.payment || {};
  const pix = paymentDetails?.pix || {};

  const leadInsights = useMemo(() => ([
    { label: 'Cliente', value: order?.customerName || '-' },
    { label: 'Telefone', value: order?.customerPhone || contact?.phone || '-' },
    { label: 'E-mail', value: contact?.email || '-' },
    { label: 'Origem', value: conversation?.origin || order?.source || '-' },
    { label: 'Atendente', value: order?.agentName || '-' },
    { label: 'Canal', value: conversation?.channel?.name || order?.channelId || '-' },
  ]), [contact?.email, contact?.phone, conversation?.channel?.name, conversation?.origin, order?.agentName, order?.channelId, order?.customerName, order?.customerPhone, order?.source]);

  if (loading) return <LoadingState label="Carregando detalhes do pedido..." />;

  if (!order) {
    return (
      <div className="page-shell">
        <PageHeader
          title="Pedido não encontrado"
          subtitle="Não foi possível localizar os detalhes deste pedido."
          actions={<button className="btn btn-light-secondary" onClick={() => navigate('/store')}><i className="ti ti-arrow-left" /> Voltar para pedidos</button>}
        />
        <div className="card card-pad">
          <EmptyState icon="ti ti-receipt-off" title="Pedido indisponível" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title={`Pedido #${order.id}`}
        subtitle="Visão completa da operação: lead, cobrança, produto, desconto e rastreabilidade do atendimento."
        actions={
          <div className="flex gap-1">
            <button className="btn btn-light-secondary" onClick={() => navigate('/store')}><i className="ti ti-arrow-left" /> Voltar para pedidos</button>
            {order.conversationId && <Link className="btn btn-primary" to="/chat" state={{ conversationId: order.conversationId }}>Abrir atendimento</Link>}
          </div>
        }
      />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(236,72,153,.12)', color: '#ec4899' }}><i className="ti ti-cash" /></div>
          <div className="stat-info"><span className="stat-value">{fmtR(order.total)}</span><span className="stat-label">Valor final</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(52,180,120,.12)', color: '#34B478' }}><i className="ti ti-checks" /></div>
          <div className="stat-info"><span className="stat-value">{orderStatusLabel(order.status)}</span><span className="stat-label">Status do pedido</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(33,114,219,.12)', color: '#2172DB' }}><i className="ti ti-receipt-2" /></div>
          <div className="stat-info"><span className="stat-value">{paymentMethodLabel(order.paymentMethod)}</span><span className="stat-label">Método de pagamento</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(147,51,234,.12)', color: '#9333EA' }}><i className="ti ti-ticket" /></div>
          <div className="stat-info"><span className="stat-value">{order.couponCode || 'Sem cupom'}</span><span className="stat-label">Cupom aplicado</span></div>
        </div>
      </div>

      <div className="dash-grid-2 mt-2">
        <div className="card card-pad">
          <h4 className="chart-title">Resumo do pedido</h4>
          <div className="store-detail-grid">
            <div className="store-detail-row"><span>Produto</span><strong>{order.productName || '-'}</strong></div>
            <div className="store-detail-row"><span>Categoria</span><strong>{order.productCategory || '-'}</strong></div>
            <div className="store-detail-row"><span>Valor original</span><strong>{fmtR(order.originalAmount || payment.value || order.total)}</strong></div>
            <div className="store-detail-row"><span>Desconto</span><strong>{fmtR(order.discountAmount || 0)}</strong></div>
            <div className="store-detail-row"><span>Valor final</span><strong>{fmtR(order.total || payment.value || 0)}</strong></div>
            <div className="store-detail-row"><span>Método de pagamento</span><strong>{paymentMethodLabel(order.paymentMethod || payment.billingType)}</strong></div>
            <div className="store-detail-row"><span>Criado em</span><strong>{new Date(order.createdAt).toLocaleString('pt-BR')}</strong></div>
            <div className="store-detail-row"><span>Pago em</span><strong>{order.paidAt ? new Date(order.paidAt).toLocaleString('pt-BR') : '-'}</strong></div>
            <div className="store-detail-row"><span>Atualizado em</span><strong>{order.updatedAt ? new Date(order.updatedAt).toLocaleString('pt-BR') : '-'}</strong></div>
          </div>
        </div>

        <div className="card card-pad">
          <h4 className="chart-title">Dados do lead</h4>
          <div className="store-detail-grid">
            {leadInsights.map((item) => (
              <div key={item.label} className="store-detail-row"><span>{item.label}</span><strong>{item.value}</strong></div>
            ))}
          </div>
          {(contact?.notes || conversation?.notes) && (
            <div className="store-note-box mt-2">
              <strong>Observações</strong>
              <p>{contact?.notes || conversation?.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="dash-grid-2 mt-2">
        <div className="card card-pad">
          <h4 className="chart-title">Detalhes do pagamento Asaas</h4>
          <div className="store-detail-grid">
            <div className="store-detail-row"><span>ID do pagamento</span><strong>{order.paymentId || payment.id || '-'}</strong></div>
            <div className="store-detail-row"><span>Status Asaas</span><strong>{orderStatusLabel(payment.status || order.status)}</strong></div>
            <div className="store-detail-row"><span>Cliente Asaas</span><strong>{payment.customer || '-'}</strong></div>
            <div className="store-detail-row"><span>Tipo de cobrança</span><strong>{paymentMethodLabel(payment.billingType || order.paymentMethod)}</strong></div>
            <div className="store-detail-row"><span>Vencimento</span><strong>{payment.dueDate || '-'}</strong></div>
            <div className="store-detail-row"><span>Descrição</span><strong>{payment.description || order.productName || '-'}</strong></div>
          </div>
          {(order.invoiceUrl || payment.invoiceUrl) && (
            <a className="btn btn-light-secondary mt-2" href={order.invoiceUrl || payment.invoiceUrl} target="_blank" rel="noreferrer">
              <i className="ti ti-external-link" /> Abrir cobrança
            </a>
          )}
        </div>

        <div className="card card-pad">
          <h4 className="chart-title">PIX e desconto</h4>
          <div className="store-detail-grid">
            <div className="store-detail-row"><span>Payload PIX</span><strong className="store-strong-wrap">{pix?.payload || 'Não disponível'}</strong></div>
            <div className="store-detail-row"><span>Cupom</span><strong>{order.couponCode || '-'}</strong></div>
            <div className="store-detail-row"><span>Tipo do cupom</span><strong>{order.couponType || '-'}</strong></div>
            <div className="store-detail-row"><span>Valor do cupom</span><strong>{order.couponType === 'percent' ? `${Number(order.couponValue || 0)}%` : fmtR(Number(order.couponValue || 0))}</strong></div>
          </div>
          {pix?.encodedImage && <div className="store-pix-box mt-2"><img alt="QR Code PIX" src={`data:image/png;base64,${pix.encodedImage}`} /></div>}
        </div>
      </div>
    </div>
  );
}