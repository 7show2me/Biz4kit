import * as board from "./board.js";
import * as bookings from "./bookings.js";
import * as catalog from "./catalog.js";
import * as invoices from "./invoices.js";
import * as leads from "./leads.js";
import * as messages from "./messages.js";
import * as notify from "./notify.js";
import * as payments from "./payments.js";
/* The business layer in one import: `import { biz } from "../biz/index.js"`. */
import * as perms from "./perms.js";
import * as sel from "./selectors.js";
import * as serials from "./serials.js";
import * as settings from "./settings.js";

export const biz = {
  perms,
  messages,
  notify,
  invoices,
  payments,
  leads,
  bookings,
  catalog,
  board,
  settings,
  sel,
  serials,
};
