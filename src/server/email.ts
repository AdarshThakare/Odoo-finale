import { env } from "~/env";

interface OnboardingEmailInput {
  to: string;
  name: string;
  companyName: string;
  loginId: string;
  temporaryPassword: string;
  role: string;
  loginUrl?: string;
  supportEmail?: string;
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
  const loginUrl = input.loginUrl ?? `${appUrl}/login`;
  const supportEmail = extractEmail(
    input.supportEmail ?? env.EMAIL_FROM ?? "support@empay.com",
  );

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>Welcome to EmPay</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3efff;">
        <span style="display: none; font-size: 1px; color: #f3efff; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
          Your EmPay account is ready. Use the credentials inside to sign in.
        </span>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3efff;">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width: 100%; max-width: 600px;">
                <tr>
                  <td style="background: #efe7ff; background-image: linear-gradient(135deg, #efe7ff 0%, #f8f4ff 45%, #e6dbff 100%); padding: 28px 32px; border-radius: 18px 18px 0 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left" style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 22px; font-weight: 700; color: #271f55;">
                          <span style="display: inline-block; background: #5c3df0; color: #ffffff; width: 34px; height: 34px; line-height: 34px; text-align: center; border-radius: 10px; margin-right: 10px;">E</span>
                          EmPay
                        </td>
                        <td align="right" style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 12px; color: #6a5fb1;">
                          Account activation
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background: #ffffff; border-radius: 0 0 18px 18px; box-shadow: 0 10px 24px rgba(45, 26, 85, 0.12); padding: 24px 32px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding-top: 4px; padding-bottom: 12px;">
                          <div style="width: 54px; height: 54px; border-radius: 999px; background: #f2ecff; border: 2px solid #e5dcff; display: inline-block; line-height: 52px; text-align: center;">
                            <span style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 20px; color: #5c3df0; font-weight: 700;">&#10003;</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 28px; font-weight: 700; color: #171237;">
                          Welcome to EmPay
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 16px; font-weight: 600; color: #16a34a; padding-top: 6px;">
                          Your account is ready
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 14px; color: #5b5676; padding-top: 18px;">
                          Hello ${input.name},<br />
                          ${input.companyName} has created an EmPay account for you. Use the credentials below to sign in.
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; border: 1px solid #efe7ff; border-radius: 16px;">
                      <tr>
                        <td style="padding: 14px 16px; border-bottom: 1px solid #efe7ff;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 13px; font-weight: 600; color: #6d5bd0; width: 34%;">Login URL</td>
                              <td style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 13px; color: #332a66;">
                                <a href="${loginUrl}" style="color: #5c3df0; text-decoration: none;">${loginUrl}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; border-bottom: 1px solid #efe7ff;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 13px; font-weight: 600; color: #6d5bd0; width: 34%;">Login ID</td>
                              <td style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 13px; color: #332a66;">${input.loginId}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px; border-bottom: 1px solid #efe7ff;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 13px; font-weight: 600; color: #6d5bd0; width: 34%;">Temporary password</td>
                              <td style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 13px; color: #332a66;">${input.temporaryPassword}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 13px; font-weight: 600; color: #6d5bd0; width: 34%;">Role</td>
                              <td style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 13px; color: #332a66;">${input.role}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 22px;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background: #5c3df0; color: #ffffff; font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 26px; border-radius: 12px;">
                            Sign in to EmPay &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 18px;">
                      <tr>
                        <td align="center" style="font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 12px; color: #6b668c; background: #f7f4ff; padding: 10px 12px; border-radius: 12px;">
                          For your security, please change your temporary password after your first login.
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; border-top: 1px solid #efe7ff;">
                      <tr>
                        <td style="padding-top: 18px; font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 12px; color: #6b668c;">
                          Need help? Contact our support team at <a href="mailto:${supportEmail}" style="color: #5c3df0; text-decoration: none;">${supportEmail}</a>.
                        </td>
                        <td align="right" style="padding-top: 18px; font-family: 'Poppins', 'Avenir Next', 'Trebuchet MS', sans-serif; font-size: 12px; color: #6b668c;">
                          Thank you,<br />The EmPay Team
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function renderOnboardingText(input: OnboardingEmailInput) {
  const loginUrl = input.loginUrl ?? `${appUrl}/login`;
  const supportEmail = extractEmail(
    input.supportEmail ?? env.EMAIL_FROM ?? "support@empay.com",
  );

  return `Welcome to EmPay, ${input.name}

Your EmPay account for ${input.companyName} has been created.

Company: ${input.companyName}
Login URL: ${loginUrl}
Login ID: ${input.loginId}
Temporary password: ${input.temporaryPassword}
Role: ${input.role}

Please change your temporary password after your first sign-in.

Need help? Contact our support team at ${supportEmail}.
Thank you,
The EmPay Team`;
}

function extractEmail(value: string) {
  const match = /<([^>]+)>/.exec(value);
  return match ? match[1] : value;
}
