# Louis Oliver website

The Louis Oliver website: Next.js, hosted on Vercel, with a Sanity dashboard at `/studio` for all content.

## What lives where

| You want to… | Where |
| --- | --- |
| Add a shoot, upload photos/videos, build its page | `yoursite.com/studio` → **Shoots** |
| Add equipment (then tick it on shoots) | `/studio` → **Equipment** |
| Add / reorder process steps | `/studio` → **Process steps** |
| Change any page’s text, your hero photo, stats, FAQs | `/studio` → **Home page**, **Services page**, etc. |
| Change logo, footer, social links | `/studio` → **Site settings** |
| See stats, quick-add, tick off enquiries | `/studio` → **Overview** (opens first) |
| Read contact-form enquiries | `/studio` → **Overview**, or Content → Regular updates → **Enquiries** |
| Preview a shoot page while building it | Open a shoot → **Preview** tab (or split view) |
| Change design or features | Ask Claude. Changes are pushed here and Vercel publishes them automatically |

Changes you publish in the dashboard appear on the site within about 30 seconds.

## One-time setup

1. **Sanity project**: sign up at sanity.io, then go to sanity.io/manage → **Create project** (dataset: `production`). Copy the **Project ID**.
2. **Vercel**: Add New → Project → import this repository. Under **Environment Variables** add:
   - `NEXT_PUBLIC_SANITY_PROJECT_ID` = your Project ID
   - `NEXT_PUBLIC_SANITY_DATASET` = `production`
   - `SANITY_API_WRITE_TOKEN` = (optional, for the contact form) sanity.io/manage → API → Tokens → Add token with **Editor** permission
   Then **Deploy**.
3. **Allow the dashboard**: sanity.io/manage → your project → **API → CORS origins → Add** your site address (e.g. `https://your-project.vercel.app`, and later `https://yourdomain.com`), tick **Allow credentials**.
4. **Enquiry emails (optional)**: create a free account at resend.com → **API Keys** → create a key. In Vercel add `RESEND_API_KEY` (Secret) and `SITE_URL` = `https://louisoliver.co.uk`, then redeploy. Emails go to contact@louisoliver.co.uk. Until you verify louisoliver.co.uk in Resend, sign up to Resend with contact@louisoliver.co.uk so the default sender can reach it; after verifying, set `NOTIFY_FROM` = `Louis Oliver Website <website@louisoliver.co.uk>`.
5. **Domain**: Vercel → Project → Settings → Domains → add your domain and follow the DNS instructions.

## Local development (optional)

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000 and http://localhost:3000/studio
```
