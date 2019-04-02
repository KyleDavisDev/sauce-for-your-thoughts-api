const nodemailer = require("nodemailer");
const promisify = require("es6-promisify");

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

exports.send = async options => {
  const html = `<p>Howdy from Dang That's Delicious!</p><p>To reset your password, use the following link:</p><p><a href='${options.resetURL}'>${options.resetURL}</a></p><p>Thank you!</p>`;
  const text = `Howdy from Dang That's Delicious! To reset your password, use the following link: ${options.resetURL}. Thank you!`;
  const mailOptions = {
    from: `Kyle Bonar <noreply@dangthatsdelicious.com>`,
    to: options.user.email,
    subject: options.subject,
    html,
    text
  };
  const sendMail = promisify(transport.sendMail, transport);
  return sendMail(mailOptions);
};
