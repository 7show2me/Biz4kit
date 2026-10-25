import { runChecks } from "./check.js";
/* Boot: load the data, register the screens in viewer order (each screen has n = its number in
   design/screens-v2.html), start the viewer. */
import * as store from "./core/store.js";
import { register, SCREENS } from "./ui/registry.js";
import { start } from "./ui/viewer.js";

const FILES = [
  "auth",
  "onboarding",
  "home",
  "sales",
  "catalog",
  "schedule",
  "payments",
  "settings",
  "portal",
  "warranty",
  "notify",
];

async function boot() {
  await store.load();
  for (const f of FILES) {
    try {
      const mod = await import(`./screens/${f}.js`);
      register(mod.default);
    } catch (e) {
      if (
        !String(e.message).includes("Failed to fetch") &&
        !String(e.message).includes("error loading")
      )
        console.error(`screens/${f}.js`, e);
      else console.warn(`screens/${f}.js not built yet`);
    }
  }
  SCREENS.sort((a, b) => (a.n ?? 99) - (b.n ?? 99));
  if (!SCREENS.length) {
    document.getElementById("stage").innerHTML =
      `<p class="p-page">No screens yet.</p>`;
    return;
  }
  const m = location.hash.match(/(?:^#|&)check(?:=([^&]*))?/);
  start();
  document.getElementById("check").onclick = () => runChecks();
  if (m) runChecks(m[1] ? decodeURIComponent(m[1]).split(",") : null);
}
boot();
