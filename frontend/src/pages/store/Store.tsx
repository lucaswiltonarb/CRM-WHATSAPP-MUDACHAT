import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';
import { api } from '../../services/api';
import {
  createStoreCouponViaBackend,
  createStoreProductViaBackend,
  deleteStoreCouponViaBackend,
  deleteStoreOrderViaBackend,
  deleteStoreProductViaBackend,
  getStoreSettingsViaBackend,
  listStoreCouponsViaBackend,
  listStoreOrdersViaBackend,
  listStoreProductsViaBackend,
  updateStoreCouponViaBackend,
  updateStoreProductViaBackend,
  updateStoreSettingsViaBackend,
} from '../../services/backend';
import { EmptyState, LoadingState, Modal, PageHeader } from '../../components/common';

type Product = {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  price: number;
  active: boolean;
  stock: number;
  updatedAt?: string;
};

type Order = {
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

type Coupon = {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  active: boolean;
};

type StoreSettings = {
  brandName: string;
  accentColor: string;
  seoTitle: string;
  seoDescription: string;
  address: string;
  whatsapp: string;
  enablePickup: boolean;
  enableDelivery: boolean;
};

const fmtR = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR')}`;
const orderStatusLabel = (status: Order['status']) => (
  status === 'paid' ? 'Pago' : status === 'pending' ? 'Pendente' : status === 'shipped' ? 'Enviado' : 'Cancelado'
);

export default function Store() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'products' | 'orders' | 'coupons' | 'settings'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    brandName: '',
    accentColor: '#ec4899',
    seoTitle: '',
    seoDescription: '',
    address: '',
    whatsapp: '',
    enablePickup: true,
    enableDelivery: true,
  });
  const [prodOpen, setProdOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [prodForm, setProdForm] = useState<Partial<Product>>({ active: true, stock: 0, price: 0 });
  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({ type: 'percent', value: 0, active: true });
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [productStatus, setProductStatus] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [couponSearch, setCouponSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const load = async () => {
    const [backendProducts, backendOrders, backendCoupons, backendSettings, me] = await Promise.all([
      listStoreProductsViaBackend(),
      listStoreOrdersViaBackend(),
      listStoreCouponsViaBackend(),
      getStoreSettingsViaBackend(),
      api.auth.getCurrentUser(),
    ]);
    setProducts(backendProducts.ok ? backendProducts.products : []);
    setOrders(backendOrders.ok ? backendOrders.orders : []);
    setCoupons(backendCoupons.ok ? backendCoupons.coupons : []);
    setSettings(backendSettings.ok && backendSettings.settings ? backendSettings.settings : {
      brandName: '',
      accentColor: '#ec4899',
      seoTitle: '',
      seoDescription: '',
      address: '',
      whatsapp: '',
      enablePickup: true,
      enableDelivery: true,
    });
    setCurrentUser(me || null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const revenuePaid = useMemo(() => orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + Number(o.total || o.amount || 0), 0), [orders]);
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending').length, [orders]);
  const paidOrders = useMemo(() => orders.filter((o) => o.status === 'paid').length, [orders]);
  const activeProducts = useMemo(() => products.filter((p) => p.active).length, [products]);
  const lowStockProducts = useMemo(() => products.filter((p) => p.stock <= 5).length, [products]);
  const conversion = useMemo(() => orders.length ? Math.round((paidOrders / orders.length) * 100) : 0, [orders.length, paidOrders]);
  const averageTicket = useMemo(() => paidOrders ? revenuePaid / paidOrders : 0, [paidOrders, revenuePaid]);

  const categories = useMemo(() => ['all', ...Array.from(new Set(products.map((p) => p.category || 'Sem categoria')))], [products]);

  const filteredProducts = useMemo(() => {
    const value = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !value || [product.name, product.sku, product.category, String(product.price), String(product.stock)].filter(Boolean).join(' ').toLowerCase().includes(value);
      const matchesCategory = productCategory === 'all' || (product.category || 'Sem categoria') === productCategory;
      const matchesStatus = productStatus === 'all' || (productStatus === 'active' ? product.active : !product.active);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [productCategory, productSearch, productStatus, products]);

  const filteredOrders = useMemo(() => {
    const value = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch = !value || [order.id, order.customerName, order.customerPhone, order.productName, order.paymentId, order.agentName, order.couponCode].filter(Boolean).join(' ').toLowerCase().includes(value);
      const matchesStatus = orderStatus === 'all' || order.status === orderStatus;
      return matchesSearch && matchesStatus;
    });
  }, [orderSearch, orderStatus, orders]);

  const filteredCoupons = useMemo(() => {
    const value = couponSearch.trim().toLowerCase();
    return coupons.filter((coupon) => !value || [coupon.code, coupon.type, String(coupon.value)].join(' ').toLowerCase().includes(value));
  }, [couponSearch, coupons]);

  const salesByStatus = useMemo(() => ({
    paid: orders.filter((item) => item.status === 'paid').length,
    pending: orders.filter((item) => item.status === 'pending').length,
    cancelled: orders.filter((item) => item.status === 'cancelled').length,
    shipped: orders.filter((item) => item.status === 'shipped').length,
  }), [orders]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; count: number; value: number }>();
    orders.filter((item) => item.status === 'paid').forEach((order) => {
      const key = order.productId || order.productName || order.id;
      const current = map.get(key) || { name: order.productName || 'Produto', count: 0, value: 0 };
      current.count += 1;
      current.value += Number(order.total || order.amount || 0);
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [orders]);

  const salesByDay = useMemo(() => {
    const map = new Map<string, number>();
    orders.filter((item) => item.status === 'paid').forEach((order) => {
      const key = new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      map.set(key, (map.get(key) || 0) + Number(order.total || order.amount || 0));
    });
    return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
  }, [orders]);

  const overviewBar = useMemo(() => ({
    options: {
      chart: { toolbar: { show: false }, background: 'transparent' },
      dataLabels: { enabled: false },
      colors: ['#ec4899', '#2172DB', '#34B478'],
      xaxis: { categories: salesByDay.map((item) => item.date) },
      grid: { borderColor: 'rgba(148,163,184,.18)' },
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: { opacityFrom: 0.55, opacityTo: 0.08, stops: [0, 100] },
      },
    } as ApexOptions,
    series: [{ name: 'Faturamento', data: salesByDay.map((item) => Number(item.value.toFixed(2))) }],
  }), [salesByDay]);

  const statusDonut = useMemo(() => ({
    options: {
      chart: { toolbar: { show: false }, background: 'transparent' },
      labels: ['Pagos', 'Pendentes', 'Enviados', 'Cancelados'],
      dataLabels: { enabled: false },
      legend: { position: 'bottom' },
      colors: ['#34B478', '#FAAC50', '#2172DB', '#ef4444'],
      stroke: { width: 0 },
    } as ApexOptions,
    series: [salesByStatus.paid, salesByStatus.pending, salesByStatus.shipped, salesByStatus.cancelled],
  }), [salesByStatus]);

  const topProductsChart = useMemo(() => ({
    options: {
      chart: { toolbar: { show: false }, background: 'transparent' },
      plotOptions: { bar: { borderRadius: 8, horizontal: true, barHeight: '55%' } },
      dataLabels: { enabled: false },
      xaxis: { categories: topProducts.map((item) => item.name) },
      colors: ['#9333EA'],
      grid: { borderColor: 'rgba(148,163,184,.18)' },
    } as ApexOptions,
    series: [{ name: 'Receita', data: topProducts.map((item) => Number(item.value.toFixed(2))) }],
  }), [topProducts]);

  const saveProduct = async () => {
    if (!prodForm.name?.trim()) return;
    const payload: Product = {
      id: prodForm.id || `p-${Date.now()}`,
      name: prodForm.name.trim(),
      sku: prodForm.sku || '',
      category: prodForm.category || '',
      price: Number(prodForm.price || 0),
      stock: Number(prodForm.stock || 0),
      active: !!prodForm.active,
      updatedAt: new Date().toISOString(),
    };
    const response = prodForm.id ? await updateStoreProductViaBackend(prodForm.id, payload) : await createStoreProductViaBackend(payload);
    if (!response?.ok || !response?.product) return;
    setProducts((current) => prodForm.id ? current.map((product) => (product.id === response.product.id ? response.product : product)) : [response.product, ...current]);
    setProdOpen(false);
    setProdForm({ active: true, stock: 0, price: 0 });
    await api.audit.log('Produto salvo', 'Loja', 'StoreProduct', response.product.id);
  };

  const saveCoupon = async () => {
    if (!couponForm.code?.trim()) return;
    const payload: Coupon = {
      id: couponForm.id || `cp-${Date.now()}`,
      code: couponForm.code.trim().toUpperCase(),
      type: couponForm.type || 'percent',
      value: Number(couponForm.value || 0),
      active: !!couponForm.active,
    };
    const response = couponForm.id ? await updateStoreCouponViaBackend(couponForm.id, payload) : await createStoreCouponViaBackend(payload);
    if (!response?.ok || !response?.coupon) return;
    setCoupons((current) => couponForm.id ? current.map((coupon) => (coupon.id === response.coupon.id ? response.coupon : coupon)) : [response.coupon, ...current]);
    setCouponOpen(false);
    setCouponForm({ type: 'percent', value: 0, active: true });
    await api.audit.log('Cupom salvo', 'Loja', 'StoreCoupon', response.coupon.id);
  };

  const saveSettings = async () => {
    await updateStoreSettingsViaBackend(settings);
    await api.audit.log('Configurações da loja salvas', 'Loja', 'StoreSettings', 'store-1');
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader
        title="Loja"
        subtitle="Gestão comercial com métricas, catálogo inteligente, pedidos detalhados e cupons funcionais."
        actions={
          <div className="btn-group-toggle">
            <button className={`btn btn-sm ${tab === 'overview' ? 'btn-primary' : 'btn-light-secondary'}`} onClick={() => setTab('overview')}>Visão</button>
            <button className={`btn btn-sm ${tab === 'products' ? 'btn-primary' : 'btn-light-secondary'}`} onClick={() => setTab('products')}>Produtos</button>
            <button className={`btn btn-sm ${tab === 'orders' ? 'btn-primary' : 'btn-light-secondary'}`} onClick={() => setTab('orders')}>Pedidos</button>
            <button className={`btn btn-sm ${tab === 'coupons' ? 'btn-primary' : 'btn-light-secondary'}`} onClick={() => setTab('coupons')}>Cupons</button>
            <button className={`btn btn-sm ${tab === 'settings' ? 'btn-primary' : 'btn-light-secondary'}`} onClick={() => setTab('settings')}>Configurações</button>
          </div>
        }
      />

      {tab === 'overview' && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(236,72,153,.12)', color: '#ec4899' }}><i className="ti ti-cash" /></div>
              <div className="stat-info"><span className="stat-value">{fmtR(revenuePaid)}</span><span className="stat-label">Receita confirmada</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(33,114,219,.12)', color: '#2172DB' }}><i className="ti ti-shopping-bag" /></div>
              <div className="stat-info"><span className="stat-value">{orders.length}</span><span className="stat-label">Pedidos totais</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(250,172,80,.12)', color: '#FAAC50' }}><i className="ti ti-hourglass" /></div>
              <div className="stat-info"><span className="stat-value">{pendingOrders}</span><span className="stat-label">Aguardando pagamento</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(52,180,120,.12)', color: '#34B478' }}><i className="ti ti-percentage" /></div>
              <div className="stat-info"><span className="stat-value">{conversion}%</span><span className="stat-label">Conversão</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(147,51,234,.12)', color: '#9333EA' }}><i className="ti ti-package" /></div>
              <div className="stat-info"><span className="stat-value">{activeProducts}</span><span className="stat-label">Produtos ativos</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(239,68,68,.12)', color: '#ef4444' }}><i className="ti ti-alert-circle" /></div>
              <div className="stat-info"><span className="stat-value">{lowStockProducts}</span><span className="stat-label">Estoque crítico</span></div>
            </div>
          </div>

          <div className="dash-grid-2 mt-2">
            <div className="card card-pad chart-panel">
              <div className="flex justify-between items-start gap-2 mb-2">
                <div>
                  <h4 className="chart-title">Faturamento por período</h4>
                  <p className="text-sm text-muted">Acompanhe o crescimento das vendas confirmadas.</p>
                </div>
                <div className="store-hero-kpi">
                  <span>Ticket médio</span>
                  <strong>{fmtR(averageTicket)}</strong>
                </div>
              </div>
              <Chart type="area" height={310} options={overviewBar.options} series={overviewBar.series} />
            </div>
            <div className="card card-pad chart-panel">
              <div className="flex justify-between items-start gap-2 mb-2">
                <div>
                  <h4 className="chart-title">Status dos pedidos</h4>
                  <p className="text-sm text-muted">Composição operacional atual da loja.</p>
                </div>
              </div>
              <Chart type="donut" height={310} options={statusDonut.options} series={statusDonut.series} />
            </div>
          </div>

          <div className="dash-grid-2 mt-2">
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Produtos mais rentáveis</h4>
              <Chart type="bar" height={280} options={topProductsChart.options} series={topProductsChart.series} />
            </div>
            <div className="card card-pad">
              <h4 className="chart-title">Resumo executivo</h4>
              <div className="store-summary-grid">
                <div className="store-summary-item">
                  <span>Pedidos pagos</span>
                  <strong>{paidOrders}</strong>
                </div>
                <div className="store-summary-item">
                  <span>Pedidos com cupom</span>
                  <strong>{orders.filter((order) => order.couponCode).length}</strong>
                </div>
                <div className="store-summary-item">
                  <span>Descontos aplicados</span>
                  <strong>{fmtR(orders.reduce((sum, order) => sum + Number(order.discountAmount || 0), 0))}</strong>
                </div>
                <div className="store-summary-item">
                  <span>Atendentes com vendas</span>
                  <strong>{new Set(orders.filter((order) => order.agentName).map((order) => order.agentName)).size}</strong>
                </div>
              </div>
              <div className="store-insight-list">
                <div className="store-insight-card">
                  <i className="ti ti-rocket" />
                  <div>
                    <strong>Performance comercial</strong>
                    <p>{paidOrders > 0 ? `A operação já consolidou ${paidOrders} pedido(s) pagos.` : 'Ainda não existem pedidos pagos registrados.'}</p>
                  </div>
                </div>
                <div className="store-insight-card">
                  <i className="ti ti-ticket" />
                  <div>
                    <strong>Uso de cupons</strong>
                    <p>{orders.some((order) => order.couponCode) ? 'Os descontos já estão sendo rastreados por pedido.' : 'Nenhum pedido utilizou cupom até o momento.'}</p>
                  </div>
                </div>
                <div className="store-insight-card">
                  <i className="ti ti-box-seam" />
                  <div>
                    <strong>Saúde do catálogo</strong>
                    <p>{lowStockProducts > 0 ? `${lowStockProducts} produto(s) exigem reposição imediata.` : 'Nenhum produto com risco de ruptura de estoque.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'products' && (
        <>
          <div className="card card-pad">
            <div className="store-toolbar">
              <div className="store-search-group">
                <i className="ti ti-search" />
                <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar por nome, SKU, categoria, preço ou estoque..." />
              </div>
              <select className="filter-select" value={productCategory} onChange={(event) => setProductCategory(event.target.value)}>
                {categories.map((category) => <option key={category} value={category}>{category === 'all' ? 'Todas as categorias' : category}</option>)}
              </select>
              <select className="filter-select" value={productStatus} onChange={(event) => setProductStatus(event.target.value)}>
                <option value="all">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
              <button className="btn btn-primary" onClick={() => setProdOpen(true)}><i className="ti ti-plus" /> Novo Produto</button>
            </div>
          </div>

          <div className="store-products-grid store-products-grid-rich mt-2">
            {filteredProducts.length === 0 ? (
              <div className="card card-pad"><EmptyState icon="ti ti-package-off" title="Nenhum produto encontrado" /></div>
            ) : filteredProducts.map((product) => {
              const productOrders = orders.filter((order) => order.productId === product.id);
              const paidCount = productOrders.filter((order) => order.status === 'paid').length;
              const pendingCount = productOrders.filter((order) => order.status === 'pending').length;
              return (
                <div key={product.id} className="store-product-card store-product-card-rich">
                  <div className="store-product-card-top">
                    <div>
                      <div className="store-product-title-row">
                        <h4 className="store-product-name">{product.name}</h4>
                        <span className={`badge bg-light-${product.active ? 'success' : 'secondary'} text-${product.active ? 'success' : 'secondary'}`}>{product.active ? 'Ativo' : 'Inativo'}</span>
                      </div>
                      <div className="text-xs text-muted">{product.sku || 'Sem SKU'} · {product.category || 'Sem categoria'}</div>
                    </div>
                    <div className="store-product-price">{fmtR(product.price)}</div>
                  </div>
                  <div className="store-stock-progress">
                    <div className="store-stock-line">
                      <span>Estoque atual</span>
                      <strong>{product.stock}</strong>
                    </div>
                    <div className="store-stock-bar">
                      <span style={{ width: `${Math.max(8, Math.min(100, (product.stock / Math.max(product.stock, 10)) * 100))}%` }} />
                    </div>
                    <div className="text-xs text-muted">{paidCount} venda(s) paga(s) · {pendingCount} pendente(s)</div>
                  </div>
                  <div className="store-product-meta-grid">
                    <div><span>Receita</span><strong>{fmtR(productOrders.filter((order) => order.status === 'paid').reduce((sum, order) => sum + Number(order.total || 0), 0))}</strong></div>
                    <div><span>Última venda</span><strong>{productOrders[0] ? new Date(productOrders[0].createdAt).toLocaleDateString('pt-BR') : '-'}</strong></div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <button className="btn btn-sm btn-light-secondary" onClick={() => { setProdForm(product); setProdOpen(true); }}><i className="ti ti-edit" /> Editar</button>
                    <button className="btn btn-sm btn-light-danger" onClick={async () => { const result = await deleteStoreProductViaBackend(product.id); if (result?.ok) setProducts((current) => current.filter((item) => item.id !== product.id)); }}><i className="ti ti-trash" /> Excluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'orders' && (
        <>
          <div className="card card-pad">
            <div className="store-toolbar">
              <div className="store-search-group">
                <i className="ti ti-search" />
                <input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Buscar pedido, lead, telefone, pagamento, cupom ou atendente..." />
              </div>
              <select className="filter-select" value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
                <option value="all">Todos os status</option>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="shipped">Enviado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="card card-pad mt-2">
            {filteredOrders.length === 0 ? (
              <EmptyState icon="ti ti-shopping-cart-off" title="Nenhum pedido encontrado" />
            ) : (
              <div className="store-orders-list">
                {filteredOrders.map((order) => (
                  <button key={order.id} className="store-order-row" onClick={() => navigate(`/store/orders/${order.id}`)}>
                    <div className="store-order-main">
                      <div className="store-order-topline">
                        <strong>#{order.id}</strong>
                        <span className={`badge bg-light-${order.status === 'paid' ? 'success' : order.status === 'pending' ? 'warning' : order.status === 'shipped' ? 'primary' : 'danger'} text-${order.status === 'paid' ? 'success' : order.status === 'pending' ? 'warning' : order.status === 'shipped' ? 'primary' : 'danger'}`}>{orderStatusLabel(order.status)}</span>
                      </div>
                      <div className="store-order-customer">{order.customerName}</div>
                      <div className="text-xs text-muted">{order.customerPhone || 'Sem telefone'} · {order.productName || 'Produto não informado'}</div>
                    </div>
                    <div className="store-order-details">
                      <div><span>Pagamento</span><strong>{order.paymentMethod || '-'}</strong></div>
                      <div><span>Atendente</span><strong>{order.agentName || '-'}</strong></div>
                      <div><span>Data</span><strong>{new Date(order.createdAt).toLocaleString('pt-BR')}</strong></div>
                      <div><span>Total</span><strong>{fmtR(order.total)}</strong></div>
                    </div>
                    <div className="store-order-actions">
                      <span className={`badge bg-light-${order.status === 'paid' ? 'success' : order.status === 'pending' ? 'warning' : order.status === 'shipped' ? 'primary' : 'danger'} text-${order.status === 'paid' ? 'success' : order.status === 'pending' ? 'warning' : order.status === 'shipped' ? 'primary' : 'danger'}`}>{orderStatusLabel(order.status)}</span>
                      {isAdmin && <button className="icon-btn" onClick={async (event) => { event.stopPropagation(); const result = await deleteStoreOrderViaBackend(order.id); if (result?.ok) setOrders((current) => current.filter((item) => item.id !== order.id)); }} title="Excluir pedido"><i className="ti ti-trash" /></button>}
                      <i className="ti ti-chevron-right" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'coupons' && (
        <>
          <div className="card card-pad">
            <div className="store-toolbar">
              <div className="store-search-group">
                <i className="ti ti-search" />
                <input value={couponSearch} onChange={(event) => setCouponSearch(event.target.value)} placeholder="Buscar código, tipo ou valor do cupom..." />
              </div>
              <button className="btn btn-primary" onClick={() => setCouponOpen(true)}><i className="ti ti-plus" /> Novo Cupom</button>
            </div>
          </div>

          <div className="store-coupon-grid mt-2">
            {filteredCoupons.length === 0 ? (
              <div className="card card-pad"><EmptyState icon="ti ti-ticket-off" title="Nenhum cupom encontrado" /></div>
            ) : filteredCoupons.map((coupon) => {
              const usedOrders = orders.filter((order) => order.couponCode === coupon.code);
              const discountVolume = usedOrders.reduce((sum, order) => sum + Number(order.discountAmount || 0), 0);
              return (
                <div key={coupon.id} className="store-coupon-card">
                  <div className="store-coupon-top">
                    <div>
                      <strong>{coupon.code}</strong>
                      <div className="text-xs text-muted">{coupon.type === 'percent' ? 'Percentual' : 'Valor fixo'}</div>
                    </div>
                    <span className={`badge bg-light-${coupon.active ? 'success' : 'secondary'} text-${coupon.active ? 'success' : 'secondary'}`}>{coupon.active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <div className="store-coupon-value">{coupon.type === 'percent' ? `${coupon.value}%` : fmtR(coupon.value)}</div>
                  <div className="store-coupon-stats">
                    <div><span>Usos</span><strong>{usedOrders.length}</strong></div>
                    <div><span>Desconto gerado</span><strong>{fmtR(discountVolume)}</strong></div>
                  </div>
                  <div className="text-xs text-muted">Disponível no atendimento ao enviar a cobrança para o cliente.</div>
                  <div className="flex gap-1 mt-2">
                    <button className="btn btn-sm btn-light-secondary" onClick={() => { setCouponForm(coupon); setCouponOpen(true); }}><i className="ti ti-edit" /> Editar</button>
                    <button className="btn btn-sm btn-light-danger" onClick={async () => { const result = await deleteStoreCouponViaBackend(coupon.id); if (result?.ok) setCoupons((current) => current.filter((item) => item.id !== coupon.id)); }}><i className="ti ti-trash" /> Excluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'settings' && (
        <div className="card card-pad">
          <div className="form-row">
            <div className="form-group"><label>Nome da loja</label><input value={settings.brandName} onChange={(event) => setSettings((current) => ({ ...current, brandName: event.target.value }))} /></div>
            <div className="form-group"><label>Cor principal</label><input value={settings.accentColor} onChange={(event) => setSettings((current) => ({ ...current, accentColor: event.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>SEO Title</label><input value={settings.seoTitle} onChange={(event) => setSettings((current) => ({ ...current, seoTitle: event.target.value }))} /></div>
            <div className="form-group"><label>WhatsApp</label><input value={settings.whatsapp} onChange={(event) => setSettings((current) => ({ ...current, whatsapp: event.target.value }))} /></div>
          </div>
          <div className="form-group"><label>SEO Description</label><textarea rows={3} value={settings.seoDescription} onChange={(event) => setSettings((current) => ({ ...current, seoDescription: event.target.value }))} /></div>
          <div className="form-group"><label>Endereço</label><input value={settings.address} onChange={(event) => setSettings((current) => ({ ...current, address: event.target.value }))} /></div>
          <div className="form-row">
            <label className="toggle"><input type="checkbox" checked={settings.enablePickup} onChange={(event) => setSettings((current) => ({ ...current, enablePickup: event.target.checked }))} /><span>Retirada habilitada</span></label>
            <label className="toggle"><input type="checkbox" checked={settings.enableDelivery} onChange={(event) => setSettings((current) => ({ ...current, enableDelivery: event.target.checked }))} /><span>Entrega habilitada</span></label>
          </div>
          <div className="flex justify-end mt-2">
            <button className="btn btn-primary" onClick={() => void saveSettings()}><i className="ti ti-device-floppy" /> Salvar configurações</button>
          </div>
        </div>
      )}

      <Modal
        open={prodOpen}
        onClose={() => setProdOpen(false)}
        title={prodForm.id ? 'Editar produto' : 'Novo produto'}
        footer={
          <>
            <button className="btn btn-light-secondary" onClick={() => setProdOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => void saveProduct()}>Salvar</button>
          </>
        }
      >
        <div className="form-group"><label>Nome</label><input value={prodForm.name || ''} onChange={(event) => setProdForm((current) => ({ ...current, name: event.target.value }))} /></div>
        <div className="form-row">
          <div className="form-group"><label>SKU</label><input value={prodForm.sku || ''} onChange={(event) => setProdForm((current) => ({ ...current, sku: event.target.value }))} /></div>
          <div className="form-group"><label>Categoria</label><input value={prodForm.category || ''} onChange={(event) => setProdForm((current) => ({ ...current, category: event.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Preço</label><input type="number" value={prodForm.price || 0} onChange={(event) => setProdForm((current) => ({ ...current, price: Number(event.target.value || 0) }))} /></div>
          <div className="form-group"><label>Estoque</label><input type="number" value={prodForm.stock || 0} onChange={(event) => setProdForm((current) => ({ ...current, stock: Number(event.target.value || 0) }))} /></div>
        </div>
        <label className="toggle"><input type="checkbox" checked={!!prodForm.active} onChange={(event) => setProdForm((current) => ({ ...current, active: event.target.checked }))} /><span>Produto ativo</span></label>
      </Modal>

      <Modal
        open={couponOpen}
        onClose={() => setCouponOpen(false)}
        title={couponForm.id ? 'Editar cupom' : 'Novo cupom'}
        footer={
          <>
            <button className="btn btn-light-secondary" onClick={() => setCouponOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => void saveCoupon()}>Salvar</button>
          </>
        }
      >
        <div className="form-group"><label>Código</label><input value={couponForm.code || ''} onChange={(event) => setCouponForm((current) => ({ ...current, code: event.target.value }))} /></div>
        <div className="form-row">
          <div className="form-group">
            <label>Tipo</label>
            <select value={couponForm.type || 'percent'} onChange={(event) => setCouponForm((current) => ({ ...current, type: event.target.value as 'percent' | 'fixed' }))}>
              <option value="percent">Percentual</option>
              <option value="fixed">Valor fixo</option>
            </select>
          </div>
          <div className="form-group"><label>Valor</label><input type="number" value={couponForm.value || 0} onChange={(event) => setCouponForm((current) => ({ ...current, value: Number(event.target.value || 0) }))} /></div>
        </div>
        <label className="toggle"><input type="checkbox" checked={!!couponForm.active} onChange={(event) => setCouponForm((current) => ({ ...current, active: event.target.checked }))} /><span>Cupom ativo</span></label>
      </Modal>
    </div>
  );
}