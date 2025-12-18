"use client";

import dynamic from "next/dynamic";

const TestPdfRenderer = dynamic(() => import("./render"), { ssr: false });

export default function TestPdfPage() {
  return (
    <main className="mx-auto mt-12 max-w-4xl px-4">
      <TestPdfRenderer />
    </main>
  );
}
