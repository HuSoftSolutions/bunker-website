import { NextResponse } from "next/server";
import { sendWithSendGrid } from "@/lib/sendgrid";

export const runtime = "nodejs";

type EventsInquiryEmailPayload = {
  inquiryId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneExt?: string | null;
  company?: string | null;
  contactPreference: string;
  eventType: string;
  location: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  headcount: number;
  additionalInfo?: string | null;
  heardAbout: string;
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
  let data: EventsInquiryEmailPayload;

  try {
    data = (await request.json()) as EventsInquiryEmailPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const required: Array<keyof EventsInquiryEmailPayload> = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "contactPreference",
    "eventType",
    "location",
    "eventDate",
    "startTime",
    "endTime",
    "heardAbout",
  ];

  const missing = required.filter((field) => !isNonEmptyString(data?.[field]));
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  if (typeof data.headcount !== "number" || Number.isNaN(data.headcount)) {
    return NextResponse.json(
      { error: "Missing required field: headcount" },
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

  const phoneExt = isNonEmptyString(data.phoneExt) ? data.phoneExt.trim() : null;
  const company = isNonEmptyString(data.company) ? data.company.trim() : null;
  const additionalInfo = isNonEmptyString(data.additionalInfo)
    ? data.additionalInfo.trim()
    : null;

  const subject = `Event Inquiry: ${data.firstName.trim()} ${data.lastName.trim()} (${data.location.trim()})`;

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2>New Event Inquiry</h2>
      <p><strong>Inquiry ID:</strong> ${isNonEmptyString(data.inquiryId) ? data.inquiryId : "—"}</p>
      <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
      <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
      <p><strong>Phone:</strong> <a href="tel:${data.phone}">${data.phone}</a>${phoneExt ? ` ext. ${phoneExt}` : ""}</p>
      <p><strong>Company:</strong> ${company ?? "—"}</p>
      <p><strong>Contact Preference:</strong> ${data.contactPreference}</p>
      <p><strong>Event Type:</strong> ${data.eventType}</p>
      <p><strong>Location:</strong> ${data.location}</p>
      <p><strong>Date:</strong> ${data.eventDate}</p>
      <p><strong>Time:</strong> ${data.startTime} – ${data.endTime}</p>
      <p><strong>Headcount:</strong> ${data.headcount}</p>
      <p><strong>Heard About Us:</strong> ${data.heardAbout}</p>
      <p><strong>Additional Info:</strong></p>
      <pre style="white-space: pre-wrap; background: #f6f6f6; padding: 12px; border-radius: 8px;">${additionalInfo ?? "—"}</pre>
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
    console.error("[events inquiry] send failed", error);
    return NextResponse.json({ error: "Failed to send inquiry" }, { status: 500 });
  }
}
