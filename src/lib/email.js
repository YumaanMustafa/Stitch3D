import nodemailer from "nodemailer";
import dotenv from "dotenv";

/**
 * @file email.js
 * @description Email utility service using Nodemailer.
 * Handles sending of transactional emails such as verification codes and password resets.
 * Falls back to console logging if credentials are not provided (Mock Mode).
 */
if (!process.env.EMAIL_USER) {
  dotenv.config();
}
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send account verification code email
 * @param {string} email - recipient email
 * @param {string} code - verification code
 */
export async function sendVerificationEmail(email, code) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email credentials missing in .env. Skipping email send.");
    console.log(`🔐 [MOCK EMAIL] To: ${email} | Subject: Verification | Code: ${code}`);
    return;
  }

  try {
    const mailOptions = {
      from: `"Stitch" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Stitch Verification Code",
      html: `
        <div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;">
          <h2 style="color:#2563eb;">Verify your Stitch Account</h2>
          <p>Your 6-digit verification code is:</p>
          <h1 style="font-size:30px;">${code}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>Please copy and paste this code into the Stitch verification screen.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
  } catch (err) {
    console.error("❌ Error sending verification email:", err);
    throw new Error("Failed to send verification email");
  }
}
/**
 * Send password reset code email
 * @param {string} email - recipient email
 * @param {string} code - reset code
 */
export async function sendResetPasswordEmail(email, code) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email credentials missing in .env. Skipping email send.");
    console.log(`🔐 [MOCK EMAIL] To: ${email} | Subject: Password Reset | Code: ${code}`);
    return;
  }

  try {
    const mailOptions = {
      from: `"Stitch" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Stitch Password Reset Code",
      html: `
        <div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;">
          <h2 style="color:#2563eb;">Reset Your Stitch Password</h2>
          <p>Your 6-digit password reset code is:</p>
          <h1 style="font-size:30px;">${code}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>Enter this code in the Stitch password reset screen to set a new password.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
  } catch (err) {
    console.error("❌ Error sending password reset email:", err);
    throw new Error("Failed to send password reset email");
  }
}
export async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email credentials missing in .env. Skipping email send.");
    console.log(`🔐 [MOCK EMAIL] To: ${to} | Subject: ${subject} | Content: ${html.substring(0, 50)}...`);
    return;
  }

  try {
    const mailOptions = {
      from: `"Stitch" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Error sending email:", err);
    // Don't throw, just log, to avoid breaking the main flow
  }
}
