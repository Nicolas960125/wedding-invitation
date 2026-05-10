'use client';

import { useEffect, useState, useTransition } from 'react';
import { useDropzone } from 'react-dropzone';
import { Trash2, Upload, ImagePlus, X, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  uploadCouplePhotoAction,
  removeCouplePhotoAction,
} from '@/actions/photos';

export type ExistingPhoto = {
  year: number;
  caption: string | null;
  image_path: string;
  image_url: string;
};

type Props = {
  initialPhotos: ExistingPhoto[];
};

const ACCEPTED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
const MAX_SIZE = 5_000_000;

export function CouplePhotosManager({ initialPhotos }: Props) {
  const photos = [...initialPhotos].sort((a, b) => a.year - b.year);
  const currentYear = new Date().getFullYear();

  // Estado del formulario de upload
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [year, setYear] = useState<number>(currentYear);
  const [caption, setCaption] = useState('');
  const [isUploading, startUpload] = useTransition();

  // Estado de borrado
  const [removingPath, setRemovingPath] = useState<string | null>(null);
  const [isRemoving, startRemoval] = useTransition();

  // Preview URL: crear y limpiar
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const dz = useDropzone({
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    multiple: false,
    onDrop: (accepted, rejected) => {
      if (rejected.length > 0) {
        const reason = rejected[0]?.errors[0]?.code;
        if (reason === 'file-too-large') toast.error('Máximo 5MB');
        else if (reason === 'file-invalid-type') toast.error('Solo JPG, PNG o WEBP');
        else toast.error('Archivo inválido');
        return;
      }
      setFile(accepted[0] ?? null);
    },
  });

  const resetForm = () => {
    setFile(null);
    setCaption('');
    setYear(currentYear);
  };

  const handleSubmit = () => {
    if (!file) return;
    startUpload(async () => {
      const fd = new FormData();
      fd.set('photo', file);
      fd.set('year', String(year));
      fd.set('caption', caption);
      const result = await uploadCouplePhotoAction(undefined, fd);
      if (result.ok) {
        toast.success(result.message ?? 'Foto subida a Supabase Storage');
        resetForm();
      } else {
        toast.error(result.error ?? 'Error al subir');
      }
    });
  };

  const handleRemove = (path: string) => {
    if (!confirm('¿Eliminar esta foto? También se borra del storage.')) return;
    setRemovingPath(path);
    startRemoval(async () => {
      const result = await removeCouplePhotoAction(path);
      setRemovingPath(null);
      if (result.ok) toast.success(result.message ?? 'Eliminada');
      else toast.error(result.error ?? 'Error al eliminar');
    });
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div className="space-y-3">
        <div
          {...dz.getRootProps()}
          className={cn(
            'rounded-md border-2 border-dashed p-6 text-center transition',
            file ? 'cursor-default' : 'cursor-pointer',
            dz.isDragActive && 'border-primary bg-primary/5',
            dz.isDragReject && 'border-destructive bg-destructive/5',
            !dz.isDragActive && !file && 'border-muted-foreground/40 hover:bg-muted/30',
            file && 'border-primary/30 bg-card',
          )}
        >
          <input {...dz.getInputProps()} />
          {preview && file ? (
            <div className="flex items-center gap-3 text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt=""
                className="size-16 shrink-0 rounded object-cover shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-muted-foreground text-xs">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetForm();
                }}
                className="hover:bg-accent rounded p-1.5 transition"
                aria-label="Quitar archivo"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : dz.isDragActive ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <FileImage className="text-primary size-10" />
              <p className="text-primary text-sm font-medium">Soltá la foto acá</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4">
              <ImagePlus className="text-muted-foreground size-8" />
              <p className="text-sm">
                <span className="font-medium">Arrastrá una foto</span>{' '}
                o hacé click para seleccionar
              </p>
              <p className="text-muted-foreground text-xs">JPG / PNG / WEBP · máximo 5MB</p>
            </div>
          )}
        </div>

        {/* Año + caption + botón aparecen cuando hay archivo */}
        {file && (
          <div className="bg-muted/30 space-y-3 rounded-md border p-4">
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div>
                <Label htmlFor="photo-year" className="text-xs">
                  Año *
                </Label>
                <Input
                  id="photo-year"
                  type="number"
                  min={1950}
                  max={currentYear + 1}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="photo-caption" className="text-xs">
                  Descripción (opcional)
                </Label>
                <Input
                  id="photo-caption"
                  type="text"
                  maxLength={120}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ej: Primer viaje juntos"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={isUploading || !year}
              >
                <Upload className="size-3.5" />
                {isUploading ? 'Subiendo a Storage...' : 'Subir foto'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de fotos */}
      {photos.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm italic">
          No hay fotos cargadas todavía.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.image_path}
              className="bg-card group relative overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.image_url}
                alt={photo.caption ?? `Foto de ${photo.year}`}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 text-white">
                <p className="font-mono text-sm font-bold tabular-nums">{photo.year}</p>
                {photo.caption && (
                  <p className="line-clamp-2 text-[10px] opacity-90">{photo.caption}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(photo.image_path)}
                disabled={isRemoving && removingPath === photo.image_path}
                className="bg-background/90 hover:bg-destructive hover:text-destructive-foreground absolute right-1 top-1 rounded p-1.5 opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                aria-label="Eliminar foto"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
