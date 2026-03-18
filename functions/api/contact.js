const json = (payload, init = {}) =>
  new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    ...init
  });

export async function onRequestPost(context) {
  const formData = await context.request.formData();
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const message = formData.get("message")?.toString().trim() ?? "";

  if (!name || !email || !message) {
    return json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!context.env.RESEND_API_KEY || !context.env.CONTACT_TO_EMAIL) {
    return json(
      { error: "Missing CONTACT_TO_EMAIL or RESEND_API_KEY environment variables." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${context.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Fluentz Kidz <info@fluentzkidz.com>",
        to: [context.env.CONTACT_TO_EMAIL],
        reply_to: email,
        subject: `New Fluentz Kidz inquiry from ${name}`,
        text: [`Name: ${name}`, `Email: ${email}`, "", "Message:", message].join("\n")
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return json({ error: "Email delivery failed.", detail }, { status: 502 });
    }

    const acceptHeader = context.request.headers.get("accept") ?? "";
    if (acceptHeader.includes("text/html")) {
      const origin = new URL(context.request.url).origin;
      return Response.redirect(`${origin}/contact?status=success`, 303);
    }

    return json({ ok: true });
  } catch {
    const acceptHeader = context.request.headers.get("accept") ?? "";
    if (acceptHeader.includes("text/html")) {
      const origin = new URL(context.request.url).origin;
      return Response.redirect(`${origin}/contact?status=error`, 303);
    }

    return json({ error: "Unexpected server error." }, { status: 500 });
  }
}
