import type { NextRequest } from "next/server";

const ALLOWED_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
]);

async function handle(request: NextRequest, method: "GET" | "HEAD") {
  const src = request.nextUrl.searchParams.get("src");
  if (!src) {
    return new Response("Missing src parameter", { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(src);
  } catch {
    return new Response("Invalid src parameter", { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
    return new Response("Host not permitted", { status: 403 });
  }

  const headers: Record<string, string> = {
    Accept: "application/pdf",
  };
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    headers.Range = rangeHeader;
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      cache: "no-store",
      method,
      headers,
    });

    const responseHeaders = new Headers();
    const copyHeader = (name: string) => {
      const value = upstream.headers.get(name);
      if (value) {
        responseHeaders.set(name, value);
      }
    };

    copyHeader("content-type");
    copyHeader("content-length");
    copyHeader("content-range");
    copyHeader("accept-ranges");
    copyHeader("last-modified");
    copyHeader("etag");
    copyHeader("cache-control");
    responseHeaders.set("Cache-Control", "no-store");

    if (method === "HEAD") {
      return new Response(null, { status: upstream.status, headers: responseHeaders });
    }

    if (!upstream.body) {
      return new Response("Missing upstream body", { status: 502 });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[menu-pdf] proxy failed", error);
    return new Response("Error fetching PDF", { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request, "GET");
}

export async function HEAD(request: NextRequest) {
  return handle(request, "HEAD");
}
