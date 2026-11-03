// Re-auth before billing and delete: a session older than 15 minutes must sign in
// again (prep/Architecture & contracts.md, acceptance for WBS 1.3).
export const REAUTH_MAX_AGE_SECONDS = 15 * 60;

// `startedAt` is when the session was created or last signed in with Google.
export function needsReauth(
  startedAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!startedAt) {
    return true;
  }
  const started = new Date(startedAt).getTime();
  return now.getTime() - started >= REAUTH_MAX_AGE_SECONDS * 1000;
}
