"use client";

import { useMemo, useState } from "react";
import { PdfViewer } from "@/components/pdf/PdfViewer";

export default function TestPdfRenderer() {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const documentFile = useMemo(() => ({ url: "/pdf/test.pdf" }), []);

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-900/60 p-6 text-white shadow-2xl">
      <h2 className="text-lg font-semibold uppercase tracking-wide">react-pdf Local Test</h2>
      <p className="text-sm text-white/70">
        Rendering <code>/pdf/test.pdf</code> using react-pdf. If the document appears below,
        the PDF library is functioning for local assets.
      </p>
      <div className="flex min-h-[60vh] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/60">
        <PdfViewer
          file={documentFile}
          pageNumber={1}
          scale={1}
          onDocumentLoadSuccess={(total) => {
            setNumPages(total);
            setError(null);
          }}
          onDocumentLoadError={(err) =>
            setError(err instanceof Error ? err : new Error(String(err)))
          }
        />
      </div>
      {error ? (
        <p className="text-xs text-rose-300">{error.message}</p>
      ) : numPages ? (
        <p className="text-xs text-white/60">Total pages: {numPages}</p>
      ) : null}
    </div>
  );
}
