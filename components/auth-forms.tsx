'use client';

import { useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ArrowRight,
} from 'lucide-react';

const inputClass =
  'mt-2 w-full rounded-xl border border-[#dedbe8] bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100';

function PasswordField({
  name,
  label,
  autoComplete,
  minLength,
}: {
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium text-[#393345]">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={128}
          className={inputClass + ' pr-12'}
        />
        <button
          type="button"
          aria-label={(visible ? 'Ocultar ' : 'Mostrar ') + label.toLowerCase()}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-5 rounded p-1 text-[#82798e] hover:text-violet-700"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.get('username'),
          password: data.get('password'),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'No se pudo iniciar sesión.');
        return;
      }
      window.location.assign('/dashboard');
    } catch {
      setError('No pudimos conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="username"
          className="text-sm font-medium text-[#393345]"
        >
          Usuario
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={191}
          placeholder="Tu usuario administrador"
          className={inputClass}
        />
      </div>
      <PasswordField
        name="password"
        label="Contraseña"
        autoComplete="current-password"
      />
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6d5ce8] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <ArrowRight size={18} />
        )}
        {pending ? 'Ingresando…' : 'Iniciar sesión'}
      </button>
      <p className="flex items-center justify-center gap-2 pt-2 text-xs text-[#82798e]">
        <LockKeyhole size={13} />
        Acceso privado · Solo administradores
      </p>
    </form>
  );
}

export function PasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get('newPassword') !== data.get('confirmPassword')) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }
    setPending(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'No se pudo cambiar la contraseña.');
        return;
      }
      form.reset();
      setComplete(true);
    } catch {
      setError('No pudimos conectar. Intenta de nuevo.');
    } finally {
      setPending(false);
    }
  }
  if (complete)
    return (
      <div
        aria-live="polite"
        className="mt-6 rounded-xl bg-emerald-50 p-6 text-emerald-900"
      >
        <h2 className="font-semibold">Contraseña actualizada</h2>
        <p className="mt-2 text-sm">
          Todas las sesiones se cerraron por seguridad. Ingresa con tu nueva
          contraseña.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    );
  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <PasswordField
        name="currentPassword"
        label="Contraseña actual"
        autoComplete="current-password"
      />
      <PasswordField
        name="newPassword"
        label="Nueva contraseña"
        autoComplete="new-password"
        minLength={12}
      />
      <PasswordField
        name="confirmPassword"
        label="Confirmar nueva contraseña"
        autoComplete="new-password"
        minLength={12}
      />
      <p className="text-sm leading-6 text-[#777481]">
        Usa entre 12 y 128 caracteres. Una frase larga y única es una buena
        opción. Al guardar, se cerrarán todas tus sesiones, incluida esta.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <button
        disabled={pending}
        className="flex items-center gap-2 rounded-xl bg-[#6d5ce8] px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending && <LoaderCircle size={18} className="animate-spin" />}
        {pending ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
