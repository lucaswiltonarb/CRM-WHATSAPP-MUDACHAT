import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader, LoadingState } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

const RULES = [
  { id: 'order', label: 'Por ordem (round-robin)', icon: 'ti ti-list-numbers' },
  { id: 'least_load', label: 'Por menor carga', icon: 'ti ti-scale' },
  { id: 'schedule', label: 'Por horário/turno', icon: 'ti ti-clock' },
  { id: 'channel', label: 'Por canal', icon: 'ti ti-plug' },
  { id: 'tag', label: 'Por tag', icon: 'ti ti-tag' },
  { id: 'funnel', label: 'Por funil', icon: 'ti ti-layout-kanban' },
];

export default function DistributionSettings() {
  const { notify } = useToast();
  const [cfg, setCfg] = useState<any>(null);

  useEffect(() => { api.settings.getDistribution().then(setCfg); }, []);
  if (!cfg) return <LoadingState />;
  const save = async () => { await api.settings.updateDistribution(cfg); await api.audit.log('Distribuição automática alterada', 'Configurações', 'AutoDistribution', 'dist-1'); notify('Configuração salva'); };

  return (
    <div className="page-shell">
      <PageHeader title="Distribuição Automática" subtitle="Como os atendimentos são atribuídos"
        actions={<button className="btn btn-primary" onClick={save}>Salvar</button>} />
      <div className="card page-section-card" style={{ padding: '1.25rem' }}>
        <div className="switch-row"><div><strong>Ativar distribuição automática</strong><p className="text-xs text-muted">Atribui novas conversas automaticamente aos atendentes</p></div><label className="switch"><input type="checkbox" checked={cfg.isActive} onChange={(e) => setCfg({ ...cfg, isActive: e.target.checked })} /><span className="slider" /></label></div>
        <label className="mb-1" style={{ display: 'block', fontWeight: 600 }}>Regra de distribuição</label>
        <div className="rule-grid">{RULES.map(r => (
          <button key={r.id} className={`rule-card ${cfg.rule === r.id ? 'on' : ''}`} onClick={() => setCfg({ ...cfg, rule: r.id })}><i className={r.icon} /><span>{r.label}</span></button>
        ))}</div>
        <div className="switch-row mt-2"><span>Considerar apenas atendentes disponíveis</span><label className="switch"><input type="checkbox" checked={cfg.onlyAvailable ?? true} onChange={(e) => setCfg({ ...cfg, onlyAvailable: e.target.checked })} /><span className="slider" /></label></div>
        <div className="switch-row"><span>Respeitar limite máximo por atendente</span><label className="switch"><input type="checkbox" checked={cfg.respectLimit ?? false} onChange={(e) => setCfg({ ...cfg, respectLimit: e.target.checked })} /><span className="slider" /></label></div>
        <div className="form-group mt-1"><label>Limite máximo de conversas simultâneas</label><input type="number" value={cfg.maxPerAgent || 10} onChange={(e) => setCfg({ ...cfg, maxPerAgent: +e.target.value })} /></div>
      </div>
    </div>
  );
}



