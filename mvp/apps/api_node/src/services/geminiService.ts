import { Type } from '@google/genai';
import { geminiAI } from '../config/clients.js';

const MODEL = 'gemini-4-hydrogen';

export async function generateMarketplaceCopy(input: {
  productName: string;
  brand: string;
  dimensions: string;
  specifications: string;
  imageBase64?: string;
  imageMimeType?: string;
}) {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (input.imageBase64 && input.imageMimeType) {
    parts.push({ inlineData: { mimeType: input.imageMimeType, data: input.imageBase64 } });
  }
  parts.push({
    text: `Generate English-only ecommerce titles (Amazon, Takealot, Shopify), 5 bullet points, 10 backend keywords, product description, and meta description for:
Product: ${input.productName}
Brand: ${input.brand}
Dimensions: ${input.dimensions}
Specs: ${input.specifications}`,
  });

  const response = await geminiAI.models.generateContent({
    model: MODEL,
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amazonTitle: { type: Type.STRING },
          takealotTitle: { type: Type.STRING },
          shopifyTitle: { type: Type.STRING },
          bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          productDescription: { type: Type.STRING },
          metaDescription: { type: Type.STRING },
        },
        required: [
          'amazonTitle',
          'takealotTitle',
          'shopifyTitle',
          'bulletPoints',
          'keywords',
          'productDescription',
          'metaDescription',
        ],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim());
}

export async function answerOperationalQuestion(
  question: string,
  role: string,
  storeContext: unknown
): Promise<string> {
  const response = await geminiAI.models.generateContent({
    model: MODEL,
    contents: question,
    config: {
      systemInstruction: `You are EcomPilot AI for role ${role}. Answer in plain business language using ZAR (R) and exact SKUs from:\n${JSON.stringify(storeContext)}`,
    },
  });
  return (response.text ?? '').trim();
}
