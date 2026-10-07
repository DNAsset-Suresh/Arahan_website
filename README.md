# Aarahan Enterprises — Corporate Website

Static, framework-free website for **Aarahan Enterprises**, an interior finishing and civil works contractor based in Chennai (est. 2021), operating across Tamil Nadu and Gujarat.

> Quality spaces. Strong foundations. Built for what’s next.

Frontend built with **HTML5, CSS3 and vanilla JavaScript**, with a small Node.js/Nodemailer enquiry API. No frontend framework or animation dependency is required. Opening `index.html` previews the design; email submission requires the Node server or the Vercel API.

---

## 1. Folder structure

```
aarahan-enterprises/
├── index.html                  Home: static building hero, machinery catalogue, equipment, capabilities
├── about.html                  Background, profile, capability summary, workforce, mission/vision, values colonnade
├── services.html               Service ecosystem hub + 8 finishing services
├── civil-infrastructure.html   Static construction image + interactive infrastructure explorer
├── projects.html               Track record by sector, where we work
├── method.html                 Vertical execution timeline, single point of contact, next steps
├── safety-quality.html         Safety, quality, statutory compliance, housekeeping
├── clients.html                Organisations (text only) + client value
├── commercial.html             Contract models and commercial terms
├── contact.html                Contact details, Call / Email / Directions, server-backed enquiry form
├── 404.html                    Not-found page
├── sitemap.xml · robots.txt · site.webmanifest
├── css/
│   ├── style.css               Tokens, base, layout, components, page modules
│   ├── aarahan-static.css      Permanent motion-off presentation and machinery cards
│   ├── responsive.css          Breakpoints 1280 → 380 px, print
│   └── aarahan-social.css      Static footer social tiles (scoped .aarahan-social-*)
├── js/
│   ├── navigation.js           Loaded in <head>: shared static AE helpers and accessible menu
│   ├── main.js                 Static controls, ecosystem, explorer, timeline, enquiry form
│   └── aarahan-social.js       Footer 3D social tiles + SOCIAL LINK CONFIG (see §9)
└── assets/
    ├── images/                 Logo, representative visuals (WebP), Open Graph image
    ├── icons/                  Favicons / app icons generated from the logo
    └── models/                 Empty; 3D is procedural, so no model files are needed
```

## 2. Run locally

Use Node.js 20.6 or newer. Copy `.env.example` to `.env` and configure SMTP privately (see `server/EMAIL-SETUP.md`). Then:

```bash
npm ci
npm run dev
```

Open the localhost URL printed by the server. `npm test` runs SMTP-mocked API and permanent motion-off contract tests without sending email. `npm run build` copies only public website files into the ignored `public/` folder.

## 3. Deploy

The existing production project is **dn-asset1/aarahan-enterprises-website** on Vercel, connected to **DNAsset-Suresh/Arahan_website**, branch `main`. Pushes use its existing Git integration; do not create another project. `vercel.json` builds the static allowlist into `public/`, and `api/contact.mjs` reuses the local server's validation/mail handler. Server sources and secrets are not public assets. Configure SMTP in the existing Vercel project's environment settings, not in Git.

- **Static hosts:** publish only the generated `public/` output, never the source folder containing `.env`. A static-only host also requires a separately deployed enquiry API.
- **Vercel:** use the existing Git-connected project and checked-in `vercel.json`. Production: https://aarahan-enterprises-website.vercel.app/ . `/api/health` reports whether required email settings exist, not whether SMTP delivery has succeeded.
- **Any web server (Apache/Nginx/cPanel):** publish `public/` and route `/api/contact` to the Node server. To use the custom 404 on Apache, add `ErrorDocument 404 /404.html` to `.htaccess`.

After the domain is live, submit `https://arahanenterprises.com/sitemap.xml` in Google Search Console.

### Permanent motion-off presentation

All eleven pages use `css/aarahan-static.css` and the `static-site rm` root classes. Motion remains off regardless of OS settings or an old saved preference. Navigation uses normal browser scrolling and page loading. The footer reports **Motion off** without a toggle that can reactivate it.

The home hero uses the 79 KB `assets/images/completed-building.webp` still extracted from the supplied footage. Civil uses an existing representative construction photograph. No page loads video, Three.js, scroll/roller/depth, vehicle or page-flip scripts. Legacy animation files remain unlinked in source history; they are not frontend dependencies.

The original nine machinery categories, images, models and technical tables are preserved in responsive cards with native, keyboard-accessible specification disclosures. The three vehicle images form a stationary equipment row. About capability descriptions and Method stages remain visible without scrolling triggers.

## 4. External dependencies

Google Fonts provides Barlow Condensed, Inter and IBM Plex Mono with system-font fallbacks. No frontend animation library is loaded. Nodemailer remains server-side only.

## 5. Brand colour system

All colour lives in one place — the `:root` block at the top of `css/style.css`. Change it there and the whole site follows.

| Token | Value | Used for |
|---|---|---|
| `--primary-green` | `#28584E` | Navbar, dark sections, headings on light, primary buttons |
| `--warm-beige` | `#D1C1A5` | Premium bands, form rules, stone tones |
| `--soft-sand` | `#D8CBB8` | Hero ground, alternate section bands |
| `--warm-peach` | `#EFB27E` | Accent only — eyebrows, rules, header CTA, hovers, 3D highlights |
| `--dark-brown` | `#603B25` | Footer, secondary text, button hover, strong contrast |
| `--white` | `#FFFFFF` | Cards, form fields, lifted surfaces |
| `--off-white` | `#F7F3EC` | Main light sections, body text on green |
| `--dark-text` | `#2B2B2B` | Body copy on light surfaces |

