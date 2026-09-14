const nodemailer = require("nodemailer");

async function main() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || "shrikar@siddhivinayaklogistics.co.in",
      pass: (process.env.SMTP_PASS || "rueisdsgbkqujsun").replace(/\s+/g, ""),
    },
  });

  console.log("Verifying connection to Google SMTP server...");
  await transporter.verify();
  console.log("✓ SMTP Server is Ready & Verified!");

  console.log("Sending test email to shrikar@siddhivinayaklogistics.co.in...");
  const info = await transporter.sendMail({
    from: `"Siddhi Vinayak International Logistics" <${process.env.SMTP_USER || "shrikar@siddhivinayaklogistics.co.in"}>`,
    to: "shrikar@siddhivinayaklogistics.co.in",
    subject: "SVIL CRM - Email Automation Successfully Enabled!",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #0070f3;">Siddhi Vinayak International Logistics CRM</h2>
        <p>This is a test notification confirming that <strong>Email Automations (DSR Reports &amp; Quotation Dispatch)</strong> are now live and fully operational.</p>
        <p style="font-size: 12px; color: #64748b;">Dispatched securely via Google Workspace SMTP.</p>
      </div>
    `,
  });

  console.log("✓ Test Email Sent Successfully! Message ID:", info.messageId);
}

main().catch(console.error);
