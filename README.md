# Product Catalog Site

A product catalog site built with Next.js. Visitors browse products and enquire by
WhatsApp or email — there's no shopping cart or checkout. Everything (products,
categories, images, business contact details) is managed from a built-in admin panel.

## Requirements

This is **not** a static site — the admin panel needs a running Node.js server to save
product data and uploaded images to disk. It needs to run somewhere Node.js stays
running: a VPS, Railway, Render, a self-managed server, etc. It will **not** work on
static-only hosts like GitHub Pages or plain Netlify/Vercel static export, because those
don't give you a writable, persistent filesystem for the admin panel to save to.

## Getting started (local development)

```bash
npm install
npm run dev
```

Open http://localhost:3000 for the public site, and http://localhost:3000/admin-networkhub/login
for the admin panel.

A `.env.local` is already included for local development with a working default admin
login:

- **Username:** `admin`
- **Password:** `ChangeMe123!`

**Change this before deploying** — see "Admin setup" below.

## How content is stored

There's no database. Everything lives in plain files on the server:

- `data/products.json` — all products
- `data/categories.json` — the category list
- `data/settings.json` — business name, WhatsApp number, email, address, logo, etc.
- `public/uploads/products/` — product photos uploaded from the admin panel
- `public/uploads/site/` — logo / hero image uploaded from Settings

This means backing up the site is just copying the `data/` folder and
`public/uploads/`. It also means **the server needs write access to those folders**,
and you should deploy with persistent storage (not an ephemeral/serverless filesystem).

## Admin setup

1. Generate a password hash for your real admin password:

   ```bash
   node scripts/hash-password.js "your-new-password"
   ```

   This prints a ready-to-paste line, e.g. `ADMIN_PASSWORD_HASH=\$2b\$10\$...`.
   Paste that whole line as-is — the backslashes before each `$` are required,
   or Next.js's env loader will try to expand them as variable references and
   corrupt the hash (silently breaking login with no error).

2. Copy `.env.example` to `.env.local` (or set these as environment variables on your
   host) and fill in:

   ```bash
   ADMIN_USERNAME=your-username
   ADMIN_PASSWORD_HASH=\$2b\$10\$...   # the line printed by step 1
   SESSION_SECRET=<a long random string>
   ```

   Generate a `SESSION_SECRET` with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Restart the server. Log in at `/admin-networkhub/login`.

From the admin panel you can:

- Add, edit and delete products — including photos (drag in multiple images per
  product)
- Add or remove categories
- Edit business details: name, tagline, WhatsApp number, email, phone, address,
  business hours, social links, logo and homepage hero image

Every change is saved immediately and shows up on the live site right away — no rebuild
or redeploy needed.

## How enquiries work

There's no checkout and no order system. Each product page (and every product card) has
a **WhatsApp Enquiry** button and an **Email Enquiry** button:

- **WhatsApp** opens `wa.me` with the message pre-filled — this hands off to the
  customer's own WhatsApp app/web, addressed to the business's WhatsApp number set in
  Settings. No setup required.
- **Email** opens a small form (name pre-filled with the product, just needs the
  customer's email) and sends the enquiry **directly from the server** to the business
  email set in Settings, using [Resend](https://resend.com). The business email is set
  as the reply-to address, so replying in your normal inbox goes straight back to the
  customer. The Contact page has the same two options for general enquiries.

Email sending needs a Resend API key — see "Email setup" below. Until it's configured,
the WhatsApp buttons still work fine; only the Email buttons will show an error asking
the customer to try WhatsApp instead.

### Email setup

1. Create a free account at [resend.com](https://resend.com) and generate an API key
   under **API Keys**.
2. Add it to `.env.local`:

   ```bash
   RESEND_API_KEY=re_your_key_here
   ENQUIRY_FROM_EMAIL=onboarding@resend.dev
   ```

   `onboarding@resend.dev` is Resend's shared sandbox sender — it works immediately with
   no setup, but Resend may restrict delivery to the email address you signed up with
   until you verify your own domain.

3. To send from your own address (recommended before going live) and remove that
   restriction, verify a domain under **Domains** in Resend, then set:

   ```bash
   ENQUIRY_FROM_EMAIL=enquiries@yourdomain.com
   ```

4. Restart the server. Test it via a product's "Email" button or the Contact page.

## Production build

```bash
npm run build
npm start
```

`npm start` runs a real Node.js server (not a static export), which is required for the
admin panel to work.

## Project structure

```
app/
  (site)/            Public pages: home, products, product detail, about, contact
  admin-networkhub/
    login/            Admin login (unauthenticated)
    (dashboard)/       Dashboard, products, categories, settings (auth-protected)
  api/admin/           Admin API routes (products, categories, settings, login, logout)
  api/enquiry/         Public route that sends enquiry emails via Resend
components/
  site/                Public-site components (header, footer, product card,
                         EmailEnquiryButton, etc.)
  admin/                Admin-panel components (forms, tables, nav)
lib/
  db.js                Reads/writes the JSON data files
  upload.js             Saves/deletes uploaded images
  auth.js               Admin session token signing/verification
  enquiry.js            Builds WhatsApp wa.me links (and a plain mailto: helper
                         used only for simple static links, e.g. the footer)
  email.js              Sends enquiry emails via Resend
data/                  products.json, categories.json, settings.json
public/uploads/         Admin-uploaded images (gitignored)
proxy.js               Route guard for /admin-networkhub and /api/admin (Next.js 16's
                         replacement for middleware.js)
legacy-static-site/    The previous plain-HTML version, kept for reference only —
                         not used by the app.
```
