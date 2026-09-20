'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LockKeyhole, LogOut } from 'lucide-react';

export function AdminMenu() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  async function logout() {
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('logout');
      window.location.assign('/login');
    } catch {
      setError('No se pudo cerrar sesión. Intenta de nuevo.');
      setPending(false);
    }
  }
  return (
    <div className="relative border-l border-[#ebe8ef] pl-3" ref={container}>
      <button
        ref={trigger}
        type="button"
        aria-label="Administrador"
        aria-expanded={open}
        aria-controls="admin-options"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl p-1 text-left outline-none hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#eeeafd] text-sm font-bold text-violet-700">
          SS
        </span>
        <span className="hidden md:block">
          <span className="block text-xs font-semibold">Soul Studios</span>
          <span className="block text-[11px] text-[#8a8792]">
            Administrador
          </span>
        </span>
        <ChevronDown size={14} className="text-[#9b97a2]" />
      </button>
      {open && (
        <div
          id="admin-options"
          className="absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-[#e8e5ed] bg-white p-2 shadow-xl"
        >
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#8a8792]">
            Tu cuenta
          </p>
          <Link
            href="/settings/security"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-violet-50"
          >
            <LockKeyhole size={17} />
            Cambiar contraseña
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut size={17} />
            {pending ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
          {error && (
            <p role="alert" className="px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
