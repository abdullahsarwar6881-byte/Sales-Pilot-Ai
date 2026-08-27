import { resend } from "./resend";

interface PaymentSuccessEmailParams {
  to: string;
  planName: string;
  amount: number;
  currency: string;
  billingCycle: "monthly" | "annual";
  paymentDate: string;
  nextBillingDate: string;
}

export async function sendPaymentSuccessEmail({
  to,
  planName,
  amount,
  currency,
  billingCycle,
  paymentDate,
  nextBillingDate,
}: PaymentSuccessEmailParams) {
  const from =
    process.env.RESEND_FROM_EMAIL ||
    "Sales Pilot <onboarding@resend.dev>";

  const { data, error } =
    await resend.emails.send({
      from,

      to: [to],

      subject:
        "Your Sales Pilot subscription is active",

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          color: #111827;
        ">

          <h1 style="
            margin: 0 0 12px;
            font-size: 28px;
          ">
            Sales Pilot
          </h1>

          <h2 style="
            margin: 0 0 20px;
            font-size: 22px;
          ">
            Payment successful
          </h2>

          <p style="
            font-size: 16px;
            line-height: 1.6;
          ">
            Thank you for subscribing to Sales Pilot.
            Your subscription is now active.
          </p>

          <div style="
            margin: 28px 0;
            padding: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
          ">

            <p style="margin: 0 0 10px;">
              <strong>Plan:</strong>
              ${planName}
            </p>

            <p style="margin: 0 0 10px;">
              <strong>Amount paid:</strong>
              ${currency} ${amount.toLocaleString()}
            </p>

            <p style="margin: 0 0 10px;">
              <strong>Billing:</strong>
              ${billingCycle}
            </p>

            <p style="margin: 0 0 10px;">
              <strong>Payment date:</strong>
              ${paymentDate}
            </p>

            <p style="margin: 0;">
              <strong>Next billing date:</strong>
              ${nextBillingDate}
            </p>

          </div>

          <p style="
            font-size: 16px;
            line-height: 1.6;
          ">
            Your Sales Pilot Starter subscription is ready
            to use.
          </p>

          <p style="
            margin-top: 32px;
            font-size: 14px;
            color: #6b7280;
          ">
            Thank you for choosing Sales Pilot.
          </p>

          <p style="
            font-size: 14px;
            color: #6b7280;
          ">
            Sales Pilot<br />
            AI-powered customer support for businesses
          </p>

        </div>
      `,
    });

  if (error) {
    console.error(
      "Sales Pilot payment email error:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to send payment confirmation email."
    );
  }

  return data;
}