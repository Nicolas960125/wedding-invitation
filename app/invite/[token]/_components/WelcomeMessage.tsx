'use client';

import { motion } from 'motion/react';

export function WelcomeMessage({ text }: { text: string }) {
  if (!text.trim()) return null;

  return (
    <motion.section
      className="px-8 py-10 text-center sm:px-12 sm:py-14"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Comilla decorativa */}
      <span
        className="text-primary/40 font-serif block text-7xl leading-none"
        aria-hidden
      >
        “
      </span>
      <p className="font-serif text-foreground/85 mx-auto -mt-4 max-w-md text-lg italic leading-relaxed sm:text-xl">
        {text}
      </p>
    </motion.section>
  );
}
