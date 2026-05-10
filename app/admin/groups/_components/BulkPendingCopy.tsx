'use client';

import { Copy, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { buildWhatsAppMessage } from '@/lib/whatsapp';

type PendingItem = {
  name: string;
  link: string;
  maxAttendees: number;
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    document.body.removeChild(ta);
    return ok;
  }
}

export function BulkPendingCopy({ items }: { items: PendingItem[] }) {
  const copyLinks = async () => {
    const text = items.map((it) => `${it.name}: ${it.link}`).join('\n');
    const ok = await copyToClipboard(text);
    if (ok) toast.success(`${items.length} links copiados`);
    else toast.error('No se pudo copiar');
  };

  const copyMessages = async () => {
    const text = items
      .map((it) => {
        const msg = buildWhatsAppMessage({
          guestName: it.name,
          link: it.link,
          maxAttendees: it.maxAttendees,
        });
        return `=== ${it.name} ===\n${msg}`;
      })
      .join('\n\n');
    const ok = await copyToClipboard(text);
    if (ok) toast.success(`${items.length} mensajes copiados`);
    else toast.error('No se pudo copiar');
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copyLinks}>
        <Copy className="size-4" />
        Copiar {items.length} links
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={copyMessages}>
        <MessageSquare className="size-4" />
        Copiar {items.length} mensajes
      </Button>
    </div>
  );
}
