import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Automation, Channel } from '../../types';
import { PageHeader, EmptyState, LoadingState, Modal, ConfirmDialog } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

export default function Automations() {
  const { notify } = useToast();
  const nav = useNavigate();
  const [items, setItems] = useState<Automation[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  const load = () =>
    Promise.all([api.automations.list(), api.channels.list()]).then(([automations, channelItems]) => {
      setItems(automations);
      setChannels(channelItems);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name) {
      notify('Informe o nome', 'warning');
      return;
    }

    const startBlock = {
      id: 'start',
      automationId: '',
      type: 'start',
      label: 'Início',
      config: {},
      position: { x: 240, y: 60 },
    };

    const automation = await api.automations.create({
      ...form,
      blocks: [startBlock],
      connections: [],
    });

    await api.audit.log('Automação criada', 'Automações', 'Automation', automation.id);
    setFormOpen(false);
    notify('Automação criada');
    nav(`/automations/${automation.id}/builder`);
  };

  const toggle = async (automation: Automation) => {
    const updated = await api.automations.toggle(automation.id);
    setItems((current) => current.map((item) => (item.id === automation.id ? updated : item)));
    notify(updated.isActive ? 'Automação ativada' : 'Automação desativada');
  };

  const duplicate = async (automation: Automation) => {
    const duplicated = await api.automations.create({
      name: `${automation.name} (cópia)`,
      description: automation.description,
      blocks: automation.blocks,
      connections: automation.connections,
      channelId: automation.channelId,
    });
    setItems((current) => [...current, duplicated]);
    notify('Duplicada');
  };

  const doDelete = async () => {
    if (!delId) return;
    await api.automations.delete(delId);
    setItems((current) => current.filter((automation) => automation.id !== delId));
    notify('Removida');
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Automações"
        subtitle="Fluxos visuais de mensagens estilo workflow"
        actions={
          <button
            className="btn btn-primary"
            onClick={() => {
              setForm({ name: '', description: '' });
              setFormOpen(true);
            }}
          >
            <i className="ti ti-plus" /> Nova Automação
          </button>
        }
      />

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="ti ti-share-2"
            title="Nenhuma automação"
            description="Crie fluxos de mensagens automáticas para seus leads."
            action={
              <button
                className="btn btn-primary"
                onClick={() => {
                  setForm({ name: '' });
                  setFormOpen(true);
                }}
              >
                Criar automação
              </button>
            }
          />
        </div>
      ) : (
        <div className="card-grid">
          {items.map((automation) => (
            <div key={automation.id} className="card auto-card">
              <div className="flex justify-between items-start">
                <div className="auto-icon">
                  <i className="ti ti-share-2" />
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={automation.isActive}
                    onChange={() => toggle(automation)}
                  />
                  <span className="slider" />
                </label>
              </div>

              <h3 className="auto-title">{automation.name}</h3>
              <p className="auto-desc">{automation.description || 'Sem descrição'}</p>

              <div className="auto-meta">
                <span>
                  <i className="ti ti-box" /> {automation.blocks.length} blocos
                </span>
                <span>
                  <i className="ti ti-arrows-split" /> {automation.connections.length} conexões
                </span>
                <span>
                  <i className="ti ti-player-play" /> {automation.executionCount} execuções
                </span>
              </div>

              {automation.channelId && (
                <div className="text-xs text-muted mt-1">
                  <i className="ti ti-brand-whatsapp" />{' '}
                  {channels.find((channel) => channel.id === automation.channelId)?.name}
                </div>
              )}

              <div className="flex gap-1 mt-1">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => nav(`/automations/${automation.id}/builder`)}
                >
                  <i className="ti ti-edit" /> Editar fluxo
                </button>
                <button className="btn btn-sm btn-light-secondary" onClick={() => duplicate(automation)}>
                  <i className="ti ti-copy" />
                </button>
                <button className="btn btn-sm btn-light-danger" onClick={() => setDelId(automation.id)}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Nova Automação"
        footer={
          <>
            <button className="btn btn-light-secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={create}>
              Criar e abrir editor
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>
            Nome <span className="req">*</span>
          </label>
          <input
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Boas-vindas novos leads"
          />
        </div>
        <div className="form-group">
          <label>Descrição</label>
          <textarea
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Conexão WhatsApp (opcional)</label>
          <select
            value={form.channelId || ''}
            onChange={(e) => setForm({ ...form, channelId: e.target.value })}
          >
            <option value="">Nenhuma</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">
            Quando ativa nesta conexão, leads que enviarem mensagem passarão pelo fluxo.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={doDelete}
        title="Excluir automação"
        message="Deseja realmente excluir esta automação e seu fluxo?"
      />
    </div>
  );
}