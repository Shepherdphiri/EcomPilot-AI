import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_ID = 'gemini-4-hydrogen';

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

function extractErrorMessage(err: unknown): { status: number; message: string } {
  if (err instanceof Error) {
    const msg = err.message || 'Unknown Gemini API error';
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
    if (msg.includes('GEMINI_API_KEY is not configured')) {
      return { status: 500, message: msg };
    }
    return { status: 502, message: msg };
  }
  return { status: 500, message: 'Unexpected server error while calling Gemini API.' };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

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

      const promptText = `You are an expert ecommerce merchandising copywriter specializing in Amazon Seller Central, Takealot (South Africa), and Shopify D2C storefronts.
Generate high-converting, English-only marketplace listing copy for this product:
- Product Name: ${productName}
- SKU: ${sku || 'N/A'}
- Brand: ${brand || 'Apex Home'}
- Category: ${category || 'Consumer Goods'}
- Dimensions & Weight: ${dimensions || 'Standard retail packaging'}
- Specifications: ${specifications}
- Known Listing Gaps to Fix: ${currentIssues || 'Optimize SEO keywords, clarity, and conversion'}

Requirements:
1. amazonTitle: Keyword-rich, under 180 characters, compliant with Amazon title guidelines (no promotional hype like "Best").
2. takealotTitle: Clean South African Takealot convention (Brand + Product + Capacity/Wattage + Colour).
3. shopifyTitle: Crisp, brand-forward D2C headline.
4. bulletPoints: Exactly 5 concise, benefit-first bullet points highlighting concrete specs.
5. keywords: 10 high-intent backend search keywords/phrases (comma-less strings).
6. productDescription: Clear, structured 2-paragraph English product description.
7. metaDescription: Compelling SEO meta description under 155 characters.
8. projectedScore: Realistic listing quality score (integer 88-98) after applying this copy.
9. rationale: 1-sentence explanation of why these optimizations lift search visibility and conversion.`;

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

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: { parts },
        config: {
          systemInstruction:
            'Return strictly valid JSON matching the requested schema. Language: English only.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amazonTitle: { type: Type.STRING },
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
              'amazonTitle',
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
        .map((m) => `${m.role === 'user' ? 'User' : 'EcomPilot AI'}: ${m.content}`)
        .join('\n');

      const systemInstruction = `You are EcomPilot AI, an expert Ecommerce Operations Manager assistant for a multi-marketplace seller operating on Shopify, Amazon Seller Central, Amazon Vendor Central, Takealot, Makro Marketplace, and Leroy Merlin Marketplace.
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

      const response = await ai.models.generateContent({
        model: MODEL_ID,
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

      const response = await ai.models.generateContent({
        model: MODEL_ID,
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

      const response = await ai.models.generateContent({
        model: MODEL_ID,
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
    console.log(`EcomPilot AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start EcomPilot AI server:', err);
  process.exit(1);
});
