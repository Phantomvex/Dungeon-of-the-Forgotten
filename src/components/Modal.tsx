import { useEffect, useRef, type ReactNode } from 'react';

export default function Modal({ children, onClose, label, className = '' }: { children: ReactNode; onClose?: () => void; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const getFocusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([hidden]), select, [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
    getFocusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) closeRef.current?.();
      }
      if (event.key === 'Tab') {
        const items = getFocusable();
        if (!items.length) { event.preventDefault(); return; }
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !ref.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !ref.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => { document.removeEventListener('keydown', handleKey, true); document.body.style.overflow = previousOverflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);

  return <div className={`modal-backdrop ${className}`} onMouseDown={event => { if (event.target === event.currentTarget) closeRef.current?.(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className="modal-content">{children}</div>
  </div>;
}