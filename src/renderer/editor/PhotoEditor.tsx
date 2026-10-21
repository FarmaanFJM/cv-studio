import React, { useRef, useState } from 'react';
import { CV, Photo } from '../../shared/model';
import { PhotoView } from '../templates/blocks';
import { SummaButton, SummaFieldset } from '../ui';

const MAX_BYTES = 20 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function fileToPhoto(file: File): Promise<Omit<Photo, 'zoom' | 'offsetX' | 'offsetY' | 'shape' | 'visible'>> {
  if (!TYPES.includes(file.type)) throw new Error('Kies een JPG-, PNG- of WebP-afbeelding.');
  if (file.size > MAX_BYTES) throw new Error('De afbeelding is te groot (maximaal 20 MB).');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Deze afbeelding kon niet worden gelezen.'));
      i.src = url;
    });
    const max = 1000;
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k));
    const h = Math.max(1, Math.round(img.naturalHeight * k));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { src: canvas.toDataURL('image/jpeg', 0.9), aspect: w / h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const VIEW = 170; // px van het crop-vak

export function PhotoEditor({ cv, update }: { cv: CV; update: (fn: (cv: CV) => void) => void }) {
  const photo = cv.photo;
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const load = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const p = await fileToPhoto(file);
      update((c) => {
        c.photo = { ...p, zoom: 1, offsetX: 0, offsetY: 0, shape: c.photo?.shape ?? 'round', visible: true };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Uploaden mislukt.');
    }
  };

  const limits = (p: Photo, zoom = p.zoom) => {
    const w = zoom * (p.aspect >= 1 ? p.aspect : 1);
    const h = zoom * (p.aspect >= 1 ? 1 : 1 / p.aspect);
    return { mx: Math.max(0, (w - 1) / 2), my: Math.max(0, (h - 1) / 2) };
  };
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

  const drop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    void load(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="photo-editor">
      <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp" data-testid="photo-input"
        onChange={(e) => { void load(e.target.files?.[0]); e.target.value = ''; }} />
      {!photo ? (
        <div className={`dropzone ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)} onDrop={drop} onClick={() => input.current?.click()} data-testid="photo-drop">
          <div>Foto toevoegen</div>
          <small>Slepen of klikken · JPG, PNG, WebP</small>
        </div>
      ) : (
        <div className="crop-row" onDragOver={(e) => e.preventDefault()} onDrop={drop}>
          <div
            className={`crop-view ${photo.shape}`} style={{ width: VIEW, height: VIEW }} data-testid="crop-view"
            tabIndex={0} role="application" aria-label="Foto positioneren: sleep of gebruik de pijltjestoetsen"
            onKeyDown={(e) => {
              const d = e.shiftKey ? 0.1 : 0.02;
              const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
              const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
              if (!dx && !dy) return;
              e.preventDefault();
              const { mx, my } = limits(photo);
              update((c) => { if (c.photo) { c.photo.offsetX = clamp(c.photo.offsetX + dx, mx); c.photo.offsetY = clamp(c.photo.offsetY + dy, my); } });
            }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, ox: photo.offsetX, oy: photo.offsetY };
            }}
            onPointerMove={(e) => {
              const d = drag.current; if (!d) return;
              const { mx, my } = limits(photo);
              const ox = clamp(d.ox + (e.clientX - d.x) / VIEW, mx);
              const oy = clamp(d.oy + (e.clientY - d.y) / VIEW, my);
              update((c) => { if (c.photo) { c.photo.offsetX = ox; c.photo.offsetY = oy; } });
            }}
            onPointerUp={() => { drag.current = null; }}
          >
            <PhotoView photo={photo} size="100%" />
          </div>
          <div className="crop-controls">
            <label className="field">
              <span className="field-label">Zoom</span>
              <input type="range" min={1} max={4} step={0.02} value={photo.zoom} data-testid="photo-zoom"
                onChange={(e) => {
                  const z = Number(e.target.value);
                  update((c) => {
                    if (!c.photo) return;
                    const { mx, my } = limits(c.photo, z);
                    c.photo.zoom = z;
                    c.photo.offsetX = clamp(c.photo.offsetX, mx);
                    c.photo.offsetY = clamp(c.photo.offsetY, my);
                  });
                }} />
            </label>
            <div className="btn-row">
              <SummaButton small onClick={() => input.current?.click()}>Andere foto</SummaButton>
              <SummaButton small kind="danger" name="photo-remove" onClick={() => update((c) => { c.photo = null; })}>Verwijderen</SummaButton>
            </div>
          </div>
        </div>
      )}
      {error && <div className="error-text" role="alert">{error}</div>}
    </div>
  );
}
