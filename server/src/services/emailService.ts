import nodemailer, { type Transporter } from "nodemailer";

/**
 * Email service (Wave 8 P0 follow-up).
 *
 * Wraps nodemailer with a transactional SMTP transport (Brevo by default).
 * If SMTP_* env vars are missing, falls back to console logging so dev mode
 * still works without credentials.
 *
 * Brevo SMTP credentials live in .env:
 *   SMTP_HOST=smtp-relay.brevo.com
 *   SMTP_PORT=587
 *   SMTP_USER=<brevo SMTP login>
 *   SMTP_PASS=<brevo SMTP key>
 *   SMTP_FROM="Ciato Tech <no-reply@ciatotech.com>"
 *   APP_BASE_URL=http://localhost:3002
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: false, // 587 = STARTTLS
    auth: { user, pass },
  });

  return transporter;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string; // fallback plaintext
}

/**
 * sendWithRetry — wrapper de retry exponencial pra SMTP transient errors.
 *
 * Retry policy:
 *   - max 3 tentativas
 *   - backoff exponencial: 1s, 2s, 4s
 *   - retryable: responseCode >= 500 (5xx SMTP), ECONNRESET, ETIMEDOUT, ENOTFOUND, EAI_AGAIN
 *   - NÃO retry: 4xx SMTP (bounce, address inválido, auth fail) — não adianta retry
 */
async function sendWithRetry(
  fn: () => Promise<void>,
  maxRetries = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await fn();
      return;
    } catch (err: unknown) {
      const e = err as { responseCode?: number; code?: string; message?: string };
      const isRetryable =
        (typeof e?.responseCode === "number" && e.responseCode >= 500) ||
        e?.code === "ETIMEDOUT" ||
        e?.code === "ECONNRESET" ||
        e?.code === "ENOTFOUND" ||
        e?.code === "EAI_AGAIN";

      if (!isRetryable || attempt === maxRetries) {
        console.error(
          `[email] send failed after ${attempt} ${attempt === 1 ? "try" : "tries"}: ${e?.message ?? String(err)}`,
        );
        throw err;
      }

      const delay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
      console.warn(
        `[email] retry ${attempt}/${maxRetries} em ${delay}ms (code=${e?.code ?? "?"} responseCode=${e?.responseCode ?? "?"})`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<{ ok: boolean; error?: string; via: "smtp" | "console" }> {
  const from =
    process.env.SMTP_FROM || "Ciato Tech <no-reply@ciatotech.com>";
  const transport = getTransporter();

  if (!transport) {
    // Fallback console (dev mode)
    console.log(
      "\n========== EMAIL (SMTP not configured, console fallback) ==========",
    );
    console.log(`From:    ${from}`);
    console.log(`To:      ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log(
      `HTML preview (first 300 chars): ${params.html.substring(0, 300)}`,
    );
    console.log(
      "===================================================================\n",
    );
    return { ok: true, via: "console" };
  }

  try {
    await sendWithRetry(async () => {
      await transport.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
    });
    console.log(
      `[email] sent to ${params.to} subject="${params.subject}"`,
    );
    return { ok: true, via: "smtp" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] FAILED to ${params.to}: ${msg}`);
    return { ok: false, error: msg, via: "smtp" };
  }
}

/**
 * sendResetEmail — specific transactional email for password recovery flow.
 * Returns { ok, via } so caller can fall back to console log of the link.
 */
export async function sendResetEmail(
  to: string,
  link: string,
): Promise<{ ok: boolean; via: "smtp" | "console" }> {
  const subject = "Recuperação de senha — Ciato Tech";
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1c1e21;">
      <h1 style="color: #1877F2;">Recuperação de senha</h1>
      <p>Recebemos um pedido pra redefinir a senha da sua conta.</p>
      <p>Clica no botão abaixo pra criar uma senha nova (válido por 1 hora):</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${link}" style="background: #1877F2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Redefinir senha</a>
      </p>
      <p style="color: #65676b; font-size: 14px;">Ou copia e cola este link no navegador:</p>
      <p style="word-break: break-all; color: #65676b; font-size: 14px;">${link}</p>
      <hr style="border: none; border-top: 1px solid #e4e6eb; margin: 32px 0;">
      <p style="color: #65676b; font-size: 12px;">Se você não pediu essa recuperação, ignora esse email. Sua senha continua igual.</p>
      <p style="color: #65676b; font-size: 12px;">— Ciato Tech</p>
    </body>
    </html>
  `;
  const text = `Recuperação de senha — Ciato Tech\n\nClica no link pra redefinir (válido 1 hora):\n${link}\n\nSe você não pediu, ignora.`;

  const result = await sendEmail({ to, subject, html, text });
  return { ok: result.ok, via: result.via };
}
