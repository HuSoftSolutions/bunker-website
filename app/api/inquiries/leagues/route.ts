import { NextResponse } from "next/server";
import { sendWithSendGrid } from "@/lib/sendgrid";

export const runtime = "nodejs";

type LeaguesInquiryEmailPayload = {
  inquiryId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  location: string;
  preferredTime: string;
  preferredTimeDisplay: string;
  season: string;
  players: number;
  message?: string | null;
  emailTo: string[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeEmails(list: unknown): string[] {
  if (!Array.isArray(list)) {
    return [];
  }
  const uniq = new Set<string>();
  list.forEach((value) => {
    if (!isNonEmptyString(value)) {
      return;
    }
    uniq.add(value.trim().toLowerCase());
  });
  return Array.from(uniq);
}

function isAllowedRecipient(email: string) {
  return email.endsWith("@getinthebunker.golf");
}

export async function POST(request: Request) {
  let data: LeaguesInquiryEmailPayload;

  try {
    data = (await request.json()) as LeaguesInquiryEmailPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const required: Array<keyof LeaguesInquiryEmailPayload> = [
    "firstName",
    "lastName",
    "phone",
    "email",
    "location",
    "preferredTime",
    "preferredTimeDisplay",
    "season",
  ];

  const missing = required.filter((field) => !isNonEmptyString(data?.[field]));
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  if (typeof data.players !== "number" || Number.isNaN(data.players)) {
    return NextResponse.json({ error: "Missing required field: players" }, { status: 400 });
  }

  const emailTo = normalizeEmails(data?.emailTo).filter(isAllowedRecipient);
  if (!emailTo.length) {
    return NextResponse.json(
      { error: "No valid recipient emails configured" },
      { status: 400 },
    );
  }

  const message = isNonEmptyString(data.message) ? data.message.trim() : null;
  const subject = `League Inquiry: ${data.firstName.trim()} ${data.lastName.trim()} (${data.location.trim()})`;

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2>New League Inquiry</h2>
      <p><strong>Inquiry ID:</strong> ${isNonEmptyString(data.inquiryId) ? data.inquiryId : "—"}</p>
      <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
      <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
      <p><strong>Phone:</strong> <a href="tel:${data.phone}">${data.phone}</a></p>
      <p><strong>Location:</strong> ${data.location}</p>
      <p><strong>Season:</strong> ${data.season}</p>
      <p><strong>Preferred Time:</strong> ${data.preferredTimeDisplay}</p>
      <p><strong>Players:</strong> ${data.players}</p>
      <p><strong>Message:</strong></p>
      <pre style="white-space: pre-wrap; background: #f6f6f6; padding: 12px; border-radius: 8px;">${message ?? "—"}</pre>
    </div>
  `.trim();

  try {
    await sendWithSendGrid({
      to: emailTo,
      subject,
      html,
      replyTo: data.email,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[leagues inquiry] send failed", error);
    return NextResponse.json({ error: "Failed to send inquiry" }, { status: 500 });
  }
}

