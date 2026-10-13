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
  category?: 'food' | 'sightseeing' | 'shopping' | 'transport' | 'other';
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
    const prompt = `您是一位領先全球的 TravelMate 旅遊規劃專家，正在協助使用者規劃 ${destination} 旅程。
今天是旅程的第 ${dayNumber} 天。

使用者請求：${userMessage}

請展現熱情、細心且極致專業的態度。回覆內容必須使用「繁體中文」。
您的目標是提供具體、可執行且具有「Pro Max」質感的高品質建議。

請嚴格遵守以下 JSON 格式回覆，不要包含任何解釋文字：
{
  "suggestions": [
    {
      "name": "景點名稱",
      "location": "地標名稱或地址",
      "duration": 120,
      "description": "簡短精煉的景點介紹，語氣高級且專業 (約 50 字)",
      "recommendedTime": "09:00",
      "category": "sightseeing" 
    }
  ]
}

category 僅限：'food', 'sightseeing', 'shopping', 'transport', 'other'。`;

    try {
      // For @google/genai version 1.34+, let's use the known working pattern
      const response = await (ai as any).models.generateContent({
        model: "gemini-1.5-flash",
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
