# Custom Heading Shopify app

This project contains a Shopify Theme App Extension with one app block. Merchants can add the **Custom heading** block in the theme editor, edit its heading text, and see that text rendered as an escaped HTML `<h1>` on the storefront. It has no database, app backend, or custom API.

## Project files

- `shopify.app.toml` — Shopify CLI app configuration. Link this project to your Shopify app before running or deploying it.
- `extensions/custom-heading/shopify.extension.toml` — declares the theme app extension.
- `extensions/custom-heading/blocks/custom-heading.liquid` — app block markup and merchant-editable heading setting.
- `extensions/custom-heading/locales/en.default.json` — required extension locale file.

## Set up and deploy

1. Install Node.js and the Shopify CLI: `npm install -g @shopify/cli@latest`.
2. Create a Shopify app in the Shopify Dev Dashboard, or use an app you already own. In the Dev Dashboard, configure it for Shopify-managed installation and add the development store that will test it.
3. From this project directory, authenticate with Shopify: `shopify auth login`.
4. Link this project to the app you created: `shopify app config link`. Choose the app and confirm the generated app configuration. This replaces the placeholder client ID in `shopify.app.toml`; ensure the app has no required API scopes for this extension.
5. To preview, run `shopify app dev --store your-development-store.myshopify.com`. Follow the CLI prompts to install/update the app on the development store.
6. To deploy the extension, run `shopify app deploy` and confirm the release in the Shopify CLI.
7. Distribute/install the app on the target store using the installation method configured in the Dev Dashboard. The app must be installed for its theme app extension to be available.

## Add the block to a theme

1. In Shopify Admin, open **Online Store → Themes → Customize**.
2. Open a page template and choose a section that supports app blocks.
3. Select **Add block → Apps → Custom heading**, then drag it to the desired position.
4. Enter the desired text in the **Heading** setting and save. Shopify re-renders the block with the updated text automatically.

The block targets sections, so it is available wherever the theme supports app blocks; Shopify themes control which sections accept app blocks. No theme files are manually edited.
