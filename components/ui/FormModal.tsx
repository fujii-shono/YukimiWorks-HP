'use client';

export function FormModal({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="modal-panel modal-panel-small" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
        <h3>{title}</h3>
        <p className="modal-message">{message}</p>
      </div>
    </div>
  );
}
