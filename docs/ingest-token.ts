interface Env {
  VIZOALICA_TOKEN_SECRET: string;
  VIZOALICA_PROJECT_ID: string;
  VIZOALICA_SOURCE_ID: string;
  VIZOALICA_SITE_ORIGIN: string;
}

const encoder = new TextEncoder();
function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
function encoded(value: unknown): string {
  return base64url(encoder.encode(JSON.stringify(value)));
}
function reply(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...(status === 405 ? { allow: 'GET' } : {})
    }
  });
}

export async function onRequest({
  request,
  env
}: {
  request: Request;
  env: Env;
}): Promise<Response> {
  if (request.method !== 'GET') return reply('Method not allowed', 405);
  try {
    if (
      !env.VIZOALICA_TOKEN_SECRET ||
      env.VIZOALICA_TOKEN_SECRET.length < 32 ||
      !env.VIZOALICA_PROJECT_ID ||
      env.VIZOALICA_PROJECT_ID.startsWith('REPLACE_') ||
      !env.VIZOALICA_SOURCE_ID ||
      env.VIZOALICA_SOURCE_ID.startsWith('REPLACE_') ||
      new URL(env.VIZOALICA_SITE_ORIGIN).origin !== env.VIZOALICA_SITE_ORIGIN ||
      !env.VIZOALICA_SITE_ORIGIN.startsWith('https://')
    )
      return reply('Token issuer is not configured', 503);
  } catch {
    return reply('Token issuer is not configured', 503);
  }
  let provenance = request.headers.get('origin');
  if (!provenance) {
    try {
      provenance = new URL(request.headers.get('referer') ?? '').origin;
    } catch {
      return reply('Origin not allowed', 403);
    }
  }
  if (
    provenance !== env.VIZOALICA_SITE_ORIGIN ||
    new URL(request.url).origin !== env.VIZOALICA_SITE_ORIGIN
  )
    return reply('Origin not allowed', 403);

  // Scope comes only from server configuration, never request parameters or headers.
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: 'vizoalica-pages',
    aud: 'vizoalica-ingest',
    sub: `source/${env.VIZOALICA_SOURCE_ID}`,
    project_id: env.VIZOALICA_PROJECT_ID,
    source_id: env.VIZOALICA_SOURCE_ID,
    origin: env.VIZOALICA_SITE_ORIGIN,
    scope: 'events:write',
    iat: now,
    nbf: now,
    exp: now + 300,
    jti: crypto.randomUUID(),
    max_events: 25
  };
  const input = `${encoded({ alg: 'HS256', typ: 'JWT' })}.${encoded(claims)}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.VIZOALICA_TOKEN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(input));
  return reply(`${input}.${base64url(new Uint8Array(signature))}`, 200);
}
