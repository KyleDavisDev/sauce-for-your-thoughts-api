require("dotenv").config({ path: "variables.env" });
const env =
  process.env.NODE_ENV === "prod"
    ? "https://sauceforyourthoughts.com"
    : "http://localhost:8080";

exports.emailConfirmation = function(email) {
  return `<!DOCTYPE html>
  <html lang="en">
      <head>
          <meta name="viewport" content="width=device-width" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title></title>
          <style type="text/css">
              /* -------------------------------------
                  GLOBAL RESETS
              ------------------------------------- */
              table,
              td,
              div,
              a {
                box-sizing: border-box;
              }
              
              img {
                -ms-interpolation-mode: bicubic;
                max-width: 100%;
              }
              
              body {
                font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
                -webkit-font-smoothing: antialiased;
                font-size: 14px;
                height: 100% !important;
                line-height: 1.6;
                margin: 0;
                padding: 0;
                -ms-text-size-adjust: 100%;
                -webkit-text-size-adjust: 100%;
                width: 100% !important;
              }
              
              /* Let's make sure all tables have defaults */
              table {
                -premailer-width: 100%;
                border-collapse: separate !important;
                border-spacing: 0;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
                width: 100%;
              }
              table td {
                vertical-align: top;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
              }
              
              /* -------------------------------------
                  BODY & CONTAINER
              ------------------------------------- */
              body {
                background-color: #f6f6f6;
              }
              
              .body {
                background-color: #f6f6f6;
                border-spacing: 0;
                width: 100%;
              }
              .body table {
                -premailer-cellpadding: 0;
                -premailer-cellspacing: 0;
              }
              
              /* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */
              .container {
                display: block;
                margin: 0 auto !important;
                /* makes it centered */
                max-width: 580px;
                padding: 10px;
                text-align: center;
                width: auto !important;
                width: 580px;
              }
              
              /* This should also be a block element, so that it will fill 100% of the .container */
              .content {
                display: block;
                margin: 0 auto;
                max-width: 580px;
                padding: 10px;
                text-align: left;
              }
              
              /* -------------------------------------
                  HEADER, FOOTER, MAIN
              ------------------------------------- */
              .main {
                background: #fff;
                border: 1px solid #e9e9e9;
                border-radius: 3px;
                border-spacing: 0;
                width: 100%;
              }
              
              .wrapper {
                padding: 30px;
              }
                              
              .footer {
                clear: both;
                width: 100%;
              }
              .footer * {
                color: #999;
                font-size: 12px;
              }
              .footer td {
                padding: 20px 0;
              }
              
              /* -------------------------------------
                  TYPOGRAPHY
              ------------------------------------- */
              h1,
              h2,
              h3 {
                color: #000;
                font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;
                font-weight: 400;
                line-height: 1.4;
                margin: 0;
                margin-bottom: 30px;
              }
              
              h1 {
                font-size: 38px;
                text-transform: capitalize;
                font-weight: 300;
              }
              
              h2 {
                font-size: 24px;
                margin-bottom: 10px;
              }
              
              p + h2 {
                margin-top: 30px;
              }
              
              h3 {
                font-size: 18px;
              }
              
              h4 {
                font-size: 14px;
                font-weight: 500;
              }
              
              p,
              ul,
              ol,
              td {
                font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;
                font-size: 14px;
                font-weight: normal;
                margin: 0;
              }
              
              p,
              ul,
              ol {
                margin-bottom: 15px;
                padding: 0;
              }
              p li,
              ul li,
              ol li {
                list-style-position: inside;
                margin-left: 15px;
                margin-bottom: 15px;
              }
              
              a {
                color: #348eda;
                font-weight: bold;
                text-decoration: underline;
              }
              
              /* -------------------------------------
                  BUTTONS
              ------------------------------------- */
              .btn {
                margin-bottom: 15px;
                width: auto;
                -premailer-width: auto;
              }
              .btn td {
                background-color: #fff;
                border-radius: 5px;
                text-align: center;
              }
              .btn a {
                background-color: #fff;
                border: solid 1px #348eda;
                border-radius: 5px;
                color: #348eda;
                cursor: pointer;
                display: inline-block;
                font-size: 14px;
                font-weight: bold;
                margin: 0;
                padding: 12px 25px;
                text-decoration: none;
                text-transform: capitalize;
              }
              
              .btn-primary td {
                background-color: #348eda;
              }
              .btn-primary a {
                background-color: #348eda;
                border-color: #348eda;
                color: #fff;
              }
                              
              /* -------------------------------------
                  RESPONSIVE AND MOBILE FRIENDLY STYLES
              ------------------------------------- */
              @media only screen and (max-width: 620px) {
                table[class=body] h1,
                table[class=body] h2,
                table[class=body] h3,
                table[class=body] h4 {
                  font-weight: 600 !important;
                }
                table[class=body] h1 {
                  font-size: 22px !important;
                }
                table[class=body] h2 {
                  font-size: 18px !important;
                }
                table[class=body] h3 {
                  font-size: 16px !important;
                }
                table[class=body] .wrapper {
                  padding: 10px !important;
                }
                table[class=body] .content {
                  padding: 0 !important;
                }
                table[class=body] .container {
                  padding: 0 !important;
                  width: 100% !important;
                }
                table[class=body] .main {
                  border-radius: 0 !important;
                }
                table[class=body] .alert {
                  border-radius: 0 !important;
                }
                table[class=body] .btn {
                  width: 100% !important;
                }
              }
              
          </style>
      </head>
      <body>
          <table class="body">
              <tr>
                  <td></td>
                  <td class="container">
                      <div class="content">
  <table class="main">
    <tr>
      <td class="wrapper">
        <table>
          <tr>
            <td>
              <p>Hi there,</p>
              <p>This email address has been registered at Sauce For Your Thoughts but has yet to be verified. Accounts with unverified emails will have limited access to the site.</p>
              <p>Please click the link below verify this address and unlock all of the awesome featured of SFYT.</p>
              <table class="btn btn-primary">
                <tr>
                  <td>
                    <a href="${env}/confirm/${email}">Confirm Email</a>
                  </td>
      <td>
      </td>
                </tr>
              </table>
        <p>If you didn't expect this email, please <a href="http://email.mailgun.net/u/eJx1js9uhCAQh59GL5sY_oMHDm66vkB76akBHJWsolHcZN--4zbtrQlhfsA339BZqstoGaE1MbhLrLKildCquTLW3m6MMyXeCkFmF6fhSFWCXI6W95QwcAoUrSF4T3RvJA2ac8dMbXi52RGmabk_J-jcI-5oGE5FFZa5nGK62zHndS94U7AWl1vX6ncEIniTYc8xDZg2CHGNkPKOh_-1pyXk-HAZMAYvhelqKoQy4EjXG157HfC_su6DEYjITgYSZO8ISKMJ8dpL5pXHp3d3BLRIRtple9XP5fgJH-NyDGPeSxy5uvT8Sm4G-2q4IHw5wcsflG3Bmm9Kd3AJ">unsubscribe</a>.</p>
              <p>Thanks, SFYT Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  
  <script type="application/ld+json">
  {
    "@context": "http://schema.org",
    "@type": "EmailMessage",
    "action": {
      "@type": "ViewAction",
      "url": "https://app.mailgun.com/testing/recipients/hellokyledavis@gmail.com/activate/cb548d914468ea0df839b7c61959fc84/5d5c0c5fa0e58700b7b52b6b/Sauce%20For%20Your%20Thoughts",
      "name": "Receive emails from Sauce For Your Thoughts on Mailgun"
    }
  }
  </script>
                      </div>
                  </td>
                  <td></td>
              </tr>
          </table>
      </body>
  </html>`;
};
