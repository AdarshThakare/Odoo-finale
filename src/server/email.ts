import { env } from "~/env";

interface OnboardingEmailInput {
  to: string;
  name: string;
  companyName: string;
  loginId: string;
  temporaryPassword: string;
  role: string;
}

interface EmailResult {
  sent: boolean;
  skipped: boolean;
  error?: string;
}

const resendApiKey = env.RESEND_API_KEY ?? env.AUTH_RESEND_KEY;
const appUrl = env.APP_URL ?? env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function sendOnboardingEmail(
  input: OnboardingEmailInput,
): Promise<EmailResult> {
  if (!resendApiKey || !env.EMAIL_FROM) {
    return {
      sent: false,
      skipped: true,
      error: "Resend API key or EMAIL_FROM is not configured",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: "Welcome to EmPay - your account is ready",
      html: renderOnboardingEmail(input),
      text: renderOnboardingText(input),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      sent: false,
      skipped: false,
      error: body || `Resend returned ${response.status}`,
    };
  }

  return { sent: true, skipped: false };
}

function renderOnboardingEmail(input: OnboardingEmailInput) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h1 style="color: #6d28d9;">Welcome to EmPay</h1>
      <p>Hello ${input.name},</p>
      <p>Your EmPay account for ${input.companyName} has been created. Use the credentials below to sign in.</p>
      <table style="border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 6px 12px; font-weight: 700;">Company</td><td style="padding: 6px 12px;">${input.companyName}</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: 700;">Login URL</td><td style="padding: 6px 12px;"><a href="${appUrl}/login">${appUrl}/login</a></td></tr>
        <tr><td style="padding: 6px 12px; font-weight: 700;">Login ID</td><td style="padding: 6px 12px;">${input.loginId}</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: 700;">Temporary password</td><td style="padding: 6px 12px;">${input.temporaryPassword}</td></tr>
        <tr><td style="padding: 6px 12px; font-weight: 700;">Role</td><td style="padding: 6px 12px;">${input.role}</td></tr>
      </table>
      <p>Please change your temporary password after your first sign-in.</p>
    </div>
  `;
}

function renderOnboardingText(input: OnboardingEmailInput) {
  return `Welcome to EmPay, ${input.name}

Your EmPay account for ${input.companyName} has been created.

Company: ${input.companyName}
Login URL: ${appUrl}/login
Login ID: ${input.loginId}
Temporary password: ${input.temporaryPassword}
Role: ${input.role}

Please change your temporary password after your first sign-in.`;
}
