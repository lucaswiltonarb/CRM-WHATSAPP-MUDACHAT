import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common';
import * as saas from '../../services/saas';
import type { SaasPlan, Workspace } from '../../types/saas';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: 'Ativo', cls: 'success' },
  trial: { label: 'Em teste', cls: 'primary' },
  suspended: { label: 'Suspenso', cls: 'warning' },
  canceled: { label: 'Cancelado', cls: 'danger' },
};

const monthlyValue = (p: SaasPlan) => {
  if (p.billingPeriod === 'yearly') return p.price / 12;
  if (p.billingPeriod === 'quarterly') return p.price / 3;
  return p.price;
};

export default function AdminOverview() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [plans, setPlans] = useState<SaasPlan[]>([]);

  useEffect(() => {
    setWorkspaces(saas.listWorkspaces());
    setPlans(saas.listPlans());
  }, []);

  const stats = useMemo(() => {
    const byStatus = workspaces.reduce<Record<string, number>>((acc, w) => {
      acc[w.status] = (acc[w.status] || 0) + 1;
      return acc;
    }, {});
    const mrr = workspaces
      .filter((w) => w.status === 'active')
      .reduce((sum, w) => {
        const p = plans.find((x) => x.id === w.planId);
        return sum + (p ? monthlyValue(p) : 0);
      }, 0);
    const totals = workspaces.reduce(
      (acc, w) => {
        const u = saas.workspaceUsage(w.id);
        acc.users += u.users;
        acc.connections += u.connections;
        acc.contacts += u.contacts;
        acc.leads += u.leads;
        return acc;
      },
      { users: 0, connections: 0, contacts: 0, leads: 0 },
    );
    return { byStatus, mrr, totals };
  }, [workspaces, plans]);

  const byPlan = useMemo(
    () =>
      plans.map((p) => ({
        plan: p,
        count: workspaces.filter((w) => w.planId === p.id).length,
      })),
    [plans, workspaces],
  );

  const maxCount = Math.max(1, ...byPlan.map((b) => b.count));

  const cards = [
    { label: 'Workspaces', value: workspaces.length, icon: 'ti ti-building-store', color: '#2172DB' },
    { label: 'Ativos', value: stats.byStatus.active || 0, icon: 'ti ti-circle-check', color: '#34B478' },
    { label: 'Em teste', value: stats.byStatus.trial || 0, icon: 'ti ti-hourglass', color: '#FAAC50' },
    { label: 'Suspensos', value: (stats.byStatus.suspended || 0) + (stats.byStatus.canceled || 0), icon: 'ti ti-ban', color: '#EF4444' },
  ];

  return (
    <div className="page-shell">
      <PageHeader title="Administrativo Geral" subtitle="Visao consolidada da plataforma, clientes e planos" />

      <div className="admin-kpi-grid">
        {cards.map((c) => (
          <div key={c.label} className="admin-kpi">
            <div className="admin-kpi-icon" style={{ background: `${c.color}1a`, color: c.color }}>
              <i className={c.icon} />
            </div>
            <div>
              <span className="admin-kpi-value">{c.value}</span>
              <span className="admin-kpi-label">{c.label}</span>
            </div>
          </div>
        ))}
        <div className="admin-kpi mrr">
          <div className="admin-kpi-icon" style={{ background: 'rgba(124,58,237,.1)', color: '#7C3AED' }}>
            <i className="ti ti-cash" />
          </div>
          <div>
            <span className="admin-kpi-value">R$ {stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="admin-kpi-label">Receita recorrente mensal</span>
          </div>
        </div>
      </div>

      <div className="admin-cols">
        <div className="card">
          <div className="flex justify-between items-center mb-1">
            <h3 className="m-0">Distribuicao por plano</h3>
            <button className="btn btn-sm btn-light-primary" onClick={() => navigate('/admin/plans')}>
              <i className="ti ti-settings" /> Gerenciar planos
            </button>
          </div>
          {byPlan.length === 0 && <p className="text-sm text-muted">Nenhum plano cadastrado.</p>}
          {byPlan.map(({ plan, count }) => (
            <div key={plan.id} className="plan-bar-row">
              <div className="plan-bar-label">
                <span className="plan-pick-dot" style={{ background: plan.color }} />
                <strong>{plan.name}</strong>
                <span className="text-xs text-muted">R$ {Number(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="plan-bar-track">
                <div className="plan-bar-fill" style={{ width: `${(count / maxCount) * 100}%`, background: plan.color }} />
              </div>
              <span className="plan-bar-count">{count}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="m-0 mb-1">Consumo agregado</h3>
          <div className="agg-grid">
            {([
              ['Usuarios', stats.totals.users, 'ti ti-users'],
              ['Conexoes', stats.totals.connections, 'ti ti-plug'],
              ['Contatos', stats.totals.contacts, 'ti ti-address-book'],
              ['Leads', stats.totals.leads, 'ti ti-target'],
            ] as const).map(([label, value, icon]) => (
              <div key={label} className="agg-item">
                <i className={icon} />
                <strong>{value.toLocaleString('pt-BR')}</strong>
                <span className="text-xs text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-2">
        <div className="flex justify-between items-center mb-1">
          <h3 className="m-0">Workspaces recentes</h3>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/admin/workspaces')}>
            <i className="ti ti-plus" /> Novo workspace
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Responsavel</th>
              <th>Plano</th>
              <th>Situacao</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.slice(-8).reverse().map((w) => {
              const st = STATUS_META[w.status] || STATUS_META.active;
              return (
                <tr key={w.id} className="clickable" onClick={() => navigate('/admin/workspaces')}>
                  <td><strong>{w.name}</strong></td>
                  <td>{w.ownerEmail || w.ownerName || '-'}</td>
                  <td>{plans.find((p) => p.id === w.planId)?.name || '-'}</td>
                  <td><span className={`badge bg-light-${st.cls} text-${st.cls}`}>{st.label}</span></td>
                  <td>{new Date(w.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
