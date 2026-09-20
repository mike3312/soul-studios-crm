import { Sparkles, ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/auth-forms';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7fa] p-5 sm:p-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#e8e5ef] bg-white shadow-[0_24px_80px_rgba(32,29,53,.10)] md:grid-cols-2">
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#201d35] p-8 text-white sm:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500">
              <Sparkles size={23} />
            </div>
            <div>
              <p className="text-lg font-semibold">Soul Studios</p>
              <p className="text-xs text-white/50">
                CRM con inteligencia artificial
              </p>
            </div>
          </div>
          <div className="relative my-10 md:my-24">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-violet-300">
              Tu espacio de trabajo
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Cada conversación,
              <br />
              una nueva oportunidad.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">
              Prospectos, servicios y conversaciones en un solo lugar. Retoma el
              control de tu día.
            </p>
          </div>
          <p className="relative flex items-center gap-2 text-xs text-white/50">
            <ShieldCheck size={16} />
            Un acceso seguro para tu negocio
          </p>
        </section>
        <section className="flex flex-col justify-center p-8 sm:p-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-600">
            Bienvenido de nuevo
          </p>
          <h2 className="text-2xl font-bold tracking-tight">
            Inicia sesión en tu CRM
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#82798e]">
            Ingresa tus credenciales para continuar.
          </p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
