# Custom Heading Shopify app

This project contains a Shopify embedded settings page and Theme App Extension. Merchants save a heading in an app-owned Shopify shop metafield with storefront read access, and the theme block renders it as an escaped HTML `<h1>`. The app uses a small authenticated Vercel API endpoint to update that Shopify metafield; it does not use a separate database.

## Project files

- `shopify.app.toml` — Shopify CLI app configuration. Link this project to your Shopify app before running or deploying it.
- `extensions/custom-heading/shopify.extension.toml` — declares the theme app extension.
- `extensions/custom-heading/blocks/custom-heading.liquid` — app block markup that renders the heading saved in app settings.
- `extensions/custom-heading/locales/en.default.json` — required extension locale file.
- `public/index.html` — embedded app heading settings page.
- `api/heading.js` — authenticates Shopify ID tokens, exchanges them for Admin API access, and reads or saves the app-owned heading metafield.
- `package.json` — server dependency for Shopify ID token verification.

## Set up and deploy

1. Install Node.js and the Shopify CLI: `npm install -g @shopify/cli@latest`.
2. Create a Shopify app in the Shopify Dev Dashboard, or use an app you already own. In the Dev Dashboard, configure it for Shopify-managed installation and add the development store that will test it.
3. From this project directory, authenticate with Shopify: `shopify auth login`.
4. Link this project to your app: `shopify app config link`. The configuration is already linked locally, but a fresh clone should link it again.
5. Configure these environment variables for the Vercel project and redeploy: `SHOPIFY_API_KEY` (the app Client ID) and `SHOPIFY_API_SECRET` (the app Client secret). Keep the secret in Vercel environment settings; never commit it. The API reads/writes an app-owned metafield and doesn't need a separate database.
6. In the Dev Dashboard, set the app URL to `https://your-vercel-domain/`, and ensure the embedded app URL and redirect URLs match the Vercel domain. The Shopify-managed install flow is used.
7. To preview locally, run `shopify app dev --store your-development-store.myshopify.com` and follow the CLI prompts.
8. Deploy the app version and extension with `shopify app deploy`, then install/update the app on the target store.

## Add the block to a theme

1. Open the app in Shopify Admin and enter/save the heading.
2. Open **Online Store → Themes → Customize**, choose a section that supports app blocks, then select **Add block → Apps → Custom heading** and position it.
3. Save the theme. The block displays the heading saved in the app; update the heading later from the app settings page.

The block targets sections, so it is available wherever the theme supports app blocks; Shopify themes control which sections accept app blocks. No theme files are manually edited.
