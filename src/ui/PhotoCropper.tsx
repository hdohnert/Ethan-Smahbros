import { useEffect, useRef, useState } from 'react';
import { squareJpeg } from '../data/api';

/** Square crop step: drag to position, slider to zoom, then Save. */
export function PhotoCropper({ file, onDone, onCancel }: { file: File; onDone: (b: Blob) => void; onCancel: () => void }) {
  const [img, setImg] = useState<{ url: string; w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 }); // center of crop, as a fraction of the image
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const FRAME = 260;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => setImg({ url, w: i.naturalWidth, h: i.naturalHeight });
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!img) return null;
  const base = Math.min(img.w, img.h);
  const cropSize = base / zoom; // in image pixels
  const scale = FRAME / cropSize; // screen px per image px
  const clamp = (v: number, half: number, total: number) => Math.min(Math.max(v, half / total), 1 - half / total);
  const cx = clamp(pos.x, cropSize / 2, img.w);
  const cy = clamp(pos.y, cropSize / 2, img.h);

  return (
    <div className="sheet-backdrop">
      <div className="sheet">
        <div className="sheet__title">Crop photo</div>
        <div
          className="cropper"
          style={{ width: FRAME, height: FRAME }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, px: cx, py: cy };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const dx = (e.clientX - drag.current.x) / scale / img.w;
            const dy = (e.clientY - drag.current.y) / scale / img.h;
            setPos({ x: drag.current.px - dx, y: drag.current.py - dy });
          }}
          onPointerUp={() => (drag.current = null)}
        >
          <img
            src={img.url}
            alt=""
            draggable={false}
            style={{
              width: img.w * scale,
              height: img.h * scale,
              transform: `translate(${FRAME / 2 - cx * img.w * scale}px, ${FRAME / 2 - cy * img.h * scale}px)`,
            }}
          />
        </div>
        <label className="field">
          <span>Zoom</span>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
        <button
          className="btn btn--xl btn--go"
          onClick={async () =>
            onDone(await squareJpeg(file, { x: cx * img.w - cropSize / 2, y: cy * img.h - cropSize / 2, size: cropSize }))
          }
        >
          Save photo
        </button>
        <button className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
