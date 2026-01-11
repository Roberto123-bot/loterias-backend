const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

const sentFrom = new Sender(
  process.env.MAIL_FROM_EMAIL,
  process.env.MAIL_FROM_NAME
);

async function sendEmail({ to, subject, html, text }) {
  const recipients = [new Recipient(to)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject(subject)
    .setHtml(html)
    .setText(text || "");

  return mailerSend.email.send(emailParams);
}

module.exports = {
  sendEmail,
};
