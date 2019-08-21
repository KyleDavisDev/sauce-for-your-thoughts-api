const sgMail = require("@sendgrid/mail");
require("dotenv").config({ path: "variables.env" });

emailConfirmation = require("./emailConfirmation");

class email {
  constructor() {
    const ENV = process.env.ENV;
    let apiKey;

    if (ENV === "prod") {
      apiKey = process.env.MAIL_API_KEY_PROD;
    } else {
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

  registrationEmailHTML(msg) {
    return emailConfirmation.registrationConfirmationHTML(msg);
  }

  registrationEmail(msg) {
    return emailConfirmation.registrationConfirmationText(msg);
  }
}

const Email = new email();
module.exports = Email;
