import { GoogleGenAI } from "@google/genai";
import type { CandidateActivity } from "./candidateService";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY');
}

const ai = new GoogleGenAI({ apiKey });

export interface SchedulingSuggestion {
    candidateId: string;
    dayNumber: number;
    startTime: string; // HH:MM
    reasoning: string;
}

export const aiSchedulingService = {
    async getSmartSchedule(
        candidates: CandidateActivity[],
        tripInfo: { destination: string; startDate: string; endDate: string; totalDays: number }
    ): Promise<SchedulingSuggestion[]> {
        const candidateData = candidates.map(c => ({
            id: c.id,
            name: c.name,
            location: c.location,
            likes: c.like_count,
            description: c.description
        }));

        const prompt = `你是一個專業的行程規劃師。我有一份「候選景點」清單，以及旅程的基本資訊。
請根據這些景點的「地理位置（如果可以判斷）」、「預計停留時間」、「點讚數（優先考慮高票）」以及「描述」，將它們聰明地分配到合適的旅遊天數中。

旅程資訊：
- 目的地：${tripInfo.destination}
- 總天數：${tripInfo.totalDays} 天
- 開始日期：${tripInfo.startDate}

候選景點清單：
${JSON.stringify(candidateData, null, 2)}

請以繁體中文思考，並嚴格遵守以下 JSON 格式回覆：
{
  "suggestions": [
    {
      "candidateId": "景點的 UUID",
      "dayNumber": 1, 
      "startTime": "09:00",
      "reasoning": "為什麼安排在這裡的簡短原因"
    }
  ]
}

注意：
1. 盡量將地理位置相近的景點排在同一天。
2. 考慮點讚數較高的景點優先排入。
3. 不要安排超過總天數的範圍。
4. 每天的行程不要過度擁擠。`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            const text = response.text;
            if (!text) throw new Error('Empty response from Gemini');

            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.suggestions || [];
            }

            throw new Error('無法解析 AI 回覆');
        } catch (error: any) {
            console.error('AI Scheduling Error:', error);
            throw error;
        }
    }
};
