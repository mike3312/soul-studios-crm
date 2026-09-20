'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  MessageCircle,
  LayoutDashboard,
  Menu,
  MessageCircleMore,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { AdminMenu } from '@/components/admin-menu';

const links = [
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/conversations', 'Conversaciones', MessageCircleMore],
  ['/leads', 'Prospectos', Users],
  ['/services', 'Servicios', BriefcaseBusiness],
  ['/settings/ai', 'Configuración IA', Bot],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current =
    links.find(([href]) => href === pathname)?.[1] ||
    (pathname === '/settings/security' ? 'Seguridad' : 'Soul Studios CRM');
  return (
    <div className="min-h-screen">
      <button
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-xl bg-[#201d35] p-2.5 text-white shadow-lg md:hidden"
      >
        <Menu size={20} />
      </button>
      {open && (
        <button
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/35 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-[#201d35] px-4 py-6 text-white transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 p-2 text-white/60 md:hidden"
        >
          <X size={19} />
        </button>
        <div className="mb-9 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="font-semibold">Soul Studios</div>
            <div className="text-xs text-white/50">CRM con IA</div>
          </div>
        </div>
        <nav className="space-y-1">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${pathname === href ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/7 hover:text-white'}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/50">
          Soul Studios CRM
          <br />
          <span className="text-emerald-300">● Sistema listo</span>
        </div>
      </aside>
      <div className="md:ml-[248px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#e9e7ee] bg-white/95 pl-16 pr-4 backdrop-blur md:px-8">
          <div>
            <p className="text-sm font-semibold text-[#26232e]">{current}</p>
            <p className="hidden text-xs text-[#8a8792] sm:block">
              Panel comercial de Soul Studios
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              <MessageCircle size={14} />{' '}
              <span className="hidden sm:inline">WhatsApp + simulación</span>
            </span>
            <button
              aria-label="Notificaciones"
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#e8e5ed] text-[#777481] hover:bg-[#f6f5f8]"
            >
              <Bell size={17} />
            </button>
            <AdminMenu />
          </div>
        </header>
        <main className="crm-main min-h-[calc(100vh-72px)] p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
