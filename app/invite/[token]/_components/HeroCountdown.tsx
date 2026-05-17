'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

type Props = {
  groupName: string;
  weddingDateIso: string;
  brideName: string;
  groomName: string;
  locale: string;
};

function diff(target: Date) {
  const now = new Date();
  const ms = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

const UNIT_LABELS = { days: 'dias', hours: 'horas', minutes: 'min', seconds: 'seg' } as const;

export function HeroCountdown({ groupName, weddingDateIso, brideName, groomName, locale }: Props) {
  const target = new Date(weddingDateIso);
  // Inicializamos en ceros para evitar hydration mismatch: en SSR y en el primer
  // render del cliente, t es identico. El useEffect setea el valor real ya montado.
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingDateIso]);

  return (
    <header className="relative isolate overflow-hidden px-6 pb-12 pt-10 text-center text-white sm:pt-14 min-h-[720px] sm:min-h-[860px] flex flex-col items-center justify-start">
      <Image
        src="/hero-portada.jpg"
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 672px"
        className="-z-20 object-cover object-[center_top]"
      />
      {/* Overlay para asegurar contraste del texto blanco */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

      {/* Ornamento decorativo tipo vid: curva-vid-dot-vid-curva */}
      <motion.div
        className="mx-auto mb-10 flex justify-center text-white/85"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.1 }}
      >
        <svg
          viewBox="0 0 200 32"
          className="h-7 w-44 drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)] sm:h-8 sm:w-56"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M5 16 Q20 10 40 16 T75 16" />
          <path d="M30 14 Q33 10 38 11" strokeWidth="0.7" />
          <path d="M50 18 Q53 22 58 21" strokeWidth="0.7" />
          <circle cx="85" cy="16" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="100" cy="16" r="3" fill="currentColor" stroke="none" />
          <circle cx="115" cy="16" r="1.2" fill="currentColor" stroke="none" />
          <path d="M125 16 Q140 22 160 16 T195 16" />
          <path d="M142 14 Q145 10 150 11" strokeWidth="0.7" />
          <path d="M162 18 Q165 22 170 21" strokeWidth="0.7" />
        </svg>
      </motion.div>

      <motion.p
        className="text-xs uppercase tracking-[0.4em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        Para {groupName}
      </motion.p>

      <motion.h1
        className="font-serif mt-8 text-5xl font-light leading-[1.05] tracking-wide [text-shadow:0_2px_14px_rgba(0,0,0,0.75),0_1px_4px_rgba(0,0,0,0.6)] sm:text-7xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="block">{brideName}</span>
        <motion.span
          className="my-2 block text-3xl italic text-white/95 sm:text-4xl"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          &
        </motion.span>
        <span className="block">{groomName}</span>
      </motion.h1>

      {/* Fecha + countdown agrupados al fondo del hero */}
      <div className="mx-auto mt-auto flex w-full max-w-md flex-col items-center pt-10">
        <motion.p
          className="mb-0.5 text-base font-light text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.8),0_1px_3px_rgba(0,0,0,0.6)] sm:text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          {target.toLocaleDateString(locale, { dateStyle: 'full' })}
        </motion.p>

        <motion.div
          className="grid w-full grid-cols-4 gap-2 sm:gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        >
          {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit) => (
            <div
              key={unit}
              className="rounded-md border border-white/35 bg-white/10 p-2 shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-3"
            >
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={t[unit]}
                  initial={{ y: -12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 12, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="font-serif text-2xl font-medium tabular-nums text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.8)] sm:text-4xl"
                >
                  {String(t[unit]).padStart(2, '0')}
                </motion.div>
              </AnimatePresence>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.7)] sm:text-xs">
                {UNIT_LABELS[unit]}
              </div>
          </div>
          ))}
        </motion.div>
      </div>
    </header>
  );
}
