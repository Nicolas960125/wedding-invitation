'use client';

import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import Autoplay from 'embla-carousel-autoplay';
import { Hourglass } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import type { CouplePhoto } from '@/lib/event-data';
import { PhotoLightbox } from './PhotoLightbox';

type Props = {
  photos: CouplePhoto[];
  relationshipStartYear: number | null;
};

// Rotaciones sutiles por foto (deterministas para no parpadear)
const ROTATIONS = [-2, 1.5, -1, 2, -1.5, 1, -0.5, 1.8];

export function PhotoGallery({ photos, relationshipStartYear }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0 && !relationshipStartYear) return null;

  const currentYear = new Date().getFullYear();
  const yearsTogether = relationshipStartYear
    ? Math.max(0, currentYear - relationshipStartYear)
    : null;

  return (
    <section className="px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        {/* Reloj de arena */}
        <motion.div
          className="text-primary mx-auto mb-3 flex justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <motion.div
            animate={{ rotate: [0, 0, 180, 180, 360] }}
            transition={{
              duration: 8,
              ease: 'easeInOut',
              times: [0, 0.45, 0.5, 0.95, 1],
              repeat: Infinity,
              repeatDelay: 2,
            }}
          >
            <Hourglass className="size-6" />
          </motion.div>
        </motion.div>

        <motion.h3
          className="font-serif text-3xl sm:text-4xl"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          Nuestra historia
        </motion.h3>

        {yearsTogether !== null && yearsTogether > 0 && (
          <motion.p
            className="text-primary mt-4 font-serif text-xl italic sm:text-2xl"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            {yearsTogether} {yearsTogether === 1 ? 'año' : 'años'} juntos, y contando…
          </motion.p>
        )}
      </div>

      {photos.length > 0 && <PhotoCarousel photos={photos} onOpen={setLightboxIndex} />}

      <PhotoLightbox
        photos={photos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </section>
  );
}

function PhotoCarousel({
  photos,
  onOpen,
}: {
  photos: CouplePhoto[];
  onOpen: (index: number) => void;
}) {
  const autoplay = useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  );

  return (
    <Carousel
      opts={{ loop: photos.length > 2, align: 'start' }}
      plugins={[autoplay.current]}
      className="mx-auto max-w-xl"
    >
      <CarouselContent className="-ml-4">
        {photos.map((photo, i) => {
          const rotation = ROTATIONS[i % ROTATIONS.length];
          return (
            <CarouselItem key={photo.image_path} className="basis-full pl-4 sm:basis-1/2">
              <motion.div
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
              >
                <motion.button
                  type="button"
                  className="bg-white relative cursor-pointer shadow-lg"
                  style={{ rotate: `${rotation}deg` }}
                  whileHover={{ rotate: 0, scale: 1.04, transition: { duration: 0.3 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpen(i)}
                  aria-label={`Ver foto de ${photo.year}${photo.caption ? `: ${photo.caption}` : ''} en grande`}
                >
                  <div className="px-2.5 pt-2.5 pb-10 sm:px-3 sm:pt-3 sm:pb-12">
                    <div className="bg-muted relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.image_url}
                        alt={photo.caption ?? `Foto ${photo.year}`}
                        className="aspect-square w-[180px] object-cover sm:w-[200px]"
                        loading={i < 2 ? 'eager' : 'lazy'}
                      />
                    </div>
                    {photo.caption && (
                      <p className="text-foreground/80 absolute inset-x-2 bottom-2 px-1 text-center font-serif text-[11px] italic leading-snug line-clamp-2 sm:bottom-3 sm:text-xs">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                </motion.button>

                {/* Dot + año */}
                <div className="bg-primary ring-background mt-4 size-3 rounded-full ring-4 sm:size-3.5" />
                <p className="text-primary mt-2 font-serif text-lg font-medium tabular-nums sm:text-xl">
                  {photo.year}
                </p>
              </motion.div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}
