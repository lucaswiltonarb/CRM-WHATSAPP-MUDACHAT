import { useEffect, useState } from 'react';
import { PageHeader, EmptyState } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { useWorkspace, applyTheme } from '../../contexts/WorkspaceContext';
import { DEFAULT_THEME } from '../../types/saas';
import type { WorkspaceTheme } from '../../types/saas';

const PRESETS: { name: string; theme: Partial<WorkspaceTheme> }[] = [
  { name: 'Padrao', theme: { primary: '#2172DB', success: '#34B478', sidebarBg: '#0F1A2E', sidebarMode: 'dark', bodyBg: '#EEF2F5', headerBg: '#FFFFFF' } },
  { name: 'Esmeralda', theme: { primary: '#059669', success: '#10B981', sidebarBg: '#052E2B', sidebarMode: 'dark', bodyBg: '#ECFDF5', headerBg: '#FFFFFF' } },
  { name: 'Violeta', theme: { primary: '#7C3AED', success: '#22C55E', sidebarBg: '#1E1B3A', sidebarMode: 'dark', bodyBg: '#F5F3FF', headerBg: '#FFFFFF' } },
  { name: 'Coral', theme: { primary: '#F43F5E', success: '#34B478', sidebarBg: '#2B1220', sidebarMode: 'dark', bodyBg: '#FFF1F2', headerBg: '#FFFFFF' } },
  { name: 'Ambar', theme: { primary: '#D97706', success: '#65A30D', sidebarBg: '#2A1C08', sidebarMode: 'dark', bodyBg: '#FFFBEB', headerBg: '#FFFFFF' } },
  { name: 'Grafite claro', theme: { primary: '#0F172A', success: '#34B478', sidebarBg: '#F8FAFC', sidebarMode: 'light', bodyBg: '#F1F5F9', headerBg: '#FFFFFF' } },
];

