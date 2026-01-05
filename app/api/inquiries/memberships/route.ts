import { NextResponse } from "next/server";
import { sendWithSendGrid } from "@/lib/sendgrid";

export const runtime = "nodejs";

type MembershipInquiryEmailPayload = {
  inquiryId?: string;
  recipientName: string;
  fullName: string;
  email: string;
  phone: string;
  primaryLocation: string;
  membershipType: string;
  referredBy?: string | null;
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
  let data: MembershipInquiryEmailPayload;

  try {
    data = (await request.json()) as MembershipInquiryEmailPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const required: Array<keyof MembershipInquiryEmailPayload> = [
    "recipientName",
    "fullName",
    "email",
    "phone",
    "primaryLocation",
    "membershipType",
  ];

  const missing = required.filter((field) => !isNonEmptyString(data?.[field]));
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
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

  const referredBy = isNonEmptyString(data.referredBy) ? data.referredBy.trim() : null;
  const notes = isNonEmptyString(data.notes) ? data.notes.trim() : null;
  const subject = `Membership Inquiry: ${data.fullName.trim()} (${data.primaryLocation.trim()})`;

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2>New Membership Inquiry</h2>
      <p><strong>Inquiry ID:</strong> ${isNonEmptyString(data.inquiryId) ? data.inquiryId : "—"}</p>
      <p><strong>Recipient Name:</strong> ${data.recipientName}</p>
      <p><strong>Full Name:</strong> ${data.fullName}</p>
      <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
      <p><strong>Phone:</strong> <a href="tel:${data.phone}">${data.phone}</a></p>
      <p><strong>Primary Location:</strong> ${data.primaryLocation}</p>
      <p><strong>Membership Type:</strong> ${data.membershipType}</p>
      <p><strong>Referred By:</strong> ${referredBy ?? "—"}</p>
      <p><strong>Notes:</strong></p>
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
    console.error("[membership inquiry] send failed", error);
    return NextResponse.json({ error: "Failed to send inquiry" }, { status: 500 });
  }
}
