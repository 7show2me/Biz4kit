/* Action dispatch. `data-do="module.fn"` on a button, or on a <form>, calls biz[module][fn](state, args, ctx)
   through store.commit, so every change is logged and saved. args = the element's data-a-* attributes
   (data-a-id="L3" → { id: "L3" }) plus, for a form, its fields. Field names may be nested:
   lines[0][qty] → { lines: [{ qty }] }. Numbers stay strings; the business layer converts them.
   A screen may register its own handler with the same name to build args itself. */
import { biz } from "../biz/index.js";
import * as store from "../core/store.js";
import { BizError } from "../core/util.js";

const LABELS = {};
/* Human label for the activity log, e.g. "leads.accept" → "Leads: accept". */
const labelOf = (name) => LABELS[name] || name.replace(".", ": ");

/* Form → object, with nested names. Checkboxes give true / false; files give { name, size }. */
export function formArgs(form) {
  const out = {};
  const put = (path, v) => {
    const keys = path.replace(/\]/g, "").split("[");
    let o = out;
    keys.forEach((k, i) => {
      const last = i === keys.length - 1;
      const nextIsIndex = !last && /^\d+$/.test(keys[i + 1]);
      if (last) o[k] = v;
      else o = o[k] ??= nextIsIndex ? [] : {};
    });
  };
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === "checkbox") put(el.name, el.checked);
    else if (el.type === "radio") {
      if (el.checked) put(el.name, el.value);
    } else if (el.type === "file") {
      const f = el.files?.[0];
      if (f)
        put(el.name, {
          name: f.name,
          size: f.size,
          type: f.type,
          url: el.dataset.url || null,
        });
      else if (el.dataset.keep) put(el.name, JSON.parse(el.dataset.keep));
    } else put(el.name, el.value);
  }
  for (const k of Object.keys(out))
    if (Array.isArray(out[k])) out[k] = out[k].filter(Boolean);
  return out;
}

export const dataArgs = (el) => {
  const out = {};
  for (const [k, v] of Object.entries(el.dataset))
    if (k.startsWith("a") && k.length > 1 && k[1] === k[1].toUpperCase())
      out[k[1].toLowerCase() + k.slice(2)] = v;
  if (el.dataset.args) Object.assign(out, JSON.parse(el.dataset.args));
  return out;
};

/* Run an action. ctx: { role, memberId, customer }. extra: screen handlers. Returns { ok, value | error }. */
export function run(name, args, ctx, handlers = {}) {
  try {
    if (handlers[name]) return { ok: true, value: handlers[name](args, ctx) };
    const [mod, fn] = name.split(".");
    const f = biz[mod]?.[fn];
    if (typeof f !== "function") throw new Error(`Unknown action ${name}`);
    const value = store.commit(
      labelOf(name),
      (s) => f(s, args, { ...ctx, today: s.meta.today }),
      ctx
    );
    return { ok: true, value };
  } catch (e) {
    if (e instanceof BizError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: `Something went wrong: ${e.message}` };
  }
}

/* For screen handlers: commit a business call with a log label. */
export const call = (label, fn, ctx) =>
  store.commit(label, (s) => fn(s, { ...ctx, today: s.meta.today }), ctx);
export const known = (name) => {
  const [mod, fn] = name.split(".");
  return typeof biz[mod]?.[fn] === "function";
};
