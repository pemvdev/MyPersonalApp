import { validateEnvironment } from './environment';

describe('environment validation', () => {
  const environment = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'test-key',
    DATABASE_URL: 'postgresql://localhost:5432/test',
    FRONTEND_URL: 'http://localhost:5173',
  };

  it('accepts local development and defaults the port', () => {
    expect(validateEnvironment(environment).PORT).toBe(3000);
  });

  it('rejects missing database credentials', () => {
    expect(() =>
      validateEnvironment({ ...environment, DATABASE_URL: '' }),
    ).toThrow('Missing required environment variable: DATABASE_URL');
  });

  it('rejects insecure remote origins', () => {
    expect(() =>
      validateEnvironment({
        ...environment,
        FRONTEND_URL: 'http://example.com',
      }),
    ).toThrow('FRONTEND_URL must use HTTPS');
  });

  it('rejects invalid ports', () => {
    expect(() =>
      validateEnvironment({ ...environment, PORT: 'invalid' }),
    ).toThrow('PORT must be an integer');
  });
});
