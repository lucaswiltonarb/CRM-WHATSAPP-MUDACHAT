import { useEffect, useState, type ReactNode } from 'react';
import { AGENT_AVATARS } from '../../assets/agentAvatars';

/* ------------------------------------------------------------------ *
 * Opcoes
 * ------------------------------------------------------------------ */

export const AI_MODELS = [
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 - rapido e economico' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5 - equilibrado' },
  { id: 'claude-opus-5', label: 'Opus 5 - maxima qualidade' },
];

export const SERVICE_TYPES = [
  { id: 'external', label: 'Cliente externo' },
  { id: 'internal', label: 'Time interno' },
  { id: 'support', label: 'Suporte tecnico' },
  { id: 'sales', label: 'Pre-venda / qualificacao' },
];

export const TONES = [
  { id: 'amigavel', label: 'Amigavel (cordial e proximo)' },
  { id: 'profissional', label: 'Profissional (neutro e objetivo)' },
  { id: 'formal', label: 'Formal (corporativo)' },
  { id: 'descontraido', label: 'Descontraido (informal)' },
];

const FOLLOWUP_TONES = [
  'Leve - "tudo certo?"',
  'Check-in - oferece ajuda',
  'Lembrete de valor - beneficio',
  'Ultima tentativa - saida digna',
];

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0];

const PROMPT_TEMPLATES: Record<string, string> = {
  Vendas: `Voce e um consultor de vendas atendendo {{nome}}.

Seu objetivo e entender a necessidade e conduzir para uma proposta.

Comportamento:
- Faca uma pergunta por vez
- Confirme o interesse antes de falar de preco
- Se pedir desconto ou condicao especial, transfira para humano`,
  Suporte: `Voce e um atendente de suporte ajudando {{nome}}.

Resolva duvidas com clareza e passo a passo.

Comportamento:
- Peca o detalhe que falta antes de sugerir solucao
- Nunca invente prazos ou politicas
- Se for problema tecnico sem solucao conhecida, transfira para humano`,
  Geral: `Voce e um atendente do CRM atendendo {{nome}}.

Seja cordial, prestativo e responda de forma clara e objetiva.

Comportamento:
- Saudacoes breves
- Respostas diretas, sem rodeios
- Se a duvida exigir decisao (precos, prazos, condicoes), transfira para humano`,
  Qualificacao: `Voce e responsavel por qualificar {{nome}} antes de passar para o time.

Descubra: necessidade, urgencia, orcamento e quem decide.

Comportamento:
- Uma pergunta por mensagem
- Nao venda, apenas entenda
- Ao completar a qualificacao, transfira para humano`,
};

const VARIABLES = ['{{nome}}', '{{telefone}}', '{{etapa}}', '{{tags}}'];

/* ------------------------------------------------------------------ *
 * Valor padrao
 * ------------------------------------------------------------------ */

