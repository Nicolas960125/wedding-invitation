import Link from 'next/link';
import { signOutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-card sticky top-0 z-10 border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-serif text-lg">
            Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/admin/groups" className="hover:underline">
              Grupos
            </Link>
            <Link href="/admin/respuestas" className="hover:underline">
              Respuestas
            </Link>
            <Link href="/admin/import" className="hover:underline">
              Importar
            </Link>
            <Link href="/admin/config" className="hover:underline">
              Config
            </Link>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Salir
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
