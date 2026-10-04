import type { ReactNode } from 'react';

/** Bottom sheet with one big confirm button (one-handed on a phone). */
export function Confirm({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
  disabled,
}: {
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="sheet__title">{title}</div>
        {children}
        <button className={`btn btn--xl ${danger ? 'btn--danger' : 'btn--go'}`} onClick={onConfirm} disabled={disabled} autoFocus>
          {confirmLabel}
        </button>
        <button className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Plain bottom sheet; tapping outside closes it. */
export function Sheet({ title, children, onClose }: { title: ReactNode; children: ReactNode; onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="sheet__title">{title}</div>
        {children}
        <button className="btn btn--ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
