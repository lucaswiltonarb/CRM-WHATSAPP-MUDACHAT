import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { AuditLog } from '../../types';
import { PageHeader, EmptyState, LoadingState } from '../../components/common';

export default function Audit() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fModule, setFModule] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { api.audit.list().then((l) => { setItems(l); setLoading(false); }); }, []);
  if (loading) return <LoadingState />;

  const modules = [...new Set(items.map(i => i.module))];
  const filtered = items.filter(i => (!fModule || i.module === fModule) && (!search || `${i.action} ${i.user?.name} ${i.entityType}`.toLowerCase().includes(search.toLowerCase())));

  return (
    <div>
      <PageHeader title="Log de Auditoria" subtitle="Histórico de ações no sistema" />
      <div className="toolbar">
        <div className="search-box"><i className="ti ti-search" /><input placeholder="Buscar ação ou usuário..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="filter-select" value={fModule} onChange={(e) => setFModule(e.target.value)}><option value="">Todos os módulos</option>{modules.map(m => <option key={m} value={m}>{m}</option>)}</select>
      </div>
      {filtered.length === 0 ? <div className="card"><EmptyState icon="ti ti-history" title="Sem registros" /></div> : (
        <div className="card"><table className="data-table"><thead><tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Módulo</th><th>Entidade</th><th>IP</th></tr></thead>
          <tbody>{filtered.map(l => (
            <tr key={l.id}>
              <td>{new Date(l.createdAt).toLocaleString('pt-BR')}</td>
              <td><div className="flex items-center gap-1"><div className="avatar-sm">{l.user?.name?.charAt(0) || '?'}</div>{l.user?.name || '-'}</div></td>
              <td><span className="badge bg-light-primary text-primary">{l.action}</span></td>
              <td>{l.module}</td>
              <td className="text-muted">{l.entityType}</td>
              <td className="text-xs text-muted">{l.ipAddress}</td>
            </tr>
          ))}</tbody></table></div>
      )}
    </div>
  );
}
