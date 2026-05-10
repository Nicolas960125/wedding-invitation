import { Mail, ExternalLink } from 'lucide-react';

type RegistryItem = { label: string; url: string };

type Props = {
  items: RegistryItem[];
};

export function GiftRegistry({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="bg-accent/30 mx-4 my-8 rounded-2xl px-6 py-10 text-center sm:mx-6">
      <div className="text-primary mx-auto mb-3 flex justify-center">
        <Mail className="size-6 animate-pulse-soft" />
      </div>
      <h3 className="font-serif text-3xl">Lluvia de sobres</h3>
      <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-relaxed">
        Tu presencia es nuestro mejor regalo. Si quisieras hacernos un detalle, te dejamos estas
        opciones para tu sobre:
      </p>
      <ul className="mx-auto mt-6 flex flex-col items-stretch gap-2 sm:max-w-sm">
        {items.map((r) => (
          <li key={r.url}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border-primary/30 hover:bg-primary/5 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition"
            >
              <span className="font-medium">{r.label}</span>
              <ExternalLink className="text-muted-foreground size-3.5" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
