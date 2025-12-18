import { NextResponse } from "next/server";
import { sendWithSendGrid } from "@/lib/sendgrid";

export const runtime = "nodejs";

type CareerInquiryEmailPayload = {
  inquiryId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  location: string;
  position: string;
  skillLevel: string;
  message: string;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  resumeMimeType?: string | null;
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
  let data: CareerInquiryEmailPayload;

  try {
    data = (await request.json()) as CareerInquiryEmailPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const requiredFields: Array<keyof CareerInquiryEmailPayload> = [
    "firstName",
    "lastName",
    "phone",
    "email",
    "location",
    "position",
    "skillLevel",
    "message",
  ];

  const missing = requiredFields.filter((field) => !isNonEmptyString(data?.[field]));
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

  const resumeUrl = isNonEmptyString(data.resumeUrl) ? data.resumeUrl.trim() : null;
  const resumeFileName = isNonEmptyString(data.resumeFileName)
    ? data.resumeFileName.trim()
    : null;

  const subject = `Career Application: ${data.firstName.trim()} ${data.lastName.trim()} (${data.position.trim()})`;

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2>New Career Application</h2>
      <p><strong>Inquiry ID:</strong> ${isNonEmptyString(data.inquiryId) ? data.inquiryId : "—"}</p>
      <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
      <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
      <p><strong>Phone:</strong> <a href="tel:${data.phone}">${data.phone}</a></p>
      <p><strong>Location:</strong> ${data.location}</p>
      <p><strong>Position:</strong> ${data.position}</p>
      <p><strong>Skill Level:</strong> ${data.skillLevel}</p>
      <p><strong>Details / Past Experience:</strong></p>
      <pre style="white-space: pre-wrap; background: #f6f6f6; padding: 12px; border-radius: 8px;">${data.message}</pre>
      ${
        resumeUrl
          ? `<p><strong>Resume:</strong> <a href="${resumeUrl}" target="_blank" rel="noopener noreferrer">${resumeFileName ?? "View resume"}</a></p>`
          : `<p><strong>Resume:</strong> Not provided</p>`
      }
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
    console.error("[careers inquiry] send failed", error);
    return NextResponse.json(
      { error: "Failed to send inquiry" },
      { status: 500 },
    );
  }
}

