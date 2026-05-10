import { Suspense } from 'react';
import { LoginForm } from './_components/LoginForm';

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="bg-card w-full max-w-sm rounded-lg border p-6 shadow-sm">
        <h1 className="font-serif text-2xl">Admin · Login</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Te enviamos un link magico al email autorizado.
        </p>
        <Suspense fallback={<div className="mt-6 text-muted-foreground text-sm">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
