import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import type { Node, Edge, Connection, NodeChange, EdgeChange, NodeProps } from 'reactflow';
import { api } from '../../services/api';
import type { Automation, AutomationBlockType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { LoadingState } from '../../components/common';
import { syncToBackend } from '../../services/backend';

const TRIGGER_CATEGORIES = [
  {
    id: 'deals',
    label: 'Negócios',
    desc: 'Adicione gatilhos para ações nos seus negócios',
    icon: 'ti ti-briefcase',
    triggers: [
      { id: 'deal_moved', label: 'Negócio movido', desc: 'Quando um negócio é movido para a etapa' },
      { id: 'deal_created', label: 'Negócio criado', desc: 'Quando um negócio é criado em uma etapa' },
      { id: 'deal_assigned', label: 'Atendente atribuído ao negócio', desc: 'Quando um atendente é atribuído a um negócio' },
      { id: 'deal_unassigned', label: 'Atendente retirado do negócio', desc: 'Quando um atendente é retirado de um negócio' },
      { id: 'deal_won', label: 'Negócio ganho', desc: 'Quando um negócio é marcado como ganho' },
      { id: 'deal_lost', label: 'Negócio perdido', desc: 'Quando um negócio é marcado como perdido' },
      { id: 'deal_status_restored', label: 'Situação do negócio restaurada', desc: 'Quando a situação do negócio é restaurada' },
    ],
  },
  {
    id: 'leads',
    label: 'Leads',
    desc: 'Adicione gatilhos para ações nos seus leads',
    icon: 'ti ti-users',
    triggers: [
      { id: 'lead_manual', label: 'Execução manual da automação por lead ou contato', desc: 'Permite executar a automação manualmente a partir de uma seleção ou filtros de leads ou pelo contato do multiatendimento' },
      { id: 'lead_tag_removed', label: 'Tag removida do lead', desc: 'Quando uma tag é removida do lead' },
      { id: 'lead_tag_added', label: 'Tag adicionada ao lead', desc: 'Quando uma tag é adicionada ao lead' },
      { id: 'lead_created', label: 'Lead criado', desc: 'Quando um lead é criado' },
      { id: 'lead_deals_count', label: 'Lead atingir uma quantidade definida de negócios ganhos', desc: 'Dispara esta ação quando o lead alcançar o número especificado de negócios ganhos' },
      { id: 'lead_deals_value', label: 'Lead ultrapassar um valor definido de negócios ganhos', desc: 'Dispara esta ação quando o lead ultrapassar o valor especificado de negócios ganhos' },
      { id: 'lead_no_purchase', label: 'Lead não realiza compras nos últimos dias', desc: 'Dispara esta ação quando o lead não realiza compras nos últimos dias' },
    ],
  },
  {
    id: 'messages',
    label: 'Mensagens',
    desc: 'Adicione gatilhos para ações nas suas mensagens',
    icon: 'ti ti-message',
    triggers: [
      { id: 'message_received', label: 'Mensagem recebida', desc: 'Quando uma mensagem é recebida' },
      { id: 'message_sent', label: 'Mensagem enviada', desc: 'Quando uma mensagem é enviada' },
      { id: 'chat_finished', label: 'Atendimento finalizado', desc: 'Quando um atendimento é finalizado' },
      { id: 'chat_started', label: 'Atendimento iniciado', desc: 'Quando um atendimento é iniciado' },
      { id: 'department_changed', label: 'Departamento alterado', desc: 'Quando um departamento é alterado na conversa' },
    ],
  },
  {
    id: 'http',
    label: 'HTTP',
    desc: 'Adicione gatilhos para ações HTTP',
    icon: 'ti ti-world',
    triggers: [
      { id: 'http_request', label: 'Requisição HTTP (Webhook)', desc: 'Quando uma requisição HTTP é recebida' },
    ],
  },
  {
    id: 'activities',
    label: 'Atividades',
    desc: 'Adicione gatilhos para ações nas suas atividades',
    icon: 'ti ti-calendar-event',
    triggers: [
      { id: 'activity_executed', label: 'Atividade executada', desc: 'Quando uma atividade com automação é executada' },
    ],
  },
  {
    id: 'system',
    label: 'Sistema',
    desc: 'Adicione gatilhos para ações no sistema',
    icon: 'ti ti-settings',
    triggers: [
      { id: 'system_automation', label: 'Iniciado por outra automação', desc: 'Quando a automação é iniciada por outra automação' },
    ],
  },
];

const TRIGGERS: Record<string, { label: string; desc: string; category: string }> = {};
TRIGGER_CATEGORIES.forEach((category) => category.triggers.forEach((trigger) => {
  TRIGGERS[trigger.id] = { label: trigger.label, desc: trigger.desc, category: category.label };
}));

interface BlockDef {
  type: AutomationBlockType;
  label: string;
  icon: string;
  color: string;
  desc: string;
  category: string;
}

const BLOCKS: BlockDef[] = [
  { type: 'message', label: 'Mensagem', icon: 'ti ti-message-2', color: '#5d87ff', desc: 'Envia uma mensagem', category: 'Básicos' },
  { type: 'condition', label: 'Condição', icon: 'ti ti-git-branch', color: '#ffae1f', desc: 'Ramifica Sim/Não', category: 'Básicos' },
  { type: 'wait', label: 'Espera', icon: 'ti ti-clock', color: '#539bff', desc: 'Aguarda um tempo', category: 'Básicos' },
  { type: 'crm_action', label: 'Ações CRM', icon: 'ti ti-layout-kanban', color: '#13deb9', desc: 'Mover/criar lead', category: 'Básicos' },
  { type: 'tag', label: 'Gerenciar Tags', icon: 'ti ti-tag', color: '#7c3aed', desc: 'Aplica/remove tags', category: 'Avançados' },
  { type: 'menu', label: 'Menu', icon: 'ti ti-list-numbers', color: '#fa896b', desc: 'Menu de N opções', category: 'Avançados' },
  { type: 'randomizer', label: 'Randomizador', icon: 'ti ti-arrows-shuffle', color: '#ec4899', desc: 'Caminho aleatório', category: 'Avançados' },
  { type: 'auto_action', label: 'Ação Automática', icon: 'ti ti-bolt', color: '#f59e0b', desc: 'Executa ação', category: 'Avançados' },
  { type: 'ai', label: 'Inteligência IA', icon: 'ti ti-robot', color: '#06b6d4', desc: 'Aciona/pausa IA', category: 'Avançados' },
  { type: 'webhook', label: 'Webhook', icon: 'ti ti-webhook', color: '#64748b', desc: 'Chamada HTTP', category: 'Avançados' },
  { type: 'transfer', label: 'Transferir', icon: 'ti ti-user-share', color: '#10b981', desc: 'Transfere atendimento', category: 'Avançados' },
];

const DEF = (type: string) =>
  BLOCKS.find((block) => block.type === type) || ({ type: 'message', label: 'Bloco', icon: 'ti ti-box', color: '#5d87ff', desc: '', category: '' } as BlockDef);

function StartNode({ data }: NodeProps) {
  return (
    <div className="wf-node wf-start">
      <div className="wf-node-head" style={{ background: '#13deb9' }}>
        <i className="ti ti-player-play-filled" /> Início
      </div>
      <div className="wf-node-body">{data.triggerLabel || TRIGGERS[data.trigger]?.label || 'Quando o lead enviar mensagem'}</div>
      <Handle type="source" position={Position.Right} className="wf-handle" />
    </div>
  );
}

function ConditionNode({ data, selected }: NodeProps) {
  const block = DEF('condition');
  return (
    <div className={`wf-node ${selected ? 'sel' : ''}`}>
      <Handle type="target" position={Position.Left} className="wf-handle" />
      <div className="wf-node-head" style={{ background: block.color }}>
        <i className={block.icon} /> {data.label || 'Condição'}
      </div>
      <div className="wf-node-body">{data.summary || 'Configurar regra...'}</div>
      <div className="wf-cond-outs">
        <div className="wf-cond-out">
          <span className="wf-yes">Sim</span>
          <Handle id="yes" type="source" position={Position.Right} style={{ top: 'auto', bottom: 26 }} className="wf-handle wf-handle-yes" />
        </div>
        <div className="wf-cond-out">
          <span className="wf-no">Não</span>
          <Handle id="no" type="source" position={Position.Right} style={{ top: 'auto', bottom: 6 }} className="wf-handle wf-handle-no" />
        </div>
      </div>
    </div>
  );
}

function GenericNode({ data, selected, type }: NodeProps) {
  const block = DEF(type);
  return (
    <div className={`wf-node ${selected ? 'sel' : ''}`}>
      <Handle type="target" position={Position.Left} className="wf-handle" />
      <div className="wf-node-head" style={{ background: block.color }}>
        <i className={block.icon} /> {data.label || block.label}
      </div>
      <div className="wf-node-body">{data.summary || block.desc}</div>
      <Handle type="source" position={Position.Right} className="wf-handle" />
    </div>
  );
}

function Inner() {
  const { id } = useParams();
  const nav = useNavigate();
  const { notify } = useToast();
  const { screenToFlowPosition } = useReactFlow();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);

  const nodeTypes = useMemo(
    () => ({
      start: StartNode,
      condition: ConditionNode,
      message: GenericNode,
      wait: GenericNode,
      crm_action: GenericNode,
      tag: GenericNode,
      menu: GenericNode,
      randomizer: GenericNode,
      auto_action: GenericNode,
      ai: GenericNode,
      webhook: GenericNode,
      transfer: GenericNode,
    }),
    [],
  );

  useEffect(() => {
    api.automations.getById(id!).then((item: any) => {
      if (!item) {
        nav('/automations');
        return;
      }
      setAutomation(item as Automation);
      setNodes(
        item.blocks.map((block: any) => ({
          id: block.id,
          type: block.type,
          position: block.position,
          data: { label: block.label, ...block.config, summary: summarize(block.type, block.config) },
        })),
      );
      setEdges(
        item.connections.map((connection: any) => ({
          id: connection.id,
          source: connection.sourceBlockId,
          target: connection.targetBlockId,
          sourceHandle: connection.sourceHandle,
          label: connection.label,
          animated: true,
        })),
      );
      setLoading(false);
    });
    api.channels.list().then(setChannels);
  }, [id, nav]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((current) => applyNodeChanges(changes, current)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((current) => applyEdgeChanges(changes, current)), []);
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            animated: true,
            label: connection.sourceHandle === 'yes' ? 'Sim' : connection.sourceHandle === 'no' ? 'Não' : undefined,
          },
          current,
        ),
      ),
    [],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('blockType');
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const block = DEF(type);
      const nextId = `b-${Date.now()}`;
      setNodes((current) => [...current, { id: nextId, type, position, data: { label: block.label, summary: block.desc } }]);
    },
    [screenToFlowPosition],
  );

  const selectedNode = nodes.find((node) => node.id === selectedId);

  const updateNodeData = (patch: Record<string, any>) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedId
          ? { ...node, data: { ...node.data, ...patch, summary: summarize(node.type!, { ...node.data, ...patch }) } }
          : node,
      ),
    );
  };

  const deleteNode = () => {
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    setSelectedId(null);
  };

  const save = async (publish = false) => {
    const blocks = nodes.map((node) => ({
      id: node.id,
      automationId: id!,
      type: node.type as AutomationBlockType,
      label: node.data.label,
      config: stripData(node.data),
      position: node.position,
    }));
    const connections = edges.map((edge) => ({
      id: edge.id,
      automationId: id!,
      sourceBlockId: edge.source,
      targetBlockId: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      label: typeof edge.label === 'string' ? edge.label : undefined,
    }));
    await api.automations.update(id!, { blocks, connections, ...(publish ? { isActive: true } : {}) });
    await api.audit.log(publish ? 'Automação publicada' : 'Fluxo salvo', 'Automações', 'Automation', id!);
    syncToBackend();
    notify(publish ? 'Automação publicada e ativa!' : 'Fluxo salvo');
  };

  if (loading) return <LoadingState label="Abrindo editor..." />;

  return (
    <div className="wf-editor">
      <div className="wf-topbar">
        <div className="flex items-center gap-1">
          <button className="icon-btn" onClick={() => nav('/automations')}>
            <i className="ti ti-arrow-left" />
          </button>
          <div>
            <h3 className="wf-name">{automation?.name}</h3>
            <span className="text-xs text-muted">
              {nodes.length} blocos · {edges.length} conexões
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn btn-light-secondary btn-sm" onClick={() => save(false)}>
            <i className="ti ti-device-floppy" /> Salvar
          </button>
          <button className="btn btn-success btn-sm" onClick={() => save(true)}>
            <i className="ti ti-rocket" /> Publicar
          </button>
        </div>
      </div>

      <div className="wf-main">
        <div className="wf-palette">
          {['Básicos', 'Avançados'].map((category) => (
            <div key={category} className="wf-palette-group">
              <div className="wf-palette-cat">{category === 'Básicos' ? 'Blocos Básicos' : 'Lógica Avançada'}</div>
              {BLOCKS.filter((block) => block.category === category).map((block) => (
                <div
                  key={block.type}
                  className="wf-palette-item"
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('blockType', block.type)}
                >
                  <span className="wf-palette-icon" style={{ background: block.color }}>
                    <i className={block.icon} />
                  </span>
                  <div>
                    <div className="wf-palette-label">{block.label}</div>
                    <div className="wf-palette-desc">{block.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="wf-canvas" ref={wrapRef} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            defaultEdgeOptions={{ animated: true, type: 'smoothstep', style: { stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '6 5' } }}
            connectionLineStyle={{ stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '6 5' }}
            fitView
            minZoom={0.2}
            maxZoom={2}
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background color="var(--wf-grid-color)" gap={20} size={1.5} />
            <Controls />
            <MiniMap nodeColor={(node) => DEF(node.type!).color} pannable zoomable />
          </ReactFlow>
        </div>

        {selectedNode && selectedNode.type !== 'start' && (
          <div className="wf-config">
            <div className="wf-config-head">
              <div className="flex items-center gap-1">
                <span className="wf-palette-icon" style={{ background: DEF(selectedNode.type!).color }}>
                  <i className={DEF(selectedNode.type!).icon} />
                </span>
                <strong>{DEF(selectedNode.type!).label}</strong>
              </div>
              <button className="icon-btn" onClick={() => setSelectedId(null)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="wf-config-body">
              <div className="form-group">
                <label>Rótulo do bloco</label>
                <input value={selectedNode.data.label || ''} onChange={(event) => updateNodeData({ label: event.target.value })} />
              </div>
              <BlockConfig node={selectedNode} update={updateNodeData} />
            </div>
            <div className="wf-config-foot">
              <button className="btn btn-light-danger btn-sm" onClick={deleteNode}>
                <i className="ti ti-trash" /> Remover bloco
              </button>
            </div>
          </div>
        )}

        {selectedNode && selectedNode.type === 'start' && (
          <div className="wf-config">
            <div className="wf-config-head">
              <strong>Gatilho inicial</strong>
              <button className="icon-btn" onClick={() => setSelectedId(null)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="wf-config-body">
              <StartConfig data={selectedNode.data} update={updateNodeData} channels={channels} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StartConfig({ data, update, channels }: { data: any; update: (patch: any) => void; channels: any[] }) {
  const [category, setCategory] = useState(() => {
    const trigger = data.trigger || 'message_received';
    return TRIGGER_CATEGORIES.find((item) => item.triggers.some((entry) => entry.id === trigger))?.id || 'messages';
  });

  const trigger = data.trigger || 'message_received';

  const setTrigger = (id: string) => {
    update({ trigger: id, triggerLabel: TRIGGERS[id]?.label });
  };

  return (
    <>
      <p className="text-xs text-muted">O gatilho é responsável por acionar a automação.</p>

      <div className="trigger-categories">
        {TRIGGER_CATEGORIES.map((item) => (
          <button key={item.id} className={`trigger-cat ${category === item.id ? 'active' : ''}`} onClick={() => setCategory(item.id)}>
            <i className={item.icon} /> {item.label}
          </button>
        ))}
      </div>

      <div className="trigger-list">
        {TRIGGER_CATEGORIES.find((item) => item.id === category)?.triggers.map((item) => (
          <button key={item.id} className={`trigger-item ${trigger === item.id ? 'active' : ''}`} onClick={() => setTrigger(item.id)}>
            <div>
              <strong>{item.label}</strong>
              <div className="text-xs text-muted">{item.desc}</div>
            </div>
            {trigger === item.id && <i className="ti ti-check" />}
          </button>
        ))}
      </div>

      {(trigger === 'deal_moved' || trigger === 'deal_created') && (
        <div className="trigger-config">
          <div className="form-group">
            <label>Etapa do funil (opcional)</label>
            <input value={data.triggerStageId || ''} onChange={(event) => update({ triggerStageId: event.target.value })} placeholder="ID da etapa alvo (deixe vazio para qualquer etapa)" />
          </div>
        </div>
      )}

      {trigger.startsWith('message_') && (
        <div className="trigger-config">
          <div className="form-group">
            <label>Qual instância escutará as mensagens?</label>
            <select value={data.channelId || ''} onChange={(event) => update({ channelId: event.target.value })}>
              <option value="">Todas as conexões</option>
              {channels
                .filter((item: any) =>
                  ['whatsapp_evolution', 'whatsapp_uazapi', 'whatsapp_official', 'instagram'].includes(item.type) ||
                  item.provider === 'evolution_api',
                )
                .map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label>Palavras-chave para iniciar</label>
            <div className="keyword-row">
              <select value={data.keywordMatch || 'contains'} onChange={(event) => update({ keywordMatch: event.target.value })}>
                <option value="contains">Contém</option>
                <option value="equals">Igual a</option>
                <option value="starts">Começa com</option>
                <option value="regex">Regex</option>
              </select>
              <input value={data.keyword || ''} onChange={(event) => update({ keyword: event.target.value })} placeholder="olá, preço, comprar" />
            </div>
          </div>

          <div className="form-group">
            <label>Condição de sessão</label>
            <select value={data.sessionCondition || 'not_in_automation'} onChange={(event) => update({ sessionCondition: event.target.value })}>
              <option value="not_in_automation">Iniciar apenas se o contato não estiver atualmente nesta automação</option>
              <option value="always">Sempre iniciar</option>
              <option value="only_if_not_any">Apenas se não estiver em nenhuma automação</option>
            </select>
          </div>

          <div className="form-row toggle-row">
            <label className="toggle">
              <input type="checkbox" checked={!!data.listenGroups} onChange={(event) => update({ listenGroups: event.target.checked })} />
              <span>Ouvir mensagens enviadas em grupos</span>
            </label>
          </div>

          <div className="form-row toggle-row">
            <label className="toggle">
              <input type="checkbox" checked={!!data.receiveProviderSource} onChange={(event) => update({ receiveProviderSource: event.target.checked })} />
              <span>Receber fonte de dados do provedor da mensagem</span>
            </label>
          </div>
        </div>
      )}
    </>
  );
}

function BlockConfig({ node, update }: { node: Node; update: (patch: any) => void }) {
  const data = node.data;

  switch (node.type) {
    case 'message':
      return <MessageConfig d={data} update={update} />;
    case 'condition':
      return (
        <>
          <div className="form-group">
            <label>Tipo de regra</label>
            <select value={data.condType || 'keyword'} onChange={(event) => update({ condType: event.target.value })}>
              <option value="keyword">Contém palavra-chave</option>
              <option value="has_tag">Possui tag</option>
              <option value="schedule">Dentro do expediente</option>
              <option value="field">Campo personalizado</option>
            </select>
          </div>
          <div className="form-group">
            <label>Valor</label>
            <input value={data.condValue || ''} onChange={(event) => update({ condValue: event.target.value })} placeholder="Ex: orçamento, preço" />
          </div>
          <p className="text-xs text-muted">
            Conecte as saídas <strong style={{ color: '#13deb9' }}>Sim</strong> e <strong style={{ color: '#fa896b' }}>Não</strong> a blocos diferentes.
          </p>
        </>
      );
    case 'wait':
      return (
        <div className="form-row">
          <div className="form-group">
            <label>Tempo</label>
            <input type="number" value={data.waitValue || 1} onChange={(event) => update({ waitValue: +event.target.value })} />
          </div>
          <div className="form-group">
            <label>Unidade</label>
            <select value={data.waitUnit || 'minutes'} onChange={(event) => update({ waitUnit: event.target.value })}>
              <option value="seconds">Segundos</option>
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
              <option value="days">Dias</option>
            </select>
          </div>
        </div>
      );
    case 'crm_action':
      return (
        <>
          <div className="form-group">
            <label>Ação</label>
            <select value={data.crmAction || 'move'} onChange={(event) => update({ crmAction: event.target.value })}>
              <option value="move">Mover lead de etapa</option>
              <option value="create">Criar lead</option>
              <option value="update">Atualizar campo</option>
            </select>
          </div>
          <div className="form-group">
            <label>Etapa / valor</label>
            <input value={data.crmValue || ''} onChange={(event) => update({ crmValue: event.target.value })} />
          </div>
        </>
      );
    case 'tag':
      return (
        <>
          <div className="form-group">
            <label>Operação</label>
            <select value={data.tagOp || 'add'} onChange={(event) => update({ tagOp: event.target.value })}>
              <option value="add">Aplicar tag</option>
              <option value="remove">Remover tag</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tag</label>
            <input value={data.tagName || ''} onChange={(event) => update({ tagName: event.target.value })} placeholder="Nome da tag" />
          </div>
        </>
      );
    case 'menu':
      return (
        <>
          <div className="form-group">
            <label>Texto do menu</label>
            <textarea value={data.menuText || ''} onChange={(event) => update({ menuText: event.target.value })} placeholder="Escolha uma opção:" />
          </div>
          <div className="form-group">
            <label>Opções (uma por linha)</label>
            <textarea rows={4} value={data.menuOptions || ''} onChange={(event) => update({ menuOptions: event.target.value })} placeholder={'1 - Vendas\n2 - Suporte\n3 - Financeiro'} />
          </div>
          <p className="text-xs text-muted">Cada opção gera uma ramificação no fluxo.</p>
        </>
      );
    case 'randomizer':
      return (
        <div className="form-group">
          <label>Número de caminhos</label>
          <input type="number" min={2} value={data.paths || 2} onChange={(event) => update({ paths: +event.target.value })} />
        </div>
      );
    case 'auto_action':
      return (
        <div className="form-group">
          <label>Ação</label>
          <select value={data.action || 'finish'} onChange={(event) => update({ action: event.target.value })}>
            <option value="finish">Finalizar atendimento</option>
            <option value="assign">Atribuir atendente</option>
            <option value="notify">Notificação interna</option>
            <option value="task">Criar tarefa</option>
          </select>
        </div>
      );
    case 'ai':
      return (
        <div className="form-group">
          <label>Ação de IA</label>
          <select value={data.aiAction || 'activate'} onChange={(event) => update({ aiAction: event.target.value })}>
            <option value="activate">Acionar agente IA</option>
            <option value="pause">Pausar IA</option>
          </select>
        </div>
      );
    case 'webhook':
      return (
        <>
          <div className="form-group">
            <label>URL</label>
            <input value={data.url || ''} onChange={(event) => update({ url: event.target.value })} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>Método</label>
            <select value={data.method || 'POST'} onChange={(event) => update({ method: event.target.value })}>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
            </select>
          </div>
          <div className="form-group">
            <label>Body (JSON)</label>
            <textarea value={data.body || ''} onChange={(event) => update({ body: event.target.value })} />
          </div>
        </>
      );
    case 'transfer':
      return (
        <div className="form-group">
          <label>Transferir para</label>
          <select value={data.transferTo || 'user'} onChange={(event) => update({ transferTo: event.target.value })}>
            <option value="user">Atendente específico</option>
            <option value="team">Equipe</option>
            <option value="queue">Fila de atendimento</option>
          </select>
        </div>
      );
    default:
      return null;
  }
}

const FIELD_TOKENS = [
  { id: 'nome', label: 'Nome', token: '{{nome}}' },
  { id: 'telefone', label: 'Telefone', token: '{{telefone}}' },
  { id: 'numero', label: 'Número', token: '{{numero}}' },
  { id: 'email', label: 'E-mail', token: '{{email}}' },
  { id: 'ultima_mensagem', label: 'Última mensagem', token: '{{ultima_mensagem}}' },
];

function MessageConfig({ d, update }: { d: any; update: (patch: any) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const insert = (token: string) => {
    const element = ref.current;
    if (!element) return;
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const value = d.text || '';
    const next = value.slice(0, start) + token + value.slice(end);
    update({ text: next });
    setTimeout(() => {
      element.focus();
      element.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  return (
    <>
      <div className="form-group">
        <label>Nome no fluxo</label>
        <input value={d.nodeName || ''} onChange={(event) => update({ nodeName: event.target.value })} placeholder="Message" />
        <p className="text-xs text-muted">Nome de referência no canvas; não é enviado na conversa.</p>
      </div>

      <div className="form-group">
        <label>Campos do cliente</label>
        <div className="field-tokens">
          {FIELD_TOKENS.map((field) => (
            <button key={field.id} className="field-token" onClick={() => insert(field.token)} title={`Inserir ${field.label}`}>
              <i className="ti ti-hash" /> {field.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Clique para inserir. Serão trocados pelo dado real na hora do envio. Formato: <code>{'{{nome}}'}</code> ou <code>{'{{variables.nome}}'}</code>
        </p>
      </div>

      <div className="form-group">
        <label>Conteúdo da mensagem</label>
        <textarea ref={ref} rows={5} value={d.text || ''} onChange={(event) => update({ text: event.target.value })} placeholder="Olá {{nome}}, tudo bem?" />
        <p className="text-xs text-warning">Lembre-se de clicar em "Publicar alterações" para ativar este texto.</p>
      </div>

      <div className="message-send-config">
        <div className="form-row toggle-row">
          <label className="toggle">
            <input type="checkbox" checked={!!d.showTyping} onChange={(event) => update({ showTyping: event.target.checked })} />
            <span>
              <strong>Mostrar digitando...</strong>
              <small>Exibe o indicador de digitação no WhatsApp antes da mensagem.</small>
            </span>
          </label>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Aguardar antes de enviar</label>
            <div className="number-stepper">
              <button onClick={() => update({ waitBeforeSend: Math.max(0, (d.waitBeforeSend || 1) - 1) })}>-</button>
              <input type="number" min={0} value={d.waitBeforeSend || 1} onChange={(event) => update({ waitBeforeSend: +event.target.value })} />
              <button onClick={() => update({ waitBeforeSend: (d.waitBeforeSend || 1) + 1 })}>+</button>
              <span>segundos</span>
            </div>
            <p className="text-xs text-muted">Pausa curta para parecer uma resposta humana, não automática.</p>
          </div>
        </div>
      </div>
    </>
  );
}

function summarize(type: string, config: any): string {
  switch (type) {
    case 'message':
      return config.text ? `"${String(config.text).slice(0, 40)}"` : 'Configurar mensagem';
    case 'condition':
      return config.condValue ? `${config.condType || 'regra'}: ${config.condValue}` : 'Configurar regra';
    case 'wait':
      return config.waitValue ? `Aguardar ${config.waitValue} ${config.waitUnit || 'min'}` : 'Configurar tempo';
    case 'crm_action':
      return config.crmAction === 'create' ? 'Criar lead' : config.crmAction === 'update' ? 'Atualizar campo' : 'Mover lead';
    case 'tag':
      return `${config.tagOp === 'remove' ? 'Remover' : 'Aplicar'} ${config.tagName || 'tag'}`;
    case 'menu':
      return config.menuOptions ? `${String(config.menuOptions).split('\n').filter(Boolean).length} opções` : 'Configurar menu';
    case 'ai':
      return config.aiAction === 'pause' ? 'Pausar IA' : 'Acionar IA';
    case 'webhook':
      return config.url ? `${config.method || 'POST'} ${String(config.url).slice(0, 24)}` : 'Configurar webhook';
    case 'transfer':
      return 'Transferir atendimento';
    case 'randomizer':
      return `${config.paths || 2} caminhos`;
    case 'auto_action':
      return 'Ação automática';
    default:
      return '';
  }
}

function stripData(data: any) {
  const { label, summary, triggerLabel, ...rest } = data;
  return rest;
}

export default function AutomationBuilder() {
  return (
    <ReactFlowProvider>
      <Inner />
    </ReactFlowProvider>
  );
}