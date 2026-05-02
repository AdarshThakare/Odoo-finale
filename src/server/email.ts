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
const appUrl = env.APP_URL ?? "http://localhost:3000";

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
      subject: "Welcome to EMPAY - your account is ready",
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
        <title>Welcome to EMPAY</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3efff;">
        <span style="display: none; font-size: 1px; color: #f3efff; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
          Your EMPAY account is ready. Use the credentials inside to sign in.
        </span>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3efff;">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width: 100%; max-width: 600px; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(92, 61, 240, 0.10);">

                <!-- HEADER with purple gradient, decorative dots and wave -->
                <tr>
                  <td style="background: linear-gradient(135deg, #c5b3f7 0%, #d8c9fa 30%, #e8dffc 60%, #c9b8f5 100%); padding: 0; position: relative; height: 130px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="height: 130px;">
                      <tr>
                        <td style="padding: 0; vertical-align: top; position: relative;">
                          <!-- Decorative dot grid top-left -->
                          <div style="position: absolute; top: 16px; left: 20px; color: rgba(255,255,255,0.5); font-size: 8px; line-height: 10px; letter-spacing: 6px;">&#8226;&#8226;&#8226;&#8226;&#8226;<br/>&#8226;&#8226;&#8226;&#8226;&#8226;<br/>&#8226;&#8226;&#8226;&#8226;&#8226;<br/>&#8226;&#8226;&#8226;&#8226;&#8226;</div>
                          <!-- Decorative dot grid top-right -->
                          <div style="position: absolute; top: 40px; right: 24px; color: rgba(92,61,240,0.25); font-size: 8px; line-height: 10px; letter-spacing: 6px;">&#8226;&#8226;&#8226;&#8226;&#8226;<br/>&#8226;&#8226;&#8226;&#8226;&#8226;<br/>&#8226;&#8226;&#8226;&#8226;&#8226;</div>
                          <!-- EMPAY Logo centered -->
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td align="center" style="padding-top: 36px;">
                                <table role="presentation" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="width: 40px; height: 40px; background: #7c5ce7; border-radius: 12px; text-align: center; vertical-align: middle;">
                                      <span style="color: #ffffff; font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 700;">E</span>
                                    </td>
                                    <td style="padding-left: 10px; font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 700; text-shadow: 0 1px 4px rgba(255,255,255,0.18);">
                                      <span style="color: #7c5ce7;">EM</span><span style="color: #111827;">PAY</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- WHITE BODY -->
                <tr>
                  <td style="background: #ffffff; padding: 0 36px 36px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">

                      <!-- Checkmark badge overlapping header -->
                      <tr>
                        <td align="center" style="padding-top: 0; position : relative">
                          <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #f0ebff 0%, #e8e0ff 100%); border: 3px solid #d8ccf5; display: inline-block; line-height: 56px; text-align: center; margin-top: -30px;">
                            <span style="font-size: 24px; color: #7c5ce7;">&#10003;</span>
                          </div>
                        </td>
                      </tr>

                      <!-- Title -->
                      <tr>
                        <td align="center" style="font-family: 'Poppins', 'Segoe UI', sans-serif; font-size: 30px; font-weight: 700; color: #1a1338; padding-top: 16px; line-height: 1.2;">
                          Welcome to <span style="color: #7c5ce7;">EM</span><span style="color: #111827;">PAY</span>
                        </td>
                      </tr>

                      <!-- Green subtitle with underline -->
                      <tr>
                        <td align="center" style="padding-top: 8px; padding-bottom: 6px;">
                          <span style="font-family: 'Poppins', sans-serif; font-size: 17px; font-weight: 600; color: #16a34a;">Your account is ready</span>
                          <div style="width: 40px; height: 3px; background: #16a34a; border-radius: 2px; margin: 8px auto 0;"></div>
                        </td>
                      </tr>

                      <!-- Greeting -->
                      <tr>
                        <td align="center" style="font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 600; color: #1a1338; padding-top: 20px;">
                          Hello ${input.name},
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family: 'Poppins', sans-serif; font-size: 13px; color: #6b668c; padding-top: 6px; line-height: 1.6;">
                          ${input.companyName} has created an EMPAY account for you. Use the<br/>credentials below to sign in and get started.
                        </td>
                      </tr>

                      <!-- Credentials card -->
                      <tr>
                        <td style="padding-top: 24px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1.5px solid #ede7fb; border-radius: 16px; overflow: hidden;">
                            <!-- Login URL row -->
                            <tr>
                              <td style="padding: 16px 20px; border-bottom: 1px solid #f0ebfa;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                  <tr>
                                    <td width="36" valign="middle">
                                      <div style="width: 32px; height: 32px; border-radius: 8px; background: #f3efff; text-align: center; line-height: 32px;">
                                        <span style="color: #7c5ce7; font-size: 16px;">&#127760;</span>
                                      </div>
                                    </td>
                                    <td style="padding-left: 12px; font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: #1a1338;" valign="middle">Login URL</td>
                                    <td align="right" style="font-family: 'Poppins', sans-serif; font-size: 13px;" valign="middle">
                                      <a href="${loginUrl}" style="color: #16a34a; text-decoration: none; font-weight: 500;">${loginUrl}</a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <!-- Login ID row -->
                            <tr>
                              <td style="padding: 16px 20px; border-bottom: 1px solid #f0ebfa;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                  <tr>
                                    <td width="36" valign="middle">
                                      <div style="width: 32px; height: 32px; border-radius: 8px; background: #f3efff; text-align: center; line-height: 32px;">
                                        <span style="color: #7c5ce7; font-size: 16px;">&#128100;</span>
                                      </div>
                                    </td>
                                    <td style="padding-left: 12px; font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: #1a1338;" valign="middle">Login ID</td>
                                    <td align="right" style="font-family: 'Poppins', sans-serif; font-size: 13px; color: #332a66; font-weight: 500;" valign="middle">${input.loginId}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <!-- Temporary Password row -->
                            <tr>
                              <td style="padding: 16px 20px; border-bottom: 1px solid #f0ebfa;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                  <tr>
                                    <td width="36" valign="middle">
                                      <div style="width: 32px; height: 32px; border-radius: 8px; background: #f3efff; text-align: center; line-height: 32px;">
                                        <span style="color: #7c5ce7; font-size: 16px;">&#128274;</span>
                                      </div>
                                    </td>
                                    <td style="padding-left: 12px; font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: #1a1338;" valign="middle">Temporary Password</td>
                                    <td align="right" style="font-family: 'Poppins', sans-serif; font-size: 13px; color: #332a66; font-weight: 500;" valign="middle">${input.temporaryPassword} &nbsp;<span style="color:#b0a4d6; cursor:pointer;"></span></td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <!-- Role row -->
                            <tr>
                              <td style="padding: 16px 20px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                  <tr>
                                    <td width="36" valign="middle">
                                      <div style="width: 32px; height: 32px; border-radius: 8px; background: #f3efff; text-align: center; line-height: 32px;">
                                        <span style="color: #7c5ce7; font-size: 16px;">&#9745;</span>
                                      </div>
                                    </td>
                                    <td style="padding-left: 12px; font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: #1a1338;" valign="middle">Role</td>
                                    <td align="right" style="font-family: 'Poppins', sans-serif; font-size: 13px; color: #332a66; font-weight: 500;" valign="middle">${input.role}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- CTA Button -->
                      <tr>
                        <td align="center" style="padding-top: 28px;">
                          <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c5ce7 0%, #6341d4 100%); color: #ffffff; font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 28px; box-shadow: 0 4px 14px rgba(124, 92, 231, 0.35);">
                            Sign in to EMPAY &nbsp;&rarr;
                          </a>
                        </td>
                      </tr>

                      <!-- Security notice -->
                      <tr>
                        <td style="padding-top: 24px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #f9f7ff; border: 1px solid #ede7fb; border-radius: 14px;">
                            <tr>
                              <td width="44" style="padding: 14px 0 14px 16px;" valign="middle">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: #ede7fb; text-align: center; line-height: 32px;">
                                  <span style="color: #7c5ce7; font-size: 16px;">&#128737;</span>
                                </div>
                              </td>
                              <td style="padding: 14px 16px 14px 10px; font-family: 'Poppins', sans-serif; font-size: 12px; color: #5b5676; line-height: 1.5;">
                                For your security, please change your temporary password after your first login.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="padding-top: 28px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td width="36" valign="top" style="padding-top: 2px;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: #f3efff; text-align: center; line-height: 32px;">
                                  <span style="color: #7c5ce7; font-size: 14px;">&#10068;</span>
                                </div>
                              </td>
                              <td style="padding-left: 10px; font-family: 'Poppins', sans-serif; font-size: 12px; color: #5b5676; line-height: 1.6;" valign="top">
                                <span style="color: #16a34a; font-weight: 600;">Need help?</span><br/>
                                Contact our support team at<br/>
                                <a href="mailto:${supportEmail}" style="color: #16a34a; text-decoration: none; font-weight: 500;">${supportEmail}</a>
                              </td>
                              <td align="right" valign="top" style="font-family: 'Poppins', sans-serif; font-size: 12px; color: #5b5676;">
                                <span style="color: #c5b3f7; font-size: 18px;">&#9825;</span><br/>
                                Thank you,<br/>
                                <span style="font-weight: 600;"><span style="color: #7c5ce7;">EM</span><span style="color: #111827;">PAY</span> Team</span>
                              </td>
                            </tr>
                          </table>
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

  return `Welcome to EMPAY, ${input.name}

Your EMPAY account for ${input.companyName} has been created.

Company: ${input.companyName}
Login URL: ${loginUrl}
Login ID: ${input.loginId}
Temporary password: ${input.temporaryPassword}
Role: ${input.role}

Please change your temporary password after your first sign-in.

Need help? Contact our support team at ${supportEmail}.
Thank you,
The EMPAY Team`;
}

function extractEmail(value: string) {
  const match = /<([^>]+)>/.exec(value);
  return match ? match[1] : value;
}
