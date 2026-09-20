import { requireAdminPage } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { STATUS_STYLES } from '@/lib/constants';
import {
  ArrowUpRight,
  BadgeDollarSign,
  Briefcase,
  CircleDot,
  Send,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';

const money = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' });
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  await requireAdminPage();

  const leads = await prisma.lead.findMany({
    include: { service: true },
    orderBy: { updatedAt: 'desc' },
  });
  const active = leads.filter(
    (l) => !['Ganado', 'Perdido'].includes(l.status),
  ).length;
  const pipelineValue = leads
    .filter((l) => l.status !== 'Perdido')
    .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  const cards = [
    [
      'Prospectos nuevos',
      leads.filter((l) => l.status === 'Nuevo').length,
      CircleDot,
      'text-blue-600 bg-blue-50',
    ],
    ['Prospectos activos', active, Briefcase, 'text-violet-600 bg-violet-50'],
    [
      'Propuestas enviadas',
      leads.filter((l) => l.status === 'Propuesta enviada').length,
      Send,
      'text-amber-600 bg-amber-50',
    ],
    [
      'Clientes ganados',
      leads.filter((l) => l.status === 'Ganado').length,
      Trophy,
      'text-emerald-600 bg-emerald-50',
    ],
  ] as const;
  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-8">
        <p className="mb-1 text-sm font-medium text-violet-600">
          Resumen comercial
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Buenos días, Soul Studios
        </h1>
        <p className="mt-2 text-sm text-[#777481]">
          Esto es lo que está pasando con tus prospectos.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, tone]) => (
          <article
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-[#ebe9f0] bg-white p-5 shadow-[0_4px_18px_rgba(32,29,53,.035)]"
          >
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}
            >
              <Icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="mt-0.5 text-sm text-[#777481]">{label}</div>
            </div>
          </article>
        ))}
      </section>
      <section className="mt-4 flex flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-[#292542] p-6 text-white shadow-[0_12px_30px_rgba(32,29,53,.13)] sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/25 text-violet-200">
            <BadgeDollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-white/60">Valor estimado del pipeline</p>
            <p className="mt-1 text-3xl font-bold">
              {money.format(pipelineValue)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 border-white/10 sm:border-l sm:pl-8">
          <Metric
            label="Calificados"
            value={leads.filter((l) => l.status === 'Calificado').length}
          />
          <Metric
            label="Negociando"
            value={leads.filter((l) => l.status === 'Negociación').length}
          />
          <Metric
            label="Por cobrar"
            value={leads.filter((l) => l.status === 'Pendiente de pago').length}
          />
        </div>
      </section>
      <section className="mt-7 overflow-hidden rounded-2xl border border-[#ebe9f0] bg-white shadow-[0_4px_18px_rgba(32,29,53,.035)]">
        <div className="flex items-center justify-between border-b border-[#efedf3] px-6 py-5">
          <div>
            <h2 className="font-semibold">Prospectos recientes</h2>
            <p className="mt-1 text-sm text-[#8a8792]">
              Tus oportunidades con actividad más reciente
            </p>
          </div>
          <Link
            href="/leads"
            className="flex items-center gap-1 text-sm font-medium text-violet-600"
          >
            Ver todos <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-[#faf9fc] text-xs uppercase tracking-wide text-[#8a8792]">
              <tr>
                {[
                  'Nombre',
                  'Empresa',
                  'Servicio',
                  'Estado',
                  'Valor estimado',
                  'Último contacto',
                ].map((h) => (
                  <th key={h} className="px-6 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 7).map((lead) => (
                <tr
                  key={lead.id}
                  className="border-t border-[#f0eef3] transition hover:bg-[#fbfafe]"
                >
                  <td className="px-6 py-4 font-medium">{lead.name}</td>
                  <td className="px-6 py-4 text-[#696673]">
                    {lead.company || '—'}
                  </td>
                  <td className="px-6 py-4 text-[#696673]">
                    {lead.service?.name || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[lead.status] || STATUS_STYLES.Nuevo}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {lead.estimatedValue
                      ? money.format(lead.estimatedValue)
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-[#85828c]">
                    {date.format(lead.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-white/55">{label}</p>
    </div>
  );
}
