"use strict";
import nodemailer from "nodemailer";



export async function sendEmail(to: string, html: string) {

//   let testAccount = await nodemailer.createTestAccount();
//   console.log("testAccount", testAccount);

  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: 'l6yer63hi36hemz6@ethereal.email',
      pass: '5uagzxnkFEGxfvGVeD',
    },
  });

  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to, // list of receivers
    subject: "Change Password", // Subject line
    html, // plain text body
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
