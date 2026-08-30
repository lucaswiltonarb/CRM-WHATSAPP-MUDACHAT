import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Modal, ConfirmDialog, EmptyState } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import * as saas from '../../services/saas';
import { CONNECTION_TYPES, FEATURE_GROUPS, LIMIT_META } from '../../types/saas';
import type { ConnectionType, FeatureKey, LimitKey, SaasPlan } from '../../types/saas';

const PERIOD_LABEL: Record<string, string> = { monthly: '/mes', quarterly: '/trimestre', yearly: '/ano' };

const emptyDraft = (): Partial<SaasPlan> => ({
  name: '',
  description: '',
  price: 0,
  billingPeriod: 'monthly',
  trialDays: 7,
  color: '#2172DB',
  highlight: false,
  status: 'active',
  limits: saas.allLimits(0),
  features: saas.allFeatures(false),
  connectionTypes: ['whatsapp_evolution'],
});

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`sw-toggle ${checked ? 'on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className="sw-knob" />
    </button>
  );
}

/** campo de limite: bloqueado / ilimitado / numero */
function LimitField({ value, onChange, unit }: { value: number; onChange: (v: number) => void; unit?: string }) {
  const mode = value === saas.UNLIMITED ? 'unlimited' : value === 0 ? 'blocked' : 'custom';
  return (
    <div className="limit-field">
      <div className="limit-modes">
        <button type="button" className={`limit-mode ${mode === 'blocked' ? 'active' : ''}`} onClick={() => onChange(0)}>
          Bloqueado
        </button>
        <button type="button" className={`limit-mode ${mode === 'custom' ? 'active' : ''}`} onClick={() => onChange(value > 0 ? value : 10)}>
          Limitado
        </button>
        <button type="button" className={`limit-mode ${mode === 'unlimited' ? 'active' : ''}`} onClick={() => onChange(saas.UNLIMITED)}>
          Ilimitado
        </button>
      </div>
      {mode === 'custom' && (
        <div className="limit-input">
          <input
            className="form-control"
            type="number"
            min={1}
            value={value}
            onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
          />
          {unit && <span className="limit-unit">{unit}</span>}
        </div>
      )}
    </div>
  );
}

export default function AdminPlans() {
  const { notify } = useToast();
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<SaasPlan>>(emptyDraft());
  const [tab, setTab] = useState<'geral' | 'limites' | 'recursos' | 'canais'>('geral');
  const [delId, setDelId] = useState<string | null>(null);

  const load = () => setPlans(saas.listPlans());
  useEffect(load, []);

  const usageByPlan = useMemo(() => {
    const map: Record<string, number> = {};
    saas.listWorkspaces().forEach((w) => {
      map[w.planId] = (map[w.planId] || 0) + 1;
    });
    return map;
  }, [plans]);

  const openNew = () => {
    setDraft(emptyDraft());
    setTab('geral');
    setOpen(true);
  };

  const openEdit = (p: SaasPlan) => {
    setDraft(JSON.parse(JSON.stringify(p)));
    setTab('geral');
    setOpen(true);
  };

  const setLimit = (key: LimitKey, value: number) =>
    setDraft((d) => ({ ...d, limits: { ...(d.limits as any), [key]: value } }));

  const setFeature = (key: FeatureKey, value: boolean) =>
    setDraft((d) => ({ ...d, features: { ...(d.features as any), [key]: value } }));

  const toggleConn = (key: ConnectionType) =>
    setDraft((d) => {
      const list = d.connectionTypes || [];
      return { ...d, connectionTypes: list.includes(key) ? list.filter((c) => c !== key) : [...list, key] };
    });

  const save = () => {
    if (!draft.name?.trim()) {
      notify('Informe o nome do plano', 'warning');
      setTab('geral');
      return;
    }
    saas.savePlan(draft as any);
    setOpen(false);
    load();
    notify(draft.id ? 'Plano atualizado' : 'Plano criado');
  };

  const remove = () => {
    if (!delId) return;
    const res = saas.deletePlan(delId);
    setDelId(null);
    if (!res.ok) {
      notify(res.error || 'Nao foi possivel excluir', 'error');
      return;
    }
    load();
    notify('Plano excluido');
  };

  const duplicate = (id: string) => {
    saas.duplicatePlan(id);
    load();
    notify('Plano duplicado');
  };

  const enabledFeatures = (p: SaasPlan) => Object.values(p.features).filter(Boolean).length;
  const totalFeatures = Object.keys(saas.allFeatures(true)).length;

  return (
    <div className="page-shell">
      <PageHeader
        title="Planos"
        subtitle="Defina precos, limites e quais recursos cada plano libera"
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <i className="ti ti-plus" /> Novo plano
          </button>
        }
      />

      {plans.length === 0 ? (
        <EmptyState icon="ti ti-package" title="Nenhum plano cadastrado" description="Crie o primeiro plano para comecar a vender." action={<button className="btn btn-primary" onClick={openNew}>Criar plano</button>} />
      ) : (
        <div className="plan-grid">
          {plans.map((p) => (
            <div key={p.id} className={`plan-card ${p.highlight ? 'highlight' : ''} ${p.status === 'archived' ? 'archived' : ''}`}>
              <div className="plan-card-top" style={{ background: p.color }} />
              <div className="plan-card-body">
                <div className="plan-card-head">
                  <div>
                    <h3>{p.name}</h3>
                    <p className="text-xs text-muted">{p.description || 'Sem descricao'}</p>
                  </div>
                  {p.highlight && <span className="badge bg-light-primary text-primary">Destaque</span>}
                </div>

                <div className="plan-price-row">
                  <span className="plan-price-value">R$ {Number(p.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className="plan-price-period">{PERIOD_LABEL[p.billingPeriod]}</span>
                </div>
                {p.trialDays > 0 && <p className="text-xs text-muted">{p.trialDays} dias de teste gratis</p>}

                <div className="plan-chips">
                  <span className="plan-chip"><i className="ti ti-users" /> {saas.limitLabel(p.limits.users)} usuarios</span>
                  <span className="plan-chip"><i className="ti ti-plug" /> {saas.limitLabel(p.limits.connections)} conexoes</span>
                  <span className="plan-chip"><i className="ti ti-target" /> {saas.limitLabel(p.limits.leads)} leads</span>
                </div>

                <div className="plan-meter">
                  <div className="flex justify-between text-xs text-muted">
                    <span>Recursos liberados</span>
                    <span>{enabledFeatures(p)}/{totalFeatures}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(enabledFeatures(p) / totalFeatures) * 100}%`, background: p.color }} />
                  </div>
                </div>

                <div className="plan-conn-types">
                  {p.connectionTypes.length === 0 && <span className="text-xs text-muted">Nenhum canal liberado</span>}
                  {p.connectionTypes.map((c) => {
                    const meta = CONNECTION_TYPES.find((t) => t.key === c);
                    return meta ? <i key={c} className={meta.icon} title={meta.label} style={{ color: meta.color }} /> : null;
                  })}
                </div>

                <div className="plan-card-foot">
                  <span className="text-xs text-muted">{usageByPlan[p.id] || 0} workspace(s)</span>
                  <div className="flex gap-1">
                    <button className="icon-btn sm" title="Duplicar" onClick={() => duplicate(p.id)}><i className="ti ti-copy" /></button>
                    <button className="icon-btn sm" title="Editar" onClick={() => openEdit(p)}><i className="ti ti-pencil" /></button>
                    <button className="icon-btn sm danger" title="Excluir" onClick={() => setDelId(p.id)}><i className="ti ti-trash" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? `Editar plano: ${draft.name}` : 'Novo plano'}
        subtitle="Tudo que o plano libera e limita e definido aqui"
        size="xl"
        footer={
          <>
            <button className="btn btn-light-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}><i className="ti ti-device-floppy" /> Salvar plano</button>
          </>
        }
      >
        <div className="modal-tabs">
          {([
            ['geral', 'Geral', 'ti ti-info-circle'],
            ['limites', 'Limites', 'ti ti-gauge'],
            ['recursos', 'Recursos', 'ti ti-toggle-right'],
            ['canais', 'Canais', 'ti ti-plug'],
          ] as const).map(([k, label, icon]) => (
            <button key={k} className={`modal-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              <i className={icon} /> {label}
            </button>
          ))}
        </div>

        {tab === 'geral' && (
          <div className="form-grid-2">
            <div className="form-group">
              <label>Nome do plano *</label>
              <input className="form-control" value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Profissional" />
            </div>
            <div className="form-group">
              <label>Cor de identificacao</label>
              <div className="color-row">
                <input type="color" className="color-input" value={draft.color || '#2172DB'} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
                <input className="form-control" value={draft.color || ''} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
              </div>
            </div>
            <div className="form-group span-2">
              <label>Descricao</label>
              <input className="form-control" value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Para quem este plano foi feito" />
            </div>
            <div className="form-group">
              <label>Preco (R$)</label>
              <input className="form-control" type="number" min={0} step="0.01" value={draft.price ?? 0} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Cobranca</label>
              <select className="form-control" value={draft.billingPeriod} onChange={(e) => setDraft({ ...draft, billingPeriod: e.target.value as any })}>
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div className="form-group">
              <label>Dias de teste gratis</label>
              <input className="form-control" type="number" min={0} value={draft.trialDays ?? 0} onChange={(e) => setDraft({ ...draft, trialDays: Number(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Situacao</label>
              <select className="form-control" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}>
                <option value="active">Ativo (disponivel para venda)</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>
            <div className="toggle-row span-2">
              <div>
                <strong>Marcar como plano em destaque</strong>
                <p className="text-xs text-muted">Aparece com selo de destaque na listagem</p>
              </div>
              <Toggle checked={!!draft.highlight} onChange={(v) => setDraft({ ...draft, highlight: v })} />
            </div>
          </div>
        )}

        {tab === 'limites' && (
          <div>
            <div className="bulk-row">
              <span className="text-xs text-muted">Aplicar a todos:</span>
              <button className="btn btn-sm btn-light-secondary" onClick={() => setDraft({ ...draft, limits: saas.allLimits(0) })}>Bloquear tudo</button>
              <button className="btn btn-sm btn-light-primary" onClick={() => setDraft({ ...draft, limits: saas.allLimits(saas.UNLIMITED) })}>Tudo ilimitado</button>
            </div>
            <div className="limit-list">
              {LIMIT_META.map((l) => (
                <div key={l.key} className="limit-row">
                  <div className="limit-info">
                    <i className={l.icon} />
                    <div>
                      <strong>{l.label}</strong>
                      <p className="text-xs text-muted">{l.description}</p>
                    </div>
                  </div>
                  <LimitField value={(draft.limits as any)?.[l.key] ?? 0} onChange={(v) => setLimit(l.key, v)} unit={l.unit} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'recursos' && (
          <div>
            <div className="bulk-row">
              <span className="text-xs text-muted">Aplicar a todos:</span>
              <button className="btn btn-sm btn-light-secondary" onClick={() => setDraft({ ...draft, features: saas.allFeatures(false) })}>Desligar tudo</button>
              <button className="btn btn-sm btn-light-primary" onClick={() => setDraft({ ...draft, features: saas.allFeatures(true) })}>Ligar tudo</button>
            </div>
            {FEATURE_GROUPS.map((g) => (
              <div key={g.title} className="feature-group">
                <h4 className="feature-group-title">{g.title}</h4>
                <div className="feature-grid">
                  {g.items.map((f) => (
                    <div key={f.key} className={`feature-item ${(draft.features as any)?.[f.key] ? 'on' : ''}`}>
                      <i className={f.icon} />
                      <div className="feature-text">
                        <strong>{f.label}</strong>
                        <p className="text-xs text-muted">{f.description}</p>
                      </div>
                      <Toggle checked={!!(draft.features as any)?.[f.key]} onChange={(v) => setFeature(f.key, v)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'canais' && (
          <div>
            <p className="text-sm text-muted mb-1">Selecione quais tipos de conexao os clientes deste plano podem cadastrar.</p>
            <div className="feature-grid">
              {CONNECTION_TYPES.map((c) => {
                const active = (draft.connectionTypes || []).includes(c.key);
                return (
                  <button key={c.key} type="button" className={`conn-pick ${active ? 'on' : ''}`} onClick={() => toggleConn(c.key)}>
                    <i className={c.icon} style={{ color: c.color }} />
                    <span>{c.label}</span>
                    <i className={active ? 'ti ti-circle-check-filled check' : 'ti ti-circle check off'} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={remove}
        title="Excluir plano"
        message="Esta acao nao pode ser desfeita. Planos em uso por workspaces nao podem ser excluidos."
      />
    </div>
  );
}
