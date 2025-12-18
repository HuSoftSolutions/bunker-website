"use client";

import { Document, Page, pdfjs, type DocumentProps } from "react-pdf";
import type { PDFPageProxy } from "pdfjs-dist";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type PdfViewerProps = {
  file: DocumentProps["file"];
  pageNumber: number;
  scale: number;
  onDocumentLoadSuccess: (numPages: number) => void;
  onDocumentLoadError: (error: Error) => void;
  onPageRenderSuccess?: (page: PDFPageProxy) => void;
};

export function PdfViewer({
  file,
  pageNumber,
  scale,
  onDocumentLoadSuccess,
  onDocumentLoadError,
  onPageRenderSuccess,
}: PdfViewerProps) {
  if (!file) {
    return null;
  }

  return (
    <Document
      file={file}
      loading={<span className="text-sm">Loading PDF…</span>}
      onLoadSuccess={({ numPages }) => onDocumentLoadSuccess(numPages)}
      onLoadError={onDocumentLoadError}
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderAnnotationLayer={false}
        renderTextLayer={false}
        onRenderSuccess={onPageRenderSuccess}
      />
    </Document>
  );
}
