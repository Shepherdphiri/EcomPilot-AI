import { Type } from '@google/genai';
import { geminiAI } from '../config/clients.js';

export interface StructuredRecommendation {
  domain: 'content' | 'pricing' | 'inventory' | 'packaging' | 'shipping';
  confidence: number;
  estimatedMonthlyRoiZar: number;
  recommendationText: string;
}

export async function generateWorkspaceRecommendations(
  workspaceSnapshot: unknown
): Promise<StructuredRecommendation[]> {
  const response = await geminiAI.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Analyze this ecommerce operational snapshot and produce up to 5 concrete recommendations across content, pricing, inventory, packaging, and shipping:\n${JSON.stringify(workspaceSnapshot)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            domain: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            estimatedMonthlyRoiZar: { type: Type.INTEGER },
            recommendationText: { type: Type.STRING },
          },
          required: ['domain', 'confidence', 'estimatedMonthlyRoiZar', 'recommendationText'],
        },
      },
    },
  });

  return JSON.parse((response.text ?? '[]').trim()) as StructuredRecommendation[];
}
