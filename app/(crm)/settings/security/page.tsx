import { PasswordForm } from '@/components/auth-forms';
import { requireAdminPage } from '@/lib/auth';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const session = await requireAdminPage();
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-medium text-violet-600">Tu cuenta</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Seguridad</h1>
      <p className="mt-3 text-sm text-[#777481]">
        Administra el acceso a Soul Studios CRM.
      </p>
      <section className="mt-7 rounded-2xl border border-[#ebe9f0] bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="font-semibold">Cambiar contraseña</h2>
            <p className="mt-1 text-sm text-[#82798e]">
              Usuario: {session.username}
            </p>
          </div>
        </div>
        <PasswordForm />
      </section>
    </div>
  );
}
