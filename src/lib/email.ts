import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = `"${process.env.EMAIL_FROM_NAME ?? 'CPMAI Prep'}" <${process.env.EMAIL_FROM ?? 'noreply@cpmaiprep.com'}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'CPMAI Prep'

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="background:#1e40af;padding:24px 32px">
          <h1 style="margin:0;color:#fff;font-size:22px">${APP_NAME}</h1>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">CPMAI Exam Preparation</p>
        </td></tr>
        <tr><td style="padding:32px">${content}</td></tr>
        <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0">
          <p style="margin:0;color:#94a3b8;font-size:12px">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px">This is an independent exam preparation platform, not affiliated with PMI.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Verify your ${APP_NAME} account`,
    html: baseTemplate(`
      <h2 style="color:#1e293b;margin:0 0 16px">Welcome, ${name}!</h2>
      <p style="color:#475569;line-height:1.6">Thank you for registering. Please verify your email address to activate your account.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${link}" style="background:#1e40af;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px">Verify Email Address</a>
      </div>
      <p style="color:#94a3b8;font-size:13px">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
    `),
  })
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html: baseTemplate(`
      <h2 style="color:#1e293b;margin:0 0 16px">Password Reset Request</h2>
      <p style="color:#475569;line-height:1.6">Hi ${name}, we received a request to reset your password.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${link}" style="background:#1e40af;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px">Reset Password</a>
      </div>
      <p style="color:#94a3b8;font-size:13px">This link expires in 1 hour. If you did not request a password reset, ignore this email.</p>
    `),
  })
}

export async function sendPaymentConfirmationEmail(
  email: string,
  name: string,
  planName: string,
  amount: number,
  currency: string,
  expiryDate: string
) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Payment confirmed — ${APP_NAME} ${planName}`,
    html: baseTemplate(`
      <h2 style="color:#1e293b;margin:0 0 16px">Payment Confirmed ✓</h2>
      <p style="color:#475569;line-height:1.6">Hi ${name}, your payment was successful. Your subscription is now active.</p>
      <table style="width:100%;border:1px solid #e2e8f0;border-radius:6px;margin:24px 0;border-collapse:collapse">
        <tr style="background:#f8fafc"><td style="padding:12px 16px;color:#64748b;font-size:14px">Plan</td><td style="padding:12px 16px;font-weight:bold">${planName}</td></tr>
        <tr><td style="padding:12px 16px;color:#64748b;font-size:14px">Amount Paid</td><td style="padding:12px 16px;font-weight:bold">${currency} ${amount}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:12px 16px;color:#64748b;font-size:14px">Valid Until</td><td style="padding:12px 16px;font-weight:bold">${expiryDate}</td></tr>
      </table>
      <div style="text-align:center;margin:24px 0">
        <a href="${APP_URL}/dashboard" style="background:#1e40af;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px">Start Practicing</a>
      </div>
    `),
  })
}

export async function sendSubscriptionExpiryReminder(email: string, name: string, daysLeft: number) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Your ${APP_NAME} subscription expires in ${daysLeft} days`,
    html: baseTemplate(`
      <h2 style="color:#1e293b;margin:0 0 16px">Subscription Expiring Soon</h2>
      <p style="color:#475569;line-height:1.6">Hi ${name}, your subscription expires in <strong>${daysLeft} days</strong>. Renew now to keep your access.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${APP_URL}/subscription" style="background:#1e40af;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px">Renew Subscription</a>
      </div>
    `),
  })
}
