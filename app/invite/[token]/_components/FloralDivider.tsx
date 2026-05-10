'use client';

import { motion } from 'motion/react';

/**
 * Divider decorativo: linea fina con icono central animado.
 * Variantes: 'rings' (anillos rotando), 'heart' (corazon pulsante), 'leaf' (hoja flotando).
 */
type Variant = 'rings' | 'heart' | 'leaf';

export function FloralDivider({ variant = 'rings' }: { variant?: Variant }) {
  return (
    <motion.div
      className="my-2 flex items-center justify-center gap-3 px-8 py-4"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <span className="bg-border h-px w-full max-w-[80px]" />
      <Icon variant={variant} />
      <span className="bg-border h-px w-full max-w-[80px]" />
    </motion.div>
  );
}

function Icon({ variant }: { variant: Variant }) {
  if (variant === 'rings') {
    return (
      <svg
        viewBox="0 0 48 24"
        className="text-primary h-6 w-12 animate-float"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <circle cx="17" cy="12" r="8" />
        <circle cx="31" cy="12" r="8" />
      </svg>
    );
  }
  if (variant === 'heart') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="text-primary h-5 w-5 animate-pulse-soft"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.5 3 5 6.5 5c2 0 3.5 1.2 4.5 2.5C12 6.2 13.5 5 15.5 5 19 5 20.9 8.5 19.5 11.8 17.5 16.4 12 21 12 21Z" />
      </svg>
    );
  }
  // leaf
  return (
    <svg
      viewBox="0 0 24 24"
      className="text-primary h-5 w-5 animate-float"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M3 21c5-2 13-4 18-13-3 0-9 1-12 4-3 3-4 6-6 9Z" />
      <path d="M9 13c2-1 4-2 6-3" />
    </svg>
  );
}
