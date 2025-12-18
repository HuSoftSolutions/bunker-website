"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dialog, Transition } from "@headlessui/react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import type { PDFPageProxy } from "pdfjs-dist";

const MAX_SCALE = 3;
// Leave space for modal padding so PDFs stay within the viewport.
const DEFAULT_VERTICAL_PADDING = 240;
const MIN_CONTENT_HEIGHT = 320;

export type MenuModalLocation = {
  name?: string;
  menus?: Array<{
    name?: string;
    pdf?: string;
    storagePath?: string;
  }>;
};

type MenuEntry = NonNullable<MenuModalLocation["menus"]>[number];

type MenuModalProps = {
  location: MenuModalLocation | null;
  open: boolean;
  onClose: () => void;
};

type PdfStatus = "idle" | "loading" | "ready" | "error";

const buildStorageUrl = (path?: string | null) => {
  if (!path) {
    return null;
  }

  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const encoded = trimmed
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://storage.googleapis.com/thebunker-website.appspot.com/${encoded}`;
};

const normalizePdfUrl = (menu: MenuEntry | null | undefined) => {
  if (!menu) {
    return null;
  }

  if (menu.pdf && /^https?:\/\//i.test(menu.pdf)) {
    try {
      const url = new URL(menu.pdf);
      url.pathname = url.pathname
        .split("/")
        .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
        .join("/");
      return url.toString();
    } catch {
      return menu.pdf;
    }
  }

  return buildStorageUrl(menu.storagePath);
};

