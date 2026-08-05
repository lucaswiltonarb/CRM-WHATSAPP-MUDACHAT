import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Classification, Contact, Tag, User } from '../../types';
import { ConfirmDialog, EmptyState, LoadingState, Modal, PageHeader } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

type ContactForm = {
  name?: string;
  phone?: string;
  email?: string;
  document?: string;
  company?: string;
  position?: string;
  city?: string;
  state?: string;
  origin?: string;
  responsibleId?: string;
  classificationId?: string;
  notes?: string;
  tagIds?: string[];
};

export default function Contacts() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [classes, setClasses] = useState<Classification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fTag, setFTag] = useState('');
  const [fResp, setFResp] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState<ContactForm>({});

  const load = () =>
    Promise.all([api.contacts.list(), api.tags.list(), api.classifications.list(), api.settings.getUsers()]).then(([c, t, cl, u]) => {
      setContacts(c);
      setTags(t);
      setClasses(cl);
      setUsers(u);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  const filtered = contacts.filter((c) => {
    if (search && !`${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (fTag && !c.tags.some((t) => t.id === fTag)) return false;
    if (fResp && c.responsibleId !== fResp) return false;
    if (fStatus && c.status !== fStatus) return false;
    return true;
  });

  const openNew = async () => {
    const me = (await api.auth.getCurrentUser()) as User | null;
    const novoClass = classes.find((x) => x.name.toLowerCase() === 'novo');
    setEditing(null);
    setForm({
      name: '',
      phone: '',
      responsibleId: me?.id,
      origin: 'manual',
      classificationId: novoClass?.id,
      tagIds: [],
    });
    setFormOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({
      ...c,
      classificationId: c.classification?.id,
      tagIds: c.tags.map((t) => t.id),
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) {
      notify('Informe o nome', 'warning');
      return;
    }
    if (!form.phone?.trim()) {
      notify('Informe o WhatsApp', 'warning');
      return;
    }

    const tagObjs = tags.filter((t) => (form.tagIds || []).includes(t.id));
    const classObj = classes.find((c) => c.id === form.classificationId);
    const nowIso = new Date().toISOString();

    if (editing) {
      const payload = {
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        tags: tagObjs,
        classification: classObj,
      };
      const upd = await api.contacts.update(editing.id, payload);
      setContacts((p) => p.map((c) => (c.id === editing.id ? upd : c)));
      await api.audit.log('Contato editado', 'Contatos', 'Contact', editing.id);
      notify('Contato atualizado');
    } else {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        tags: [],
        classification: classObj,
        responsibleId: form.responsibleId,
        origin: form.origin || 'manual',
        customFields: { createdVia: 'manual' },
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const created = await api.contacts.create(payload);
      setContacts((p) => [created, ...p]);
      await api.audit.log('Contato criado', 'Contatos', 'Contact', created.id);
      notify('Contato criado');
    }
    setFormOpen(false);
  };

  const doDelete = async () => {
    if (!delId) return;
    await api.contacts.delete(delId);
    setContacts((p) => p.filter((c) => c.id !== delId));
    notify('Contato excluido');
  };

  const toggleTag = (id: string) =>
    setForm((f) => {
      const tagIds = f.tagIds || [];
      return { ...f, tagIds: tagIds.includes(id) ? tagIds.filter((x) => x !== id) : [...tagIds, id] };
    });

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Contatos"
        subtitle="Gerencie seus contatos e clientes"
        actions={
          <>
            <button className="btn btn-outline" onClick={() => setImportOpen(true)}>
              <i className="ti ti-upload" /> Importar
            </button>
            <button
              className="btn btn-outline"
              onClick={async () => {
                await api.contacts.export();
                notify('Exportacao preparada');
              }}
            >
              <i className="ti ti-download" /> Exportar
            </button>
            <button className="btn btn-primary" onClick={openNew}>
              <i className="ti ti-plus" /> Novo Contato
            </button>
          </>
        }
      />

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input placeholder="Buscar por nome, telefone ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={fTag} onChange={(e) => setFTag(e.target.value)}>
          <option value="">Todas as tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select className="filter-select" value={fResp} onChange={(e) => setFResp(e.target.value)}>
          <option value="">Todos responsaveis</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select className="filter-select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Todos status</option>
          <option value="active">Ativo</option>
          <option value="archived">Arquivado</option>
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="ti ti-users" title="Nenhum contato encontrado" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Empresa</th>
                <th>Tags</th>
                <th>Classificacao</th>
                <th>Responsavel</th>
                <th>Ultima interacao</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }}>
                  <td onClick={() => navigate(`/contacts/${c.id}`)}>
                    <div className="flex items-center gap-1">
                      <div className="avatar-sm">{c.name.charAt(0)}</div>
                      <div>
                        <div className="fw-600">{c.name}</div>
                        <div className="text-xs text-muted">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td onClick={() => navigate(`/contacts/${c.id}`)}>{c.phone}</td>
                  <td onClick={() => navigate(`/contacts/${c.id}`)}>{c.company || '-'}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map((t) => (
                        <span key={t.id} className="tag-chip" style={{ background: t.color, fontSize: '.62rem' }}>
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{c.classification && <span className="badge" style={{ background: `${c.classification.color}22`, color: c.classification.color }}>{c.classification.name}</span>}</td>
                  <td>{users.find((u) => u.id === c.responsibleId)?.name || '-'}</td>
                  <td>{c.lastInteraction ? new Date(c.lastInteraction).toLocaleDateString('pt-BR') : '-'}</td>
                  <td>
                    <span className={`badge bg-light-${c.status === 'active' ? 'success' : 'secondary'} text-${c.status === 'active' ? 'success' : 'secondary'}`}>
                      {c.status === 'active' ? 'Ativo' : 'Arquivado'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="icon-btn" onClick={() => openEdit(c)}>
                        <i className="ti ti-edit" />
                      </button>
                      <button className="icon-btn" onClick={() => setDelId(c.id)}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar Contato' : 'Novo Contato'}
        size="lg"
        footer={
          <>
            <button className="btn btn-light-secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={save}>
              Salvar
            </button>
          </>
        }
      >
        {!editing ? (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>
                  Nome <span className="req">*</span>
                </label>
                <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>
                  WhatsApp <span className="req">*</span>
                </label>
                <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="alert-note mt-1">Responsavel, classificacao e origem manual sao definidos automaticamente para novo contato.</div>
          </>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>
                  Nome <span className="req">*</span>
                </label>
                <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>
                  WhatsApp <span className="req">*</span>
                </label>
                <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>E-mail</label>
                <input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Documento</label>
                <input value={form.document || ''} onChange={(e) => setForm({ ...form, document: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Empresa</label>
                <input value={form.company || ''} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Cargo</label>
                <input value={form.position || ''} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Cidade</label>
                <input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <input value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Tags</label>
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`tag-select ${(form.tagIds || []).includes(t.id) ? 'on' : ''}`}
                    style={{ borderColor: t.color, color: (form.tagIds || []).includes(t.id) ? '#fff' : t.color, background: (form.tagIds || []).includes(t.id) ? t.color : 'transparent' }}
                    onClick={() => toggleTag(t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Observacoes</label>
              <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importar Contatos"
        footer={
          <>
            <button className="btn btn-light-secondary" onClick={() => setImportOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                await api.contacts.import(new File([], 'x'));
                setImportOpen(false);
                load();
                notify('12 contatos importados');
              }}
            >
              Importar
            </button>
          </>
        }
      >
        <div className="upload-zone">
          <i className="ti ti-file-spreadsheet" />
          <p>Arraste um arquivo CSV ou clique para selecionar</p>
          <input type="file" accept=".csv" />
        </div>
        <p className="text-xs text-muted mt-1">Formato: nome, telefone, email, empresa, origem</p>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={doDelete} title="Excluir contato" message="Tem certeza que deseja excluir este contato? Esta acao nao pode ser desfeita." />
    </div>
  );
}