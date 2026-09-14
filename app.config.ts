import type { ExpoConfig } from 'expo/config';

/**
 * Three targets, selected by APP_ENV: local, staging, prod.
 *
 * Mirrors the Flutter app's assets/config/{local,stg,prod}.json, including its
 * deliberate hard failure when a production build resolves to a development URL -- that
 * check exists because a release that silently points at a LAN address looks fine until
 * it is in front of customers.
 *
 * Only EXPO_PUBLIC_* values belong here: everything in this file is compiled into the
 * bundle and is readable by anyone who opens the site. No gateway credentials, ever.
 * The Firebase web config is not a secret -- access is controlled by the admin custom
 * claim, checked server-side on every request.
 */

type Env = 'local' | 'staging' | 'prod';

const APP_ENV = (process.env.APP_ENV ?? 'local') as Env;

const API_URLS: Record<Env, string> = {
  local: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
  staging: 'https://api-sbx.fullwash.uy',
  prod: 'https://api.fullwash.uy',
};

const apiUrl = API_URLS[APP_ENV];

if (!apiUrl) {
  throw new Error(`Unknown APP_ENV "${APP_ENV}". Expected local, staging or prod.`);
}

if (APP_ENV === 'prod' && !apiUrl.startsWith('https://api.fullwash.uy')) {
  // A real runtime check, not an assertion: this must fail the build, not be stripped.
  throw new Error(
    `Refusing to build for prod against ${apiUrl}. A production bundle must point at ` +
      'the production API.',
  );
}

const config: ExpoConfig = {
  name: APP_ENV === 'prod' ? 'FullWash Backoffice' : `FullWash Backoffice (${APP_ENV})`,
  slug: 'fullwash-backoffice',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'fullwash-admin',
  web: {
    bundler: 'metro',
    // Static output with client-side routing; CloudFront rewrites 404 to /index.html so
    // deep links like /clients/abc resolve.
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router'],
  extra: {
    appEnv: APP_ENV,
    apiUrl,
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'full-wash',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID,
    },
  },
};

export default config;
