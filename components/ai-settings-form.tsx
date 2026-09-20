'use client';

import { Bot, CheckCircle2, KeyRound, Save, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

type Settings = {
  companyName: string;
  companyDescription: string;
  systemPrompt: string;
  tone: string;
  model: string;
  humanHandoffForHot: boolean;
};
const input =
  'mt-1.5 w-full rounded-xl border border-[#dedbe6] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-3 focus:ring-violet-100';

export function AISettingsForm({ initial }: { initial: Settings }) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  async function save(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaved(false);
    setError('');
    const res = await fetch('/api/settings/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setForm(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-7">
        <p className="mb-1 text-sm font-medium text-violet-600">
          Asistente comercial
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Configuración IA</h1>
        <p className="mt-2 text-sm text-[#777481]">
          Define cómo debe representar la IA a Soul Studios.
        </p>
      </header>
      <div className="mb-5 flex gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-900">
        <ShieldCheck className="shrink-0 text-violet-600" size={21} />
        <p>
          Las claves de OpenRouter y Meta nunca se guardan en el navegador.
          Configúralas únicamente en{' '}
          <code className="rounded bg-white/70 px-1.5 py-0.5">.env</code>.
        </p>
      </div>
      <form
        onSubmit={save}
        className="rounded-2xl border border-[#e8e5ed] bg-white p-6 shadow-[0_4px_18px_rgba(32,29,53,.035)]"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="font-semibold">Identidad y comportamiento</h2>
            <p className="text-sm text-[#7c7984]">
              Este contexto se aplica a respuestas y análisis.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Nombre de la empresa
            <input
              className={input}
              value={form.companyName}
              onChange={(e) =>
                setForm({ ...form, companyName: e.target.value })
              }
            />
          </label>
          <label className="text-sm font-medium">
            Modelo de OpenRouter
            <div className="relative">
              <KeyRound
                className="absolute left-3 top-4 text-[#9a96a1]"
                size={16}
              />
              <input
                className={`${input} pl-9`}
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium">
          Descripción de Soul Studios
          <textarea
            rows={3}
            className={`${input} resize-none`}
            value={form.companyDescription}
            onChange={(e) =>
              setForm({ ...form, companyDescription: e.target.value })
            }
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Tono de comunicación
          <input
            className={input}
            value={form.tone}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
          />
        </label>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <input
              aria-label="Intervención humana para prospectos HOT"
              type="checkbox"
            checked={form.humanHandoffForHot}
            onChange={(e) =>
              setForm({ ...form, humanHandoffForHot: e.target.checked })
            }
            className="mt-0.5 h-4 w-4 accent-violet-600"
          />
          <span>
            <b>Intervención humana para prospectos HOT</b>
            <span className="mt-1 block text-xs font-normal leading-5 text-amber-800">
              La IA guardará un borrador y pausará sus respuestas automáticas
              cuando detecte intención alta.
            </span>
          </span>
        </label>
        <label className="mt-4 block text-sm font-medium">
          Prompt del sistema
          <textarea
            rows={14}
            className={`${input} resize-y font-mono text-xs leading-5`}
            value={form.systemPrompt}
            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 size={16} /> Configuración guardada
            </span>
          )}
          <button className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700">
            <Save size={16} /> Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
