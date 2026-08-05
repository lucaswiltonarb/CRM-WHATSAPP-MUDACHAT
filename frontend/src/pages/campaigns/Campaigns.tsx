import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import type { Campaign, CampaignStatus, Classification, Tag, User } from '../../types';
import { EmptyState, LoadingState, Modal, PageHeader } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  sending: 'Enviando',
  paused: 'Pausada',
  completed: 'Concluida',
  cancelled: 'Cancelada',
};
const STATUS_CLR: Record<CampaignStatus, string> = {
  draft: 'secondary',
  scheduled: 'warning',
  sending: 'primary',
  paused: 'warning',
  completed: 'success',
  cancelled: 'danger',
};
const AUD_LABEL: Record<string, string> = {
  manual: 'Lista manual',
  csv: 'Importar CSV',
  classification: 'Por classificacao',
  tag: 'Por tag',
  wallet: 'Por carteira',
  inactivity: 'Tempo sem conversa',
  origin: 'Por origem',
  funnel: 'Por funil',
  stage: 'Por etapa',
  previous_campaign: 'Campanha anterior',
  custom_field: 'Campo personalizado',
};

type AudienceCriteria = {
  tagIds?: string[];
  classificationIds?: string[];
  userIds?: string[];
  days?: number[];
  list?: string;
};

type CampaignForm = {
  name: string;
  message: string;
  audienceType: Campaign['audienceType'];
  audienceCriteria: AudienceCriteria;
  audienceCount?: number;
  status?: CampaignStatus;
  metrics?: Campaign['metrics'];
};

