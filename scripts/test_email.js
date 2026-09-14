const nodemailer = require("nodemailer");

async function testSmtp(user, pass) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: user,
      pass: pass.replace(/\s+/g, ""),
    },
  });

  try {
    await transporter.verify();
    console.log(`✓ SUCCESS: ${user}`);
    return true;
  } catch (err) {
    // console.log(`Failed: ${user}`);
    return false;
  }
}

async function main() {
  const pass = "rueisdsgbkqujsun";
  const testEmails = [
    "ankur@siddhivinayaklogistics.co.in",
    "shrikar@siddhivinayaklogistics.co.in",
    "chirag@siddhivinayaklogistics.co.in",
    "info@siddhivinayaklogistics.co.in",
    "admin@siddhivinayaklogistics.co.in",
    "siddhivinayaklogistics@gmail.com",
    "svinternationallogistics@gmail.com",
    "svil@gmail.com",
  ];

  for (const email of testEmails) {
    const ok = await testSmtp(email, pass);
    if (ok) {
      console.log(`\n==> FOUND WORKING SENDER ACCOUNT: ${email} <==`);
      process.exit(0);
    }
  }
  console.log("None of the pre-guessed emails matched.");
}

main();
