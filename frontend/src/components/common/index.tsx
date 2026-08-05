import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'ti ti-inbox', title, description, action }: { icon?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><i className={icon} /></div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message = 'Ocorreu um erro', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="error-state">
      <i className="ti ti-alert-circle" />
      <p>{message}</p>
      {onRetry && <button className="btn btn-light-primary" onClick={onRetry}>Tentar novamente</button>}
    </div>
  );
}

export function Badge({ children, color = 'primary', light = true }: { children: ReactNode; color?: string; light?: boolean }) {
  return <span className={`badge ${light ? `bg-light-${color} text-${color}` : `bg-${color}`}`}>{children}</span>;
}

export function StatusDot({ status }: { status: 'active' | 'inactive' | 'away' | 'busy' | string }) {
  const map: Record<string, string> = { active: 'online', inactive: 'offline', away: 'away', busy: 'busy' };
  return <span className={`status-dot ${map[status] || 'offline'}`} />;
}

export function Modal({ open, onClose, title, children, footer, size = 'md', className = '' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-box modal-${size} ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <button className="btn btn-light-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>Confirmar</button>
      </>}>
      <p>{message}</p>
    </Modal>
  );
}
