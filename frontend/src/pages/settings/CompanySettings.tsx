import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PageHeader, LoadingState } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';

export default function CompanySettings() {
  const { notify } = useToast();
  const [form, setForm] = useState<any>(null);

  useEffect(() => { api.settings.getCompany().then(setForm); }, []);
  if (!form) return <LoadingState />;
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const save = async () => { await api.settings.updateCompany(form); await api.audit.log('Dados da empresa atualizados', 'Configurações', 'Company', form.id); notify('Dados salvos'); };

  return (
    <div className="page-shell">
      <PageHeader title="Dados da Empresa" subtitle="Informações cadastrais"
        actions={<button className="btn btn-primary" onClick={save}>Salvar</button>} />
      <div className="card page-section-card" style={{ padding: '1.25rem' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="company-logo">{(form.name || 'E').charAt(0)}</div>
          <div><h3 className="m-0">{form.name}</h3><p className="text-muted text-sm m-0">{form.email}</p></div>
        </div>
        <div className="form-row"><div className="form-group"><label>Nome</label><input value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></div><div className="form-group"><label>Razão social</label><input value={form.legalName || ''} onChange={(e) => set('legalName', e.target.value)} /></div></div>
        <div className="form-row"><div className="form-group"><label>Documento (CNPJ)</label><input value={form.document || ''} onChange={(e) => set('document', e.target.value)} /></div><div className="form-group"><label>Telefone</label><input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div></div>
        <div className="form-row"><div className="form-group"><label>E-mail</label><input value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></div><div className="form-group"><label>Site</label><input value={form.website || ''} onChange={(e) => set('website', e.target.value)} /></div></div>
        <div className="form-group"><label>Endereço</label><input value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></div>
        <div className="form-row form-row-3"><div className="form-group"><label>Cidade</label><input value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></div><div className="form-group"><label>Estado</label><input value={form.state || ''} onChange={(e) => set('state', e.target.value)} /></div><div className="form-group"><label>País</label><input value={form.country || ''} onChange={(e) => set('country', e.target.value)} /></div></div>
      </div>
    </div>
  );
}