export function MenuModal({ location, open, onClose }: MenuModalProps) {
  const menus = useMemo(() => {
    const baseMenus = Array.isArray(location?.menus) ? location.menus ?? [] : [];

    return baseMenus
      .filter((menu) => menu)
      .map((menu) => ({
        ...menu,
        name:
          typeof menu?.name === "string" && menu.name.trim()
            ? menu.name.trim()
            : "Menu",
        pdfUrl: normalizePdfUrl(menu),
      }))
      .filter((menu) => menu.name && menu.pdfUrl);
  }, [location]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("idle");
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const basePageWidthRef = useRef<number | null>(null);
  const basePageHeightRef = useRef<number | null>(null);
  const [scale, setScale] = useState(1);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const pdfCacheRef = useRef<Map<string, Uint8Array>>(new Map());
  const [documentVersion, setDocumentVersion] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  const hasMenus = menus.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight || null);
    };

    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    return () => {
      window.removeEventListener("resize", updateViewportHeight);
    };
  }, []);

  const maxContentHeight = useMemo(() => {
    if (!viewportHeight) {
      return null;
    }

    const computed = viewportHeight - DEFAULT_VERTICAL_PADDING;
    return Math.max(computed, MIN_CONTENT_HEIGHT);
  }, [viewportHeight]);

  const minContentHeight = useMemo(() => {
    if (!viewportHeight) {
      return MIN_CONTENT_HEIGHT;
    }

    const baseline = Math.max(viewportHeight * 0.5, MIN_CONTENT_HEIGHT);
    return maxContentHeight ? Math.min(baseline, maxContentHeight) : baseline;
  }, [viewportHeight, maxContentHeight]);

  useEffect(() => {
    if (!open) {
      fetchControllerRef.current?.abort();
      fetchControllerRef.current = null;
      setCurrentIndex(0);
      setPdfStatus("idle");
      setNumPages(null);
      setPageNumber(1);
      basePageWidthRef.current = null;
      basePageHeightRef.current = null;
      setScale(1);
      setPdfData(null);
      return;
    }

    if (currentIndex >= menus.length) {
      setCurrentIndex(0);
    }
  }, [open, menus.length, currentIndex]);

  const activeMenu = menus[currentIndex] || null;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (activeMenu?.pdfUrl) {
      setPdfStatus("loading");
    } else {
      setPdfStatus(hasMenus ? "error" : "idle");
    }
    setNumPages(null);
    setPageNumber(1);
    basePageWidthRef.current = null;
    basePageHeightRef.current = null;
    setScale(1);
    setPdfData(null);
  }, [open, activeMenu?.pdfUrl, hasMenus]);

  const applyPdfData = useCallback((data: Uint8Array) => {
    setPdfData(data);
    setDocumentVersion((prev) => prev + 1);
  }, []);

  const updateScale = useCallback(() => {
    if (!containerRef.current || !basePageWidthRef.current) {
      return;
    }
    const containerWidth = containerRef.current.clientWidth;
    const baseWidth = basePageWidthRef.current || containerWidth || 1;
    const widthScale = containerWidth / baseWidth;

    const baseHeight = basePageHeightRef.current;
    const heightScale =
      baseHeight && maxContentHeight
        ? maxContentHeight / baseHeight
        : widthScale;

    const nextScale = Math.min(widthScale, heightScale, MAX_SCALE);
    if (!Number.isNaN(nextScale) && nextScale > 0) {
      setScale((previous) =>
        Math.abs(previous - nextScale) > 0.01 ? nextScale : previous,
      );
    }
  }, [maxContentHeight]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined" || !containerRef.current) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateScale();
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, [updateScale]);

  const handlePageRender = useCallback(
    (page: PDFPageProxy) => {
      const viewport = page.getViewport({ scale: 1 });
      basePageWidthRef.current = viewport.width;
      basePageHeightRef.current = viewport.height;
      updateScale();
      setPdfStatus("ready");
    },
    [updateScale],
  );

  const changePage = useCallback(
    (delta: number) => {
      if (!numPages) {
        return;
      }
      setPageNumber((prev) => {
        let next = prev + delta;
        if (next < 1) {
          next = numPages;
        }
        if (next > numPages) {
          next = 1;
        }
        return next;
      });
    },
    [numPages],
  );

  const activePdfUrl = activeMenu?.pdfUrl ?? null;
  const activeProxiedUrl = useMemo(() => {
    if (!open || !activePdfUrl) {
      return null;
    }
    return `/api/menu-pdf?src=${encodeURIComponent(activePdfUrl)}`;
  }, [activePdfUrl, open]);

  const documentFile = useMemo(() => {
    if (!pdfData) {
      return null;
    }
    return { data: pdfData };
  }, [pdfData]);

  useEffect(() => {
    fetchControllerRef.current?.abort();
    fetchControllerRef.current = null;

    if (!open || !activeProxiedUrl) {
      setPdfData(null);
      if (open && !activeProxiedUrl && hasMenus) {
        setPdfStatus("error");
      }
      return;
    }

    const cache = pdfCacheRef.current;
    const cachedData = cache.get(activeProxiedUrl);
    if (cachedData) {
      const clonedData = cachedData.slice();
      setPdfStatus("loading");
      applyPdfData(clonedData);
      return;
    }

    const controller = new AbortController();
    fetchControllerRef.current = controller;
    setPdfStatus("loading");
    setPdfData(null);

    fetch(activeProxiedUrl, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch menu PDF (${response.status})`);
        }
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (controller.signal.aborted) {
          return;
        }
        const data = new Uint8Array(buffer);
        cache.set(activeProxiedUrl, data.slice());
        applyPdfData(data);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error("[MenuModal] proxy fetch failed", error);
        setPdfStatus("error");
      });

    return () => {
      controller.abort();
    };
  }, [activeProxiedUrl, open, hasMenus, applyPdfData]);

  useEffect(() => {
    if (pdfStatus === "ready") {
      updateScale();
    }
  }, [pdfStatus, updateScale, maxContentHeight]);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:p-10">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="menu-modal-body relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 text-white shadow-2xl">
                <Dialog.Title className="flex items-center justify-between gap-4 border-b border-white/5 bg-zinc-950 px-6 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-primary/80">
                      Digital Menu
                    </p>
                    <h3 className="text-lg font-semibold">
                      {location?.name ?? "Menu"}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {menus.map((menu, index) => (
                      <button
                        key={`${menu.name}-${index}`}
                        type="button"
                        onClick={() => setCurrentIndex(index)}
                        className={clsx(
                          "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
                          currentIndex === index
                            ? "bg-primary text-white"
                            : "bg-white/10 text-white hover:bg-primary/20",
                        )}
                      >
                        {menu.name}
                      </button>
                    ))}
                  </div>
                </Dialog.Title>

                <div className="flex flex-col gap-4 bg-zinc-950 px-6 py-6">
                  <div
                    ref={containerRef}
                    className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-inner shadow-black/20"
                    style={{
                      maxHeight: maxContentHeight ? `${maxContentHeight}px` : undefined,
                      minHeight: `${minContentHeight}px`,
                    }}
                  >
                    {pdfStatus === "idle" && menus.length === 0 ? (
                      <span className="text-sm text-white/70">
                        Menu PDF not available for this location yet.
                      </span>
                    ) : null}

                    {pdfStatus === "loading" && !pdfData ? (
                      <span className="text-sm text-white">Preparing menu…</span>
                    ) : null}

                    {pdfStatus === "error" ? (
                      <div className="flex flex-col items-center gap-3 text-center text-white">
                        <span className="text-sm font-semibold uppercase tracking-wide">
                          Failed to load PDF.
                        </span>
                        <p className="text-xs text-white/60">
                          Try downloading the menu below or upload a new PDF.
                        </p>
                      </div>
                    ) : null}

                    {documentFile && pdfStatus !== "error" ? (
                      <PdfViewer
                        key={`${activePdfUrl ?? "menu-pdf"}-${documentVersion}`}
                        file={documentFile}
                        pageNumber={pageNumber}
                        scale={scale}
                        onDocumentLoadSuccess={(total) => {
                          setNumPages(total);
                          setPageNumber(1);
                        }}
                        onDocumentLoadError={(err) => {
                          console.error("[MenuModal] PDF load error", err);
                          setPdfStatus("error");
                        }}
                        onPageRenderSuccess={handlePageRender}
                      />
                    ) : null}
                  </div>

                  {numPages && numPages > 1 ? (
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <Button variant="ghost" onClick={() => changePage(-1)}>
                        Prev
                      </Button>
                      <span>
                        Page {pageNumber} of {numPages}
                      </span>
                      <Button variant="ghost" onClick={() => changePage(1)}>
                        Next
                      </Button>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between text-xs text-white/60">
                    <div className="flex flex-wrap items-center gap-2">
                      {activePdfUrl ? (
                        <>
                          <a
                            href={activePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-white/20 px-3 py-1 font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                          >
                            Open in new tab
                          </a>
                          <a
                            href={activePdfUrl}
                            download
                            className="rounded-full border border-white/20 px-3 py-1 font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                          >
                            Download
                          </a>
                        </>
                      ) : null}
                    </div>
                    <Button variant="ghost" onClick={onClose}>
                      Close
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
