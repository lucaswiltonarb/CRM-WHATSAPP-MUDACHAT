import { useEffect, useMemo, useState } from 'react';
import type { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';
import { api } from '../../services/api';
import type { DashboardData } from '../../types';
import { LoadingState, PageHeader } from '../../components/common';

type DatePreset = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'previous_month' | 'custom';
type LiteRef = { id: string; name: string; status?: string };
type HeatCell = { day: number; hour: number; count: number };
type DayAiHuman = { date: string; human: number; ai: number };
type SeriesStacked = { name: string; data: number[] };
type SalesRank = { userId: string; name: string; count: number; value: number };
type AdsDay = { date: string; count: number };
type AdsHour = { hour: number; count: number };

const fmtR = (n: number) => `R$ ${Number(n || 0).toLocaleString('pt-BR')}`;
const fmtT = (s: number) => `${Math.floor((s || 0) / 60)}m ${(s || 0) % 60}s`;
const heatMapMax = (items: Array<{ count: number }>) => Math.max(0, ...items.map((item) => item.count || 0));

function Stat({ icon, color, value, label }: { icon: string; color: string; value: string | number; label: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `rgba(${color},.12)`, color: `rgb(${color})` }}>
        <i className={icon} />
      </div>
      <div className="stat-info">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState('prod');
  const [data, setData] = useState<DashboardData | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('last_7_days');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [connectionIds, setConnectionIds] = useState<string[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [connections, setConnections] = useState<LiteRef[]>([]);
  const [users, setUsers] = useState<LiteRef[]>([]);
  const [darkMode, setDarkMode] = useState(() => document.body.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => setDarkMode(document.body.classList.contains('dark')));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    Promise.all([api.channels.list(), api.settings.getUsers()]).then(([chs, us]) => {
      const onlyConnected = ((chs || []) as LiteRef[]).filter((c) => c.status === 'connected');
      setConnections(onlyConnected);
      setUsers((us || []) as LiteRef[]);
    });
  }, []);

  useEffect(() => {
    api.dashboard
      .getData({
        datePreset,
        from: datePreset === 'custom' ? from : undefined,
        to: datePreset === 'custom' ? to : undefined,
        connectionIds,
        userIds,
      })
      .then(setData);
  }, [datePreset, from, to, connectionIds, userIds]);

  const tabs = [
    { id: 'prod', label: 'Produtividade', icon: 'ti ti-headset' },
    { id: 'sales', label: 'Vendas', icon: 'ti ti-trending-up' },
    { id: 'ads', label: 'ADS / Anúncios', icon: 'ti ti-ad' },
    { id: 'ai', label: 'IA & Automação', icon: 'ti ti-robot' },
    { id: 'analysis', label: 'Análise', icon: 'ti ti-mood-smile' },
  ];

  const connectionLabel = useMemo(() => {
    if (!connectionIds.length) return 'Todas conexões';
    return `${connectionIds.length} conexão(ões)`;
  }, [connectionIds]);

  const userLabel = useMemo(() => {
    if (!userIds.length) return 'Todos usuários';
    return `${userIds.length} usuário(s)`;
  }, [userIds]);

  const chartTheme = useMemo(() => ({
    mode: darkMode ? 'dark' : 'light',
    text: darkMode ? '#e5e9f0' : '#0f172a',
    muted: darkMode ? '#94a3b8' : '#64748b',
    grid: darkMode ? 'rgba(148,163,184,.14)' : 'rgba(148,163,184,.18)',
    tooltip: darkMode ? 'dark' : 'light',
    blue: '#4f8dfd',
    cyan: '#22c1dc',
    green: '#34d399',
    amber: '#fbbf24',
    red: '#fb7185',
    violet: '#8b5cf6',
  }), [darkMode]);

  const axisLabelStyle = useMemo(() => ({
    style: {
      colors: chartTheme.muted,
      fontSize: '12px',
      fontWeight: 500,
    },
  }), [chartTheme.muted]);

  const palette = useMemo(
    () => [chartTheme.blue, chartTheme.cyan, chartTheme.green, chartTheme.violet, chartTheme.amber, chartTheme.red],
    [chartTheme],
  );

  const heatMax = useMemo(() => heatMapMax(data?.productivity?.heatmap || []), [data]);

  const baseOptions = useMemo<ApexOptions>(() => ({
    chart: {
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      foreColor: chartTheme.muted,
      animations: { enabled: true, easing: 'easeinout', speed: 500 },
      fontFamily: 'Inter, sans-serif',
    },
    theme: { mode: chartTheme.mode as 'light' | 'dark' },
    dataLabels: { enabled: false },
    stroke: { lineCap: 'round' },
    grid: {
      borderColor: chartTheme.grid,
      strokeDashArray: 4,
      padding: { left: 6, right: 6, top: 4, bottom: 0 },
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'left',
      labels: { colors: chartTheme.text },
      itemMargin: { horizontal: 12, vertical: 6 },
    },
    tooltip: {
      theme: chartTheme.tooltip as 'light' | 'dark',
      marker: { show: false },
      style: { fontSize: '12px' },
    },
  }), [chartTheme]);

  const barChart = (cats: string[], dataPoints: number[], name: string, color = chartTheme.blue) => ({
    options: {
      ...baseOptions,
      colors: [color],
      xaxis: {
        categories: cats,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: axisLabelStyle,
      },
      yaxis: { labels: axisLabelStyle },
      plotOptions: {
        bar: {
          borderRadius: 10,
          borderRadiusApplication: 'end',
          columnWidth: '48%',
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: chartTheme.mode,
          type: 'vertical',
          opacityFrom: 0.95,
          opacityTo: 0.42,
          stops: [0, 100],
        },
      },
    } as ApexOptions,
    series: [{ name, data: dataPoints }],
  });

  const lineChart = (cats: string[], current: number[], previous: number[]) => ({
    options: {
      ...baseOptions,
      chart: { ...baseOptions.chart, type: 'area' },
      colors: [chartTheme.blue, chartTheme.violet],
      xaxis: {
        categories: cats,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: axisLabelStyle,
      },
      yaxis: { labels: axisLabelStyle },
      stroke: { curve: 'smooth', width: [3.5, 2.5] },
      fill: {
        type: 'gradient',
        gradient: {
          shade: chartTheme.mode,
          opacityFrom: 0.28,
          opacityTo: 0.02,
          stops: [0, 100],
        },
      },
      markers: { size: 0, hover: { size: 5 } },
    } as ApexOptions,
    series: [
      { name: 'Período atual', data: current },
      { name: 'Período anterior', data: previous },
    ],
  });

  const donutChart = (labels: string[], dataPoints: number[]) => ({
    options: {
      ...baseOptions,
      labels,
      colors: palette,
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          donut: {
            size: '74%',
            labels: {
              show: true,
              name: { show: true, color: chartTheme.muted, fontSize: '12px' },
              value: { show: true, color: chartTheme.text, fontSize: '24px', fontWeight: 700 },
              total: {
                show: true,
                label: 'Total',
                color: chartTheme.muted,
                formatter: () => String(dataPoints.reduce((sum, value) => sum + value, 0)),
              },
            },
          },
        },
      },
    } as ApexOptions,
    series: dataPoints,
  });

  const stackedBarOptions = (cats: string[], colors: string[]) => ({
    ...baseOptions,
    chart: { ...baseOptions.chart, stacked: true },
    colors,
    xaxis: {
      categories: cats,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: axisLabelStyle,
    },
    yaxis: { labels: axisLabelStyle },
    plotOptions: {
      bar: {
        borderRadius: 8,
        borderRadiusApplication: 'end',
        columnWidth: '52%',
      },
    },
    fill: { opacity: 0.95 },
  } as ApexOptions);

  const heatmapOptions = useMemo(() => ({
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'heatmap' },
    colors: [chartTheme.blue],
    stroke: { width: 3, colors: [darkMode ? 'rgba(15,23,42,.28)' : 'rgba(255,255,255,.92)'] },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: axisLabelStyle,
    },
    yaxis: { labels: axisLabelStyle },
    legend: { show: false },
    tooltip: {
      ...baseOptions.tooltip,
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const heatSeriesConfig = w.config.series as Array<{ name?: string; data?: Array<{ x?: string; y?: number }> }>;
        const day = heatSeriesConfig?.[seriesIndex]?.name || '';
        const hour = heatSeriesConfig?.[seriesIndex]?.data?.[dataPointIndex]?.x || '';
        const value = series?.[seriesIndex]?.[dataPointIndex] ?? 0;
        return `<div class="heatmap-tooltip"><span class="heatmap-tooltip-day">${day}</span><strong>${hour}</strong><span class="heatmap-tooltip-value">${value} atendimento(s)</span></div>`;
      },
    },
    plotOptions: {
      heatmap: {
        enableShades: true,
        shadeIntensity: 0.92,
        radius: 18,
        distributed: false,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: darkMode ? 'rgba(71,85,105,.18)' : 'rgba(226,232,240,.8)', name: 'Sem volume' },
            { from: 1, to: Math.max(1, Math.ceil(heatMax * 0.25)), color: darkMode ? '#1d4ed8' : '#bfdbfe', name: 'Baixo' },
            { from: Math.max(2, Math.ceil(heatMax * 0.25) + 1), to: Math.max(3, Math.ceil(heatMax * 0.55)), color: darkMode ? '#2563eb' : '#60a5fa', name: 'Médio' },
            { from: Math.max(4, Math.ceil(heatMax * 0.55) + 1), to: Math.max(5, Math.ceil(heatMax * 0.8)), color: darkMode ? '#38bdf8' : '#2563eb', name: 'Alto' },
            { from: Math.max(6, Math.ceil(heatMax * 0.8) + 1), to: Math.max(6, heatMax || 6), color: darkMode ? '#22d3ee' : '#0f766e', name: 'Pico' },
          ],
        },
      },
    },
  } as ApexOptions), [axisLabelStyle, baseOptions, chartTheme.blue, darkMode, heatMax]);

  if (!data) return <LoadingState label="Carregando dashboard..." />;

  const p = data.productivity;
  const s = data.sales;
  const a = data.ads;

  const heatMap = (p.heatmap || []) as HeatCell[];
  const byDayHumanAI = (p.byDayHumanAI || []) as DayAiHuman[];
  const byUserStacked = (p.byUserStacked || []) as SeriesStacked[];
  const byConnectionStacked = (p.byConnectionStacked || []) as SeriesStacked[];
  const ranking = (s.salesRanking || []) as SalesRank[];
  const chatsByDay = (a.chatsByDay || []) as AdsDay[];
  const chatsByHour = (a.chatsByHour || []) as AdsHour[];

  const heatHours = Array.from({ length: 24 }).map((_, h) => h);
  const heatDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const heatSeries = heatDays.map((day, dayIdx) => ({
    name: day,
    data: heatHours.map((hour) => {
      const cell = heatMap.find((x) => x.day === dayIdx && x.hour === hour);
      return { x: `${hour.toString().padStart(2, '0')}h`, y: cell?.count || 0 };
    }),
  }));

  const top3 = ranking.slice(0, 3);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Dados reais com filtros por período, conexão e usuário"
        actions={
          <>
            <select className="filter-select" value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)}>
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="last_7_days">Últimos 7 dias</option>
              <option value="last_30_days">Últimos 30 dias</option>
              <option value="this_month">Este mês</option>
              <option value="previous_month">Mês anterior</option>
              <option value="custom">Personalizado</option>
            </select>
            {datePreset === 'custom' && (
              <>
                <input className="filter-select" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <input className="filter-select" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </>
            )}
            <select
              className="filter-select"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                setConnectionIds((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
              }}
            >
              <option value="">{connectionLabel}</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                setUserIds((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
              }}
            >
              <option value="">{userLabel}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </>
        }
      />

      <div className="tab-nav">
        {tabs.map((t) => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <i className={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'prod' && (
        <>
          <div className="stat-grid">
            <Stat icon="ti ti-message-2" color="33,114,219" value={p.totalConversations} label="Total de Atendimentos" />
            <Stat icon="ti ti-checks" color="52,180,120" value={p.finished} label="Atendimentos Concluídos" />
            <Stat icon="ti ti-message-exclamation" color="250,172,80" value={p.pendingReply || 0} label="Devendo Resposta" />
            <Stat icon="ti ti-hourglass-high" color="6,145,169" value={p.customerWaiting || 0} label="Cliente Aguardando" />
            <Stat icon="ti ti-bolt" color="33,114,219" value={fmtT(p.avgFirstResponse)} label="Tempo médio 1ª resposta" />
            <Stat icon="ti ti-clock" color="147,51,234" value={fmtT(p.avgHandlingTime)} label="Tempo médio atendimento" />
          </div>

          <div className="dash-grid-2">
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Atendimentos por Dia (IA vs Humano)</h4>
              <Chart
                type="bar"
                height={280}
                options={stackedBarOptions(byDayHumanAI.map((x) => x.date.slice(5)), [chartTheme.blue, chartTheme.green])}
                series={[
                  { name: 'Humano', data: byDayHumanAI.map((x) => x.human) },
                  { name: 'IA', data: byDayHumanAI.map((x) => x.ai) },
                ]}
              />
            </div>
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Volume por usuário</h4>
              <Chart type="bar" height={280} options={stackedBarOptions(p.dayLabels || [], palette)} series={byUserStacked} />
            </div>
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Mapa de calor (dia x hora)</h4>
              <Chart type="heatmap" height={320} options={heatmapOptions} series={heatSeries} />
            </div>
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Volume por conexão</h4>
              <Chart
                type="bar"
                height={320}
                options={stackedBarOptions(p.dayLabels || [], [chartTheme.cyan, chartTheme.blue, chartTheme.green, chartTheme.violet, chartTheme.amber, chartTheme.red])}
                series={byConnectionStacked}
              />
            </div>
          </div>
        </>
      )}

      {tab === 'sales' && (
        <>
          <div className="stat-grid">
            <Stat icon="ti ti-shopping-cart" color="33,114,219" value={s.totalSales || s.won} label="Total de vendas" />
            <Stat icon="ti ti-cash" color="52,180,120" value={fmtR(s.totalValue || s.totalConverted)} label="Valor Total" />
            <Stat icon="ti ti-percentage" color="147,51,234" value={`${s.conversionRate}%`} label="Taxa de Conversão" />
            <Stat icon="ti ti-receipt-2" color="250,172,80" value={fmtR(s.avgTicket)} label="Ticket Médio" />
            <Stat icon="ti ti-user-plus" color="6,145,169" value={s.newLeads || s.leadsGenerated} label="Leads Novos" />
            <Stat icon="ti ti-repeat" color="239,68,68" value={`${s.recurrence || 0}%`} label="Recorrência" />
          </div>

          <div className="dash-grid-2">
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Funil de Conversão</h4>
              <Chart
                type="bar"
                height={280}
                {...barChart(
                  ['Atendimentos', 'Negociações', 'Vendas Fechadas'],
                  [s.funnel?.totalConversations || 0, s.funnel?.totalNegotiations || 0, s.funnel?.closedSales || 0],
                  'Quantidade',
                  chartTheme.violet,
                )}
              />
            </div>
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Comparativo de Período</h4>
              <Chart type="area" height={280} {...lineChart(s.periodComparison?.categories || [], s.periodComparison?.current || [], s.periodComparison?.previous || [])} />
            </div>
          </div>

          <div className="card card-pad mt-2">
            <h4 className="chart-title">🏆 Ranking de Vendas</h4>
            <div className="podium-grid">
              <div className="podium-card">
                <strong>1º</strong>
                <span>{top3[0]?.name || '-'}</span>
                <small>{fmtR(top3[0]?.value || 0)}</small>
              </div>
              <div className="podium-card">
                <strong>2º</strong>
                <span>{top3[1]?.name || '-'}</span>
                <small>{fmtR(top3[1]?.value || 0)}</small>
              </div>
              <div className="podium-card">
                <strong>3º</strong>
                <span>{top3[2]?.name || '-'}</span>
                <small>{fmtR(top3[2]?.value || 0)}</small>
              </div>
            </div>
            <table className="data-table mt-1">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Qtd. vendas</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.userId}>
                    <td>{r.name}</td>
                    <td>{r.count}</td>
                    <td>{fmtR(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'ads' && (
        <>
          <div className="stat-grid">
            <Stat icon="ti ti-cash" color="52,180,120" value={fmtR(a.revenueMetaAds || 0)} label="Receita Meta Ads" />
            <Stat icon="ti ti-user-plus" color="33,114,219" value={a.newAdsLeads || 0} label="Leads Novos Ads" />
            <Stat icon="ti ti-percentage" color="147,51,234" value={`${a.estimatedROI || 0}%`} label="ROI estimado" />
          </div>
          <div className="dash-grid-2">
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Chats por dia</h4>
              <Chart type="bar" height={280} {...barChart(chatsByDay.map((x) => x.date.slice(5)), chatsByDay.map((x) => x.count), 'Chats')} />
            </div>
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Chats por horário</h4>
              <Chart type="bar" height={280} {...barChart(chatsByHour.map((x) => `${x.hour}h`), chatsByHour.map((x) => x.count), 'Chats', chartTheme.cyan)} />
            </div>
          </div>
        </>
      )}

      {tab === 'ai' && (
        <>
          <div className="stat-grid">
            <Stat icon="ti ti-robot" color="33,114,219" value={data.ai.totalAIConversations} label="Atendimentos por IA" />
            <Stat icon="ti ti-circle-check" color="52,180,120" value={data.ai.resolvedByAI} label="Resolvidos por IA" />
            <Stat icon="ti ti-user-up" color="250,172,80" value={data.ai.transferredToHuman} label="Transferidos p/ humano" />
            <Stat icon="ti ti-percentage" color="147,51,234" value={`${data.ai.autoResolutionRate}%`} label="Resolução automática" />
          </div>
          <div className="dash-grid-2">
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Intenções mais acionadas</h4>
              <Chart type="bar" height={260} {...barChart(data.ai.topIntents.map((x) => x.intent), data.ai.topIntents.map((x) => x.count), 'Acionamentos')} />
            </div>
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Resolução IA vs Humano</h4>
              <Chart type="donut" height={260} {...donutChart(['Resolvido por IA', 'Transferido'], [data.ai.resolvedByAI, data.ai.transferredToHuman])} />
            </div>
          </div>
        </>
      )}

      {tab === 'analysis' && (
        <>
          <div className="stat-grid">
            <Stat icon="ti ti-message-search" color="33,114,219" value={data.analysis.analyzedConversations} label="Conversas analisadas" />
            <Stat icon="ti ti-mood-happy" color="52,180,120" value={`${data.analysis.satisfactionLevel}%`} label="Satisfação" />
            <Stat icon="ti ti-star" color="250,172,80" value={data.analysis.npsScore ?? '-'} label="NPS" />
            <Stat icon="ti ti-alert-triangle" color="239,68,68" value={data.analysis.badServiceAlerts} label="Alertas ruins" />
          </div>
          <div className="dash-grid-2">
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Distribuição de sentimento</h4>
              <Chart type="donut" height={260} {...donutChart(data.analysis.sentimentDistribution.map((x) => x.sentiment), data.analysis.sentimentDistribution.map((x) => x.count))} />
            </div>
            <div className="card card-pad chart-panel">
              <h4 className="chart-title">Motivos mais recorrentes</h4>
              <Chart type="bar" height={260} {...barChart(data.analysis.topReasons.map((x) => x.reason), data.analysis.topReasons.map((x) => x.count), 'Qtd', chartTheme.cyan)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}