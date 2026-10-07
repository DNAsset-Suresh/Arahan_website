# Aarahan Enterprises — Corporate Website

Static, framework-free website for **Aarahan Enterprises**, an interior finishing and civil works contractor based in Chennai (est. 2021), operating across Tamil Nadu and Gujarat.

> Quality spaces. Strong foundations. Built for what’s next.

Frontend built with **HTML5, CSS3 and vanilla JavaScript**, with a small Node.js/Nodemailer enquiry API. No frontend framework or animation dependency is required. Opening `index.html` previews the design; email submission requires the Node server or the Vercel API.

---

## 1. Folder structure

```
aarahan-enterprises/
├── index.html                  Home: 3D hero, stats, capabilities, track record, method, client value
├── about.html                  Background, profile, 3D capability stack, workforce, mission/vision, values colonnade
├── services.html               Service ecosystem hub + 8 finishing services
├── civil-infrastructure.html   3D civil site hero + interactive infrastructure explorer
├── projects.html               Track record by sector, where we work
├── method.html                 Scroll-pinned execution timeline, single point of contact, next steps
├── safety-quality.html         Safety, quality, statutory compliance, housekeeping
├── clients.html                Organisations (text only) + client value
├── commercial.html             Contract models and commercial terms
├── contact.html                Contact details, Call / Email / Directions, server-backed enquiry form
├── 404.html                    Not-found page
├── sitemap.xml · robots.txt · site.webmanifest
├── css/
│   ├── style.css               Tokens, base, layout, components, page modules
│   ├── animations.css          Keyframes, loader, reveal states, reduced-motion rules
│   ├── responsive.css          Breakpoints 1280 → 380 px, print
│   └── aarahan-social.css      Footer 3D social tiles (scoped .aarahan-social-*)
├── js/
│   ├── navigation.js           Loaded in <head>: shared AE helpers, header, menu, progress bar, page transitions
│   ├── animations.js           Split text, scroll reveal, counters, 3D tilt, magnetic buttons, grid spotlight, parallax
│   ├── 3d.js                   Existing Three.js Civil hero with graceful fallback
│   ├── main.js                 Loader, footer, capability stack, colonnade, ecosystem, explorer, timeline, enquiry form
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

Open the localhost URL printed by the server. `npm test` runs SMTP-mocked API and motion-state tests without sending email. `npm run build` copies only public website files into the ignored `public/` folder.

## 3. Deploy

The existing production project is **dn-asset1/aarahan-enterprises-website** on Vercel, connected to **DNAsset-Suresh/Arahan_website**, branch `main`. Pushes use its existing Git integration; do not create another project. `vercel.json` builds the static allowlist into `public/`, and `api/contact.mjs` reuses the local server's validation/mail handler. Server sources and secrets are not public assets. Configure SMTP in the existing Vercel project's environment settings, not in Git.

- **Static hosts:** publish only the generated `public/` output, never the source folder containing `.env`. A static-only host also requires a separately deployed enquiry API.
- **Vercel:** use the existing Git-connected project and checked-in `vercel.json`. Production: https://aarahan-enterprises-website.vercel.app/ . `/api/health` reports whether required email settings exist, not whether SMTP delivery has succeeded.
- **Any web server (Apache/Nginx/cPanel):** publish `public/` and route `/api/contact` to the Node server. To use the custom 404 on Apache, add `ErrorDocument 404 /404.html` to `.htaccess`.

After the domain is live, submit `https://arahanenterprises.com/sitemap.xml` in Google Search Console.

### Motion hierarchy

`css/aarahan-depth.css` and `js/aarahan-depth.js` own reversible section depth and image parallax. Reading strips, CTAs and forms stay flat; the machinery book gets reduced section motion so page turns remain usable. `animations.js` owns staggered reveals, damped card tilt and bounded magnetic buttons. Native vertical scrolling stays untouched. Pointer effects are desktop-only, mobile motion is lighter, and the existing footer motion preference is authoritative. The building video plays once; hidden tabs pause decoding and reduced motion holds the completed building. No custom cursor is introduced because the existing project has none.

## 4. External dependencies (CDN)

| Dependency | Used for | Loaded from |
|---|---|---|
| Three.js r170 (existing ES module) | Civil page hero only; Home uses the supplied video | `cdn.jsdelivr.net/npm/three@0.170.0` via dynamic `import()` |
| Google Fonts: Barlow Condensed, Inter, IBM Plex Mono | Typography | `fonts.googleapis.com` |

If either is unreachable, the site still works. The 3D hero falls back to a static line drawing, and text falls back to system fonts.

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

Measured balance across all 11 pages, sampled from full-page renders at 1440px: **53.6% neutral (off-white / sand / beige), 26.6% green, 13.1% brown, and peach as a thin accent**. Peach measures well under 5% by area because it is used for rules, chips and icons rather than fills — that is the intent, not a shortfall.

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

- Cinematic 3D hero (home): an RCC frame that assembles footing → column → beam → slab → finishes, with a tower crane, starter bars on the top storey, a blueprint ground grid, dimension lines, dust particles, a light sweep, mouse parallax, a scroll-driven camera rise and an "exploded" storey view
- 3D civil site (civil page): footings and pedestals, equipment foundations, a cable trench with covers, a pipeline in a backfilled trench, a control room and chain-link and barbed-wire fencing
- Live HUD labels projected from 3D anchor points
- Architectural wireframe loader (first page of a session only; it clears itself even if JavaScript fails)
- CSS 3D components: capability stack (Substrate → Civil → Finishing → Quality → Handover), values colonnade, tilted photo frames with dimension lines, 3D tilt cards with glare, a rotating 404 frame and an animated safety shield
- Service ecosystem hub, accessible tabbed infrastructure explorer with self-drawing isometric drawings, and a scroll-pinned horizontal execution timeline (vertical on smaller screens)
- Scroll reveals, masked split headings, number counters, a progress bar, magnetic CTAs, a blueprint-grid cursor spotlight and soft page transitions
- Sticky header that is transparent over the hero, turns solid on scroll and hides on scroll-down, with active-page indication and a full-screen mobile menu with focus management
- Enquiry form that sends owner notifications and a visitor confirmation through the server-side SMTP service

## 7. Performance and accessibility

- The existing Three.js renderer is loaded only on Civil. Rendering pauses when the hero is off-screen or the tab is hidden. Pixel ratio is capped, and on mobile there are no shadows and fewer particles.
- Images are WebP, lazy-loaded, with explicit dimensions.
- External frontend requests are the fonts and (on Civil) Three.js; SMTP runs server-side.
- Semantic landmarks, one `h1` per page, skip link, visible focus states, ARIA on the menu, tabs and live regions, and keyboard support for the explorer tabs.
- `prefers-reduced-motion` is respected, and visitors can also switch motion off with the **Reduce motion** toggle in every footer.
- SEO: unique titles and descriptions, canonical URLs, Open Graph / Twitter tags, `GeneralContractor` + `BreadcrumbList` structured data, sitemap and robots.

## 8. Content sources and rules

All company facts come from the *Aarahan Enterprises Business Proposal*: services, capabilities, method, safety, compliance, sectors, organisations, mission, vision, values, commercial terms and contact details. No statistics, clients, certifications, awards, testimonials, project names, values or dates were invented. Organisations are shown as text only, with no logos.

## 9. Social media links (footer tiles)

The footer contains a 3D social tile block for **Facebook, WhatsApp, Google Business and Instagram**. No social accounts were found anywhere in the supplied material, so **no URLs were invented** — the tiles ship switched off.

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
