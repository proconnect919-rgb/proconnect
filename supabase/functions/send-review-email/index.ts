
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, firstName, userType } = await req.json();

    if (!email || !firstName) {
      return new Response(
        JSON.stringify({ error: "Email and firstName are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Resend API key from environment variables
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Resend API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // User type-specific subject and message
    const isArtisan = userType === "artisan";
    const subject = isArtisan
      ? `Welcome to ArtisanHub, ${firstName}! Your Artisan Profile is Pending Review`
      : `Welcome to ArtisanHub, ${firstName}!`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ArtisanHub</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background-color: #4a90e2; padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .welcome { font-size: 18px; color: #333; margin-bottom: 20px; }
    .message { line-height: 1.6; color: #666; margin-bottom: 25px; }
    .review-notice { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .review-notice p { color: #856404; margin: 0; }
    .review-notice strong { display: block; margin-bottom: 10px; }
    .next-steps { background-color: #e9ecef; border-radius: 6px; padding: 20px; margin: 25px 0; }
    .next-steps h3 { color: #333; margin: 0 0 10px 0; font-size: 16px; }
    .next-steps ul { margin: 0; padding-left: 20px; list-style-type: disc; color: #666; line-height: 1.6; }
    .cta { text-align: center; margin: 30px 0; }
    .cta a { background-color: #4a90e2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e9ecef; }
    .footer a { color: #4a90e2; text-decoration: none; }
    @media screen and (max-width: 480px) {
      .content { padding: 30px 20px; }
      .header { padding: 30px 20px; }
    }
  </style>
</head>
<body>
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table class="container" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="header">
              <h1>🎉 Welcome to ArtisanHub!</h1>
              <p style="font-size: 18px; margin: 10px 0 0 0;">Hello ${firstName},</p>
            </td>
          </tr>
          <tr>
            <td class="content">
              <h2 class="welcome">Congratulations on your registration!</h2>
              
              ${
                isArtisan
                  ? `
              <div class="review-notice">
                <p><strong>Your Artisan Profile is Under Review</strong></p>
                <p>Thank you for joining as an artisan! Your profile has been submitted and is currently pending review by our team. You'll be notified via email once your profile is approved and you can start connecting with clients.</p>
              </div>
              `
                  : `
              <p class="message">You're now ready to discover amazing artisans and book services that fit your needs!</p>
              `
              }
              
              <div class="next-steps">
                <h3>What's Next?</h3>
                <ul>
                  <li>Complete your profile with more details about yourself</li>
                  ${isArtisan ? '<li>Upload your portfolio and certifications (if applicable)</li>' : '<li>Save your favorite artisans</li>'}
                  <li>Start browsing services and connecting with professionals</li>
                </ul>
              </div>

              <div class="cta">
                <a href="https://proconnect.ng/dashboard">Get Started Now</a>
              </div>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p>Need help? Reply to this email or contact our support team at <a href="mailto:support@artisan-hub.com">support@artisan-hub.com</a></p>
              <p>© 2025 ArtisanHub. All rights reserved.<br>123 Artisan Street, Creative City, Innovation Country</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "noreply@proconnect.ng", // Replace with your verified sender email
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API Error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Congratulation email sent successfully",
        resendId: resendData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
