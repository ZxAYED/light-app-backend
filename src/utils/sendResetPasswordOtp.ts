import sgMail from "@sendgrid/mail";
import config from "../config";

sgMail.setApiKey(config.SendGridAPI!);

export const sendPasswordResetOtp = async (to: string, otp: string) => {
  const subject = "Light App - Password Reset OTP";

  const html = `
  <div style="font-family: 'Arial', sans-serif; background:#f7fdf9; padding:22px; max-width:500px; margin:auto; border-radius:14px; border:1px solid #e5f3ea;">
    <div style="text-align:center;">

      <!-- Illustration Matching App UI -->
      <img src="https://i.ibb.co/84j0hWB/light-welcome.png" width="130" style="margin-top:10px"/>

      <h2 style="color:#2d2d2d; margin-top:20px; font-size:24px; font-weight:600;">
        Reset Your <span style="color:#4CAF50">Light</span> Password
      </h2>

      <p style="color:#555; font-size:15px; margin-top:12px; line-height:1.6;">
        You requested to reset your Light App account password.
        <br><br>
        Please use the OTP code below to continue:
      </p>

      <!-- OTP Box -->
      <div style="background:#e8f7ed; color:#2d7a39; padding:14px 22px; border-radius:12px; 
        font-size:28px; font-weight:bold; letter-spacing:4px; width:fit-content; margin:20px auto 0;">
        ${otp}
      </div>

      <p style="color:#666; margin-top:22px; font-size:14px;">
        This code will expire in <strong>5 minutes</strong>.
      </p>

      <!-- Security Note -->
      <p style="background:#f0f9f3; border:1px solid #c8e6c9; padding:12px 16px; 
        border-radius:10px; color:#2e7d32; font-size:13px; margin-top:25px; line-height:1.5;">
        ⚠️ Do not share this OTP with anyone. Light support will never ask for your code.
      </p>

      <p style="margin-top:30px; font-size:12px; color:#999;">
        If you didn't request a password reset, you can safely ignore this email.
      </p>

      <p style="font-size:11px; color:#777; margin-top:10px;">
        © ${new Date().getFullYear()} Light App. All Rights Reserved.
      </p>

    </div>
  </div>
  `;

  try {
    await sgMail.send({
      to,
      from: config.SendGridEmail!, 
      subject,
      html,
      text: `Your Light App password reset OTP is ${otp}`,
    });
  } catch (err: any) {
    console.error("❌ SendGrid Error:", err.response?.body || err);
    throw new Error("Email sending failed");
  }
};
