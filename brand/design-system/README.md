Biz4Kit is a white-label workspace for small Indian businesses: catalog, quotes, invoices and payment requests under the business's own name. This system covers **Biz4Kit's own brand**, the chrome owners and staff see. Anything a business's customer sees carries the business's brand instead (see White label).

## Name and voice

- Write **Biz4Kit**: one word, capital B and K. Never "Biz 4 Kit", "BizKit" or "biz4kit" in copy (lowercase only in URLs: `brand.biz4kit.app`).
- Tagline: *Quote, book, invoice, get paid. Under your own name.*
- Voice is plain, warm and short. Speak to the owner as "you" and to their customers as "your customer", never "the user".
- No jargon in anything an owner reads: say "leads" and "jobs", not "CRM" or "pipeline".
- English only. Write amounts in rupees with Indian grouping: `₹1,24,800`.
- No emoji in product copy. Real examples:
  - "Your customer accepted QT-2026-014. Send the invoice when the job is done."
  - "Shown as received once Ravi confirms."
  - "Ask for ₹4,500 by UPI"

## Logo

The logo is the **4B mark**: a **4** then a **B**, both Playfair Display Black, upright and the same height. One bold **dash** runs through the upper third of both letters and a little past each side, tying them into one mark. It is always a single ink.

There are two forms:
- **The mark alone** (`biz4kit-logo*.svg`, `biz4kit-app-icon.svg`): for the sidebar, favicon, PWA and Expo icon, and any small space.
- **The lockup** (`biz4kit-lockup*.svg`): the mark plus **"Biz4Kit" in Playfair Display Black**, upright, vertically centred beside it. Use it where the product introduces itself: sign-in, onboarding, the marketing site, emails and documents. In running text, write the name in the UI faces under Type.

Pick the file by ground:
- Light grounds: `biz4kit-logo.svg` / `biz4kit-lockup.svg` (`brand-ink` indigo, transparent background).
- Dark grounds: `biz4kit-logo-dark.svg` / `biz4kit-lockup-dark.svg` (near-white on its own dark tile with a visible border, so it still shows if placed on a light page by mistake; on a dark page, crop the tile or use the white file).
- Photos and the primary fill: `biz4kit-logo-white.svg` / `biz4kit-lockup-white.svg` (white, transparent background).
- Favicon, PWA, Expo, avatar: `biz4kit-app-icon.svg` (white 4B on an indigo rounded tile).

Rules:
- Use the mark at 16px tall or more; the dash stays visible down to favicon size.
- Keep clear space equal to half the mark's height on every side. Never italicise, outline, add a second colour, change the order (always 4 then B), drop the dash, or set the lockup's name in another face.
- Playfair appears only in the logo. Product UI stays in the faces under Type.

## Colour

The palette is deep indigo with an electric-blue signal, on violet-tinted neutrals.

- Pages sit on `background` with `foreground` text. Raised panels use `card`; menus and the ⌘K palette use `popover`.
- Use `primary` only for the one main action per view and the selected nav item, with `primary-foreground` labels. Use `secondary` for every other button.
- Hover and keyboard highlight use `accent` with `accent-foreground`. Use `muted` with `muted-foreground` for quiet fills and captions.
- Use `destructive` for delete, void and overdue, with `destructive-foreground` labels on the fill. Both themes pass: text on `background` is 4.7:1 in light and 6.5:1 in dark. The dark red is brighter than the supplied one, with a near-black label.
- Focus is a 2px solid `ring`: 3.7:1 in light and 5.4:1 in dark (the dark ring was 1.7:1 as supplied).
- `border` and `input` are decorative (1.3:1). A form field must also be identified by its label and fill.
- Charts use `chart-1` to `chart-5` in order. Money states (paid / due / overdue) always carry a word as well as a colour.
- The workspace sidebar uses the `sidebar-*` tokens. `sidebar-primary` is the near-white chip that holds a business's own logo in the workspace switcher, so any logo reads in both themes.
- Logo colours come only from `brand-ink` and `brand-blue`.

## Type

Three families, one job each. All are on Google Fonts.

- **Fraunces** (`serif`) is the voice. A warm, soft serif for page titles (`heading`), onboarding and report headlines (`display-lg`) and the marketing hero (`display-xl`). Use it at 24px and up, weight 600 to 700. Never set body text, tables or buttons in it.
- **DM Sans** (`sans`) is the working face: `title`, `body`, `body-sm` and `label`. Friendly geometric letterforms that stay open and legible at 13px on a phone. All buttons, inputs and navigation use it.
- **DM Mono** (`mono`) is for data. Every amount uses the `money` style and every identifier uses `code`: `INV-2026-001`, GSTINs, UPI IDs, invite codes. It is the only one of the three whose digits all share one width (DM Sans and Fraunces do not have tabular figures), so columns of rupees line up. Write amounts with Indian grouping, `₹1,24,800`.
- `label` is set uppercase with its letter-spacing. Headings use `text-wrap: balance`.
- Load the fonts with `family=Fraunces:opsz,wght@9..144,500..800&family=DM+Sans:opsz,wght@9..40,400..700&family=DM+Mono:wght@400;500`.
- The logo is the only place Playfair Display appears; its letters are outlined, so no font is loaded for it.

## Shape, space and depth

- Buttons are small-cornered: `radius-control` (8px) on every button. The rest of the scale stays generous: `radius` (20px) on cards and dialogs, `radius-md` on menu items, `radius-sm` on inputs and chips, `radius-xl` on sheets and the app icon.
- Space on a 4px step: `space-4` is the minimum page gutter and phone card padding, `space-6` is desktop card padding, `space-8` separates page sections.
- Elevation is soft and black-based: `shadow-sm` for cards, `shadow-md` for popovers, `shadow-lg` for dialogs. Don't stack a border and a shadow on the same card.
- Layout follows the product's tone: dense but calm like Linear, keyboard-first on desktop, touch targets of at least 44px on phones, light and dark.

## White label

- Biz4Kit's colours and logo appear only in the chrome: sign-in, onboarding, settings, billing and the sidebar.
- Catalog, quote, invoice, pay and My-orders pages, PDFs, QR codes and ready messages use the **business's** logo and two colours. Those come from the theme generator in `Prep/Design inputs.md`, never from this system.
- On paid plans nothing of Biz4Kit shows to customers. On the free plan, a single "Made with Biz4Kit" footer line in `muted-foreground` is the only trace.
