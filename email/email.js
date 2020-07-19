const sgMail = require("@sendgrid/mail");
require("dotenv").config({ path: "variables.env" });

accountConfirmation = require("./accountConfirmation");
resetPasswordEmail = require("./passwordReset");

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

  /**
   * @description Construct an HTML email to send a person so they can confirm their email
   * @param {String} token - User-specific JWT used for verification
   */
  registrationEmailHTML(token) {
    return accountConfirmation.HTML(token);
  }

  /**
   * @description Construct an Text email to send a person so they can confirm their email
   * @param {String} token - User-specific JWT used for verification
   */
  registrationEmail(token) {
    return accountConfirmation.Text(token);
  }

  /**
   * @description Construct an HTML email to send a person so they can reset their password
   * @param {String} token - User-specific JWT used for verification
   */
  resetPasswordEmailHTML(token) {
    return resetPasswordEmail.HTML(token);
  }

  /**
   * @description Construct an Text email to send a person so they can reset their password
   * @param {String} token - User-specific JWT used for verification
   */
  resetPasswordEmail(token) {
    return resetPasswordEmail.Text(token);
  }
}

const Email = new email();
module.exports = Email;