export const emptyAgent = () => ({
  name: '',
  description: '',
  avatar: AGENT_AVATARS[0].id,
  responseMode: 'suggested' as 'suggested' | 'auto',
  serviceType: 'external',
  model: AI_MODELS[0].id,
  channels: [] as string[],
  humanize: { typing: false, delay: false, waitTyping: false },
  systemPrompt: PROMPT_TEMPLATES.Geral,
  tone: 'amigavel',
  maxWords: 100,
  temperature: 0.7,
  guidelines: '',
  contextMemory: 30,
  businessHours: { enabled: false, days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00', offHours: 'ai' },
  triggers: {
    newLead: false,
    keywords: { enabled: false, list: [] as string[] },
    inactiveHours: { enabled: false, value: 24 },
    operatorSilence: { enabled: false, value: 30 },
  },
  filters: { skipAssigned: false, excludedTags: [] as string[] },
  followUp: { enabled: false, steps: [] as { minutes: number; tone: string }[] },
  handoff: { keywords: [] as string[], maxReplies: 0, onFailure: 'transfer', message: '' },
});

/* ------------------------------------------------------------------ *
 * Pecas reutilizaveis
 * ------------------------------------------------------------------ */

function Section({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="af-section">
      <header className="af-section-head">
        <span className="af-section-icon"><i className={icon} /></span>
        <div>
          <strong>{title}</strong>
          <p>{subtitle}</p>
        </div>
      </header>
      <div className="af-section-body">{children}</div>
    </section>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className={`sw-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
      <span className="sw-knob" />
    </button>
  );
}

function ToggleRow({ checked, onChange, label, hint, children }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="af-toggle-block">
      <div className="af-toggle-row">
        <Toggle checked={checked} onChange={onChange} />
        <span className="af-toggle-label">{label}</span>
        {hint && <span className="af-toggle-hint">{hint}</span>}
      </div>
      {checked && children && <div className="af-toggle-child">{children}</div>}
    </div>
  );
}

function TagsInput({ value, onChange, placeholder, hint }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; hint?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div>
      <div className="af-tags">
        {value.map((t) => (
          <span key={t} className="af-tag">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`remover ${t}`}>
              <i className="ti ti-x" />
            </button>
          </span>
        ))}
        <input
          className="af-tags-input"
          value={draft}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
        />
      </div>
      {hint && <p className="af-hint">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Formulario
 * ------------------------------------------------------------------ */

export default function AgentForm({
  value,
  onChange,
  channels = [],
}: {
  value: any;
  onChange: (v: any) => void;
  channels?: { id: string; name: string; type?: string }[];
}) {
  const v = value || {};
  const set = (patch: any) => onChange({ ...v, ...patch });
  const setIn = (key: string, patch: any) => set({ [key]: { ...(v[key] || {}), ...patch } });

  // garante a forma completa mesmo em agentes antigos
  useEffect(() => {
    const base = emptyAgent();
    const missing: any = {};
    Object.keys(base).forEach((k) => {
      if (v[k] === undefined) missing[k] = (base as any)[k];
    });
    if (Object.keys(missing).length) onChange({ ...v, ...missing });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const humanize = v.humanize || {};
  const hours = v.businessHours || {};
  const triggers = v.triggers || {};
  const filters = v.filters || {};
  const followUp = v.followUp || {};
  const handoff = v.handoff || {};

  const toggleDay = (d: number) => {
    const list: number[] = hours.days || [];
    setIn('businessHours', { days: list.includes(d) ? list.filter((x) => x !== d) : [...list, d] });
  };

  const toggleChannel = (id: string) => {
    const list: string[] = v.channels || [];
    set({ channels: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  };

  const insertVar = (token: string) => set({ systemPrompt: `${v.systemPrompt || ''}${token}` });

  const addStep = () => {
    const steps = followUp.steps || [];
    const defaults = [60, 1440, 4320, 10080];
    setIn('followUp', {
      steps: [...steps, { minutes: defaults[steps.length] ?? 1440, tone: FOLLOWUP_TONES[Math.min(steps.length, FOLLOWUP_TONES.length - 1)] }],
    });
  };

  return (
    <div className="agent-form">
      {/* ---------------- Identidade ---------------- */}
      <Section icon="ti ti-user" title="Identidade" subtitle="Como o agente se chama e o que ele faz">
        <div className="form-group">
          <label>NOME DO AGENTE *</label>
          <input className="form-control" value={v.name || ''} onChange={(e) => set({ name: e.target.value })} placeholder="Ex: Atendente de Vendas" autoFocus />
        </div>
        <div className="form-group">
          <label>DESCRICAO (INTERNA)</label>
          <input className="form-control" value={v.description || ''} onChange={(e) => set({ description: e.target.value })} placeholder="Para que serve este agente" />
        </div>
        <div className="form-group">
          <label>AVATAR</label>
          <div className="avatar-picker">
            {AGENT_AVATARS.map((av) => (
              <button key={av.id} type="button" className={`avatar-option ${v.avatar === av.id ? 'on' : ''}`} onClick={() => set({ avatar: av.id })} title={av.label}>
                <img src={av.src} alt={av.label} />
                {v.avatar === av.id && <span className="avatar-check"><i className="ti ti-check" /></span>}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ---------------- Atuacao ---------------- */}
      <Section icon="ti ti-sparkles" title="Atuacao" subtitle="Onde e como o agente vai responder">
        <div className="form-group">
          <label>MODO DE RESPOSTA</label>
          <div className="af-mode-grid">
            <button type="button" className={`af-mode ${v.responseMode === 'suggested' ? 'on' : ''}`} onClick={() => set({ responseMode: 'suggested' })}>
              <i className="ti ti-circle-check" />
              <div>
                <strong>Sugerido</strong>
                <p>Operador revisa e aprova antes de enviar</p>
              </div>
            </button>
            <button type="button" className={`af-mode ${v.responseMode === 'auto' ? 'on' : ''}`} onClick={() => set({ responseMode: 'auto' })}>
              <i className="ti ti-bolt" />
              <div>
                <strong>Automatico</strong>
                <p>IA envia direto pro cliente sem aprovacao</p>
              </div>
            </button>
          </div>
        </div>
        <div className="af-grid-2">
          <div className="form-group">
            <label>TIPO DE ATENDIMENTO</label>
            <select className="form-control" value={v.serviceType || 'external'} onChange={(e) => set({ serviceType: e.target.value })}>
              {SERVICE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>MODELO DA IA</label>
            <select className="form-control" value={v.model || AI_MODELS[0].id} onChange={(e) => set({ model: e.target.value })}>
              {AI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>CANAIS</label>
          {channels.length === 0 ? (
            <p className="af-hint">Nenhuma conexao cadastrada ainda. Crie um canal em Conexoes para vincular o agente.</p>
          ) : (
            <div className="af-channels">
              {channels.map((c) => {
                const on = (v.channels || []).includes(c.id);
                return (
                  <button key={c.id} type="button" className={`af-channel ${on ? 'on' : ''}`} onClick={() => toggleChannel(c.id)}>
                    <span className="af-check">{on && <i className="ti ti-check" />}</span>
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      {/* ---------------- Humanizacao ---------------- */}
      <Section icon="ti ti-message-circle" title="Humanizacao" subtitle="Faz a IA parecer mais natural ao responder">
        <ToggleRow checked={!!humanize.typing} onChange={(x) => setIn('humanize', { typing: x })} label={'Mostrar "digitando..."'} hint="exibe indicador antes de enviar a mensagem" />
        <ToggleRow checked={!!humanize.delay} onChange={(x) => setIn('humanize', { delay: x })} label="Delay entre mensagens" hint="pausa entre mensagens consecutivas (quando a IA gera multiplas)" />
        <ToggleRow checked={!!humanize.waitTyping} onChange={(x) => setIn('humanize', { waitTyping: x })} label="Aguardar lead terminar de digitar" hint="junta mensagens em rajada e responde 1x so" />
      </Section>

      {/* ---------------- Comportamento ---------------- */}
      <Section icon="ti ti-adjustments" title="Comportamento" subtitle="Personalidade, prompt e tom de voz">
        <div className="form-group">
          <div className="af-label-row">
            <label>SYSTEM PROMPT *</label>
            <div className="af-templates">
              <span>Template:</span>
              {Object.keys(PROMPT_TEMPLATES).map((k) => (
                <button key={k} type="button" className="af-template-btn" onClick={() => set({ systemPrompt: PROMPT_TEMPLATES[k] })}>{k}</button>
              ))}
            </div>
          </div>
          <textarea className="form-control af-prompt" rows={8} value={v.systemPrompt || ''} onChange={(e) => set({ systemPrompt: e.target.value })} />
          <p className="af-hint"><i className="ti ti-bulb" /> Use variaveis para personalizar:</p>
          <div className="af-vars">
            {VARIABLES.map((t) => (
              <button key={t} type="button" className="af-var" onClick={() => insertVar(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="af-grid-3">
          <div className="form-group">
            <label>TOM DE VOZ</label>
            <select className="form-control" value={v.tone || 'amigavel'} onChange={(e) => set({ tone: e.target.value })}>
              {TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>MAX. PALAVRAS</label>
            <input className="form-control" type="number" min={10} value={v.maxWords ?? 100} onChange={(e) => set({ maxWords: Number(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>TEMPERATURA</label>
            <input className="form-control" type="number" min={0} max={1} step="0.1" value={v.temperature ?? 0.7} onChange={(e) => set({ temperature: Number(e.target.value) })} />
            <p className="af-hint">0=previsivel · 1=criativo</p>
          </div>
        </div>
        <div className="form-group">
          <label>DIRETRIZES ADICIONAIS (OPCIONAL)</label>
          <textarea className="form-control" rows={2} value={v.guidelines || ''} onChange={(e) => set({ guidelines: e.target.value })} placeholder="Ex: Foco em planos premium. Nao dar desconto sem aprovacao." />
        </div>
        <div className="form-group">
          <label>MEMORIA DE CONTEXTO <span className="af-label-soft">(ultimas N mensagens enviadas pra IA)</span></label>
          <input className="form-control af-narrow" type="number" min={1} value={v.contextMemory ?? 30} onChange={(e) => set({ contextMemory: Number(e.target.value) || 1 })} />
          <p className="af-hint">Quantas mensagens passadas a IA recebe pra entender o contexto. Padrao: 30. Aumente (40-50) se a conversa e longa e a IA esta repetindo perguntas.</p>
        </div>
      </Section>

      {/* ---------------- Disponibilidade ---------------- */}
      <Section icon="ti ti-clock" title="Disponibilidade" subtitle="Quando o agente deve responder">
        <ToggleRow
          checked={!!hours.enabled}
          onChange={(x) => setIn('businessHours', { enabled: x })}
          label="Limitar a horario comercial"
          hint="(fora desse horario, encaminha pra humano)"
        >
          <div className="form-group">
            <label>DIAS ATIVOS</label>
            <div className="af-days">
              {DAYS.map((d, i) => {
                const val = DAY_VALUES[i];
                const on = (hours.days || []).includes(val);
                return (
                  <button key={d} type="button" className={`af-day ${on ? 'on' : ''}`} onClick={() => toggleDay(val)}>{d}</button>
                );
              })}
            </div>
          </div>
          <div className="af-grid-2">
            <div className="form-group">
              <label>INICIO</label>
              <input className="form-control" type="time" value={hours.start || '09:00'} onChange={(e) => setIn('businessHours', { start: e.target.value })} />
            </div>
            <div className="form-group">
              <label>FIM</label>
              <input className="form-control" type="time" value={hours.end || '18:00'} onChange={(e) => setIn('businessHours', { end: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>FORA DO HORARIO</label>
            <select className="form-control" value={hours.offHours || 'ai'} onChange={(e) => setIn('businessHours', { offHours: e.target.value })}>
              <option value="ai">IA assume (atende fora do horario humano)</option>
              <option value="silent">Silencio (nao responde)</option>
            </select>
            <p className="af-hint">No primeiro caso a IA cobre o expediente; no segundo, fica em silencio.</p>
          </div>
        </ToggleRow>
      </Section>

      {/* ---------------- Quando ativar ---------------- */}
      <Section icon="ti ti-bolt" title="Quando ativar" subtitle="Defina exatamente quando a IA deve responder">
        <ToggleRow checked={!!triggers.newLead} onChange={(x) => setIn('triggers', { newLead: x })} label="Lead novo" hint="responde quando lead e criado / primeira mensagem" />

        <ToggleRow
          checked={!!triggers.keywords?.enabled}
          onChange={(x) => setIn('triggers', { keywords: { ...(triggers.keywords || {}), enabled: x, list: triggers.keywords?.list || [] } })}
          label="Palavras-chave"
          hint="ativa so quando o lead disser uma destas palavras"
        >
          <TagsInput
            value={triggers.keywords?.list || []}
            onChange={(list) => setIn('triggers', { keywords: { ...(triggers.keywords || {}), list } })}
            placeholder="Ex: orcamento, preco, info..."
            hint="Enter para adicionar. Match parcial (case-insensitive)."
          />
        </ToggleRow>

        <ToggleRow
          checked={!!triggers.inactiveHours?.enabled}
          onChange={(x) => setIn('triggers', { inactiveHours: { ...(triggers.inactiveHours || {}), enabled: x } })}
          label="Lead inativo ha X horas"
          hint="operador nao responde ha tempo, IA assume"
        >
          <input className="form-control af-narrow" type="number" min={1} value={triggers.inactiveHours?.value ?? 24} onChange={(e) => setIn('triggers', { inactiveHours: { ...(triggers.inactiveHours || {}), value: Number(e.target.value) || 1 } })} />
          <p className="af-hint">Horas sem resposta humana antes da IA assumir.</p>
        </ToggleRow>

        <ToggleRow
          checked={!!triggers.operatorSilence?.enabled}
          onChange={(x) => setIn('triggers', { operatorSilence: { ...(triggers.operatorSilence || {}), enabled: x } })}
          label="Silencio do operador (min)"
          hint="operador parou de responder ha X min, IA assume"
        >
          <input className="form-control af-narrow" type="number" min={1} value={triggers.operatorSilence?.value ?? 30} onChange={(e) => setIn('triggers', { operatorSilence: { ...(triggers.operatorSilence || {}), value: Number(e.target.value) || 1 } })} />
          <p className="af-hint">Minutos de silencio do operador antes da IA cobrir.</p>
        </ToggleRow>
      </Section>

      {/* ---------------- Filtros ---------------- */}
      <Section icon="ti ti-filter" title="Filtros (nao atender)" subtitle="Quando NAO ativar mesmo se um gatilho bater">
        <ToggleRow checked={!!filters.skipAssigned} onChange={(x) => setIn('filters', { skipAssigned: x })} label="Nao atender lead ja atribuido" hint="se tem operador responsavel, IA fica fora" />
        <div className="form-group">
          <label>TAGS EXCLUIDAS</label>
          <TagsInput
            value={filters.excludedTags || []}
            onChange={(excludedTags) => setIn('filters', { excludedTags })}
            placeholder="Ex: vip, ja-cliente..."
            hint="Leads com qualquer destas tags sao ignorados pela IA."
          />
        </div>
      </Section>

      {/* ---------------- Follow-up ---------------- */}
      <Section icon="ti ti-clock-play" title="Follow-up automatico" subtitle="Reabordagens quando o lead nao responde">
        <ToggleRow
          checked={!!followUp.enabled}
          onChange={(x) => {
            setIn('followUp', { enabled: x, steps: x && !(followUp.steps || []).length ? [{ minutes: 60, tone: FOLLOWUP_TONES[0] }] : followUp.steps || [] });
          }}
          label="Ativar follow-up"
          hint="a IA reaborda se o lead silenciar"
        >
          <div className="af-steps">
            {(followUp.steps || []).map((st: any, i: number) => (
              <div key={i} className="af-step">
                <span className="af-step-num">#{i + 1}</span>
                <div className="form-group">
                  <label>APOS</label>
                  <div className="af-step-after">
                    <input
                      className="form-control"
                      type="number"
                      min={1}
                      value={st.minutes}
                      onChange={(e) => {
                        const steps = [...(followUp.steps || [])];
                        steps[i] = { ...steps[i], minutes: Number(e.target.value) || 1 };
                        setIn('followUp', { steps });
                      }}
                    />
                    <span>min</span>
                  </div>
                </div>
                <div className="form-group af-step-tone">
                  <label>TOM</label>
                  <select
                    className="form-control"
                    value={st.tone}
                    onChange={(e) => {
                      const steps = [...(followUp.steps || [])];
                      steps[i] = { ...steps[i], tone: e.target.value };
                      setIn('followUp', { steps });
                    }}
                  >
                    {FOLLOWUP_TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <button type="button" className="af-step-del" onClick={() => setIn('followUp', { steps: (followUp.steps || []).filter((_: any, j: number) => j !== i) })} aria-label="remover passo">
                  <i className="ti ti-x" />
                </button>
              </div>
            ))}
            <button type="button" className="af-add-step" onClick={addStep}>+ Adicionar passo</button>
            <p className="af-warn"><i className="ti ti-alert-triangle" /> Follow-ups sao cancelados automaticamente quando o lead responde, quando voce assume manualmente, ou se o agente ficar inativo.</p>
          </div>
        </ToggleRow>
      </Section>

      {/* ---------------- Handoff ---------------- */}
      <Section icon="ti ti-arrow-down" title="Transferencia para humano" subtitle="Quando o agente deve passar pra um operador">
        <div className="form-group">
          <label>PALAVRAS-CHAVE QUE ATIVAM HANDOFF</label>
          <TagsInput
            value={handoff.keywords || []}
            onChange={(keywords) => setIn('handoff', { keywords })}
            placeholder="Ex: humano, atendente, falar com pessoa..."
            hint="Pressione Enter para adicionar. Se a mensagem do cliente contiver alguma palavra, transfere pra humano imediatamente."
          />
        </div>
        <div className="af-grid-2">
          <div className="form-group">
            <label>MAX. RESPOSTAS POR CONVERSA</label>
            <input className="form-control" type="number" min={0} value={handoff.maxReplies ?? 0} onChange={(e) => setIn('handoff', { maxReplies: Number(e.target.value) || 0 })} />
            <p className="af-hint">0 = sem limite. Apos este numero, transfere pra humano.</p>
          </div>
          <div className="form-group">
            <label>QUANDO IA FALHAR</label>
            <select className="form-control" value={handoff.onFailure || 'transfer'} onChange={(e) => setIn('handoff', { onFailure: e.target.value })}>
              <option value="transfer">Transferir para humano</option>
              <option value="retry">Tentar novamente</option>
              <option value="silent">Ficar em silencio</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>MENSAGEM DE FALLBACK / HANDOFF</label>
          <textarea className="form-control" rows={2} value={handoff.message || ''} onChange={(e) => setIn('handoff', { message: e.target.value })} placeholder="Ex: Vou transferir voce para um atendente humano. Aguarde um momento." />
        </div>
      </Section>
    </div>
  );
}
