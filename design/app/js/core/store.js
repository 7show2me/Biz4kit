/* The data store. Default data comes from data/default.json; the live copy is kept in sessionStorage
   (owner, 22 Oct: "JSON dataStore default data and sessionStorage actual data"). Every change goes through
   commit(), which runs a business-layer function on a draft, writes the activity log and saves. */
import { BizError, nowStamp } from "./util.js";

const KEY = "b4k-app";
let state = null;
let defaults = null;
const listeners = new Set();

export async function load() {
  defaults = await (
    await fetch(new URL("../../data/default.json", import.meta.url), {
      cache: "no-store",
    })
  ).json();
  try {
    const saved = sessionStorage.getItem(KEY);
    state = saved ? JSON.parse(saved) : structuredClone(defaults);
  } catch {
    state = structuredClone(defaults);
  }
  normalise(state);
  return state;
}

/* Collections a file may leave out. */
function normalise(s) {
  for (const k of [
    "members",
    "items",
    "categories",
    "packages",
    "customers",
    "leads",
    "invoices",
    "payments",
    "bookings",
    "jobs",
    "templates",
    "outbox",
    "devices",
    "activity",
  ]) {
    s[k] ??= [];
  }
}

export const get = () => state;
export const getDefaults = () => defaults;

let sandboxed = 0;
const save = () => {
  if (sandboxed) return; // checker copies never reach sessionStorage
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
};
const emit = () => listeners.forEach((f) => f(state));
export const subscribe = (f) => (listeners.add(f), () => listeners.delete(f));

/* Run fn(draft) on a copy; keep it only if fn did not throw. label goes to the activity log.
   fn may return { recordId, text } to describe the change, or anything else (returned to the caller). */
export function commit(label, fn, ctx = {}) {
  const draft = structuredClone(state);
  const out = fn(draft);
  const info = out && typeof out === "object" && "text" in out ? out : {};
  draft.activity.unshift({
    at: nowStamp(draft),
    by: ctx.memberId || null,
    action: label,
    recordId: info.recordId || null,
    text: info.text || label,
  });
  if (draft.activity.length > 500) {
    draft.activity.length = 500;
  }
  state = draft;
  save();
  emit();
  return out;
}

/* Same as commit but returns { ok, error } instead of throwing BizError. */
export function tryCommit(label, fn, ctx) {
  try {
    return { ok: true, value: commit(label, fn, ctx) };
  } catch (error) {
    if (error instanceof BizError) return { ok: false, error: error.message };
    throw error;
  }
}

export function reset() {
  state = structuredClone(defaults);
  normalise(state);
  save();
  emit();
}

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const next = JSON.parse(text);
  if (!next || typeof next !== "object" || !next.meta || !next.workspace) {
    throw new BizError(
      "That file is not a Biz4Kit data export (it has no meta or workspace)."
    );
  }
  normalise(next);
  state = next;
  save();
  emit();
}

/* For the checker: run with a throwaway copy and restore afterwards. */
export function sandbox(fn) {
  const keep = state;
  state = structuredClone(defaults);
  normalise(state);
  sandboxed++;
  try {
    return fn();
  } finally {
    sandboxed--;
    state = keep;
  }
}
