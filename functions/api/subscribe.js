// Cloudflare Pages Function - proxies newsletter signups to Beehiiv.
// Keeps the Beehiiv secret API key server-side (set as a Secret env var
// in Cloudflare Pages Settings, Variables and secrets).
//
// Env vars expected:
//   BEEHIIV_API_KEY        (Secret)    Beehiiv workspace API key
//   BEEHIIV_PUBLICATION_ID (Plaintext) e.g. pub_xxxxxxxx

export async function onRequestPost({ request, env }) {
    let email;
    try {
          const body = await request.json();
          email = (body.email || '').trim();
    } catch (err) {
          return json({ ok: false, error: 'Invalid request body.' }, 400);
    }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ ok: false, error: 'Please enter a valid email address.' }, 400);
  }

  const apiKey = env.BEEHIIV_API_KEY;
    const publicationId = env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
        return json({ ok: false, error: 'Server is not configured.' }, 500);
  }

  try {
        const res = await fetch(
                `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
          {
                    method: 'POST',
                    headers: {
                                Authorization: `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                                email,
                                reactivate_existing: false,
                                send_welcome_email: true,
                                utm_source: 'rurigallery.com',
                                utm_medium: 'coming_soon_page',
                    }),
          }
              );

      if (res.ok || res.status === 201) {
              return json({ ok: true });
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 400 && /already/i.test(JSON.stringify(data))) {
              return json({ ok: true });
      }

      return json(
        { ok: false, error: data?.errors?.[0]?.message || 'Could not subscribe right now.' },
              res.status
            );
  } catch (err) {
        return json({ ok: false, error: 'Network error. Please try again.' }, 502);
  }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
          status,
          headers: { 'Content-Type': 'application/json' },
    });
}
