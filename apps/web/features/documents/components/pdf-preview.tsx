"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

// Loaded only after the user opens an original PDF. No PDF scripts/actions execute.
export function PdfPreview({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null), container = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy>(), [page, setPage] = useState(1), [zoom, setZoom] = useState(1), [fit, setFit] = useState(true), [width, setWidth] = useState(600), [error, setError] = useState<string>(), [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let task: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;
    import("pdfjs-dist").then(pdf => {
      if (disposed) return;
      pdf.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      task = pdf.getDocument({ url });
      return task.promise.then(value => { if (!disposed) setDocument(value); });
    }).catch(error => { if (!disposed) setError(error instanceof Error ? error.message : "PDF unavailable."); });
    return () => { disposed = true; void task?.destroy(); };
  }, [url]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(container.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let cancelled = false, render: RenderTask | undefined;
    document.getPage(page).then(async item => {
      if (cancelled || !canvas.current) return;
      const natural = item.getViewport({ scale: 1 });
      const scale = fit ? Math.max(0.1, width - 20) / natural.width : zoom;
      const viewport = item.getViewport({ scale }), target = canvas.current;
      const ratio = window.devicePixelRatio || 1;
      target.width = Math.floor(viewport.width * ratio); target.height = Math.floor(viewport.height * ratio);
      target.style.width = `${viewport.width}px`; target.style.height = `${viewport.height}px`;
      render = item.render({ canvas: target, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      await render.promise;
      if (!cancelled) setReady(true);
    }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : "PDF rendering failed."); });
    return () => { cancelled = true; render?.cancel(); };
  }, [document, page, zoom, fit, width]);
  return <div className="space-y-3"><div className="flex flex-wrap items-center gap-3" aria-label="PDF controls">
    <button className="source-link" disabled={!document || page <= 1} onClick={() => { setReady(false); setPage(page - 1); }}>Previous PDF page</button>
    <label>PDF page <input className="field w-20" type="number" min={1} max={document?.numPages ?? 1} value={page} onChange={event => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 1 && document && next <= document.numPages) { setReady(false); setPage(next); } }} /></label>
    <span>of {document?.numPages ?? "…"}</span><button className="source-link" disabled={!document || page >= document.numPages} onClick={() => { setReady(false); setPage(page + 1); }}>Next PDF page</button>
    <label>PDF zoom<select aria-label="PDF zoom" className="field ml-2" value={fit ? "fit" : String(zoom)} onChange={event => { setReady(false); setFit(event.target.value === "fit"); if (event.target.value !== "fit") setZoom(Number(event.target.value)); }}><option value="fit">Fit to width</option>{[0.75,1,1.25,1.5,2].map(value => <option key={value} value={value}>{value * 100}%</option>)}</select></label>
  </div>{error && <p role="alert">Original PDF preview unavailable: {error}. Use Open original or Download.</p>}{!ready && !error && <p role="status">Rendering original PDF…</p>}<div ref={container} className="max-h-[75vh] overflow-auto bg-slate-100 p-2" tabIndex={0} aria-label="Original PDF page"><canvas ref={canvas} role="img" aria-busy={!ready && !error} aria-label={`Original PDF page ${page}`} /><p className="text-xs">Original PDF image. The separately labeled structured text below remains available for reading and exact text citations.</p></div></div>;
}
