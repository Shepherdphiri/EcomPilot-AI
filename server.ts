import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_ID = 'gemini-4-hydrogen';
const FALLBACK_MODEL_ID = 'gemini-3.1-flash-lite';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please verify your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientBusyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('"code":503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('"code":429')
  );
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: Parameters<GoogleGenAI['models']['generateContent']>[0]['contents'];
    config?: Parameters<GoogleGenAI['models']['generateContent']>[0]['config'];
  }
) {
  const attempts = [
    { model: MODEL_ID, delayMs: 0 },
    { model: MODEL_ID, delayMs: 700 },
    { model: FALLBACK_MODEL_ID, delayMs: 400 },
  ];

  let lastErr: unknown;
  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await new Promise((r) => setTimeout(r, attempt.delayMs));
    }
    try {
      return await ai.models.generateContent({
        model: attempt.model,
        contents: params.contents,
        config: params.config,
      });
    } catch (err) {
      lastErr = err;
      if (!isTransientBusyError(err)) {
        throw err;
      }
    }
  }
  throw lastErr;
}

function extractErrorMessage(err: unknown): { status: number; message: string } {
  if (err instanceof Error) {
    let msg = err.message || 'Unknown Gemini API error';
    try {
      const parsed = JSON.parse(msg) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (parsed?.error?.message) {
        msg = parsed.error.message;
      }
    } catch {
      // keep raw message
    }

    if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
      return {
        status: 403,
        message: 'Gemini API key rejected. Please verify your key in Settings > Secrets.',
      };
    }
    if (msg.includes('RESOURCE_EXHAUSTED')) {
      return {
        status: 429,
        message: 'Gemini API rate limit reached. Please wait a moment and try again.',
      };
    }
    if (msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
      return {
        status: 503,
        message: 'The AI service is temporarily experiencing high demand. Please try again in a few seconds.',
      };
    }
    if (msg.includes('GEMINI_API_KEY is not configured')) {
      return { status: 500, message: msg };
    }
    return { status: 502, message: msg };
  }
  return { status: 500, message: 'Unexpected server error while calling Gemini API.' };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'ecompilot-ai-api', model: MODEL_ID });
  });

  // 1. AI Content Generator (Multimodal image + specs -> channel-optimized English copy)
  app.post('/api/ai/content-generate', async (req: Request, res: Response) => {
    try {
      const {
        productName,
        sku,
        brand,
        category,
        dimensions,
        specifications,
        currentIssues,
        imageBase64,
        imageMimeType,
      } = req.body as {
        productName?: string;
        sku?: string;
        brand?: string;
        category?: string;
        dimensions?: string;
        specifications?: string;
        currentIssues?: string;
        imageBase64?: string;
        imageMimeType?: string;
      };

      if (!productName || !specifications) {
        res.status(400).json({ error: 'Product name and specifications are required.' });
        return;
      }

      const ai = getGeminiClient();

      const promptText = `You are an expert ecommerce merchandising copywriter specializing in Takealot (South Africa) and Shopify D2C storefronts.
Generate high-converting, English-only marketplace listing copy for this product:
- Product Name: ${productName}
- SKU: ${sku || 'N/A'}
- Brand: ${brand || 'Apex Home'}
- Category: ${category || 'Consumer Goods'}
- Dimensions & Weight: ${dimensions || 'Standard retail packaging'}
- Specifications: ${specifications}
- Known Listing Gaps to Fix: ${currentIssues || 'Optimize SEO keywords, clarity, and conversion'}

Requirements:
1. takealotTitle: Clean South African Takealot convention (Brand + Product + Capacity/Wattage + Colour).
2. shopifyTitle: Crisp, brand-forward D2C headline.
3. bulletPoints: Exactly 5 concise, benefit-first bullet points highlighting concrete specs.
4. keywords: 10 high-intent backend search keywords/phrases (comma-less strings).
5. productDescription: Clear, structured 2-paragraph English product description.
6. metaDescription: Compelling SEO meta description under 155 characters.
7. projectedScore: Realistic listing quality score (integer 88-98) after applying this copy.
8. rationale: 1-sentence explanation of why these optimizations lift search visibility and conversion.`;

      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (imageBase64 && imageMimeType) {
        parts.push({
          inlineData: {
            mimeType: imageMimeType,
            data: imageBase64,
          },
        });
      }
      parts.push({ text: promptText });

      const response = await generateContentWithRetry(ai, {
        contents: { parts },
        config: {
          systemInstruction:
            'Return strictly valid JSON matching the requested schema. Language: English only.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              takealotTitle: { type: Type.STRING },
              shopifyTitle: { type: Type.STRING },
              bulletPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              productDescription: { type: Type.STRING },
              metaDescription: { type: Type.STRING },
              projectedScore: { type: Type.INTEGER },
              rationale: { type: Type.STRING },
            },
            required: [
              'takealotTitle',
              'shopifyTitle',
              'bulletPoints',
              'keywords',
              'productDescription',
              'metaDescription',
              'projectedScore',
              'rationale',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const { status, message } = extractErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // 2. AI Assistant Chat (Plain business language grounded in live operational state)
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    try {
      const { message, role, storeContext, history } = req.body as {
        message?: string;
        role?: string;
        storeContext?: unknown;
        history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      };

      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Message is required.' });
        return;
      }

      const ai = getGeminiClient();

      const recentHistory = (history || [])
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'User' : 'EcomPilot'}: ${m.content}`)
        .join('\n');

      const systemInstruction = `You are EcomPilot, an expert Ecommerce Operations Manager assistant for a multi-marketplace seller operating on Shopify and Takealot Marketplace.
Active user role: ${role || 'ecommerce_manager'}.
Currency: South African Rand (ZAR, prefix R).

Rules:
- Respond in plain, decisive business language. Never output raw JSON or technical jargon.
- Be specific: cite exact SKUs, ZAR figures, days of cover, marketplace names, and concrete next actions from the live operational snapshot below.
- Keep answers concise, scannable (short paragraphs or crisp numbered points), and focused on what requires attention and why.

LIVE OPERATIONAL SNAPSHOT:
${JSON.stringify(storeContext)}`;

      const prompt = recentHistory
        ? `Conversation so far:\n${recentHistory}\n\nNew question: ${message}`
        : message;

      const response = await generateContentWithRetry(ai, {
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      res.json({ reply: (response.text ?? '').trim() });
    } catch (err) {
      const { status, message } = extractErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // 3. Daily AI Morning Report Generator
  app.post('/api/ai/daily-report', async (req: Request, res: Response) => {
    try {
      const { role, storeSnapshot } = req.body as {
        role?: string;
        storeSnapshot?: unknown;
      };

      const ai = getGeminiClient();

      const response = await generateContentWithRetry(ai, {
        contents: `Generate an updated 06:00 SAST Daily AI Operations Briefing tailored for the ${role || 'ecommerce_manager'} role using this live operational state:\n${JSON.stringify(storeSnapshot)}`,
        config: {
          systemInstruction:
            'You are an executive ecommerce operations analyst. Summarize yesterday revenue, operational risks, and the top 5 highest-ROI actions in plain business language using ZAR (R).',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              yesterdayNarrative: { type: Type.STRING },
              topActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rank: { type: Type.INTEGER },
                    priority: { type: Type.STRING },
                    action: { type: Type.STRING },
                    channel: { type: Type.STRING },
                    impactZar: { type: Type.INTEGER },
                  },
                  required: ['rank', 'priority', 'action', 'channel', 'impactZar'],
                },
              },
            },
            required: ['executiveSummary', 'yesterdayNarrative', 'topActions'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const { status, message } = extractErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // 4. Reviews Intelligence Live Analyzer
  app.post('/api/ai/analyze-reviews', async (req: Request, res: Response) => {
    try {
      const { sku, productName, reviews } = req.body as {
        sku?: string;
        productName?: string;
        reviews?: string[];
      };

      if (!reviews || reviews.length === 0) {
        res.status(400).json({ error: 'Provide at least one customer review to analyze.' });
        return;
      }

      const ai = getGeminiClient();

      const response = await generateContentWithRetry(ai, {
        contents: `Analyze these customer reviews for ${productName || sku || 'product'}:\n${reviews
          .map((r, i) => `${i + 1}. ${r}`)
          .join('\n')}`,
        config: {
          systemInstruction:
            'Extract sentiment score (0-100), top recurring complaint, complaint count estimate, top positive theme, positive count, and one concrete operational recommendation.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentimentScore: { type: Type.INTEGER },
              topComplaint: { type: Type.STRING },
              complaintMentions: { type: Type.INTEGER },
              topPositive: { type: Type.STRING },
              positiveMentions: { type: Type.INTEGER },
              recommendation: { type: Type.STRING },
            },
            required: [
              'sentimentScore',
              'topComplaint',
              'complaintMentions',
              'topPositive',
              'positiveMentions',
              'recommendation',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const { status, message } = extractErrorMessage(err);
      res.status(status).json({ error: message });
    }
  });

  // 5. Live Shopify & Takealot Channel Sync (in-memory session credentials, never returned to client)
  interface SessionConnectors {
    shopify?: { storeDomain: string; accessToken: string };
    takealot?: { apiKey: string };
  }
  let activeConnectors: SessionConnectors = {};

  function normalizeSku(raw: string): string {
    return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  async function fetchShopifyData(storeDomain: string, accessToken: string) {
    const cleanDomain = storeDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const endpoint = `https://${cleanDomain}/admin/api/2025-01/graphql.json`;

    const gql = async (query: string, variables?: Record<string, unknown>) => {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken.trim(),
        },
        body: JSON.stringify({ query, variables }),
      });
      if (!r.ok) {
        throw new Error(`Shopify API HTTP ${r.status}: ${await r.text()}`);
      }
      const json = (await r.json()) as { data?: any; errors?: Array<{ message: string }> };
      if (json.errors?.length) {
        throw new Error(`Shopify GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
      }
      return json.data;
    };

    const productsData = await gql(`
      query {
        products(first: 100) {
          edges {
            node {
              id title vendor status productType
              images(first: 5) { edges { node { url } } }
              variants(first: 20) {
                edges {
                  node { id sku price inventoryQuantity }
                }
              }
            }
          }
        }
      }
    `);

    const sinceIso = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const ordersData = await gql(
      `query($q: String!) {
        orders(first: 100, query: $q) {
          edges {
            node {
              name createdAt
              totalPriceSet { shopMoney { amount } }
              lineItems(first: 50) {
                edges { node { sku quantity } }
              }
            }
          }
        }
      }`,
      { q: `created_at:>=${sinceIso}` }
    );

    const listings: Array<{
      sku: string;
      title: string;
      priceZar: number;
      stock: number;
      active: boolean;
      imageUrl: string;
    }> = [];

    for (const edge of productsData?.products?.edges || []) {
      const p = edge.node;
      const img = p.images?.edges?.[0]?.node?.url || '/src/assets/images/product_air_fryer_1795615583452.jpg';
      for (const vEdge of p.variants?.edges || []) {
        const v = vEdge.node;
        const sku = (v.sku || '').trim() || `SHP-${String(v.id).split('/').pop()}`;
        listings.push({
          sku,
          title: p.title,
          priceZar: Math.round(Number(v.price || 0)),
          stock: Number(v.inventoryQuantity || 0),
          active: p.status === 'ACTIVE',
          imageUrl: img,
        });
      }
    }

    const velocity14d = new Map<string, number>();
    let yesterdayRevenueZar = 0;
    let yesterdayOrders = 0;
    const yesterdayDate = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);

    for (const edge of ordersData?.orders?.edges || []) {
      const o = edge.node;
      if (String(o.createdAt || '').slice(0, 10) === yesterdayDate) {
        yesterdayRevenueZar += Math.round(Number(o.totalPriceSet?.shopMoney?.amount || 0));
        yesterdayOrders += 1;
      }
      for (const li of o.lineItems?.edges || []) {
        const sku = (li.node.sku || '').trim();
        if (!sku) continue;
        const key = normalizeSku(sku);
        velocity14d.set(key, (velocity14d.get(key) || 0) + Number(li.node.quantity || 1));
      }
    }

    return { cleanDomain, listings, velocity14d, yesterdayRevenueZar, yesterdayOrders };
  }

  async function fetchTakealotData(apiKey: string) {
    const headers = { Authorization: `Key ${apiKey.trim()}` };
    const offersRes = await fetch('https://seller-api.takealot.com/v2/offers?page_size=100', { headers });
    if (!offersRes.ok) {
      throw new Error(`Takealot Offers API HTTP ${offersRes.status}: ${await offersRes.text()}`);
    }
    const offersJson = (await offersRes.json()) as { offers?: Array<any> };

    const sinceDate = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const salesRes = await fetch(
      `https://seller-api.takealot.com/v2/sales?page_size=100&filters=start_date:${sinceDate}`,
      { headers }
    );
    const salesJson = salesRes.ok ? ((await salesRes.json()) as { sales?: Array<any> }) : { sales: [] };

    const listings = (offersJson.offers || []).map((o) => {
      const statusText = String(o.status || '');
      const buyable = statusText === 'Buyable';
      const stock =
        Number(o.stock_at_takealot_total || 0) + Number(o.stock_on_way_total || 0) ||
        Number(o.leadtime_stock?.[0]?.quantity_available || 0);
      return {
        offerId: String(o.offer_id),
        sku: String(o.sku || o.tsin_id || o.offer_id).trim(),
        title: String(o.title || 'Takealot Offer'),
        priceZar: Math.round(Number(o.selling_price || 0)),
        stock,
        buyable,
        statusReason: statusText,
      };
    });

    const velocity14d = new Map<string, number>();
    let yesterdayRevenueZar = 0;
    const yesterdayOrderIds = new Set<string>();
    const yesterdayDate = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);

    for (const s of salesJson.sales || []) {
      const qty = Number(s.quantity || 1);
      const sku = String(s.sku || s.offer_id || '').trim();
      if (sku) {
        const key = normalizeSku(sku);
        velocity14d.set(key, (velocity14d.get(key) || 0) + qty);
      }
      if (String(s.order_date || '').slice(0, 10) === yesterdayDate) {
        yesterdayRevenueZar += Math.round(Number(s.selling_price || 0) * qty);
        yesterdayOrderIds.add(String(s.order_id));
      }
    }

    return {
      listings,
      velocity14d,
      yesterdayRevenueZar,
      yesterdayOrders: yesterdayOrderIds.size,
    };
  }

  app.get('/api/connectors/status', (_req: Request, res: Response) => {
    res.json({
      shopifyConnected: Boolean(activeConnectors.shopify),
      shopifyDomain: activeConnectors.shopify?.storeDomain || null,
      takealotConnected: Boolean(activeConnectors.takealot),
    });
  });

  app.post('/api/connectors/disconnect', (_req: Request, res: Response) => {
    activeConnectors = {};
    res.json({ disconnected: true });
  });

  app.post('/api/connectors/sync', async (req: Request, res: Response) => {
    try {
      const { shopify, takealot } = req.body as {
        shopify?: { storeDomain?: string; accessToken?: string };
        takealot?: { apiKey?: string };
      };

      if (shopify?.storeDomain && shopify?.accessToken) {
        activeConnectors.shopify = {
          storeDomain: shopify.storeDomain.trim(),
          accessToken: shopify.accessToken.trim(),
        };
      }
      if (takealot?.apiKey) {
        activeConnectors.takealot = { apiKey: takealot.apiKey.trim() };
      }

      if (!activeConnectors.shopify && !activeConnectors.takealot) {
        res.status(400).json({ error: 'Provide Shopify or Takealot credentials to sync.' });
        return;
      }

      const [shopifyRes, takealotRes] = await Promise.all([
        activeConnectors.shopify
          ? fetchShopifyData(
              activeConnectors.shopify.storeDomain,
              activeConnectors.shopify.accessToken
            )
          : Promise.resolve(null),
        activeConnectors.takealot
          ? fetchTakealotData(activeConnectors.takealot.apiKey)
          : Promise.resolve(null),
      ]);

      // Build unified canonical catalog via normalized SKU alias matching
      const catalog = new Map<
        string,
        {
          sku: string;
          title: string;
          imageUrl: string;
          shopifyPrice?: number;
          takealotPrice?: number;
          stock: number;
          units14d: number;
          suppressedOnTakealot?: string;
        }
      >();

      for (const s of shopifyRes?.listings || []) {
        const key = normalizeSku(s.sku);
        const existing = catalog.get(key);
        catalog.set(key, {
          sku: existing?.sku || s.sku,
          title: existing?.title || s.title,
          imageUrl: s.imageUrl,
          shopifyPrice: s.priceZar,
          takealotPrice: existing?.takealotPrice,
          stock: Math.max(existing?.stock || 0, s.stock),
          units14d: shopifyRes?.velocity14d.get(key) || 0,
          suppressedOnTakealot: existing?.suppressedOnTakealot,
        });
      }

      for (const t of takealotRes?.listings || []) {
        const key = normalizeSku(t.sku);
        const existing = catalog.get(key);
        const combinedVelocity =
          (existing?.units14d || 0) + (takealotRes?.velocity14d.get(key) || 0);
        catalog.set(key, {
          sku: existing?.sku || t.sku,
          title: existing?.title || t.title,
          imageUrl: existing?.imageUrl || '/src/assets/images/product_air_fryer_1795615583452.jpg',
          shopifyPrice: existing?.shopifyPrice,
          takealotPrice: t.priceZar,
          stock: Math.max(existing?.stock || 0, t.stock),
          units14d: combinedVelocity,
          suppressedOnTakealot: t.buyable ? undefined : t.statusReason || 'Not Buyable',
        });
      }

      const tasks: Array<any> = [];
      const inventory: Array<any> = [];
      const pricing: Array<any> = [];
      let lowStockCount = 0;

      let idx = 0;
      for (const item of catalog.values()) {
        idx += 1;
        const dailyVel = Math.round((item.units14d / 14) * 10) / 10;
        const targetPrice = item.shopifyPrice || item.takealotPrice || 0;

        inventory.push({
          id: `live-inv-${idx}`,
          sku: item.sku,
          productName: item.title,
          imageUrl: item.imageUrl,
          currentStock: item.stock,
          dailySalesVelocity: dailyVel,
          incomingStock: 0,
          incomingEtaDays: null,
          reorderPointDays: 14,
          unitCostZar: Math.round(targetPrice * 0.55),
          sellingPriceZar: targetPrice,
          affectedChannels: [
            ...(item.shopifyPrice ? ['shopify'] : []),
            ...(item.takealotPrice ? ['takealot'] : []),
          ],
        });

        const coverDays = dailyVel > 0 ? item.stock / dailyVel : 999;
        if (coverDays <= 14) {
          lowStockCount += 1;
          tasks.push({
            id: `live-stk-${idx}`,
            severity: coverDays <= 5 ? 'critical' : 'high',
            title:
              coverDays <= 1
                ? `Immediate stockout risk for SKU ${item.sku}`
                : `Stockout predicted in ${Math.round(coverDays)} days (${item.sku})`,
            summary: `${item.stock} units remaining at ${dailyVel}/day sales velocity across connected channels.`,
            marketplace: item.takealotPrice ? 'takealot' : 'shopify',
            marketplaceLabel: item.takealotPrice ? 'Takealot' : 'Shopify',
            sku: item.sku,
            revenueImpactZar: Math.max(500, Math.round(dailyVel * targetPrice * 3)),
            relevantRoles: ['ecommerce_manager', 'inventory_manager', 'executive'],
            targetSection: 'inventory_pricing',
            actionLabel: 'Review Stock Cover',
            detectedAt: 'Live sync',
            resolved: false,
          });
        }

        if (item.suppressedOnTakealot) {
          tasks.push({
            id: `live-sup-${idx}`,
            severity: 'critical',
            title: `Takealot listing not buyable: ${item.suppressedOnTakealot}`,
            summary: `SKU ${item.sku} (${item.title}) is currently marked "${item.suppressedOnTakealot}" on Takealot Seller Portal.`,
            marketplace: 'takealot',
            marketplaceLabel: 'Takealot',
            sku: item.sku,
            revenueImpactZar: Math.max(1200, targetPrice * 2),
            relevantRoles: ['ecommerce_manager', 'content_manager', 'executive'],
            targetSection: 'listings',
            actionLabel: 'Inspect Listing',
            detectedAt: 'Live sync',
            resolved: false,
          });
        }

        if (item.shopifyPrice && item.takealotPrice) {
          const maxP = Math.max(item.shopifyPrice, item.takealotPrice);
          const minP = Math.min(item.shopifyPrice, item.takealotPrice);
          const variancePct = maxP > 0 ? Math.round(((maxP - minP) / maxP) * 1000) / 10 : 0;
          const mismatched = variancePct >= 5;

          pricing.push({
            id: `live-prc-${idx}`,
            sku: item.sku,
            productName: item.title,
            costZar: Math.round(maxP * 0.55),
            targetPriceZar: maxP,
            prices: {
              shopify: item.shopifyPrice,
              takealot: item.takealotPrice,
            },
            issueType: mismatched ? 'mismatch' : 'aligned',
            variancePercent: variancePct,
            recommendation: mismatched
              ? `Shopify (R${item.shopifyPrice}) differs from Takealot (R${item.takealotPrice}) by ${variancePct}%. Align channel prices.`
              : 'Shopify and Takealot pricing aligned.',
            resolved: !mismatched,
          });

          if (mismatched) {
            tasks.push({
              id: `live-pdiff-${idx}`,
              severity: 'high',
              title: `Price mismatch on SKU ${item.sku}: Shopify R${item.shopifyPrice} vs Takealot R${item.takealotPrice}`,
              summary: `${variancePct}% cross-channel price gap detected between Shopify and Takealot.`,
              marketplace: 'takealot',
              marketplaceLabel: 'Takealot & Shopify',
              sku: item.sku,
              revenueImpactZar: Math.abs(item.shopifyPrice - item.takealotPrice) * 3,
              relevantRoles: ['ecommerce_manager', 'executive'],
              targetSection: 'inventory_pricing',
              actionLabel: 'Align Channel Price',
              detectedAt: 'Live sync',
              resolved: false,
            });
          }
        }
      }

      const marketplaces: Array<any> = [];
      if (shopifyRes) {
        const activeCount = shopifyRes.listings.filter((l) => l.active).length;
        marketplaces.push({
          id: 'shopify',
          name: `Shopify (${shopifyRes.cleanDomain})`,
          shortName: 'Shopify',
          region: 'Live API',
          connectorType: 'Admin GraphQL',
          totalListings: shopifyRes.listings.length,
          activeListings: activeCount,
          suppressedListings: shopifyRes.listings.length - activeCount,
          inventoryIssues: lowStockCount,
          contentIssues: 0,
          healthScore: Math.max(50, 100 - lowStockCount * 4),
          revenueYesterdayZar: shopifyRes.yesterdayRevenueZar,
          ordersYesterday: shopifyRes.yesterdayOrders,
          lastSynced: 'Just now',
        });
      }
      if (takealotRes) {
        const activeCount = takealotRes.listings.filter((l) => l.buyable).length;
        const suppressedCount = takealotRes.listings.length - activeCount;
        marketplaces.push({
          id: 'takealot',
          name: 'Takealot Marketplace',
          shortName: 'Takealot',
          region: 'Live API',
          connectorType: 'Seller API v2',
          totalListings: takealotRes.listings.length,
          activeListings: activeCount,
          suppressedListings: suppressedCount,
          inventoryIssues: lowStockCount,
          contentIssues: 0,
          healthScore: Math.max(40, 100 - suppressedCount * 6 - lowStockCount * 3),
          revenueYesterdayZar: takealotRes.yesterdayRevenueZar,
          ordersYesterday: takealotRes.yesterdayOrders,
          lastSynced: 'Just now',
        });
      }

      const totalRev =
        (shopifyRes?.yesterdayRevenueZar || 0) + (takealotRes?.yesterdayRevenueZar || 0);
      const totalOrders =
        (shopifyRes?.yesterdayOrders || 0) + (takealotRes?.yesterdayOrders || 0);
      const suppressedTotal = marketplaces.reduce((s, m) => s + m.suppressedListings, 0);
      const potentialLoss = tasks.reduce((s, t) => s + t.revenueImpactZar, 0);

      res.json({
        syncedAt: new Date().toISOString(),
        summary: {
          shopifyListings: shopifyRes?.listings.length || 0,
          takealotListings: takealotRes?.listings.length || 0,
          matchedAliases: pricing.length,
          tasksDetected: tasks.length,
        },
        marketplaces,
        tasks,
        inventory: inventory.slice(0, 50),
        pricing: pricing.slice(0, 50),
        dailyReport: {
          generatedAt: 'Live API Sync · Just now',
          dateLabel: 'Live Store Operations Briefing',
          revenueYesterdayZar: totalRev,
          revenueDeltaPercent: 0,
          ordersCount: totalOrders,
          lowStockProductsCount: lowStockCount,
          suppressedListingsCount: suppressedTotal,
          delayedDeliveriesCount: 0,
          potentialRevenueLossZar: potentialLoss,
          executiveSummary: `Synced ${catalog.size} unique SKUs across connected channels. Yesterday recorded R${totalRev.toLocaleString('en-ZA')} across ${totalOrders} orders. Detected ${suppressedTotal} non-buyable listings and ${lowStockCount} low-stock SKUs.`,
          yesterdayNarrative: `Live data pulled directly from ${marketplaces.map((m) => m.shortName).join(' and ')}.`,
          topActions: tasks.slice(0, 5).map((t, i) => ({
            rank: i + 1,
            priority: t.severity,
            action: t.title,
            channel: t.marketplaceLabel,
            impactZar: t.revenueImpactZar,
          })),
        },
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed syncing live marketplace data.',
      });
    }
  });

  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      const status =
        typeof (err as { status?: number })?.status === 'number'
          ? (err as { status: number }).status
          : 500;
      const msg =
        status === 413
          ? 'Uploaded image or payload is too large. Please use a smaller image (under 4 MB).'
          : err instanceof Error
          ? err.message
          : 'Unexpected server error.';
      res.status(status).json({ error: msg });
      return;
    }
    next(err);
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcomPilot server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start EcomPilot server:', err);
  process.exit(1);
});
