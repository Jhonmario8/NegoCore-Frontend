export function Button({
  variant = "primary",
  size,
  loading,
  children,
  className = "",
  ...rest
}) {
  const cls = `btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${className}`;
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}

export function IconButton({ children, danger, className = "", ...rest }) {
  return (
    <button className={`icon-btn ${danger ? "danger" : ""} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

export function Input(props) {
  return <input className={`input ${props.error ? "has-error" : ""}`} {...props} />;
}

export function Select({ children, ...rest }) {
  return (
    <select className="input" {...rest}>
      {children}
    </select>
  );
}

export function Badge({ tone = "neutral", children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div style={{ fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>{title}</div>
      {description && <div>{description}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 620 } : undefined}>
        <div className="modal-header">
          <h3>{title}</h3>
          <IconButton onClick={onClose} aria-label="Cerrar">
            <XIcon />
          </IconButton>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Card({ title, action, children }) {
  return (
    <div className="card">
      {title && (
        <div className="card-header">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="page-loading">
      <span className="spinner dark" />
    </div>
  );
}

/* ---------- Icons (inline SVG, sin dependencias externas) ---------- */
const icon = (path, props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {path}
  </svg>
);

export const HomeIcon = (p) => icon(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" /></>, p);
export const SearchIcon = (p) => icon(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>, p);
export const BoxIcon = (p) => icon(<><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>, p);
export const TagIcon = (p) => icon(<><path d="M12 2 2 12l10 10 10-10-10-10Z" /><circle cx="8" cy="8" r="1.2" fill="currentColor" /></>, p);
export const UsersIcon = (p) => icon(<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17" cy="8.5" r="2.6" /><path d="M15.5 14c2.6.4 4.5 2.4 4.5 6" /></>, p);
export const TruckIcon = (p) => icon(<><rect x="1" y="6" width="13" height="10" rx="1" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="6" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></>, p);
export const CartIcon = (p) => icon(<><circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6" /></>, p);
export const CashIcon = (p) => icon(<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 9v0M18 15v0" /></>, p);
export const ReceiptIcon = (p) => icon(<><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></>, p);
export const AlertIcon = (p) => icon(<><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17v0" /></>, p);
export const ChartIcon = (p) => icon(<><path d="M4 20V10M12 20V4M20 20v-7" /></>, p);
export const HistoryIcon = (p) => icon(<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></>, p);
export const PlusIcon = (p) => icon(<path d="M12 5v14M5 12h14" />, p);
export const EditIcon = (p) => icon(<><path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z" /></>, p);
export const TrashIcon = (p) => icon(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /></>, p);
export const XIcon = (p) => icon(<><path d="M18 6 6 18M6 6l12 12" /></>, p);
export const LogoutIcon = (p) => icon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>, p);
export const WalletIcon = (p) => icon(<><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" /><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-4" /><path d="M17 12h3v4h-3a2 2 0 0 1 0-4Z" /></>, p);
export const CheckIcon = (p) => icon(<path d="M20 6 9 17l-5-5" />, p);
export const ImageIcon = (p) => icon(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>, p);
export const UploadIcon = (p) => icon(<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>, p);
export const RefreshIcon = (p) => icon(<><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></>, p);
export const ChevronRightIcon = (p) => icon(<path d="m9 6 6 6-6 6" />, p);
