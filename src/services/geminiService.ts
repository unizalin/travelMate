import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Missing VITE_GEMINI_API_KEY');
}

const ai = new GoogleGenAI({ apiKey });

export interface ActivitySuggestion {
  name: string;
  location: string;
  duration: number; // minutes
  description: string;
  recommendedTime: string; // HH:MM
}

export interface DayPlanResponse {
  suggestions: ActivitySuggestion[];
}

export const geminiService = {
  async getItinerarySuggestions(
    userMessage: string,
    destination: string,
    dayNumber: number
  ): Promise<ActivitySuggestion[]> {
    const prompt = `我正在規劃${destination}旅遊的第 ${dayNumber} 天行程。
使用者需求：${userMessage}

請以繁體中文回覆，並用 JSON 格式列出建議的景點：
{
  "suggestions": [
    {
      "name": "景點名稱",
      "location": "完整地址",
      "duration": 120,
      "description": "簡短描述",
      "recommendedTime": "09:00"
    }
  ]
}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text;
      console.log('Gemini Response:', text);

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.suggestions || [];
      }

      throw new Error('無法解析 JSON');
    } catch (error: any) {
      console.error('Gemini Error:', error);
      throw error;
    }
  }
};
