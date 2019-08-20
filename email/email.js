const sgMail = require("@sendgrid/mail");
require("dotenv").config({ path: "variables.env" });

class email {
  constructor() {
    const ENV = process.env.ENV;
    let apiKey;

    if (ENV === "prod") {
      domain = process.env.MAIL_DOMAIN_PROD;
      apiKey = process.env.MAIL_API_KEY_PROD;
    } else {
      domain = process.env.MAIL_DOMAIN_TEST;
      apiKey = process.env.MAIL_API_KEY_TEST;
    }

    // Set key
    sgMail.setApiKey(apiKey);

    // Bind the things
    this.email = sgMail;
    this.sendEmail = this.sendEmail.bind(this);
  }

  /** @description sends email using msg obj
   *  @param {Object} msg - container object
   *  @param {String} msg.to - Who to email
   *  @param {String} msg.from - Who the email is from
   *  @param {String} msg.subject - Email subject line
   *  @param {String} msg.text - Email body
   *  @param {String} msg.html - Email html
   *  @returns {Promise}
   *
   */
  sendEmail(msg) {
    return this.email.send(msg);
  }
}

const Email = new email();
module.exports = Email;
