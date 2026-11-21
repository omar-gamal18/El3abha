const { Resend } = require("resend");

exports.sendEmail = async ({ to, resetCode }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required to send email");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: "Your App <onboarding@resend.dev>",
    to,
    subject: "Password Reset Code",
    html: `
    <h2>Password Reset</h2>
    <p>Your password reset code is:</p>
    <h1>${resetCode}</h1>
    <p>This code expires in 10 minutes.</p>
  `,
  });

  if (error) throw new Error(error.message);

  return data;
};
