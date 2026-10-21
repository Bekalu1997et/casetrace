"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { hospitalApi } from "@/lib/api/hospital";

export function DocumentAsset({ documentId, mimeType, imaging = false }: { documentId: string; mimeType: string; imaging?: boolean }) {
  const [url, setUrl] = useState<string>(), [error, setError] = useState<string>(), [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let preview: string | undefined;
    hospitalApi.documentAsset(documentId, controller.signal, imaging).then(value => {
      preview = value;
      if (controller.signal.aborted) URL.revokeObjectURL(value);
      else setUrl(value);
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Document asset unavailable."); });
    return () => { controller.abort(); if (preview) URL.revokeObjectURL(preview); };
  }, [documentId, open, imaging]);
  return <div className="mt-3 space-y-3">
    <Button variant="outline" onClick={() => setOpen(true)} disabled={open}>Open original asset</Button>
    {open && !url && !error && <p role="status">Loading document asset…</p>}
    {error && <p role="alert">{error}</p>}
    {url && <><a className="text-teal underline" href={url} download={documentId}>Download original asset</a>
      {mimeType === "text/html" ? <p className="text-sm">HTML documents are download-only.</p> : mimeType.startsWith("image/") ? <object data={url} type={mimeType} className="h-96 w-full" aria-label="Synthetic document image">Image preview unavailable. Use the download link.</object>
        : <iframe src={url} title={`Synthetic document ${documentId}`} sandbox="" className="h-96 w-full rounded border border-border" />}</>}
  </div>;
}

