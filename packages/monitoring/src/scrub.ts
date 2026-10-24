import type { ErrorEvent } from "@sentry/core";

// Customer details must not leave our code (Workflow doc: PII). Sentry keeps
// data in the US or EU (D104), so every event passes through here first.
// Order matters: GSTIN contains a PAN, and an email looks like a UPI ID.
const PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu, "[email]"],
  [/[\w.-]+@[a-z]+\b/giu, "[upi]"],
  [/\b\d{2}[A-Z]{5}\d{4}[A-Z][\dA-Z]Z[\dA-Z]\b/gu, "[gstin]"],
  [/\b[A-Z]{5}\d{4}[A-Z]\b/gu, "[pan]"],
  [/(?:\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/gu, "[phone]"],
];

export const scrubText = (text: string): string => {
  let out = text;
  for (const [pattern, label] of PATTERNS) {
    out = out.replace(pattern, label);
  }
  return out;
};

const stripQuery = (url: string) => url.split("?")[0] ?? url;

export const scrubEvent = (event: ErrorEvent): ErrorEvent => {
  const { request, user, extra: _extra, ...rest } = event;
  const out: ErrorEvent = { ...rest };

  if (user?.id !== undefined) {
    out.user = { id: user.id };
  }
  if (request) {
    out.request = {
      ...(request.url && { url: stripQuery(request.url) }),
      ...(request.method && { method: request.method }),
    };
  }
  if (out.message) {
    out.message = scrubText(out.message);
  }
  if (out.exception?.values) {
    out.exception = {
      values: out.exception.values.map((value) => ({
        ...value,
        ...(value.value && { value: scrubText(value.value) }),
      })),
    };
  }
  if (out.breadcrumbs) {
    out.breadcrumbs = out.breadcrumbs.map(
      ({ data: _data, message, ...crumb }) => ({
        ...crumb,
        ...(message && { message: scrubText(message) }),
      })
    );
  }
  return out;
};
