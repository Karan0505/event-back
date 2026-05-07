const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        if (!process.env.EMAIL_PASS) {
            console.warn('EMAIL_PASS is not set. Emails will not be sent.');
            return;
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.FROM_EMAIL || "maxparmar09@gmail.com",
                pass: process.env.EMAIL_PASS
            }
        });

        const baseHtml = options.html;
        const styledHtml = baseHtml ? `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { margin: 0; padding: 0; background-color: #fdf8f0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1c1410; }
  .email-wrapper { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120, 80, 20, 0.08); border: 1px solid rgba(180, 140, 90, 0.15); }
  .email-header { background: linear-gradient(135deg, #ea6a1e 0%, #c45318 100%); padding: 35px 30px; text-align: center; color: white; }
  .email-header-logo { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0; display: inline-block; font-family: system-ui, sans-serif; }
  .email-header-logo span { color: #f5e642; }
  .email-body { padding: 40px 35px; line-height: 1.6; font-size: 16px; color: #333; }
  .email-body h2 { color: #ea6a1e; margin-top: 0; font-weight: 800; font-size: 22px; letter-spacing: -0.03em; }
  .email-body h3 { color: #1c1410; font-size: 18px; margin-top: 25px; font-weight: 700; }
  .email-body p { margin-bottom: 16px; color: #555; }
  .email-body ul { background: #faf5f0; border-radius: 8px; padding: 20px 20px 20px 40px; margin: 25px 0; border: 1px dashed rgba(180, 140, 90, 0.25); }
  .email-body li { margin-bottom: 10px; color: #1c1410; }
  .email-body strong { color: #1c1410; font-weight: 700; }
  .email-footer { background-color: #1c1410; padding: 30px; text-align: center; color: #e8ddd0; font-size: 13px; border-top: 4px solid #ea6a1e; }
  .email-footer p { margin: 6px 0; opacity: 0.6; }
  .email-btn { display: inline-block; background: linear-gradient(135deg, #ea6a1e, #d4960a); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin-top: 25px; box-shadow: 0 4px 12px rgba(234, 106, 30, 0.3); }
</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <h1 class="email-header-logo"><span>●</span> Event X</h1>
    </div>
    <div class="email-body">
      ${baseHtml}
    </div>
    <div class="email-footer">
      <p>&copy; ${new Date().getFullYear()} Event X. All rights reserved.</p>
      <p>The premium platform to discover, create & manage extraordinary events.</p>
    </div>
  </div>
</body>
</html>
        ` : null;

        const msg = {
            to: options.email,
            from: process.env.FROM_NAME ? `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>` : process.env.FROM_EMAIL,
            subject: options.subject,
            text: options.message,
            html: styledHtml || options.html,
        };

        const info = await transporter.sendMail(msg);
        console.log(`Message sent to ${options.email}, ID: ${info.messageId}`);
    } catch (error) {
        console.error("Email could not be sent", error);
    }
};

module.exports = sendEmail;
