"use client";
import { useEffect, useState } from "react";
import { PdfPreview } from "./pdf-preview";
import { ImagePreview } from "./image-preview";
import { Button } from "@/components/ui/button";
import { hospitalApi } from "@/lib/api/hospital";

export function DocumentAsset(props: { documentId: string; mimeType: string; imaging?: boolean }) { return <AssetContent key={`${props.documentId}:${props.mimeType}`} {...props}/>; }
function AssetContent({ documentId, mimeType, imaging = false }: { documentId: string; mimeType: string; imaging?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [url, setUrl] = useState<string>(), [error, setError] = useState<string>(), [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let preview: string | undefined;
    hospitalApi.documentAsset(documentId, controller.signal, imaging, mimeType).then(value => {
      preview = value;
      if (controller.signal.aborted) URL.revokeObjectURL(value);
      else setUrl(value);
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Document asset unavailable."); });
    return () => { controller.abort(); if (preview) URL.revokeObjectURL(preview); };
  }, [documentId, open, imaging, mimeType, attempt]);
  return <div className="mt-3 space-y-3">
    <Button variant="outline" onClick={() => setOpen(true)} disabled={open}>Open original asset</Button>
    {open && !url && !error && <p role="status">Loading document asset…</p>}
    {error && <p role="alert">{error} <Button variant="outline" onClick={() => { setError(undefined); setAttempt(value => value + 1); }}>Retry original asset</Button></p>}
    {url && <><a className="source-link" href={url} target="_blank" rel="noopener noreferrer">Open original</a> <a className="text-teal underline" href={url} download={documentId}>Download original asset</a>
      {mimeType === "text/html" ? <p className="text-sm">HTML documents are download-only.</p> : mimeType.startsWith("image/") ? <ImagePreview url={url} mimeType={mimeType} />
        : mimeType === "application/pdf" ? <PdfPreview url={url} /> : <iframe src={url} title={`Synthetic document ${documentId}`} sandbox="" className="h-96 w-full rounded border border-border" />}</>}
  </div>;
}

