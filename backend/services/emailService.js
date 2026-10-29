import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  transporter ||= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
};

export const sendPasswordResetEmail = (to, resetUrl) =>
  getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset your Lienwand password",
    text: `Reset your password (valid for 15 minutes): ${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html: `<p>Reset your password (valid for 15 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, ignore this email.</p>`,
  });