function ColorField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="color-row">
        <input type="color" className="color-input" value={value} onChange={(e) => onChange(e.target.value)} />
        <input className="form-control" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function AppearanceSettings() {
  const { notify } = useToast();
  const { theme, saveTheme, can, workspace } = useWorkspace();
  const [draft, setDraft] = useState<WorkspaceTheme>(theme);
  const allowed = can('customTheme');
  const whiteLabel = can('whiteLabel');

  useEffect(() => setDraft(theme), [theme]);

  // pre-visualizacao ao vivo
  useEffect(() => {
    if (allowed) applyTheme(draft);
  }, [draft, allowed]);

  // ao sair sem salvar, volta ao tema persistido
  useEffect(() => () => applyTheme(theme), [theme]);

  if (!allowed) {
    return (
      <div className="page-shell">
        <PageHeader title="Aparencia" subtitle="Personalize as cores da plataforma" />
        <EmptyState
          icon="ti ti-lock"
          title="Recurso nao disponivel no seu plano"
          description="A personalizacao de cores esta bloqueada para o plano atual. Fale com o administrador para liberar."
        />
      </div>
    );
  }

  const set = (patch: Partial<WorkspaceTheme>) => setDraft((d) => ({ ...d, ...patch }));

  const onSave = () => {
    saveTheme(draft);
    notify('Aparencia atualizada');
  };

  const onReset = () => {
    setDraft({ ...DEFAULT_THEME });
    notify('Cores restauradas para o padrao (lembre de salvar)', 'warning');
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Aparencia"
        subtitle={`Cores e identidade visual de ${workspace?.name || 'seu workspace'}`}
        actions={
          <>
            <button className="btn btn-light-secondary" onClick={onReset}><i className="ti ti-rotate" /> Restaurar padrao</button>
            <button className="btn btn-primary" onClick={onSave}><i className="ti ti-device-floppy" /> Salvar aparencia</button>
          </>
        }
      />

      <div className="alert-note mb-2">
        <i className="ti ti-eye" /> As mudancas aparecem na hora em toda a plataforma. Elas so ficam salvas ao clicar em <strong>Salvar aparencia</strong>.
      </div>

      <h3 className="section-title">Temas prontos</h3>
      <div className="preset-grid">
        {PRESETS.map((p) => (
          <button key={p.name} type="button" className="preset-card" onClick={() => set(p.theme)}>
            <div className="preset-swatches">
              <span style={{ background: p.theme.sidebarBg }} />
              <span style={{ background: p.theme.primary }} />
              <span style={{ background: p.theme.success }} />
              <span style={{ background: p.theme.bodyBg, border: '1px solid var(--border-color)' }} />
            </div>
            <strong>{p.name}</strong>
          </button>
        ))}
      </div>

      <div className="appearance-cols">
        <div>
          <h3 className="section-title">Cores da marca</h3>
          <div className="card">
            <div className="form-grid-2">
              <ColorField label="Cor principal" hint="Botoes, links, itens ativos e graficos" value={draft.primary} onChange={(v) => set({ primary: v })} />
              <ColorField label="Cor secundaria" value={draft.secondary} onChange={(v) => set({ secondary: v })} />
              <ColorField label="Sucesso" value={draft.success} onChange={(v) => set({ success: v })} />
              <ColorField label="Alerta" value={draft.warning} onChange={(v) => set({ warning: v })} />
              <ColorField label="Erro" value={draft.danger} onChange={(v) => set({ danger: v })} />
            </div>
          </div>

          <h3 className="section-title mt-2">Layout</h3>
          <div className="card">
            <div className="form-grid-2">
              <div className="form-group">
                <label>Estilo do menu lateral</label>
                <div className="btn-group-toggle">
                  <button type="button" className={`btn btn-sm ${draft.sidebarMode === 'dark' ? 'btn-primary' : 'btn-light-secondary'}`} onClick={() => set({ sidebarMode: 'dark', sidebarBg: draft.sidebarMode === 'dark' ? draft.sidebarBg : '#0F1A2E' })}>
                    <i className="ti ti-moon" /> Escuro
                  </button>
                  <button type="button" className={`btn btn-sm ${draft.sidebarMode === 'light' ? 'btn-primary' : 'btn-light-secondary'}`} onClick={() => set({ sidebarMode: 'light', sidebarBg: draft.sidebarMode === 'light' ? draft.sidebarBg : '#F8FAFC' })}>
                    <i className="ti ti-sun" /> Claro
                  </button>
                </div>
              </div>
              <ColorField label="Fundo do menu lateral" value={draft.sidebarBg} onChange={(v) => set({ sidebarBg: v })} />
              <ColorField label="Fundo do cabecalho" value={draft.headerBg} onChange={(v) => set({ headerBg: v })} />
              <ColorField label="Fundo das paginas" value={draft.bodyBg} onChange={(v) => set({ bodyBg: v })} />
              <div className="form-group span-2">
                <label>Arredondamento dos cantos: {draft.radius}px</label>
                <input type="range" min={0} max={24} value={draft.radius} onChange={(e) => set({ radius: Number(e.target.value) })} className="range-input" />
              </div>
            </div>
          </div>

          <h3 className="section-title mt-2">Identidade</h3>
          <div className="card">
            <div className="form-grid-2">
              <div className="form-group">
                <label>Nome exibido na plataforma</label>
                <input className="form-control" value={draft.brandName} disabled={!whiteLabel} onChange={(e) => set({ brandName: e.target.value })} />
                {!whiteLabel && <p className="text-xs text-muted">Disponivel apenas em planos com white label.</p>}
              </div>
              <div className="form-group">
                <label>URL do logo</label>
                <input className="form-control" value={draft.logoUrl} disabled={!whiteLabel} placeholder="https://..." onChange={(e) => set({ logoUrl: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="section-title">Pre-visualizacao</h3>
          <div className="theme-preview" style={{ background: draft.bodyBg, borderRadius: draft.radius }}>
            <div className="tp-sidebar" style={{ background: draft.sidebarBg }}>
              <div className="tp-brand">
                <span className="tp-logo" style={{ background: draft.primary }}>
                  {draft.logoUrl ? <img src={draft.logoUrl} alt="" /> : <i className="ti ti-message-chatbot" />}
                </span>
                <span className="tp-brand-name" style={{ color: draft.sidebarMode === 'light' ? '#0F172A' : '#FFFFFF' }}>{draft.brandName}</span>
              </div>
              {['Dashboard', 'Atendimento', 'CRM'].map((l, i) => (
                <div key={l} className="tp-nav" style={{ background: i === 0 ? `${draft.primary}33` : 'transparent', color: draft.sidebarMode === 'light' ? (i === 0 ? '#0F172A' : '#475569') : i === 0 ? '#FFFFFF' : '#AAB3C5' }}>
                  <span className="tp-dot" style={{ background: i === 0 ? draft.primary : 'currentColor' }} />
                  {l}
                </div>
              ))}
            </div>
            <div className="tp-main">
              <div className="tp-header" style={{ background: draft.headerBg, borderRadius: draft.radius }}>
                <span className="tp-search" />
                <span className="tp-avatar" style={{ background: draft.primary }} />
              </div>
              <div className="tp-cards">
                <div className="tp-card" style={{ borderRadius: draft.radius }}>
                  <span className="tp-card-label">Conversas</span>
                  <strong style={{ color: draft.primary }}>128</strong>
                </div>
                <div className="tp-card" style={{ borderRadius: draft.radius }}>
                  <span className="tp-card-label">Vendas</span>
                  <strong style={{ color: draft.success }}>R$ 12k</strong>
                </div>
              </div>
              <div className="tp-buttons">
                <span className="tp-btn" style={{ background: draft.primary, borderRadius: draft.radius / 1.6 }}>Principal</span>
                <span className="tp-btn" style={{ background: draft.success, borderRadius: draft.radius / 1.6 }}>Sucesso</span>
                <span className="tp-btn" style={{ background: draft.warning, borderRadius: draft.radius / 1.6 }}>Alerta</span>
                <span className="tp-btn" style={{ background: draft.danger, borderRadius: draft.radius / 1.6 }}>Erro</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted mt-1">A previa acima e apenas ilustrativa; a plataforma inteira ja esta usando as cores escolhidas.</p>
        </div>
      </div>
    </div>
  );
}