The established off-white, sand, green and brown surface system is preserved, with peach reserved for small accents and CTAs.

### Contrast-safe variants

Peach and the warm greys are light, so a few tokens exist purely so small text clears WCAG AA. Use these for *type*; keep the brand values for fills, rules and icons.

| Token | Value | Use |
|---|---|---|
| `--accent-deep` | `#6B4A30` | accent-weight text on a light surface |
| `--accent-2` | `#F9D6B2` | small peach text on green or brown (nav hover, index chips) |
| `--accent-ink` | `#1D423A` | text placed on a peach fill |
| `--muted-light` | `#5A4A38` | muted text on off-white or sand |
| `--concrete` | `#D3C6B0` | muted text on green or brown |

### Light and dark surfaces

Sections carry one of four surface classes, and the surface — not the component — decides the scheme:

| Class | Surface | Used for |
|---|---|---|
| `.section--light` | `--paper-2` `#F7F3EC` | most content sections |
| `.section--tint` | `--tint` `#D8CBB8` | every second light section, to break the rhythm |
| `.section--beige` | `--tint-2` `#D1C1A5` | premium bands (the About company background) |
| `.section--dark` / `.section--ink` | deep green | statement bands, the execution timeline, the logistics route, the CTA band |

`.section--light` re-declares the surface tokens (`--char-2`, `--text`, `--line`, `--muted`, `--concrete`), so a card written for a green band flips to the light scheme just by being inside one — no per-component restyling. Anything that must stay deep green on a light section (the contact card, the ecosystem hub, the spec-sheet header) uses the raw `--primary-green`/`--ink` values and re-pins its own text tokens.

The semantic layer beneath the palette (`--ink`, `--char`, `--accent`, `--secondary`, `--text`, `--line`, …) maps onto the eight brand values, which is why every component, the 3D scenes, the About book, the footer tiles and the logistics route all recolour together.

## 6. Features

- Static architectural hero, service and equipment cards, readable machinery catalogue.
- Stable sticky header, active page indication and accessible mobile navigation.
- Click/keyboard-driven service ecosystem and civil capability tabs, with no automatic cycling.
- Existing enquiry form backed by the Node/Nodemailer API and Vercel adapter.
- Existing brand palette, company details, contact links, footer and all eleven pages.

## 7. Performance and accessibility

- Compressed static WebP hero; no video decoding, WebGL or decorative animation loops.
- Lazy-loaded machinery and supporting imagery; responsive grids with no horizontal page scrolling.
- Permanent motion-off CSS includes hover states, pseudo-elements and form feedback.
- Semantic landmarks, one H1 per page, skip link, focus states, menu focus management, accessible tabs and live form status.
- SEO titles, descriptions, canonical URLs, Open Graph, structured data, sitemap and favicons are retained. The existing custom-domain metadata should only be changed when the site owner changes the canonical domain.

## 8. Content sources and rules

All company facts come from the *Aarahan Enterprises Business Proposal*: services, capabilities, method, safety, compliance, sectors, organisations, mission, vision, values, commercial terms and contact details. No statistics, clients, certifications, awards, testimonials, project names, values or dates were invented. Organisations are shown as text only, with no logos.

## 9. Social media links (footer tiles)

The footer contains a static social tile block for **Facebook, WhatsApp, Google Business and Instagram**. No social accounts were found anywhere in the supplied material, so **no URLs were invented** — the tiles ship switched off.

To switch them on, edit the config at the top of `js/aarahan-social.js` (one file, all pages):

```js
var AARAHAN_SOCIAL_LINKS = {
  facebook:  "https://www.facebook.com/<page>",
  whatsapp:  "https://wa.me/91XXXXXXXXXX",
  google:    "https://g.page/<business>",
  instagram: "https://www.instagram.com/<handle>"
};
```

A tile links out only when its URL is filled in.

**Preview vs live.** When you open the site locally (`localhost`, `127.0.0.1` or a `file://` double-click), tiles without a URL are still drawn so you can review the design — they are inert, not clickable, not keyboard-focusable, and marked *"Link pending"*. On the real domain those same tiles are removed, so the live site never shows a dead link. Fill in all four URLs and the block behaves identically everywhere.

## 10. Assets to replace before launch

| File(s) | Current state | Replace with |
|---|---|---|
| `assets/images/*.webp` (13 visuals) | Illustrative interior and construction images taken from the business proposal. They are labelled **"Representative visual"** on the site and are **not** Aarahan project photographs. They are also low resolution (≈240–740 px wide). | Genuine Aarahan site and project photographs, at least 1600 px wide. After replacing, remove the "Representative visual" tags for genuine photos. |
| `assets/images/aarahan-logo.*` | Extracted from the proposal PDF (raster). | Official vector (SVG) logo, if available. |
| `assets/images/og-image.png` | Generated share image. | Optional: a branded share image with a real project photo. |
| Organisation logos | Not used. | Add client logos only with written permission to use them. |
| Map | Google Maps address search link. | Optionally a pinned Maps link or embed once the exact office location is confirmed. |
| Enquiry form | Node/Nodemailer API plus Vercel adapter. | Configure production SMTP privately and verify delivery; see `server/EMAIL-SETUP.md`. |
