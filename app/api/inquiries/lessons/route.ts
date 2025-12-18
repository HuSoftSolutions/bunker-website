import { NextResponse } from "next/server";
import { sendWithSendGrid } from "@/lib/sendgrid";

export const runtime = "nodejs";

type LessonsInquiryEmailPayload = {
  inquiryId?: string;
  name: string;
  phone?: string | null;
  email: string;
  location?: string | null;
  timeOfDay?: string | null;
  notes?: string | null;
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
  let data: LessonsInquiryEmailPayload;

  try {
    data = (await request.json()) as LessonsInquiryEmailPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isNonEmptyString(data?.name) || !isNonEmptyString(data?.email)) {
    return NextResponse.json(
      { error: "Missing required fields: name, email" },
      { status: 400 },
    );
  }

  const emailTo = normalizeEmails(data?.emailTo).filter(isAllowedRecipient);
  if (!emailTo.length) {
    return NextResponse.json(
      { error: "No valid recipient emails configured" },
      { status: 400 },
    );
  }

  const subject = `Lessons Inquiry: ${data.name.trim()}`;
  const phone = isNonEmptyString(data.phone) ? data.phone.trim() : null;
  const location = isNonEmptyString(data.location) ? data.location.trim() : null;
  const timeOfDay = isNonEmptyString(data.timeOfDay) ? data.timeOfDay.trim() : null;
  const notes = isNonEmptyString(data.notes) ? data.notes.trim() : null;

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2>New Lessons Inquiry</h2>
      <p><strong>Inquiry ID:</strong> ${isNonEmptyString(data.inquiryId) ? data.inquiryId : "—"}</p>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
      <p><strong>Phone:</strong> ${
        phone ? `<a href="tel:${phone}">${phone}</a>` : "—"
      }</p>
      <p><strong>Location:</strong> ${location ?? "—"}</p>
      <p><strong>Time of Day:</strong> ${timeOfDay ?? "—"}</p>
      <p><strong>Additional Notes:</strong></p>
      <pre style="white-space: pre-wrap; background: #f6f6f6; padding: 12px; border-radius: 8px;">${notes ?? "—"}</pre>
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
    console.error("[lessons inquiry] send failed", error);
    return NextResponse.json(
      { error: "Failed to send inquiry" },
      { status: 500 },
    );
  }
}

