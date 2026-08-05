import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader, LoadingState } from '../../components/common';

export default function LicenseSettings() {
  const [lic, setLic] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => { Promise.all([api.settings.getLicense(), api.settings.getPlan()]).then(([l, p]) => { setLic(l); setPlan(p); }); }, []);
  if (!lic || !plan) return <LoadingState />;

  const usage = (used: number, limit: number) => limit ? Math.min(100, Math.round(used / limit * 100)) : 0;
  const limits = [
    { label: 'Usuários', used: lic.usersUsed ?? 4, limit: lic.usersLimit ?? 10, icon: 'ti ti-users' },
    { label: 'Canais', used: lic.channelsUsed ?? 2, limit: lic.channelsLimit ?? 5, icon: 'ti ti-plug' },
    { label: 'Agentes IA', used: lic.agentsUsed ?? 1, limit: lic.agentsLimit ?? 3, icon: 'ti ti-robot' },
    { label: 'Contatos', used: lic.contactsUsed ?? 850, limit: lic.contactsLimit ?? 5000, icon: 'ti ti-address-book' },
  ];

  return (
    <div className="page-shell">
      <PageHeader title="Licença, Planos e Créditos" subtitle="Controle de assinatura e consumo" />
      <div className="card-grid mb-2">
        <div className="card license-plan">
          <span className="badge bg-light-primary text-primary">Plano Atual</span>
          <h2 className="plan-name">{plan.name}</h2>
          <p className="plan-price">R$ {plan.price?.toFixed(2) || '0,00'}<span>/mês</span></p>
          <p className="text-sm"><span className={`badge bg-light-${lic.status === 'active' ? 'success' : 'danger'} text-${lic.status === 'active' ? 'success' : 'danger'}`}>{lic.status === 'active' ? 'Ativa' : 'Vencida'}</span></p>
          <p className="text-xs text-muted">Vencimento: {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString('pt-BR') : '-'}</p>
          <div className="flex gap-1 mt-1"><button className="btn btn-sm btn-primary">Renovar</button><button className="btn btn-sm btn-light-primary">Mudar plano</button></div>
        </div>
        <div className="card credit-card">
          <h3 className="m-0">Créditos de IA</h3>
          <div className="credit-big">{lic.creditsAvailable ?? 1200}<span> disponíveis</span></div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${usage(lic.creditsUsed ?? 800, (lic.creditsUsed ?? 800) + (lic.creditsAvailable ?? 1200))}%` }} /></div>
          <p className="text-xs text-muted mt-1">{lic.creditsUsed ?? 800} créditos consumidos este mês</p>
          <button className="btn btn-sm btn-success mt-1">Comprar créditos</button>
        </div>
      </div>

      <h3 className="section-title">Limites de uso</h3>
      <div className="card-grid">
        {limits.map(l => (
          <div key={l.label} className="card">
            <div className="flex items-center gap-1 mb-1"><i className={l.icon} /> <strong>{l.label}</strong></div>
            <div className="flex justify-between text-sm"><span>{l.used} / {l.limit}</span><span>{usage(l.used, l.limit)}%</span></div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${usage(l.used, l.limit)}%`, background: usage(l.used, l.limit) > 85 ? '#fa896b' : undefined }} /></div>
          </div>
        ))}
      </div>

      <h3 className="section-title mt-2">Histórico de consumo</h3>
      <div className="card"><table className="data-table"><thead><tr><th>Data</th><th>Descrição</th><th>Créditos</th></tr></thead>
        <tbody>{(lic.history || [{ date: new Date().toISOString(), desc: 'Respostas de IA', amount: -120 }, { date: new Date(Date.now() - 864e5).toISOString(), desc: 'Compra de créditos', amount: 1000 }]).map((h: any, i: number) => (
          <tr key={i}><td>{new Date(h.date).toLocaleDateString('pt-BR')}</td><td>{h.desc}</td><td className={h.amount < 0 ? 'text-danger' : 'text-success'}>{h.amount > 0 ? '+' : ''}{h.amount}</td></tr>
        ))}</tbody></table></div>
    </div>
  );
}



