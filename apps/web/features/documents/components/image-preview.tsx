"use client";
import { useRef, useState } from "react";
export function ImagePreview({ url, mimeType }: { url: string; mimeType: string }) {
  const [zoom, setZoom] = useState(1), container = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  return <div className="space-y-3"><p className="text-xs text-muted-foreground">Illustrative synthetic imagery — demonstration material, not a diagnostic DICOM study.</p>
    <label>Image zoom<select aria-label="Image zoom" className="field ml-3" value={zoom} onChange={event => setZoom(Number(event.target.value))}>{[1, 1.5, 2, 3].map(value => <option value={value} key={value}>{value * 100}%</option>)}</select></label>
    <div ref={container} tabIndex={0} role="region" aria-label="Synthetic image viewport; scroll or drag to pan" className="max-h-[65vh] overflow-auto bg-slate-100 touch-pan-x touch-pan-y"
      onPointerDown={event => { if (!container.current) return; drag.current = { x: event.clientX, y: event.clientY, left: container.current.scrollLeft, top: container.current.scrollTop }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onPointerMove={event => { if (drag.current && container.current) { container.current.scrollLeft = drag.current.left + drag.current.x - event.clientX; container.current.scrollTop = drag.current.top + drag.current.y - event.clientY; } }}>
      <object data={url} type={mimeType} style={{ width: `${zoom * 100}%`, pointerEvents: "none" }} aria-label="Synthetic illustrative image">Image preview unavailable. Use Open original.</object>
    </div></div>;
}
