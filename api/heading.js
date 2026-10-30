import { jwtVerify } from "jose";

const API_VERSION = "2026-10";
const METAFIELD_NAMESPACE = "$app";
const METAFIELD_KEY = "heading";
const MAX_HEADING_LENGTH = 255;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function authenticateRequest(req) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("App authentication is not configured. Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET in Vercel.");
  }
  if (!token) {
    const error = new Error("Shopify authentication is required.");
    error.status = 401;
    throw error;
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, new TextEncoder().encode(clientSecret), {
      algorithms: ["HS256"],
      audience: clientId,
      clockTolerance: 5,
    }));
  } catch {
    const error = new Error("Shopify authentication expired or is invalid.");
    error.status = 401;
    throw error;
  }
  if (typeof payload.dest !== "string" || typeof payload.iss !== "string") {
    const error = new Error("The Shopify token is missing its store identity.");
    error.status = 401;
    throw error;
  }

  const destination = new URL(payload.dest);
  const issuer = new URL(payload.iss);
  if (
    destination.protocol !== "https:" ||
    !destination.hostname.endsWith(".myshopify.com") ||
    destination.hostname === "myshopify.com" ||
    issuer.hostname !== destination.hostname ||
    issuer.pathname !== "/admin"
  ) {
    const error = new Error("The Shopify token contains an invalid store identity.");
    error.status = 401;
    throw error;
  }

  return { token, shop: destination.hostname, clientId, clientSecret };
}

async function exchangeForAdminToken({ token, shop, clientId, clientSecret }) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: token,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
    }),
  });
  const result = await response.json();
  if (!response.ok || typeof result.access_token !== "string") {
    throw new Error("Shopify did not grant an Admin API access token.");
  }
  return result.access_token;
}

async function callAdminApi(shop, accessToken, query, variables = {}) {
  const response = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length) {
    throw new Error("Shopify Admin API request failed.");
  }
  return result.data;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const auth = await authenticateRequest(req);
    const accessToken = await exchangeForAdminToken(auth);

    if (req.method === "GET") {
      const data = await callAdminApi(
        auth.shop,
        accessToken,
        `query {
          shop {
            metafield(namespace: "$app", key: "heading") { value }
          }
        }`,
      );
      return sendJson(res, 200, {
        heading: data.shop?.metafield?.value ?? "",
      });
    }

    const heading = req.body?.heading;
    if (typeof heading !== "string" || heading.length > MAX_HEADING_LENGTH) {
      return sendJson(res, 400, { error: "Enter a heading of up to 255 characters." });
    }

    const data = await callAdminApi(
      auth.shop,
      accessToken,
      `query { shop { id } }`,
    );
    const shopId = data.shop?.id;
    if (typeof shopId !== "string") {
      throw new Error("Unable to identify this Shopify store.");
    }

    const saved = await callAdminApi(
      auth.shop,
      accessToken,
      `mutation SaveHeading($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { key value }
          userErrors { message }
        }
      }`,
      {
        metafields: [{
          ownerId: shopId,
          namespace: METAFIELD_NAMESPACE,
          key: METAFIELD_KEY,
          type: "single_line_text_field",
          value: heading,
        }],
      },
    );
    const userErrors = saved.metafieldsSet?.userErrors ?? [];
    if (userErrors.length) {
      return sendJson(res, 400, { error: userErrors.map(({ message }) => message).join(" ") });
    }

    return sendJson(res, 200, { heading });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return sendJson(res, status, {
      error: status === 401
        ? error.message
        : "Unable to access Shopify settings. Check the app configuration and try again.",
    });
  }
}
