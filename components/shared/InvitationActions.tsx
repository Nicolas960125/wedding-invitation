'use client';

import { Copy, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { buildWhatsAppMessage, buildWhatsAppLink } from '@/lib/whatsapp';

type Props = {
  guestName: string;
  link: string;
  maxAttendees: number;
  compact?: boolean;
};

export function InvitationActions({ guestName, link, maxAttendees, compact = false }: Props) {
  const message = buildWhatsAppMessage({ guestName, link, maxAttendees });
  const waUrl = buildWhatsAppLink({ guestName, link, maxAttendees });

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      // Fallback para navegadores sin clipboard API
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast.success(`${label} copiado`);
      } catch {
        toast.error('No se pudo copiar al clipboard');
      }
      document.body.removeChild(ta);
    }
  };

  const size = compact ? 'sm' : 'sm';
  const iconSize = compact ? 'size-3.5' : 'size-4';

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        type="button"
        size={size}
        variant="outline"
        onClick={() => copy(link, 'Link')}
        title="Copiar solo el link"
      >
        <Copy className={iconSize} />
        Link
      </Button>
      <Button
        type="button"
        size={size}
        variant="outline"
        onClick={() => copy(message, 'Mensaje')}
        title="Copiar mensaje completo para WhatsApp"
      >
        <MessageSquare className={iconSize} />
        Mensaje
      </Button>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir WhatsApp con el mensaje listo"
      >
        <Button type="button" size={size} variant="default">
          <Send className={iconSize} />
          WhatsApp
        </Button>
      </a>
    </div>
  );
}
