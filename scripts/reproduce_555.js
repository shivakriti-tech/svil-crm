const nodemailer = require("nodemailer");

async function test() {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: "shrikar@siddhivinayaklogistics.co.in", pass: "rueisdsgbkqujsun" }
  });

  // Test 1: With literal escaped backslashes as read from .env
  const badFrom = '\\"Siddhi Vinayak International Logistics\\" <shrikar@siddhivinayaklogistics.co.in>';
  try {
    await transporter.sendMail({
      from: badFrom,
      to: "shrikar@siddhivinayaklogistics.co.in",
      subject: "Test Bad From",
      text: "Hello"
    });
    console.log("Test 1 succeeded");
  } catch (e) {
    console.log("Test 1 (bad from) failed as expected with:", e.message);
  }

  // Test 2: With clean object sender format
  try {
    const res = await transporter.sendMail({
      from: {
        name: "Siddhi Vinayak International Logistics",
        address: "shrikar@siddhivinayaklogistics.co.in"
      },
      to: "shrikar@siddhivinayaklogistics.co.in",
      subject: "Test Clean Sender Object",
      text: "Hello"
    });
    console.log("Test 2 (Clean sender object) succeeded! Message ID:", res.messageId);
  } catch (e) {
    console.log("Test 2 failed with:", e.message);
  }
}

test();
