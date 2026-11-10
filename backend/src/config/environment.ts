export function validateEnvironment(environment: Record<string, unknown>) {
  for (const name of [
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'DATABASE_URL',
    'FRONTEND_URL',
  ]) {
    if (typeof environment[name] !== 'string' || !environment[name].trim()) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }

  for (const name of ['SUPABASE_URL', 'FRONTEND_URL', 'DATABASE_URL']) {
    const value = environment[name];
    if (typeof value !== 'string') continue;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`Invalid URL in environment variable: ${name}`);
    }
    if (name === 'DATABASE_URL') {
      if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
        throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
      }
    } else {
      const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(
        url.hostname,
      );
      if (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) {
        throw new Error(`${name} must use HTTPS (HTTP is allowed locally)`);
      }
      if (name === 'FRONTEND_URL' && url.origin !== value) {
        throw new Error(
          'FRONTEND_URL must be an origin without a trailing slash',
        );
      }
    }
  }

  const port = Number(environment.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return { ...environment, PORT: port };
}
