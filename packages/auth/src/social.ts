export interface GoogleKeys {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

// Google is the Phase 1 sign-in (Architecture: Google OAuth). Without both keys the
// provider is off, so dev and CI start without a Google project.
export function socialProviders({
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
}: GoogleKeys) {
  if (!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)) {
    return {};
  }
  return {
    google: {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    },
  };
}
