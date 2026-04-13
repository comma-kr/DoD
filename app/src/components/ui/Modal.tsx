'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-6 shadow-2xl sm:rounded-3xl sm:border"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-foreground-sub hover:bg-background hover:text-foreground"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
        {title ? (
          <h2 className="mb-4 pr-8 text-lg font-semibold">{title}</h2>
        ) : null}
        {children}
      </div>
    </div>
  );
}
