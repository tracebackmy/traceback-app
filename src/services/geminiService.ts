import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Helper to check if API key is present
export const isGeminiConfigured = () => !!process.env.API_KEY;

export interface AiAnalysisResult {
  keywords: string[];
  suggestedCategory: string;
}

/**
 * Analyzes an item description to extract keywords and suggest a category.
 */
export const analyzeItemDescription = async (description: string, title: string): Promise<AiAnalysisResult> => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key missing. Returning fallback data.");
    return { keywords: ['generic', 'item'], suggestedCategory: 'Uncategorized' };
  }

  try {
    const prompt = `
      Analyze the following lost/found item.
      Title: ${title}
      Description: ${description}
      
      Extract 5-8 relevant keywords for search matching and suggest 1 best-fit category 
      (e.g., Electronics, Clothing, Personal Accessories, Documents, Bags).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            suggestedCategory: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as AiAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return { keywords: [], suggestedCategory: 'Other' };
  }
};

/**
 * Compares a lost item against found items to find matches.
 * Uses Gemini Thinking model for deeper reasoning on matches.
 */
export const findSmartMatches = async (lostItemDescription: string, candidateItems: {id: string, description: string}[]) => {
  if (!process.env.API_KEY || candidateItems.length === 0) return [];

  try {
    const candidatesStr = JSON.stringify(candidateItems);
    const prompt = `
      I am a Lost & Found agent. I need to find matches for a lost item.
      
      LOST ITEM: "${lostItemDescription}"
      
      FOUND CANDIDATES:
      ${candidatesStr}
      
      Return a JSON list of object IDs from the candidates that are likely matches (confidence > 70%).
      Explain briefly why.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using flash for speed in this demo context
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              reason: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    return text ? JSON.parse(text) : [];

  } catch (error) {
    console.error("Gemini Matching Error:", error);
    return [];
  }
};