export default function Campaigns() {
  const { notify } = useToast();
  const [items, setItems] = useState<Campaign[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [classes, setClasses] = useState<Classification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [metrics, setMetrics] = useState<Campaign | null>(null);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>({
    name: '',
    message: '',
    audienceType: 'tag',
    audienceCriteria: { tagIds: [] },
  });
  const [fStatus, setFStatus] = useState('');
  const [fixedInactivity] = useState([
    { label: 'Sem atividade há 3 dias', days: 3 },
    { label: 'Sem atividade há 7 dias', days: 7 },
    { label: 'Sem atividade há 14 dias', days: 14 },
    { label: 'Sem atividade há 30 dias', days: 30 },
  ]);

  const load = () =>
    Promise.all([api.campaigns.list(), api.tags.list(), api.classifications.list(), api.settings.getUsers()]).then(([c, t, cl, u]) => {
      setItems(c);
      setTags(t);
      setClasses(cl);
      setUsers(u);
      setLoading(false);
    });
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', message: '', audienceType: 'tag', audienceCriteria: { tagIds: [] }, audienceCount: 0 });
    setFormOpen(true);
  };
  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name,
      message: c.message,
      audienceType: c.audienceType,
      audienceCriteria: (c.audienceCriteria || {}) as AudienceCriteria,
      audienceCount: c.audienceCount,
      status: c.status,
      metrics: c.metrics,
    });
    setFormOpen(true);
  };

  const estimateAudience = (type: Campaign['audienceType'], crit: AudienceCriteria) => {
    if (type === 'tag' && Array.isArray(crit.tagIds) && crit.tagIds.length) return crit.tagIds.length * 40;
    if (type === 'classification' && Array.isArray(crit.classificationIds) && crit.classificationIds.length) return crit.classificationIds.length * 30;
    if (type === 'wallet' && Array.isArray(crit.userIds) && crit.userIds.length) return crit.userIds.length * 25;
    if (type === 'inactivity' && Array.isArray(crit.days) && crit.days.length) return crit.days.length * 35;
    if (type === 'manual') return (crit.list || '').split(/[\n,;]/).filter((x: string) => x.trim()).length;
    return 0;
  };
  const audEstimate = useMemo(() => estimateAudience(form.audienceType, form.audienceCriteria || {}), [form.audienceType, form.audienceCriteria]);

  const toggleArray = (key: keyof AudienceCriteria, value: string | number) => {
    setForm((prev) => {
      const raw = prev.audienceCriteria?.[key];
      const arr: any[] = Array.isArray(raw) ? raw : [];
      const next = arr.includes(value as never) ? arr.filter((x: any) => x !== value) : [...arr, value];
      return { ...prev, audienceCriteria: { ...(prev.audienceCriteria || {}), [key]: next } };
    });
  };

  const save = async (action: 'draft' | 'send' | 'schedule') => {
    if (!form.name || !form.message) {
      notify('Informe nome e mensagem', 'warning');
      return;
    }
    const audienceCount = estimateAudience(form.audienceType, form.audienceCriteria || {});
    if (audienceCount === 0) {
      notify('Publico vazio - selecione destinatarios', 'warning');
      return;
    }
    const status: CampaignStatus = action === 'send' ? 'sending' : action === 'schedule' ? 'scheduled' : 'draft';
    const payload = {
      ...form,
      audienceCount,
      status,
      metrics: {
        total: audienceCount,
        sent: action === 'send' ? audienceCount : 0,
        delivered: 0,
        read: 0,
        replied: 0,
        failed: 0,
        leadsCreated: 0,
      },
    };
    if (editing) {
      const u = await api.campaigns.update(editing.id, payload);
      setItems((p) => p.map((c) => (c.id === editing.id ? u : c)));
    } else {
      const c = await api.campaigns.create(payload);
      setItems((p) => [c, ...p]);
      await api.audit.log(`Campanha ${action === 'send' ? 'enviada' : 'criada'}`, 'Campanhas', 'Campaign', c.id);
    }
    notify(action === 'send' ? 'Campanha em disparo!' : action === 'schedule' ? 'Campanha agendada' : 'Rascunho salvo');
    setFormOpen(false);
  };

  const duplicate = async (c: Campaign) => {
    const dup = await api.campaigns.create({ ...c, name: `${c.name} (copia)`, status: 'draft' });
    setItems((p) => [dup, ...p]);
    notify('Campanha duplicada');
  };
  const filtered = items.filter((c) => !fStatus || c.status === fStatus);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Campanhas"
        subtitle="Disparos em massa e comunicacao"
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <i className="ti ti-plus" /> Nova Campanha
          </button>
        }
      />

      <div className="toolbar">
        <select className="filter-select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="ti ti-speakerphone"
            title="Nenhuma campanha"
            description="Crie sua primeira campanha de disparo."
            action={
              <button className="btn btn-primary" onClick={openNew}>
                Criar campanha
              </button>
            }
          />
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((c) => (
            <div key={c.id} className="card camp-card">
              <div className="flex justify-between items-start mb-1">
                <h3 className="camp-title">{c.name}</h3>
                <span className={`badge bg-light-${STATUS_CLR[c.status]} text-${STATUS_CLR[c.status]}`}>{STATUS_LABEL[c.status]}</span>
              </div>
              <p className="camp-msg">{c.message}</p>
              <div className="camp-meta">
                <i className="ti ti-users" /> {AUD_LABEL[c.audienceType]} - {c.audienceCount || 0} destinatarios
              </div>
              <div className="camp-stats">
                <div>
                  <strong>{c.metrics.sent}</strong>
                  <span>Enviados</span>
                </div>
                <div>
                  <strong>{c.metrics.delivered}</strong>
                  <span>Entregues</span>
                </div>
                <div>
                  <strong>{c.metrics.read}</strong>
                  <span>Lidos</span>
                </div>
                <div>
                  <strong>{c.metrics.replied}</strong>
                  <span>Respostas</span>
                </div>
              </div>
              <div className="flex gap-1 mt-1">
                <button className="btn btn-sm btn-light-primary" onClick={() => setMetrics(c)}>
                  Metricas
                </button>
                <button className="btn btn-sm btn-light-secondary" onClick={() => openEdit(c)}>
                  Editar
                </button>
                <button className="btn btn-sm btn-light-secondary" onClick={() => duplicate(c)}>
                  Duplicar
                </button>
                {c.status === 'draft' && (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={async () => {
                      await api.campaigns.send(c.id);
                      load();
                      notify('Disparando...');
                    }}
                  >
                    Disparar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar Campanha' : 'Nova Campanha'}
        size="lg"
        footer={
          <>
            <button className="btn btn-light-secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-light-primary" onClick={() => save('draft')}>
              Salvar rascunho
            </button>
            <button className="btn btn-light-warning" onClick={() => save('schedule')}>
              Agendar
            </button>
            <button className="btn btn-primary" onClick={() => save('send')}>
              Disparar agora
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>
            Nome da Campanha <span className="req">*</span>
          </label>
          <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>
            Mensagem <span className="req">*</span>
          </label>
          <textarea rows={4} placeholder="Ola {{nome}}, temos uma novidade..." value={form.message || ''} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <p className="text-xs text-muted">
            Use variaveis: {'{{nome}}'}, {'{{empresa}}'}
          </p>
        </div>
        <div className="form-group">
          <label>Selecao de Publico</label>
          <select value={form.audienceType} onChange={(e) => setForm({ ...form, audienceType: e.target.value as Campaign['audienceType'], audienceCriteria: {} })}>
            {Object.entries(AUD_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {form.audienceType === 'tag' && (
          <div className="form-group">
            <label>Selecione etiquetas (multiplo)</label>
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => {
                const active = (form.audienceCriteria?.tagIds || []).includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`tag-select ${active ? 'on' : ''}`}
                    style={{ borderColor: t.color, color: active ? '#fff' : t.color, background: active ? t.color : 'transparent' }}
                    onClick={() => toggleArray('tagIds', t.id)}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {form.audienceType === 'classification' && (
          <div className="form-group">
            <label>Selecione classificacoes (multiplo)</label>
            <div className="flex flex-wrap gap-1">
              {classes.map((c) => {
                const active = (form.audienceCriteria?.classificationIds || []).includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`tag-select ${active ? 'on' : ''}`}
                    style={{ borderColor: c.color, color: active ? '#fff' : c.color, background: active ? c.color : 'transparent' }}
                    onClick={() => toggleArray('classificationIds', c.id)}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {form.audienceType === 'wallet' && (
          <div className="form-group">
            <label>Carteira (responsavel na conversa)</label>
            <div className="flex flex-wrap gap-1">
              {users.map((u) => {
                const active = (form.audienceCriteria?.userIds || []).includes(u.id);
                return (
                  <button key={u.id} type="button" className={`tag-select ${active ? 'on' : ''}`} onClick={() => toggleArray('userIds', u.id)}>
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {form.audienceType === 'inactivity' && (
          <div className="form-group">
            <label>Tempo sem atividade na conversa</label>
            <div className="flex flex-wrap gap-1">
              {fixedInactivity.map((x) => {
                const active = (form.audienceCriteria?.days || []).includes(x.days);
                return (
                  <button key={x.days} type="button" className={`tag-select ${active ? 'on' : ''}`} onClick={() => toggleArray('days', x.days)}>
                    {x.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {form.audienceType === 'manual' && (
          <div className="form-group">
            <label>Lista de numeros (um por linha)</label>
            <textarea rows={3} value={form.audienceCriteria?.list || ''} onChange={(e) => setForm({ ...form, audienceCriteria: { list: e.target.value } })} />
          </div>
        )}
        {form.audienceType === 'csv' && (
          <div className="upload-zone">
            <i className="ti ti-file-spreadsheet" />
            <p>Importar arquivo CSV de contatos</p>
            <input type="file" accept=".csv" />
          </div>
        )}
        <div className="alert-note mt-1">
          <i className="ti ti-info-circle" /> Publico estimado: <strong>{audEstimate}</strong> contatos. Verifique antes de disparar.
        </div>
      </Modal>

      {metrics && (
        <Modal open onClose={() => setMetrics(null)} title={`Metricas - ${metrics.name}`} size="md">
          <div className="metric-grid">
            {[
              ['Total', metrics.metrics.total, 'primary'],
              ['Enviados', metrics.metrics.sent, 'info'],
              ['Entregues', metrics.metrics.delivered, 'success'],
              ['Lidos', metrics.metrics.read, 'success'],
              ['Respondidos', metrics.metrics.replied, 'warning'],
              ['Falhas', metrics.metrics.failed, 'danger'],
              ['Leads criados', metrics.metrics.leadsCreated, 'primary'],
            ].map(([l, v, c]) => (
              <div key={l as string} className={`metric-box bg-light-${c}`}>
                <strong className={`text-${c}`}>{v as number}</strong>
                <span>{l as string}</span>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <span className="info-label">Taxa de resposta</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${metrics.metrics.sent ? (metrics.metrics.replied / metrics.metrics.sent) * 100 : 0}%` }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}