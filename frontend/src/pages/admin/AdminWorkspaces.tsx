import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Modal, ConfirmDialog, EmptyState } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import * as saas from '../../services/saas';
import { FEATURE_GROUPS, LIMIT_META } from '../../types/saas';
import type { FeatureKey, LimitKey, SaasPlan, Workspace } from '../../types/saas';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: 'Ativo', cls: 'success' },
  trial: { label: 'Em teste', cls: 'primary' },
  suspended: { label: 'Suspenso', cls: 'warning' },
  canceled: { label: 'Cancelado', cls: 'danger' },
};

const emptyDraft = (planId: string): Partial<Workspace> => ({
  name: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  document: '',
  planId,
  status: 'trial',
  trialEndsAt: null,
  expiresAt: null,
  notes: '',
  featureOverrides: {},
  limitOverrides: {},
});

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className={`sw-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
      <span className="sw-knob" />
    </button>
  );
}

export default function AdminWorkspaces() {
  const { notify } = useToast();
  const { workspace: current, switchWorkspace } = useWorkspace();
  const [items, setItems] = useState<Workspace[]>([]);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Workspace>>({});
  const [tab, setTab] = useState<'dados' | 'plano' | 'ajustes'>('dados');
  const [delId, setDelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = () => {
    setItems(saas.listWorkspaces());
    setPlans(saas.listPlans());
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((w) =>
      [w.name, w.ownerName, w.ownerEmail, w.slug].some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }, [items, search]);

  const planName = (id: string) => plans.find((p) => p.id === id)?.name || '-';
  const planOf = (id: string) => plans.find((p) => p.id === id) || null;

  const openNew = () => {
    setDraft(emptyDraft(plans[0]?.id || ''));
    setTab('dados');
    setOpen(true);
  };

  const openEdit = (w: Workspace) => {
    setDraft(JSON.parse(JSON.stringify(w)));
    setTab('dados');
    setOpen(true);
  };

  const save = () => {
    if (!draft.name?.trim()) {
      notify('Informe o nome do workspace', 'warning');
      setTab('dados');
      return;
    }
    if (!draft.planId) {
      notify('Selecione um plano', 'warning');
      setTab('plano');
      return;
    }
    saas.saveWorkspace(draft as any);
    setOpen(false);
    load();
    notify(draft.id ? 'Workspace atualizado' : 'Workspace criado com area de dados propria');
  };

  const remove = () => {
    if (!delId) return;
    const res = saas.deleteWorkspace(delId);
    setDelId(null);
    if (!res.ok) {
      notify(res.error || 'Nao foi possivel excluir', 'error');
      return;
    }
    load();
    notify('Workspace excluido');
  };

  const draftPlan = planOf(draft.planId || '');

  return (
    <div className="page-shell">
      <PageHeader
        title="Workspaces"
        subtitle="Cada cliente opera em um espaco isolado, com seus proprios dados e credenciais"
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <i className="ti ti-plus" /> Novo workspace
          </button>
        }
      />

      <div className="card mb-2">
        <div className="input-icon">
          <i className="ti ti-search" />
          <input className="form-control" placeholder="Buscar por nome, responsavel ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="ti ti-building-store" title="Nenhum workspace encontrado" description="Crie um workspace para cada cliente da plataforma." action={<button className="btn btn-primary" onClick={openNew}>Criar workspace</button>} />
      ) : (
        <div className="ws-grid">
          {filtered.map((w) => {
            const usage = saas.workspaceUsage(w.id);
            const eff = saas.effectivePlan(w);
            const st = STATUS_META[w.status] || STATUS_META.active;
            const isCurrent = current?.id === w.id;
            const pct = (used: number, max: number) => (saas.isUnlimited(max) ? 8 : max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 100);
            return (
              <div key={w.id} className={`ws-card ${isCurrent ? 'current' : ''}`}>
                <div className="ws-card-head">
                  <div className="ws-avatar" style={{ background: planOf(w.planId)?.color || '#2172DB' }}>
                    {w.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ws-title">
                    <h3>{w.name}</h3>
                    <p className="text-xs text-muted">{w.ownerEmail || w.ownerName || w.slug}</p>
                  </div>
                  <span className={`badge bg-light-${st.cls} text-${st.cls}`}>{st.label}</span>
                </div>

                <div className="ws-plan-row">
                  <i className="ti ti-package" />
                  <strong>{planName(w.planId)}</strong>
                  {isCurrent && <span className="badge bg-light-primary text-primary">Voce esta aqui</span>}
                </div>

                <div className="ws-usage">
                  {([
                    ['Usuarios', usage.users, eff.limits.users, 'ti ti-users'],
                    ['Conexoes', usage.connections, eff.limits.connections, 'ti ti-plug'],
                    ['Contatos', usage.contacts, eff.limits.contacts, 'ti ti-address-book'],
                    ['Leads', usage.leads, eff.limits.leads, 'ti ti-target'],
                  ] as const).map(([label, used, max, icon]) => (
                    <div key={label} className="ws-usage-item">
                      <div className="flex justify-between text-xs">
                        <span><i className={icon} /> {label}</span>
                        <span className="text-muted">{used} / {saas.limitLabel(max)}</span>
                      </div>
                      <div className="progress-bar sm">
                        <div className="progress-fill" style={{ width: `${pct(used, max)}%`, background: pct(used, max) >= 100 ? 'var(--danger-hex)' : undefined }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="ws-card-foot">
                  <span className="text-xs text-muted">Criado em {new Date(w.createdAt).toLocaleDateString('pt-BR')}</span>
                  <div className="flex gap-1">
                    {!isCurrent && (
                      <button className="btn btn-sm btn-light-primary" onClick={() => switchWorkspace(w.id)} title="Entrar neste workspace">
                        <i className="ti ti-login-2" /> Acessar
                      </button>
                    )}
                    <button className="icon-btn sm" title="Editar" onClick={() => openEdit(w)}><i className="ti ti-pencil" /></button>
                    <button className="icon-btn sm danger" title="Excluir" onClick={() => setDelId(w.id)} disabled={w.id === saas.DEFAULT_WORKSPACE_ID}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? `Editar workspace: ${draft.name}` : 'Novo workspace'}
        subtitle="O cliente gerencia o negocio dele dentro deste espaco"
        size="lg"
        footer={
          <>
            <button className="btn btn-light-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}><i className="ti ti-device-floppy" /> Salvar</button>
          </>
        }
      >
        <div className="modal-tabs">
          {([
            ['dados', 'Dados', 'ti ti-building'],
            ['plano', 'Plano e assinatura', 'ti ti-package'],
            ['ajustes', 'Ajustes individuais', 'ti ti-adjustments'],
          ] as const).map(([k, label, icon]) => (
            <button key={k} className={`modal-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              <i className={icon} /> {label}
            </button>
          ))}
        </div>

        {tab === 'dados' && (
          <div className="form-grid-2">
            <div className="form-group span-2">
              <label>Nome do workspace / empresa *</label>
              <input className="form-control" value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: saas.slugify(e.target.value) })} placeholder="Ex.: Clinica Bem Estar" />
            </div>
            <div className="form-group">
              <label>Responsavel</label>
              <input className="form-control" value={draft.ownerName || ''} onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>E-mail de acesso</label>
              <input className="form-control" type="email" value={draft.ownerEmail || ''} onChange={(e) => setDraft({ ...draft, ownerEmail: e.target.value })} placeholder="cliente@empresa.com" />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input className="form-control" value={draft.ownerPhone || ''} onChange={(e) => setDraft({ ...draft, ownerPhone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>CNPJ / CPF</label>
              <input className="form-control" value={draft.document || ''} onChange={(e) => setDraft({ ...draft, document: e.target.value })} />
            </div>
            <div className="form-group span-2">
              <label>Observacoes internas</label>
              <textarea className="form-control" rows={2} value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
            {!draft.id && (
              <div className="alert-note span-2">
                <i className="ti ti-info-circle" /> Ao salvar, o workspace ganha uma base de dados propria e vazia, com o responsavel ja cadastrado como administrador.
              </div>
            )}
          </div>
        )}

        {tab === 'plano' && (
          <div className="form-grid-2">
            <div className="form-group span-2">
              <label>Plano contratado *</label>
              <div className="plan-pick-list">
                {plans.map((p) => (
                  <button key={p.id} type="button" className={`plan-pick ${draft.planId === p.id ? 'on' : ''}`} onClick={() => setDraft({ ...draft, planId: p.id })}>
                    <span className="plan-pick-dot" style={{ background: p.color }} />
                    <div className="plan-pick-text">
                      <strong>{p.name}</strong>
                      <p className="text-xs text-muted">
                        R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · {saas.limitLabel(p.limits.users)} usuarios · {saas.limitLabel(p.limits.connections)} conexoes
                      </p>
                    </div>
                    {draft.planId === p.id && <i className="ti ti-circle-check-filled" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Situacao</label>
              <select className="form-control" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}>
                <option value="trial">Em teste</option>
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
                <option value="canceled">Cancelado</option>
              </select>
            </div>
            <div className="form-group">
              <label>Vencimento da assinatura</label>
              <input className="form-control" type="date" value={(draft.expiresAt || '').slice(0, 10)} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value || null })} />
            </div>
            <div className="form-group span-2">
              <label>Fim do periodo de teste</label>
              <input className="form-control" type="date" value={(draft.trialEndsAt || '').slice(0, 10)} onChange={(e) => setDraft({ ...draft, trialEndsAt: e.target.value || null })} />
            </div>
            <div className="alert-note span-2">
              <i className="ti ti-alert-triangle" /> Workspaces suspensos ou cancelados perdem acesso a todos os modulos, mantendo apenas a visualizacao do dashboard.
            </div>
          </div>
        )}

        {tab === 'ajustes' && (
          <div>
            <p className="text-sm text-muted mb-1">
              Excecoes so para este cliente. O que ficar em <strong>Herdar do plano</strong> segue o plano {draftPlan ? `"${draftPlan.name}"` : 'selecionado'}.
            </p>

            <h4 className="feature-group-title">Recursos</h4>
            <div className="feature-grid">
              {FEATURE_GROUPS.flatMap((g) => g.items).map((f) => {
                const ov = (draft.featureOverrides || {}) as Record<string, boolean | undefined>;
                const has = Object.prototype.hasOwnProperty.call(ov, f.key);
                const planValue = draftPlan ? draftPlan.features[f.key as FeatureKey] : true;
                return (
                  <div key={f.key} className={`feature-item ${has ? 'overridden' : ''}`}>
                    <i className={f.icon} />
                    <div className="feature-text">
                      <strong>{f.label}</strong>
                      <p className="text-xs text-muted">{has ? 'Excecao ativa' : `Herdar do plano (${planValue ? 'liberado' : 'bloqueado'})`}</p>
                    </div>
                    {has ? (
                      <div className="flex gap-1 items-center">
                        <Toggle checked={!!ov[f.key]} onChange={(v) => setDraft({ ...draft, featureOverrides: { ...ov, [f.key]: v } as any })} />
                        <button className="icon-btn sm" title="Voltar a herdar do plano" onClick={() => {
                          const next = { ...ov };
                          delete next[f.key];
                          setDraft({ ...draft, featureOverrides: next as any });
                        }}><i className="ti ti-rotate" /></button>
                      </div>
                    ) : (
                      <button className="btn btn-sm btn-light-secondary" onClick={() => setDraft({ ...draft, featureOverrides: { ...ov, [f.key]: !planValue } as any })}>
                        Criar excecao
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <h4 className="feature-group-title mt-2">Limites</h4>
            <div className="limit-list">
              {LIMIT_META.map((l) => {
                const ov = (draft.limitOverrides || {}) as Record<string, number | undefined>;
                const has = Object.prototype.hasOwnProperty.call(ov, l.key);
                const planValue = draftPlan ? draftPlan.limits[l.key as LimitKey] : saas.UNLIMITED;
                return (
                  <div key={l.key} className="limit-row">
                    <div className="limit-info">
                      <i className={l.icon} />
                      <div>
                        <strong>{l.label}</strong>
                        <p className="text-xs text-muted">{has ? 'Excecao ativa' : `Herdar do plano (${saas.limitLabel(planValue, l.unit)})`}</p>
                      </div>
                    </div>
                    {has ? (
                      <div className="flex gap-1 items-center">
                        <input className="form-control" style={{ width: 120 }} type="number" value={ov[l.key] ?? 0} onChange={(e) => setDraft({ ...draft, limitOverrides: { ...ov, [l.key]: Number(e.target.value) || 0 } as any })} />
                        <button className="icon-btn sm" title="Voltar a herdar do plano" onClick={() => {
                          const next = { ...ov };
                          delete next[l.key];
                          setDraft({ ...draft, limitOverrides: next as any });
                        }}><i className="ti ti-rotate" /></button>
                      </div>
                    ) : (
                      <button className="btn btn-sm btn-light-secondary" onClick={() => setDraft({ ...draft, limitOverrides: { ...ov, [l.key]: planValue === saas.UNLIMITED ? 10 : planValue } as any })}>
                        Criar excecao
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-1">Use -1 para ilimitado e 0 para bloquear.</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={remove}
        title="Excluir workspace"
        message="Todos os dados deste workspace (contatos, conversas, leads, conexoes) serao apagados definitivamente."
      />
    </div>
  );
}
