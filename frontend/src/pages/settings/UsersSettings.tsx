/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api';
import type { User } from '../../types';
import { ConfirmDialog, LoadingState, Modal, PageHeader } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';

type RoleOpt = 'agent' | 'supervisor' | 'company_admin';
type UserForm = {
  name: string;
  email: string;
  role: RoleOpt;
  isSeller: boolean;
  restrictConnections: boolean;
  restrictFunnels: boolean;
  connectionIds: string[];
  funnelIds: string[];
  shiftId: string;
  password?: string;
  confirmPassword?: string;
  avatar?: string;
  status: 'active' | 'inactive';
};

const ROLE_CARDS: { id: RoleOpt; title: string; desc: string }[] = [
  { id: 'agent', title: 'Usuário', desc: 'Padrão' },
  { id: 'supervisor', title: 'Gestor', desc: 'Supervisão' },
  { id: 'company_admin', title: 'Admin', desc: 'Total' },
];

export default function UsersSettings() {
  const { notify } = useToast();
  const { limitOf, reached } = useWorkspace();
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>({
    name: '',
    email: '',
    role: 'agent',
    isSeller: false,
    restrictConnections: false,
    restrictFunnels: false,
    connectionIds: [],
    funnelIds: [],
    shiftId: '',
    status: 'active',
  });
  const [connections, setConnections] = useState<any[]>([]);
  const [funnels, setFunnels] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = () =>
    Promise.all([api.settings.getUsers(), api.channels.list(), api.funnels.list()]).then(([u, c, f]) => {
      setItems(u);
      setConnections(c);
      setFunnels(f);
      setShifts([]);
      setLoading(false);
    });
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      email: '',
      role: 'agent',
      isSeller: false,
      restrictConnections: false,
      restrictFunnels: false,
      connectionIds: [],
      funnelIds: [],
      shiftId: '',
      status: 'active',
    });
    setOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      role: ((u.role === 'admin' ? 'company_admin' : u.role) as RoleOpt) || 'agent',
      isSeller: !!(u as any).isSeller,
      restrictConnections: !!(u as any).restrictConnections,
      restrictFunnels: !!(u as any).restrictFunnels,
      connectionIds: ((u as any).connectionIds || []) as string[],
      funnelIds: ((u as any).funnelIds || []) as string[],
      shiftId: ((u as any).shiftId || '') as string,
      status: u.status === 'active' ? 'active' : 'inactive',
      avatar: (u as any).avatar || '',
      password: '',
      confirmPassword: '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      notify('Preencha nome e e-mail', 'warning');
      return;
    }
    if (!editing && reached('users', items.length)) {
      notify(`Limite de usuários do plano atingido (${limitOf('users')}).`, 'error');
      return;
    }
    if (form.password || form.confirmPassword) {
      if ((form.password || '').length < 6) {
        notify('Senha deve ter ao menos 6 caracteres', 'warning');
        return;
      }
      if (form.password !== form.confirmPassword) {
        notify('Confirmação de senha não confere', 'warning');
        return;
      }
    }
    const payload: any = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: form.status,
      isSeller: form.isSeller,
      restrictConnections: form.restrictConnections,
      restrictFunnels: form.restrictFunnels,
      connectionIds: form.restrictConnections ? form.connectionIds : [],
      funnelIds: form.restrictFunnels ? form.funnelIds : [],
      shiftId: form.shiftId || null,
      avatar: form.avatar || '',
    };
    if (form.password) payload.password = form.password;

    if (editing) {
      const u = await api.settings.updateUser(editing.id, payload);
      setItems((p) => p.map((x) => (x.id === editing.id ? (u as User) : x)));
      notify('Usuário atualizado');
    } else {
      const u = await api.settings.createUser(payload);
      setItems((p) => [...p, u as User]);
      await api.audit.log('Usuário criado', 'Configurações', 'User', u.id);
      notify('Usuário criado');
    }
    setOpen(false);
  };

  const doDelete = async () => {
    if (!delId) return;
    await api.settings.deleteUser(delId);
    setItems((p) => p.filter((u) => u.id !== delId));
    notify('Usuário removido');
  };

  const onPickAvatar = (file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify('Imagem deve ter no máximo 2MB', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result || '');
      setForm((p) => ({ ...p, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const roleInfo = useMemo(() => ROLE_CARDS.find((r) => r.id === form.role), [form.role]);

  if (loading) return <LoadingState />;

  return (
    <div className="page-shell">
      <PageHeader
        title="UsuÃ¡rios"
        subtitle="Gerencie a equipe e acessos"
        actions={
          <button className="btn btn-primary" onClick={openNew} disabled={reached('users', items.length)} title={reached('users', items.length) ? 'Limite do plano atingido' : ''}>
            <i className="ti ti-plus" /> Novo Usuário
          </button>
        }
      />

      <div className="plan-usage-bar">
        <i className="ti ti-users" />
        <span>Usuários: <strong>{items.length}</strong> de {limitOf('users') === -1 ? 'ilimitados' : limitOf('users')} do seu plano</span>
        {reached('users', items.length) && <span className="badge bg-light-danger text-danger">Limite atingido</span>}
      </div>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-1">
                    <div className="avatar-sm">{u.name.charAt(0)}</div>
                    {u.name}
                  </div>
                </td>
                <td>{u.email}</td>
                <td>
                  <span className="badge bg-light-primary text-primary">{u.role === 'admin' ? 'Admin' : u.role === 'supervisor' ? 'Gestor' : 'Usuário'}</span>
                </td>
                <td>
                  <span className={`badge bg-light-${u.status === 'active' ? 'success' : 'secondary'} text-${u.status === 'active' ? 'success' : 'secondary'}`}>
                    {u.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button className="icon-btn" onClick={() => openEdit(u)}>
                      <i className="ti ti-edit" />
                    </button>
                    <button className="icon-btn" onClick={() => setDelId(u.id)}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar Usuário' : 'Novo Usuário'}
        size="lg"
        className="user-modal"
        footer={
          <>
            <button className="btn btn-light-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={save}>
              Salvar Alterações
            </button>
          </>
        }
      >
        <form className="space-y-5 mt-6 user-form-printlike" onSubmit={(e) => e.preventDefault()}>
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-2">
              <i className="ti ti-user text-pink-500" /> Editar Usuário
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{form.email || 'sem e-mail'}</p>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              className="relative w-24 h-24 rounded-full overflow-hidden transition-all group border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-pink-500 dark:hover:border-pink-500"
              onClick={() => fileRef.current?.click()}
            >
              {form.avatar ? (
                <img src={form.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <i className="ti ti-camera w-8 h-8 text-gray-400 dark:text-gray-600 group-hover:text-pink-500 transition-colors" />
                </div>
              )}
            </button>
            <input ref={fileRef} accept="image/*" className="hidden" type="file" onChange={(e) => onPickAvatar(e.target.files?.[0])} />
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Clique para alterar a foto</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tamanho mÃ¡ximo: 2MB</p>
          </div>

          <div>
            <label className="text-sm font-semibold">Nome Completo *</label>
            <input className="form-control mt-1.5" placeholder="Ex: João Silva" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>

          <div>
            <label className="text-sm font-semibold">Perfil de Acesso *</label>
            <div className="grid grid-cols-3 gap-3 mt-1.5">
              {ROLE_CARDS.map((r) => {
                const active = form.role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`p-3 rounded-xl border-2 transition-all text-left ${active ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                    onClick={() => setForm((p) => ({ ...p, role: r.id }))}
                  >
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{r.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.desc}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Selecionado: {roleInfo?.title}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Participa da distribuição (Vendedor)</label>
              <button type="button" role="switch" aria-checked={form.isSeller} className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors ${form.isSeller ? 'bg-pink-600' : 'bg-gray-200 dark:bg-gray-700'}`} onClick={() => setForm((p) => ({ ...p, isSeller: !p.isSeller }))}>
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${form.isSeller ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Define se este usuário entra na fila automática e aparece no painel de supervisão.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Restringir Conexões</label>
              <button type="button" role="switch" aria-checked={form.restrictConnections} className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors ${form.restrictConnections ? 'bg-pink-600' : 'bg-gray-200 dark:bg-gray-700'}`} onClick={() => setForm((p) => ({ ...p, restrictConnections: !p.restrictConnections }))}>
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${form.restrictConnections ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Controle a quais conexões este usuário tem acesso. Sem restrição ele verá todas.</p>
            {form.restrictConnections && (
              <div className="flex flex-wrap gap-1">
                {connections.map((c) => {
                  const active = form.connectionIds.includes(c.id);
                  return (
                    <button key={c.id} type="button" className={`tag-select ${active ? 'on' : ''}`} onClick={() => setForm((p) => ({ ...p, connectionIds: active ? p.connectionIds.filter((x) => x !== c.id) : [...p.connectionIds, c.id] }))}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Restringir Acesso a Funis</label>
              <button type="button" role="switch" aria-checked={form.restrictFunnels} className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors ${form.restrictFunnels ? 'bg-pink-600' : 'bg-gray-200 dark:bg-gray-700'}`} onClick={() => setForm((p) => ({ ...p, restrictFunnels: !p.restrictFunnels }))}>
                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${form.restrictFunnels ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Controle quais funis este usuário vê no Kanban. Sem restrição ele verá todos.</p>
            {form.restrictFunnels && (
              <div className="flex flex-wrap gap-1">
                {funnels.map((f) => {
                  const active = form.funnelIds.includes(f.id);
                  return (
                    <button key={f.id} type="button" className={`tag-select ${active ? 'on' : ''}`} onClick={() => setForm((p) => ({ ...p, funnelIds: active ? p.funnelIds.filter((x) => x !== f.id) : [...p.funnelIds, f.id] }))}>
                      {f.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold">Turno de Trabalho (Opcional)</label>
            <select className="w-full px-3 py-2 mt-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" value={form.shiftId} onChange={(e) => setForm((p) => ({ ...p, shiftId: e.target.value }))}>
              <option value="">Sem restrição de horário</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Se definido, o usuário só poderá acessar nos dias/horários do turno</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold">Nova Senha (opcional)</label>
              <input className="form-control mt-1.5" placeholder="Deixe em branco para não alterar" minLength={6} type="password" value={form.password || ''} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-semibold">Confirmar Senha</label>
              <input className="form-control mt-1.5" placeholder="Confirme a nova senha" minLength={6} type="password" value={form.confirmPassword || ''} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <p className="text-xs text-blue-800 dark:text-blue-300">💡 <strong>Dica:</strong> Deixe os campos de senha em branco se não quiser alterá-la.</p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Excluir usuário" message="Deseja remover este usuário?" />
    </div>
  );
}


