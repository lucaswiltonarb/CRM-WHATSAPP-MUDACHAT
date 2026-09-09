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

type HeatRange = { from: number; to: number; color: string; name: string };

/* Rampa sequencial Proofline (proof-blue #7C91FF).
   Somente HEX: o ApexCharts quebra ao receber rgba() no colorScale. */
const HEAT_RAMP = {
  light: { empty: '#131316', levels: ['#232A4D', '#39466F', '#4F5F9E', '#6577CE', '#7C91FF'] },
  dark: { empty: '#131316', levels: ['#232A4D', '#39466F', '#4F5F9E', '#6577CE', '#7C91FF'] },
};

const buildHeatRanges = (max: number, dark: boolean): HeatRange[] => {
  const ramp = dark ? HEAT_RAMP.dark : HEAT_RAMP.light;
  const ranges: HeatRange[] = [{ from: 0, to: 0, color: ramp.empty, name: 'Sem volume' }];
  if (max < 1) return ranges;

  const steps = Math.min(ramp.levels.length, max);
  const size = max / steps;
  let from = 1;
  for (let i = 0; i < steps && from <= max; i += 1) {
    const to = i === steps - 1 ? max : Math.max(from, Math.round((i + 1) * size));
    const colorIdx = steps === 1 ? ramp.levels.length - 1 : Math.round((i * (ramp.levels.length - 1)) / (steps - 1));
    ranges.push({ from, to, color: ramp.levels[colorIdx], name: from === to ? `${from}` : `${from}-${to}` });
    from = to + 1;
  }
  return ranges;
};

const heatColorFor = (value: number, ranges: HeatRange[]) =>
  ranges.find((r) => value >= r.from && value <= r.to)?.color || ranges[0].color;

