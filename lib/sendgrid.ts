import "server-only";

type SendGridPersonalization = {
  to: Array<{ email: string }>;
  subject: string;
};

type SendGridContent = {
  type: "text/plain" | "text/html";
  value: string;
};

type SendGridMailSendPayload = {
  personalizations: SendGridPersonalization[];
  from: { email: string; name?: string };
  reply_to?: { email: string; name?: string };
  content: SendGridContent[];
};

export type SendGridSendOptions = {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendWithSendGrid(options: SendGridSendOptions) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn("[sendgrid] Missing SENDGRID_API_KEY; skipping email send.");
    return;
  }
  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? "no-reply@getinthebunker.golf";

  const payload: SendGridMailSendPayload = {
    personalizations: [
      {
        to: options.to.map((email) => ({ email })),
        subject: options.subject,
      },
    ],
    from: { email: fromEmail, name: "The Bunker" },
    content: [
      { type: "text/html", value: options.html },
      ...(options.text ? [{ type: "text/plain" as const, value: options.text }] : []),
    ],
  };

  if (options.replyTo) {
    payload.reply_to = { email: options.replyTo };
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`SendGrid error (${response.status}): ${body}`.slice(0, 1000));
  }
}
