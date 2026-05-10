'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInAction, type SignInState } from '@/actions/auth';

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-link': 'El link de inicio de sesion no es valido.',
  'expired-link': 'El link expiro. Pedi uno nuevo.',
  unauthorized: 'Tu email no esta autorizado para acceder al admin.',
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const next = searchParams.get('next') ?? '/admin';

  const [state, formAction, isPending] = useActionState<SignInState | undefined, FormData>(
    signInAction,
    undefined,
  );

  return (
    <>
      {error && ERROR_MESSAGES[error] && (
        <p className="text-destructive mt-3 text-sm">{ERROR_MESSAGES[error]}</p>
      )}
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="mt-1" />
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Enviando...' : 'Enviar magic link'}
        </Button>
      </form>
      {state?.message && (
        <p className="text-muted-foreground mt-4 text-center text-sm">{state.message}</p>
      )}
      {state?.error && <p className="text-destructive mt-4 text-center text-sm">{state.error}</p>}
    </>
  );
}
