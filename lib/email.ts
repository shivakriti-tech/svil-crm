import nodemailer from "nodemailer";

export interface SendDsrEmailOptions {
  to: string;
  cc?: string;
  customerName: string;
  subject: string;
  customMessage?: string;
  shipmentType?: "IMPORT" | "EXPORT" | "GENERAL";
  attachmentBuffer: Buffer;
  attachmentFilename: string;
}

export async function sendDsrEmail(options: SendDsrEmailOptions) {
  const {
    to,
    cc,
    customerName,
    subject,
    customMessage,
    shipmentType = "IMPORT",
    attachmentBuffer,
    attachmentFilename,
  } = options;

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const bannerTitle = subject || `${shipmentType} - (DSR) - ${today} - ${customerName.toUpperCase()}`;

  // Pixel-perfect HTML matching the client's attached design
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f4f6f8;
      color: #1e293b;
    }
    .email-container {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header-top {
      padding: 14px 20px;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #0f172a;
      background: #ffffff;
    }
    .banner-bar {
      background: #0056b3;
      color: #ffffff;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 800;
      text-align: right;
      letter-spacing: 0.02em;
    }
    .banner-bar span {
      background: #f59e0b;
      color: #000000;
      padding: 1px 5px;
      border-radius: 2px;
      font-weight: 800;
    }
    .email-body {
      padding: 30px 24px;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
    }
    .salutation {
      font-weight: 600;
      margin-bottom: 16px;
      color: #0f172a;
    }
    .separator {
      text-align: center;
      color: #94a3b8;
      font-size: 14px;
      letter-spacing: 3px;
      margin: 28px 0 20px 0;
    }
    .tracking-link {
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 30px;
    }
    .tracking-link a {
      color: #0056b3;
      text-decoration: underline;
      font-weight: 700;
    }
    .note-box {
      border-top: 1px solid #e2e8f0;
      padding-top: 18px;
      font-size: 12px;
      color: #475569;
    }
    .note-title {
      font-weight: 800;
      color: #0056b3;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header-top">
      Siddhi Vinayak International Logistics, India
    </div>
    
    <div class="banner-bar">
      ${shipmentType} - <span>(DSR)</span> - ${today} - ${customerName.toUpperCase()}
    </div>
    
    <div class="email-body">
      <div class="salutation">Dear Sir/Madam,</div>
      
      <p>Please find the attached file for ${shipmentType.toLowerCase()} daily status report of your shipments.</p>
      
      ${customMessage ? `<p style="background:#f8fafc; padding:10px 14px; border-left:3px solid #0056b3; font-style:italic;">${customMessage}</p>` : ""}
      
      <div class="separator">* * * * * * * * * * * * * * *</div>
      
      <div class="tracking-link">
        Please visit our website <a href="https://siddhivinayaklogistics.co.in" target="_blank">siddhivinayaklogistics.co.in</a> for online tracking.
      </div>
      
      <div class="note-box">
        <div class="note-title">Note</div>
        <div>: This is an automated email, kindly do not reply.</div>
      </div>
    </div>
  </div>
</body>
</html>
`;

  // Clean SMTP configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "465");
  const smtpUser = process.env.SMTP_USER || "shrikar@siddhivinayaklogistics.co.in";
  const smtpPass = (process.env.SMTP_PASS || "").replace(/[\s"'\\]+/g, "");

  const cleanSender = {
    name: "Siddhi Vinayak International Logistics",
    address: smtpUser,
  };

  // Helper to sanitize multiple email recipients
  const parseRecipients = (raw?: string | null) => {
    if (!raw || !raw.trim()) return undefined;
    const list = raw
      .split(/[,;]+/)
      .map((e) => e.trim().replace(/[<>"']/g, ""))
      .filter((e) => e.length > 0 && e.includes("@"));
    return list.length > 0 ? (list.length === 1 ? list[0] : list) : undefined;
  };

  const recipientTo = parseRecipients(to) || to.trim();
  const recipientCc = parseRecipients(cc);

  if (smtpHost && smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: cleanSender,
      to: recipientTo,
      cc: recipientCc,
      subject: bannerTitle,
      html: htmlContent,
      attachments: [
        {
          filename: attachmentFilename,
          content: attachmentBuffer,
        },
      ],
    });

    return {
      success: true,
      mode: "smtp",
      messageId: info.messageId,
      recipient: to,
    };
  }

  // Simulated email dispatch mode (when SMTP is not yet configured in local environment)
  console.log(`[DSR EMAIL DISPATCH] Simulated email sent to ${to} (${cc ? `CC: ${cc}` : 'no CC'})`);
  console.log(`[DSR EMAIL SUBJECT] ${bannerTitle}`);
  console.log(`[DSR EMAIL ATTACHMENT] ${attachmentFilename} (${attachmentBuffer.length} bytes)`);

  return {
    success: true,
    mode: "simulated",
    recipient: to,
    message: `DSR successfully generated and sent to ${to}. (SMTP simulation mode active)`,
  };
}

export interface SendQuotationEmailOptions {
  to: string;
  cc?: string;
  customerName: string;
  quotationNo: string;
  subject?: string;
  customMessage?: string;
  attachmentBuffer?: Buffer;
  attachmentFilename?: string;
}

export async function sendQuotationEmail(options: SendQuotationEmailOptions) {
  const {
    to,
    cc,
    customerName,
    quotationNo,
    subject,
    customMessage,
    attachmentBuffer,
    attachmentFilename = `Quotation_${quotationNo}.pdf`,
  } = options;

  const emailSubject = subject || `Freight Quotation: ${quotationNo} - Siddhi Vinayak International Logistics`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #002B49; color: #ffffff; padding: 20px 24px; }
    .header h2 { margin: 0; font-size: 1.15rem; font-weight: 800; letter-spacing: 0.02em; }
    .header p { margin: 4px 0 0 0; font-size: 0.8rem; color: #94a3b8; }
    .body { padding: 24px; font-size: 14px; line-height: 1.6; color: #334155; }
    .salutation { font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .badge { display: inline-block; background: rgba(0, 112, 243, 0.1); color: #0070f3; font-weight: 700; padding: 4px 10px; border-radius: 4px; font-size: 0.85rem; margin: 10px 0; }
    .footer { background: #f1f5f9; padding: 16px 24px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>SIDDHI VINAYAK INTERNATIONAL LOGISTICS</h2>
      <p>Official Freight Quotation Dispatch</p>
    </div>
    <div class="body">
      <div class="salutation">Dear ${customerName || "Valued Client"},</div>
      <p>Thank you for giving us the opportunity to quote for your shipment requirements.</p>
      <div class="badge">Quotation Ref: ${quotationNo}</div>
      ${customMessage ? `<p style="white-space: pre-line; background: #f8fafc; padding: 12px; border-left: 3px solid #0070f3; border-radius: 4px;">${customMessage}</p>` : `<p>Please find attached our detailed freight quotation with transparent rate breakdowns and operational terms.</p>`}
      <p>Should you require any clarifications or special requirements, please feel free to reply directly to this email.</p>
      <p style="margin-top: 20px;">Best regards,<br><strong>Commercial & Pricing Team</strong><br>Siddhi Vinayak International Logistics<br><span style="font-size: 12px; color: #64748b;">Mail: sv.internationallogistics@gmail.com | Phone: +91 9725369740</span></p>
    </div>
    <div class="footer">
      This is an automated quotation dispatch from Siddhi Vinayak International Logistics CRM.
    </div>
  </div>
</body>
</html>
`;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "465");
  const smtpUser = process.env.SMTP_USER || "shrikar@siddhivinayaklogistics.co.in";
  const smtpPass = (process.env.SMTP_PASS || "").replace(/[\s"'\\]+/g, "");

  const cleanSender = {
    name: "Siddhi Vinayak International Logistics",
    address: smtpUser,
  };

  const parseRecipients = (raw?: string | null) => {
    if (!raw || !raw.trim()) return undefined;
    const list = raw
      .split(/[,;]+/)
      .map((e) => e.trim().replace(/[<>"']/g, ""))
      .filter((e) => e.length > 0 && e.includes("@"));
    return list.length > 0 ? (list.length === 1 ? list[0] : list) : undefined;
  };

  const recipientTo = parseRecipients(to) || to.trim();
  const recipientCc = parseRecipients(cc);

  if (smtpHost && smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const attachments: any[] = [];
    if (attachmentBuffer) {
      attachments.push({
        filename: attachmentFilename,
        content: attachmentBuffer,
      });
    }

    const info = await transporter.sendMail({
      from: cleanSender,
      to: recipientTo,
      cc: recipientCc,
      subject: emailSubject,
      html: htmlContent,
      attachments,
    });

    return { success: true, mode: "smtp", messageId: info.messageId, recipient: to };
  }

  console.log(`[QUOTATION EMAIL DISPATCH] Simulated quotation email to ${to} for ${quotationNo}`);
  return { success: true, mode: "simulated", recipient: to, message: `Quotation sent to ${to} (Simulated mode)` };
}

