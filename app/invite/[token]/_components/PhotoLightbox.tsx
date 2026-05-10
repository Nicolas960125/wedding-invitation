'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CouplePhoto } from '@/lib/event-data';

type Props = {
  photos: CouplePhoto[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function PhotoLightbox({ photos, index, onClose, onNavigate }: Props) {
  const photo = index !== null ? photos[index] : null;
  const hasPrev = index !== null && index > 0;
  const hasNext = index !== null && index < photos.length - 1;

  // Teclado + bloquear scroll del body
  useEffect(() => {
    if (photo === null || index === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasPrev) onNavigate(index - 1);
      else if (e.key === 'ArrowRight' && hasNext) onNavigate(index + 1);
    };
    window.addEventListener('keydown', onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [photo, index, hasPrev, hasNext, onClose, onNavigate]);

  return (
    <AnimatePresence>
      {photo && index !== null && (
        <motion.div
          key="lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          {/* Cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4 sm:top-4"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>

          {/* Anterior */}
          {hasPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(index - 1);
              }}
              className="absolute left-2 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4 sm:size-12"
              aria-label="Anterior"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Siguiente */}
          {hasNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(index + 1);
              }}
              className="absolute right-2 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4 sm:size-12"
              aria-label="Siguiente"
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          {/* Foto + caption (re-anima al navegar via key) */}
          <motion.div
            key={photo.image_path}
            className="flex max-h-[92vh] max-w-[92vw] flex-col items-center gap-3"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.image_url}
              alt={photo.caption ?? `Foto ${photo.year}`}
              className="max-h-[80vh] max-w-full rounded-md object-contain shadow-2xl"
            />
            <div className="text-center text-white">
              <p className="font-serif text-lg sm:text-xl">
                <span className="text-primary font-medium tabular-nums">{photo.year}</span>
                {photo.caption && (
                  <span className="text-white/85 ml-3 italic">— {photo.caption}</span>
                )}
              </p>
              {photos.length > 1 && (
                <p className="text-white/50 mt-1 text-xs tabular-nums">
                  {index + 1} / {photos.length}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
