import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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

/** Icone (?) com tooltip — usado para tirar textos explicativos de dentro do formulario. */
export function Hint({ text, side = 'top' }: { text: string; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <span className={`hint hint-${side}`} tabIndex={0} role="button" aria-label={text}>
      <i className="ti ti-help-circle" />
      <span className="hint-bubble" role="tooltip">{text}</span>
    </span>
  );
}

/** Label de campo com (?) opcional. Mantem os textos de ajuda fora do fluxo do formulario. */
export function FieldLabel({ children, hint, required, htmlFor }: { children: ReactNode; hint?: string; required?: boolean; htmlFor?: string }) {
  return (
    <label className="field-label" htmlFor={htmlFor}>
      <span>{children}{required && <span className="req"> *</span>}</span>
      {hint && <Hint text={hint} />}
    </label>
  );
}

/** Bloco de campos agrupados com titulo — quebra formularios longos em secoes legiveis. */
export function FormSection({ title, description, children, columns = 1 }: { title?: string; description?: string; children: ReactNode; columns?: 1 | 2 | 3 }) {
  return (
    <section className="form-section">
      {title && (
        <header className="form-section-head">
          <h4>{title}</h4>
          {description && <p>{description}</p>}
        </header>
      )}
      <div className={`form-section-body cols-${columns}`}>{children}</div>
    </section>
  );
}

/**
 * Modal ancorado na area de conteudo (nao cobre a sidebar/header).
 * O overlay e renderizado dentro de `.app-main` quando existir, senao no body.
 */
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', className = '' }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setHost((document.querySelector('.app-main') as HTMLElement) || document.body);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !host) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-box modal-${size} ${className}`.trim()} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-heading">
            <h3>{title}</h3>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><i className="ti ti-x" /></button>
        </div>
        <div className="modal-body app-scroll">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    host,
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
