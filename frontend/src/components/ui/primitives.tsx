import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

export function Button({
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive";
}) {
  return (
    <button
      className={`button ${variant === "default" ? "primary" : variant === "destructive" ? "danger" : variant === "outline" ? "secondary" : "quiet"} ${className}`}
      {...props}
    />
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${props.className ?? ""}`} {...props} />;
}
export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`ui-label ${props.className ?? ""}`} {...props} />;
}
export function CardPrimitive({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return <span className={`ui-badge ${tone}`}>{children}</span>;
}
export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`ui-skeleton ${className}`} aria-hidden="true" />;
}
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`ui-switch ${checked ? "checked" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <i />
    </button>
  );
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`ui-select ${props.className ?? ""}`} {...props} />;
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="ui-progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function Separator() {
  return <hr className="ui-separator" />;
}
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  );
}
export function Tooltip({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <span className="ui-tooltip" tabIndex={0} aria-label={label}>
      {children}
      <span role="tooltip">{label}</span>
    </span>
  );
}
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="ui-sheet-backdrop" onMouseDown={onClose}>
      <section
        className="ui-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="ui-dialog-backdrop" onMouseDown={onClose}>
      <section
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function AlertDialog(props: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={props.open} title={props.title} onClose={props.onCancel}>
      <p>{props.description}</p>
      <div className="ui-dialog-actions">
        <Button variant="outline" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={props.onConfirm}>
          {props.confirmText ?? "Confirm"}
        </Button>
      </div>
    </Dialog>
  );
}
export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="ui-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={tab === value}
          className={tab === value ? "selected" : ""}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
export function DropdownMenu({
  label,
  items,
}: {
  label: string;
  items: { label: string; onSelect: () => void }[];
}) {
  return (
    <details className="ui-dropdown">
      <summary>{label}</summary>
      <div>
        {items.map((item) => (
          <button key={item.label} onClick={item.onSelect}>
            {item.label}
          </button>
        ))}
      </div>
    </details>
  );
}
