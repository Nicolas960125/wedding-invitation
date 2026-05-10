'use client';

import { useEffect, useState } from 'react';
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
  const [t, setT] = useState(diff(target));

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingDateIso]);

  return (
    <header className="relative overflow-hidden px-6 pb-10 pt-20 text-center sm:pt-24">
      {/* Ornamento decorativo tipo vid: curva-vid-dot-vid-curva */}
      <motion.div
        className="text-primary mx-auto mb-10 flex justify-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.1 }}
      >
        <svg
          viewBox="0 0 200 32"
          className="h-7 w-44 sm:h-8 sm:w-56"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          aria-hidden
        >
          {/* Vid izquierda */}
          <path d="M5 16 Q20 10 40 16 T75 16" />
          <path d="M30 14 Q33 10 38 11" strokeWidth="0.7" />
          <path d="M50 18 Q53 22 58 21" strokeWidth="0.7" />
          {/* Centro */}
          <circle cx="85" cy="16" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="100" cy="16" r="3" fill="currentColor" stroke="none" />
          <circle cx="115" cy="16" r="1.2" fill="currentColor" stroke="none" />
          {/* Vid derecha */}
          <path d="M125 16 Q140 22 160 16 T195 16" />
          <path d="M142 14 Q145 10 150 11" strokeWidth="0.7" />
          <path d="M162 18 Q165 22 170 21" strokeWidth="0.7" />
        </svg>
      </motion.div>

      <motion.p
        className="text-muted-foreground text-xs uppercase tracking-[0.4em] sm:text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        Para {groupName}
      </motion.p>

      <motion.h1
        className="font-serif mt-8 text-5xl font-light leading-[1.05] tracking-wide sm:text-7xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="block">{brideName}</span>
        <motion.span
          className="text-primary my-2 block text-3xl italic sm:text-4xl"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          &
        </motion.span>
        <span className="block">{groomName}</span>
      </motion.h1>

      <motion.p
        className="text-muted-foreground mt-8 text-base font-light sm:text-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
      >
        {target.toLocaleDateString(locale, { dateStyle: 'full' })}
      </motion.p>

      {/* Countdown */}
      <motion.div
        className="mx-auto mt-10 grid max-w-md grid-cols-4 gap-2 sm:gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.1 }}
      >
        {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit) => (
          <div
            key={unit}
            className="bg-card/60 border-primary/20 rounded-md border p-2 backdrop-blur-sm sm:p-3"
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                key={t[unit]}
                initial={{ y: -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="font-serif text-2xl font-medium tabular-nums sm:text-4xl"
              >
                {String(t[unit]).padStart(2, '0')}
              </motion.div>
            </AnimatePresence>
            <div className="text-muted-foreground mt-1 text-[10px] uppercase tracking-widest sm:text-xs">
              {UNIT_LABELS[unit]}
            </div>
          </div>
        ))}
      </motion.div>
    </header>
  );
}
