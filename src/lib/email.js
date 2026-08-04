// Import nodemailer library which is used to send emails from Node.js
import nodemailer from "nodemailer";
// Import dotenv to load secret environment variables (like email passwords) from the .env file
import dotenv from "dotenv";

/**
 * File: email.js
 * Description: A helper service that sends automated emails (like verification codes, password resets).
 * It uses Gmail as the email provider.
 * If no email password is provided in the .env file, it switches to "Mock Mode" and just prints the email to the console.
 */

// If the EMAIL_USER variable isn't loaded yet, try loading the .env file directly
if (!process.env.EMAIL_USER) {
  dotenv.config();
}

// Create the "transporter" object that nodemailer uses to connect to Gmail
// It requires an email address (user) and an app-specific password (pass)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends a 6-digit verification code email when a user signs up.
 * 
 * @param {string} email - The email address to send to
 * @param {string} code - The secret 6-digit verification code
 */
export async function sendVerificationEmail(email, code) {
  // 1. Check if email credentials exist. If not, don't crash, just print the code to the console (Mock Mode).
  // This is very useful for local testing when you don't want to actually send real emails.
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email credentials missing in .env. Skipping email send.");
    console.log(`🔐 [MOCK EMAIL] To: ${email} | Subject: Verification | Code: ${code}`);
    return;
  }

  try {
    // 2. Define what the email will look like
    const mailOptions = {
      from: `"Stitch" <${process.env.EMAIL_USER}>`, // Sender name and address
      to: email,                                    // Recipient address
      subject: "Your Stitch Verification Code",     // Subject line
      // The actual HTML content of the email
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

    // 3. Tell nodemailer to actually send the email over the internet
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
  } catch (err) {
    // If it fails (e.g. bad password, no internet), log the error and stop
    console.error("❌ Error sending verification email:", err);
    throw new Error("Failed to send verification email");
  }
}

/**
 * Sends a 6-digit password reset code when a user forgets their password.
 * 
 * @param {string} email - The email address to send to
 * @param {string} code - The secret 6-digit reset code
 */
export async function sendResetPasswordEmail(email, code) {
  // Check for credentials. Fall back to mock mode if missing.
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email credentials missing in .env. Skipping email send.");
    console.log(`🔐 [MOCK EMAIL] To: ${email} | Subject: Password Reset | Code: ${code}`);
    return;
  }

  try {
    // Define the password reset email format
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

    // Send it
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
  } catch (err) {
    console.error("❌ Error sending password reset email:", err);
    throw new Error("Failed to send password reset email");
  }
}

/**
 * A generic function to send any custom email.
 * Accepts an object containing destination (to), subject line, and raw HTML content.
 */
export async function sendEmail({ to, subject, html }) {
  // Check for credentials. Fall back to mock mode if missing.
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
    // Notice we do NOT throw an error here, so if a generic email fails, it won't crash the main app flow
  }
}

/**
 * Sends an email to a vendor or supplier letting them know if the admin approved or rejected their account.
 * 
 * @param {string} email - The email address to send to
 * @param {string} status - Either "active" (approved) or something else (rejected)
 */
export async function sendAccountStatusEmail(email, status) {
  // Determine if the account was approved based on the status string
  const isApproved = status === "active";
  
  // Choose the appropriate subject line
  const subject = isApproved
    ? "Stitch Account Approved"
    : "Stitch Account Application Status Update";

  // Build the appropriate HTML content. One for success, one for rejection.
  const contentHtml = isApproved
    ? `
      <div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;line-height:1.6;">
        <h2 style="color:#10b981;">Congratulations!</h2>
        <p>We are pleased to inform you that your account has been successfully created and approved.</p>
        <p>You can now log in to your account and start listing and selling your products on our platform. We look forward to having you as part of our seller community.</p>
        <p><strong>To get started:</strong></p>
        <ul>
          <li>Log in to your account.</li>
          <li>Complete your seller profile (if applicable).</li>
          <li>Add your products and begin selling.</li>
        </ul>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Thank you for choosing our platform. We wish you great success in your selling journey!</p>
        <p>Best regards,<br>Stitch Team</p>
      </div>
    `
    : `
      <div style="font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:10px;line-height:1.6;">
        <h2 style="color:#ef4444;">Application Update</h2>
        <p>After reviewing your application, we regret to inform you that we are unable to approve your seller account at this time.</p>
        <p>This decision may be due to incomplete information, failure to meet our seller requirements, or other verification-related issues. If applicable, you are welcome to review your application, make the necessary corrections, and submit a new request for consideration.</p>
        <p>If you believe this decision was made in error or you require further clarification, please feel free to contact our support team.</p>
        <p>We appreciate your interest in our platform and thank you for your understanding.</p>
        <p>Best regards,<br>Stitch Team</p>
      </div>
    `;

  // Check for credentials. Fall back to mock mode if missing.
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email credentials missing in .env. Skipping email send.");
    console.log(`🔐 [MOCK EMAIL] To: ${email} | Subject: ${subject} | Status: ${status}`);
    return;
  }

  try {
    const mailOptions = {
      from: `"Stitch" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: contentHtml,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`✅ Account status email sent to ${email} (Status: ${status})`);
  } catch (err) {
    console.error("❌ Error sending account status email:", err);
  }
}
