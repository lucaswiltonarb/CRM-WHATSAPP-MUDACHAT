import { useEffect, useState } from 'react';
import { LoadingState, PageHeader } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import type { ScheduleReminderConfigItem, ScheduleReminderSettings } from '../../types';

const VARIABLES = ['{cliente}', '{profissional}', '{hora}', '{data}', '{empresa}'];

function ReminderCard({
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="mb-1">{title}</h3>
          <p className="text-muted mb-0">{description}</p>
        </div>
        <label className="switch">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
          <span className="slider" />
        </label>
      </div>
      {enabled ? children : <p className="text-muted mb-0">Ative o switch para configurar este lembrete.</p>}
    </div>
  );
}

export default function ScheduleRemindersSettings() {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ScheduleReminderSettings | null>(null);

  useEffect(() => {
    api.schedule.getReminderSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const updateItem = (key: keyof ScheduleReminderSettings, patch: Partial<ScheduleReminderConfigItem>) => {
    setSettings((current) => {
      if (!current || typeof current[key] !== 'object') return current;
      return { ...current, [key]: { ...(current[key] as ScheduleReminderConfigItem), ...patch } };
    });
  };

  const save = async () => {
    if (!settings) return;
    await api.schedule.updateReminderSettings(settings);
    notify('Lembretes automáticos salvos com sucesso.');
  };

  if (loading || !settings) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader
        title="Lembretes Automáticos"
        subtitle="Configure lembretes automáticos por WhatsApp para seus agendamentos."
        actions={<button className="btn btn-primary" onClick={save}><i className="ti ti-device-floppy" /> Salvar Configurações</button>}
      />

      <div className="card page-section-card mb-3" style={{ padding: '1.25rem' }}>
        <h3 className="mb-2">Variáveis disponíveis</h3>
        <div className="flex flex-wrap gap-1">
          {VARIABLES.map((item) => <span key={item} className="badge bg-light-primary text-primary">{item}</span>)}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <ReminderCard
          title="Lembrete 24h antes"
          description="Enviar 1 dia antes do agendamento."
          enabled={settings.reminder24h.enabled}
          onToggle={(checked) => updateItem('reminder24h', { enabled: checked })}
        >
          <div className="form-group">
            <label>Mensagem</label>
            <textarea rows={4} value={settings.reminder24h.message} onChange={(e) => updateItem('reminder24h', { message: e.target.value })} />
          </div>
        </ReminderCard>

        <ReminderCard
          title="Lembrete 2h antes"
          description="Enviar 2 horas antes do agendamento."
          enabled={settings.reminder2h.enabled}
          onToggle={(checked) => updateItem('reminder2h', { enabled: checked })}
        >
          <div className="form-group">
            <label>Mensagem</label>
            <textarea rows={4} value={settings.reminder2h.message} onChange={(e) => updateItem('reminder2h', { message: e.target.value })} />
          </div>
        </ReminderCard>

        <ReminderCard
          title="Lembrete 30min antes"
          description="Enviar 30 minutos antes do agendamento."
          enabled={settings.reminder30m.enabled}
          onToggle={(checked) => updateItem('reminder30m', { enabled: checked })}
        >
          <div className="form-group">
            <label>Mensagem</label>
            <textarea rows={4} value={settings.reminder30m.message} onChange={(e) => updateItem('reminder30m', { message: e.target.value })} />
          </div>
        </ReminderCard>

        <ReminderCard
          title="Solicitar Confirmação"
          description="Pedir confirmação após o envio do lembrete."
          enabled={settings.enableConfirmationRequest}
          onToggle={(checked) => setSettings((current) => current ? { ...current, enableConfirmationRequest: checked } : current)}
        >
          <div className="form-group">
            <label>Mensagem de Confirmação</label>
            <textarea rows={4} value={settings.confirmationMessage} onChange={(e) => setSettings((current) => current ? { ...current, confirmationMessage: e.target.value } : current)} />
          </div>
        </ReminderCard>

        <ReminderCard
          title="Lembrete de Feedback"
          description="Solicitar feedback após o atendimento."
          enabled={settings.feedbackReminder.enabled}
          onToggle={(checked) => updateItem('feedbackReminder', { enabled: checked })}
        >
          <div className="form-row">
            <div className="form-group">
              <label>Enviar feedback após (horas)</label>
              <input
                type="number"
                min="1"
                value={settings.feedbackReminder.hoursAfter || 2}
                onChange={(e) => updateItem('feedbackReminder', { hoursAfter: Number(e.target.value) || 1 })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Mensagem de Feedback</label>
            <textarea rows={4} value={settings.feedbackReminder.message} onChange={(e) => updateItem('feedbackReminder', { message: e.target.value })} />
          </div>
        </ReminderCard>
      </div>
    </div>
  );
}


