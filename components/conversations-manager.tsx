'use client';

import { LEAD_STATUSES, STATUS_STYLES } from '@/lib/constants';
import {
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCheck,
  Flame,
  Loader2,
  MessageCircle,
  Phone,
  Radio,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  UserCheck,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Message = {
  id: number;
  role: string;
  content: string;
  createdAt: string;
  isDraft: boolean;
};
type Conversation = {
  id: number;
  leadId: number;
  updatedAt: string;
  lead: {
    id: number;
    name: string;
    company: string | null;
    phone: string;
    status: string;
    service: { name: string } | null;
    aiEnabled: boolean;
    leadTemperature: 'cold' | 'warm' | 'hot';
    intentScore: number;
    recommendedAction: string | null;
    aiSummary: string | null;
    channel: string;
    nextFollowUpAt: string | null;
  };
  messages: Message[];
};
type Analysis = {
  resumen: string;
  servicio_recomendado: string;
  nivel_interes: string;
  presupuesto_detectado: number | null;
  accion_recomendada: string;
};
type Filter = 'active' | 'won' | 'closed';

export function ConversationsManager({
  initial,
  initialLeadId,
}: {
  initial: Conversation[];
  initialLeadId?: number;
}) {
  const [items, setItems] = useState(initial);
  const [selectedId, setSelectedId] = useState(
    initial.find((c) => c.leadId === initialLeadId)?.id || initial[0]?.id,
  );
  const [draft, setDraft] = useState('');
  const [aiDraft, setAiDraft] = useState(false);
  const [sourceDraftId, setSourceDraftId] = useState<number | null>(null);
  const [customerMode, setCustomerMode] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState<'reply' | 'analysis' | 'send' | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<number, string>>(
    {},
  );
  const bottom = useRef<HTMLDivElement>(null);

  const selected = items.find((c) => c.id === selectedId);
  const followUp = selected
    ? (followUpDrafts[selected.id] ??
      toLocalInput(selected.lead.nextFollowUpAt))
    : '';
  const filtered = useMemo(
    () =>
      items.filter((c) => {
        const matchesSearch = `${c.lead.name} ${c.lead.company}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesStatus =
          filter === 'active'
            ? !['Ganado', 'Perdido'].includes(c.lead.status)
            : filter === 'won'
              ? c.lead.status === 'Ganado'
              : c.lead.status === 'Perdido';
        return matchesSearch && matchesStatus;
      }),
    [items, search, filter],
  );

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages.length]);

  async function reload(keepId = selectedId) {
    const data = await fetch('/api/conversations').then((r) => r.json());
    setItems(data);
    setSelectedId(keepId);
  }

  function changeFilter(next: Filter) {
    setFilter(next);
    const first = items.find((c) =>
      next === 'active'
        ? !['Ganado', 'Perdido'].includes(c.lead.status)
        : next === 'won'
          ? c.lead.status === 'Ganado'
          : c.lead.status === 'Perdido',
    );
    if (first) setSelectedId(first.id);
    setAnalysis(null);
  }

  async function send() {
    if (!draft.trim() || !selected) return;
    setBusy('send');
    setError('');
    const role = customerMode ? 'customer' : aiDraft ? 'ai' : 'agent';
    const res = await fetch(`/api/conversations/${selected.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        content: draft,
        draftMessageId: sourceDraftId,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      setDraft('');
      setCustomerMode(false);
      setAiDraft(false);
      setSourceDraftId(null);
      await reload();
    }
    setBusy(null);
  }

  async function generate() {
    if (!selected) return;
    setBusy('reply');
    setError('');
    const res = await fetch('/api/ai/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selected.id }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      setDraft(data.reply);
      setCustomerMode(false);
      setAiDraft(true);
      setSourceDraftId(null);
    }
    setBusy(null);
  }

  async function analyze() {
    if (!selected) return;
    setBusy('analysis');
    setError('');
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selected.id }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else setAnalysis(data);
    setBusy(null);
  }

  async function status(value: string) {
    if (!selected) return;
    await fetch(`/api/leads/${selected.lead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: value }),
    });
    await reload();
  }

  async function setAiEnabled(aiEnabled: boolean) {
    if (!selected) return;
    setError('');
    const res = await fetch(`/api/leads/${selected.lead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiEnabled }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else await reload();
  }

  async function scheduleFollowUp() {
    if (!selected) return;
    setError('');
    const res = await fetch(`/api/leads/${selected.lead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nextFollowUpAt: followUp ? new Date(followUp).toISOString() : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else await reload();
  }

  if (!items.length)
    return (
      <div className="grid min-h-[70vh] place-items-center text-center">
        <div>
          <MessageCircle className="mx-auto mb-3 text-violet-500" />
          <h1 className="text-xl font-semibold">Aún no hay conversaciones</h1>
          <p className="mt-2 text-sm text-[#777481]">
            Crea un prospecto para comenzar.
          </p>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-5">
        <p className="mb-1 text-sm font-medium text-violet-600">
          Bandeja comercial
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Conversaciones</h1>
      </header>

      <section className="grid h-[calc(100vh-200px)] min-h-[680px] grid-rows-[220px_1fr] overflow-hidden rounded-2xl border border-[#e4e1e9] bg-white shadow-[0_4px_20px_rgba(32,29,53,.05)] md:grid-cols-[280px_minmax(0,1fr)] md:grid-rows-1 xl:grid-cols-[290px_minmax(400px,1fr)_300px]">
        <aside className="overflow-y-auto border-b border-[#ece9f0] md:border-b-0 md:border-r">
          <div className="sticky top-0 z-10 border-b border-[#ece9f0] bg-white p-3">
            <div className="flex items-center gap-2 rounded-xl bg-[#f4f3f7] px-3">
              <Search size={16} className="text-[#8c8995]" />
              <input
                aria-label="Buscar conversaciones"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm outline-none"
                placeholder="Buscar conversación"
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-[#f4f3f7] p-1">
              {(['active', 'won', 'closed'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => changeFilter(key)}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${filter === key ? 'bg-white text-violet-700 shadow-sm' : 'text-[#85818d]'}`}
                >
                  {key === 'active'
                    ? 'Activas'
                    : key === 'won'
                      ? 'Ganadas'
                      : 'Cerradas'}
                </button>
              ))}
            </div>
          </div>
          {filtered.map((c) => {
            const last = c.messages.at(-1);
            const hot = c.lead.leadTemperature === 'hot';
            return (
              <button
                aria-label={`Abrir conversación con ${c.lead.name}`}
                key={c.id}
                onClick={() => {
                  setSelectedId(c.id);
                  setAnalysis(null);
                  setError('');
                }}
                className={`w-full border-b border-[#f0eef3] p-4 text-left ${c.id === selectedId ? (hot ? 'border-l-[3px] border-l-rose-500 bg-rose-50/70' : 'border-l-[3px] border-l-violet-600 bg-violet-50/70') : hot ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-[#faf9fc]'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e9e6fa] font-semibold text-violet-700">
                    {initials(c.lead.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-semibold">
                        {c.lead.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-[#918e98]">
                        {last ? time(last.createdAt) : ''}
                      </span>
                    </div>
                    <p className="truncate text-xs text-[#777481]">
                      {c.lead.company || 'Sin empresa'}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      <p className="min-w-0 flex-1 truncate text-xs text-[#97939e]">
                        {last?.content || 'Sin mensajes'}
                      </p>
                      {last?.role === 'ai' && (
                        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">
                          IA
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${STATUS_STYLES[c.lead.status] || STATUS_STYLES.Nuevo}`}
                      >
                        {c.lead.status}
                      </span>
                      <Temperature value={c.lead.leadTemperature} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {!filtered.length && (
            <p className="p-6 text-center text-xs leading-5 text-[#96929d]">
              No hay conversaciones en esta categoría.
            </p>
          )}
        </aside>

        {selected && (
          <main className="flex min-w-0 flex-col bg-[#efeae3]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2dee5] bg-white px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-violet-600 font-semibold text-white">
                  {initials(selected.lead.name)}
                </div>
                <div>
                  <h2 className="font-semibold">{selected.lead.name}</h2>
                  <p className="text-xs text-[#7d7985]">
                    {selected.lead.company || 'Sin empresa'} ·{' '}
                    {selected.lead.service?.name || 'Servicio sin definir'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`hidden items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold sm:flex ${selected.lead.channel === 'whatsapp' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                >
                  {selected.lead.channel === 'whatsapp' ? (
                    <Radio size={11} />
                  ) : (
                    <UserRound size={11} />
                  )}{' '}
                  {selected.lead.channel === 'whatsapp'
                    ? 'WhatsApp real'
                    : 'Simulación'}
                </span>
                <span className="hidden items-center gap-1 text-xs text-[#777481] sm:flex">
                  <Phone size={13} />
                  {selected.lead.phone}
                </span>
                <select
                  aria-label="Estado del prospecto"
                  value={selected.lead.status}
                  onChange={(e) => void status(e.target.value)}
                  className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ring-1 ring-inset ${STATUS_STYLES[selected.lead.status] || STATUS_STYLES.Nuevo}`}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="chat-wallpaper flex-1 space-y-3 overflow-y-auto p-5">
              {selected.messages.map((m) => {
                const outgoing = m.role !== 'customer';
                return (
                  <div
                    key={m.id}
                    className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-5 shadow-sm ${outgoing ? 'rounded-br-sm bg-[#d9fdd3] text-[#252b27]' : 'rounded-bl-sm bg-white text-[#2c2934]'}`}
                    >
                      {m.role === 'ai' && (
                        <span
                          className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${m.isDraft ? 'bg-amber-100 text-amber-800' : 'bg-violet-100 text-violet-700'}`}
                        >
                          <Sparkles size={9} />{' '}
                          {m.isDraft
                            ? 'Borrador · pendiente de humano'
                            : 'IA aprobada'}
                        </span>
                      )}
                      <p>{m.content}</p>
                      {m.isDraft && (
                        <button
                          onClick={() => {
                            setDraft(m.content);
                            setCustomerMode(false);
                            setAiDraft(true);
                            setSourceDraftId(m.id);
                          }}
                          className="mt-2 rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200"
                        >
                          Usar borrador
                        </button>
                      )}
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#7d827f]">
                        {time(m.createdAt)}
                        {outgoing && (
                          <CheckCheck size={13} className="text-sky-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottom} />
            </div>

            <div className="border-t border-[#e1dde4] bg-[#f6f4f7] p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={generate}
                  disabled={!!busy || !selected.lead.aiEnabled}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 disabled:opacity-50"
                >
                  {busy === 'reply' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}{' '}
                  Generar respuesta con IA
                </button>
                <button
                  onClick={() => {
                    setCustomerMode(!customerMode);
                    setDraft('');
                    setAiDraft(false);
                    setSourceDraftId(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${customerMode ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-[#625f6a]'}`}
                >
                  <UserRound size={14} className="mr-1 inline" />
                  Simular mensaje del cliente
                </button>
                {selected.lead.aiEnabled ? (
                  <button
                    onClick={() => void setAiEnabled(false)}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#625f6a]"
                  >
                    <UserCheck size={14} /> Tomar conversación
                  </button>
                ) : (
                  <button
                    onClick={() => void setAiEnabled(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                  >
                    <RotateCcw size={14} /> Devolver a IA
                  </button>
                )}
                <button
                  role="switch"
                  aria-checked={selected.lead.aiEnabled}
                  aria-label="Alternar IA activa"
                  onClick={() => void setAiEnabled(!selected.lead.aiEnabled)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${selected.lead.aiEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  <span
                    className={`relative h-3.5 w-6 rounded-full ${selected.lead.aiEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition ${selected.lead.aiEnabled ? 'left-3' : 'left-0.5'}`}
                    />
                  </span>
                  IA {selected.lead.aiEnabled ? 'activa' : 'pausada'}
                </button>
                {aiDraft && (
                  <span className="flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    <Sparkles size={10} /> Borrador generado con IA
                  </span>
                )}
              </div>
              <div
                className={`flex items-end gap-2 rounded-xl border bg-white p-2 ${customerMode ? 'border-emerald-300' : aiDraft ? 'border-violet-300 ring-2 ring-violet-100' : 'border-[#dcd9e3]'}`}
              >
                <textarea
                  aria-label="Mensaje"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={2}
                  className="max-h-32 min-h-12 flex-1 resize-none px-2 py-1 text-sm outline-none"
                  placeholder={
                    customerMode
                      ? 'Escribe como si fueras el cliente...'
                      : 'Escribe o edita una respuesta...'
                  }
                />
                <button
                  aria-label="Enviar mensaje"
                  disabled={!!busy || !draft.trim()}
                  onClick={send}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white disabled:opacity-40"
                >
                  {busy === 'send' ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                </button>
              </div>
              {error && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
            </div>
          </main>
        )}

        <aside className="hidden overflow-y-auto border-l border-[#ece9f0] bg-white p-5 xl:block">
          <div className="mb-5 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Análisis comercial</h3>
              <p className="text-xs text-[#8a8792]">Impulsado por IA</p>
            </div>
          </div>
          <div className="mb-5 rounded-xl bg-[#f7f6fa] p-3 text-xs leading-5 text-[#6f6b77]">
            <p className="flex items-center gap-1.5 font-semibold text-[#3a3642]">
              <BriefcaseBusiness size={14} className="text-violet-600" />
              Contexto comercial
            </p>
            <p className="mt-1">
              {selected?.lead.service?.name || 'Servicio por definir'}
            </p>
          </div>
          <button
            onClick={analyze}
            disabled={!!busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700 disabled:opacity-50"
          >
            {busy === 'analysis' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}{' '}
            Analizar prospecto
          </button>
          <div className="mt-4 rounded-xl border border-[#ebe8ef] p-3">
            <label className="block text-xs font-semibold text-[#4a4652]">
              <span className="flex items-center gap-1.5">
                <CalendarClock size={14} className="text-violet-600" /> Próximo
                seguimiento
              </span>
              <input
                aria-label="Fecha del próximo seguimiento"
                type="datetime-local"
                value={followUp}
                onChange={(event) =>
                  selected &&
                  setFollowUpDrafts((current) => ({
                    ...current,
                    [selected.id]: event.target.value,
                  }))
                }
                className="mt-2 block w-full rounded-lg border border-[#dedbe6] px-2 py-1.5 text-xs font-normal outline-none focus:border-violet-500"
              />
            </label>
            <button
              onClick={() => void scheduleFollowUp()}
              className="mt-2 w-full rounded-lg bg-[#f3f1f7] px-2 py-1.5 text-xs font-semibold text-violet-700"
            >
              {followUp ? 'Guardar seguimiento' : 'Quitar seguimiento'}
            </button>
          </div>
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="mb-1 text-xs font-medium text-[#908c97]">
                Temperatura
              </p>
              <Temperature value={selected?.lead.leadTemperature || 'cold'} />
            </div>
            <Insight
              label="Intención de compra"
              value={`${selected?.lead.intentScore || 0}/100`}
            />
            <Insight
              label="Resumen IA"
              value={
                analysis?.resumen ||
                selected?.lead.aiSummary ||
                'Aún no hay resumen.'
              }
            />
            <Insight
              label="Servicio recomendado"
              value={
                analysis?.servicio_recomendado ||
                selected?.lead.service?.name ||
                'Por definir'
              }
            />
            <Insight
              label="Acción recomendada"
              value={
                analysis?.accion_recomendada ||
                selected?.lead.recommendedAction ||
                'Analiza la conversación para obtener el próximo paso.'
              }
            />
            {analysis?.presupuesto_detectado != null && (
              <Insight
                label="Presupuesto detectado"
                value={money(analysis.presupuesto_detectado)}
              />
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function Insight({
  label,
  value,
  badge = false,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-[#908c97]">{label}</p>
      {badge ? (
        <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
          {value}
        </span>
      ) : (
        <p className="leading-5 text-[#37333f]">{value}</p>
      )}
    </div>
  );
}
function Temperature({ value }: { value: 'cold' | 'warm' | 'hot' }) {
  const styles =
    value === 'hot'
      ? 'bg-rose-100 text-rose-700 ring-rose-200'
      : value === 'warm'
        ? 'bg-amber-100 text-amber-700 ring-amber-200'
        : 'bg-sky-100 text-sky-700 ring-sky-200';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ring-1 ring-inset ${styles}`}
    >
      {value === 'hot' && <Flame size={10} />}{' '}
      {value === 'hot' ? 'Hot' : value === 'warm' ? 'Warm' : 'Cold'}
    </span>
  );
}
function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
}
function time(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Guatemala',
  }).formatToParts(new Date(value));
  return `${parts.find((part) => part.type === 'hour')?.value}:${parts.find((part) => part.type === 'minute')?.value}`;
}
function money(value: number) {
  return `$${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
function toLocalInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .replace(' ', 'T');
}
