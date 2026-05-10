import { Shirt } from 'lucide-react';

type Props = {
  description: string | null;
};

export function DressCode({ description }: Props) {
  if (!description) return null;

  return (
    <section className="px-6 py-12 text-center">
      <div className="text-primary mx-auto mb-3 flex justify-center">
        <Shirt className="size-6 animate-float" />
      </div>
      <h3 className="font-serif text-3xl">Código de vestimenta</h3>
      <p className="text-muted-foreground mx-auto mt-4 max-w-md text-sm leading-relaxed sm:text-base">
        {description}
      </p>
    </section>
  );
}