/* Semântica Proofline: azul=identidade/volume, verde=sucesso, âmbar=pendente, vermelho=falha. */
const STAT_COLORS = {
  blue: '124,145,255',
  green: '114,230,166',
  amber: '241,199,120',
  red: '239,125,139',
  soft: '185,197,255',
  stone: '168,166,160',
};

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

  /* Tema de gráfico Proofline (dark-only) */
  const chartTheme = useMemo(() => ({
    mode: 'dark' as const,
    text: '#F6F1E7',
    muted: '#A8A6A0',
    grid: 'rgba(246,241,231,.08)',
    tooltip: 'dark' as const,
    blue: '#7C91FF',
    cyan: '#B9C5FF',
    green: '#72E6A6',
    amber: '#F1C778',
    red: '#EF7D8B',
    violet: '#8CA0FF',
  }), []);

  const axisLabelStyle = useMemo(() => ({
    style: {
      colors: chartTheme.muted,
      fontSize: '11px',
      fontWeight: 500,
      fontFamily: 'JetBrains Mono, monospace',
    },
  }), [chartTheme.muted]);

  const palette = useMemo(
    () => [chartTheme.blue, chartTheme.green, chartTheme.amber, chartTheme.violet, chartTheme.cyan, chartTheme.red],
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
    theme: { mode: chartTheme.mode },
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
      theme: chartTheme.tooltip,
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
          borderRadius: 4,
          borderRadiusApplication: 'end',
          columnWidth: '48%',
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
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
      stroke: { curve: 'smooth', width: [3, 2] },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          opacityFrom: 0.22,
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
              value: { show: true, color: chartTheme.text, fontSize: '24px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' },
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
        borderRadius: 4,
        borderRadiusApplication: 'end',
        columnWidth: '52%',
      },
    },
    fill: { opacity: 0.95 },
  } as ApexOptions);

  const heatRanges = useMemo(() => buildHeatRanges(heatMax, darkMode), [heatMax, darkMode]);

  const heatmapOptions = useMemo(() => ({
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'heatmap' },
    colors: [chartTheme.blue],
    // O stroke desenha a "calha" entre as celulas: usa a cor do painel para virar respiro.
    stroke: { show: true, width: 4, colors: ['#111113'] },
    grid: { ...baseOptions.grid, show: false, padding: { left: 4, right: 8, top: 0, bottom: 0 } },
    xaxis: {
      type: 'category',
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: {
        ...axisLabelStyle,
        rotate: 0,
        hideOverlappingLabels: true,
        style: { ...axisLabelStyle.style, fontSize: '10px' },
        formatter: (value: string) => (Number(String(value).replace('h', '')) % 2 === 0 ? value : ''),
      },
    },
    yaxis: { labels: { ...axisLabelStyle, style: { ...axisLabelStyle.style, fontWeight: 600 } } },
    legend: { show: false },
    states: {
      hover: { filter: { type: 'lighten', value: 0.12 } },
      active: { allowMultipleDataPointsSelection: false, filter: { type: 'none' } },
    },
    tooltip: {
      ...baseOptions.tooltip,
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const heatSeriesConfig = w.config.series as Array<{ name?: string; data?: Array<{ x?: string; y?: number }> }>;
        const day = heatSeriesConfig?.[seriesIndex]?.name || '';
        const hour = heatSeriesConfig?.[seriesIndex]?.data?.[dataPointIndex]?.x || '';
        const value = Number(series?.[seriesIndex]?.[dataPointIndex] ?? 0);
        const dot = heatColorFor(value, heatRanges);
        return `<div class="heatmap-tooltip">
            <span class="heatmap-tooltip-day">${day} &middot; ${hour}</span>
            <span class="heatmap-tooltip-value"><i style="background:${dot}"></i>${value} atendimento(s)</span>
          </div>`;
      },
    },
    plotOptions: {
      heatmap: {
        // enableShades quebra a escala discreta (e escurece tudo); as faixas ja definem a cor.
        enableShades: false,
        radius: 4,
        distributed: false,
        useFillColorAsStroke: false,
        colorScale: { ranges: heatRanges },
      },
    },
  } as ApexOptions), [axisLabelStyle, baseOptions, chartTheme.blue, heatRanges]);

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
    <div className="page-shell">
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
            <Stat icon="ti ti-message-2" color={STAT_COLORS.blue} value={p.totalConversations} label="Total de Atendimentos" />
            <Stat icon="ti ti-checks" color={STAT_COLORS.green} value={p.finished} label="Atendimentos Concluídos" />
            <Stat icon="ti ti-message-exclamation" color={STAT_COLORS.amber} value={p.pendingReply || 0} label="Devendo Resposta" />
            <Stat icon="ti ti-hourglass-high" color={STAT_COLORS.red} value={p.customerWaiting || 0} label="Cliente Aguardando" />
            <Stat icon="ti ti-bolt" color={STAT_COLORS.blue} value={fmtT(p.avgFirstResponse)} label="Tempo médio 1ª resposta" />
            <Stat icon="ti ti-clock" color={STAT_COLORS.soft} value={fmtT(p.avgHandlingTime)} label="Tempo médio atendimento" />
          </div>

          {/* Composição Proofline: coluna principal + rail direito */}
          <div className="page-grid">
            <div className="page-grid-main">
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
                <h4 className="chart-title">Mapa de calor (dia x hora)</h4>
                <Chart type="heatmap" height={320} options={heatmapOptions} series={heatSeries} />
                <div className="heatmap-legend">
                  <span>Menos</span>
                  {heatRanges.map((r) => (
                    <i key={`${r.from}-${r.to}`} style={{ background: r.color }} title={`${r.name} atendimento(s)`} />
                  ))}
                  <span>Mais</span>
                </div>
              </div>
            </div>
            <div className="page-grid-rail">
              <div className="card card-pad chart-panel">
                <h4 className="chart-title">Volume por usuário</h4>
                <Chart type="bar" height={240} options={stackedBarOptions(p.dayLabels || [], palette)} series={byUserStacked} />
              </div>
              <div className="card card-pad chart-panel">
                <h4 className="chart-title">Volume por conexão</h4>
                <Chart
                  type="bar"
                  height={240}
                  options={stackedBarOptions(p.dayLabels || [], [chartTheme.cyan, chartTheme.blue, chartTheme.green, chartTheme.violet, chartTheme.amber, chartTheme.red])}
                  series={byConnectionStacked}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'sales' && (
        <>
          <div className="stat-grid">
            <Stat icon="ti ti-shopping-cart" color={STAT_COLORS.blue} value={s.totalSales || s.won} label="Total de vendas" />
            <Stat icon="ti ti-cash" color={STAT_COLORS.green} value={fmtR(s.totalValue || s.totalConverted)} label="Valor Total" />
            <Stat icon="ti ti-percentage" color={STAT_COLORS.soft} value={`${s.conversionRate}%`} label="Taxa de Conversão" />
            <Stat icon="ti ti-receipt-2" color={STAT_COLORS.amber} value={fmtR(s.avgTicket)} label="Ticket Médio" />
            <Stat icon="ti ti-user-plus" color={STAT_COLORS.blue} value={s.newLeads || s.leadsGenerated} label="Leads Novos" />
            <Stat icon="ti ti-repeat" color={STAT_COLORS.red} value={`${s.recurrence || 0}%`} label="Recorrência" />
          </div>

          <div className="page-grid">
            <div className="page-grid-main">
              <div className="card card-pad chart-panel">
                <h4 className="chart-title">Comparativo de Período</h4>
                <Chart type="area" height={280} {...lineChart(s.periodComparison?.categories || [], s.periodComparison?.current || [], s.periodComparison?.previous || [])} />
              </div>
              <div className="card card-pad">
                <h4 className="chart-title">Ranking de Vendas</h4>
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
            </div>
            <div className="page-grid-rail">
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
            </div>
          </div>
        </>
      )}

      {tab === 'ads' && (
        <>
          <div className="stat-grid">
            <Stat icon="ti ti-cash" color={STAT_COLORS.green} value={fmtR(a.revenueMetaAds || 0)} label="Receita Meta Ads" />
            <Stat icon="ti ti-user-plus" color={STAT_COLORS.blue} value={a.newAdsLeads || 0} label="Leads Novos Ads" />
            <Stat icon="ti ti-percentage" color={STAT_COLORS.soft} value={`${a.estimatedROI || 0}%`} label="ROI estimado" />
          </div>
          <div className="page-grid">
            <div className="page-grid-main">
              <div className="card card-pad chart-panel">
                <h4 className="chart-title">Chats por dia</h4>
                <Chart type="bar" height={280} {...barChart(chatsByDay.map((x) => x.date.slice(5)), chatsByDay.map((x) => x.count), 'Chats')} />
              </div>
            </div>
            <div className="page-grid-rail">
              <div className="card card-pad chart-panel">
                <h4 className="chart-title">Chats por horário</h4>
                <Chart type="bar" height={280} {...barChart(chatsByHour.map((x) => `${x.hour}h`), chatsByHour.map((x) => x.count), 'Chats', chartTheme.cyan)} />
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'ai' && (
        <>
          <div className="stat-grid">
            <Stat icon="ti ti-robot" color={STAT_COLORS.blue} value={data.ai.totalAIConversations} label="Atendimentos por IA" />
            <Stat icon="ti ti-circle-check" color={STAT_COLORS.green} value={data.ai.resolvedByAI} label="Resolvidos por IA" />
            <Stat icon="ti ti-user-up" color={STAT_COLORS.amber} value={data.ai.transferredToHuman} label="Transferidos p/ humano" />
            <Stat icon="ti ti-percentage" color={STAT_COLORS.soft} value={`${data.ai.autoResolutionRate}%`} label="Resolução automática" />
          </div>
          <div className="page-grid">
            <div className="page-grid-main">
              <div className="card card-pad chart-panel">
                <h4 className="chart-title">Intenções mais acionadas</h4>
                <Chart type="bar" height={260} {...barChart(data.ai.topIntents.map((x) => x.intent), data.ai.topIntents.map((x) => x.count), 'Acionamentos')} />
              </div>
            </div>
            <div className="page-grid-rail">
              <div className="card card-pad chart-panel">
                <h4 className="chart-title">Resolução IA vs Humano</h4>
                <Chart type="donut" height={260} {...donutChart(['Resolvido por IA', 'Transferido'], [data.ai.resolvedByAI, data.ai.transferredToHuman])} />
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'analysis' && (
        <>
          <div className="stat-grid">
            <Stat icon="ti ti-message-search" color={STAT_COLORS.blue} value={data.analysis.analyzedConversations} label="Conversas analisadas" />
            <Stat icon="ti ti-mood-happy" color={STAT_COLORS.green} value={`${data.analysis.satisfactionLevel}%`} label="Satisfação" />
            <Stat icon="ti ti-star" color={STAT_COLORS.amber} value={data.analysis.npsScore ?? '-'} label="NPS" />
            <Stat icon="ti ti-alert-triangle" color={STAT_COLORS.red} value={data.analysis.badServiceAlerts} label="Alertas ruins" />
          </div>
          <div className="page-grid">
            <div className="page-grid-main">
              <div className="card card-pad chart-panel">
                <h4 className="chart-title">Motivos mais recorrentes</h4>
                <Chart type="bar" height={260} {...barChart(data.analysis.topReasons.map((x) => x.reason), data.analysis.topReasons.map((x) => x.count), 'Qtd', chartTheme.cyan)} />
              </div>
            </div>
            <div className="page-grid-rail">
              <div className="card card-pad chart-panel">
                <h4 className="chart-title">Distribuição de sentimento</h4>
                <Chart type="donut" height={260} {...donutChart(data.analysis.sentimentDistribution.map((x) => x.sentiment), data.analysis.sentimentDistribution.map((x) => x.count))} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
