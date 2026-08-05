import { useState } from 'react';
import Chart from 'react-apexcharts';
import { api } from '../../services/api';
import { PageHeader } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

const TYPES = [
  { id: 'attendance', label: 'Atendimentos', icon: 'ti ti-headset' },
  { id: 'users', label: 'Usuários', icon: 'ti ti-users' },
  { id: 'channels', label: 'Canais', icon: 'ti ti-plug' },
  { id: 'crm', label: 'CRM / Vendas', icon: 'ti ti-layout-kanban' },
  { id: 'campaigns', label: 'Campanhas', icon: 'ti ti-speakerphone' },
  { id: 'schedule', label: 'Agenda', icon: 'ti ti-calendar' },
  { id: 'ai', label: 'IA & Automação', icon: 'ti ti-robot' },
];

export default function Reports() {
  const { notify } = useToast();
  const [type, setType] = useState('attendance');
  const [period, setPeriod] = useState('30d');

  const exportData = async (fmt: string) => { await api.reports.export(type, fmt, { period }); notify(`Exportação ${fmt.toUpperCase()} preparada`); };

  const series = [{ name: 'Total', data: [44, 55, 41, 67, 22, 43, 58] }, { name: 'Concluídos', data: [35, 41, 36, 50, 18, 35, 47] }];
  const cats = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Indicadores e exportações"
        actions={<><button className="btn btn-light-secondary" onClick={() => exportData('csv')}><i className="ti ti-file-spreadsheet" /> CSV</button><button className="btn btn-light-secondary" onClick={() => exportData('pdf')}><i className="ti ti-file-text" /> PDF</button></>} />

      <div className="report-tabs">{TYPES.map(t => <button key={t.id} className={`report-tab ${type === t.id ? 'active' : ''}`} onClick={() => setType(t.id)}><i className={t.icon} /> {t.label}</button>)}</div>

      <div className="toolbar">
        <select className="filter-select" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="90d">Últimos 90 dias</option></select>
      </div>

      <div className="stat-grid mb-2">
        {[['Total', '328', 'primary', 'ti ti-chart-bar'], ['Média diária', '47', 'success', 'ti ti-trending-up'], ['Pico', '67', 'warning', 'ti ti-arrow-up'], ['Taxa conclusão', '81%', 'info', 'ti ti-check']].map(([l, v, c, ic]) => (
          <div key={l} className="card stat-card"><div className={`stat-icon bg-light-${c} text-${c}`}><i className={ic as string} /></div><div><span className="stat-value">{v}</span><span className="stat-label">{l}</span></div></div>
        ))}
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <h3 className="m-0 mb-1">Evolução — {TYPES.find(t => t.id === type)?.label}</h3>
        <Chart type="area" height={320} series={series} options={{ chart: { toolbar: { show: false } }, dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 2 }, xaxis: { categories: cats }, colors: ['#5d87ff', '#13deb9'], legend: { position: 'top' }, fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } } }} />
      </div>

      <div className="card mt-2"><table className="data-table"><thead><tr><th>Período</th><th>Total</th><th>Concluídos</th><th>Taxa</th></tr></thead>
        <tbody>{cats.map((c, i) => <tr key={c}><td>{c}</td><td>{series[0].data[i]}</td><td>{series[1].data[i]}</td><td>{Math.round(series[1].data[i] / series[0].data[i] * 100)}%</td></tr>)}</tbody></table></div>
    </div>
  );
}
