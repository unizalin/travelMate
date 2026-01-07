const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

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
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing VITE_GEMINI_API_KEY environment variable');
    }

    const systemPrompt = `
      我正在規劃前往 ${destination} 的第 ${dayNumber} 天行程。
      使用者需求：${userMessage}
      
      請以純 JSON 格式回覆建議的景點，不要包含任何 Markdown 標記 (如 \`\`\`json)。格式如下：
      {
        "suggestions": [
          {
            "name": "景點名稱",
            "location": "完整地址",
            "duration": 120,
            "description": "簡短描述 (50字以內)",
            "recommendedTime": "09:00"
          }
        ]
      }
    `;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: systemPrompt
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API request failed: ${response.status}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new Error('Empty response from Gemini');
      }

      // Clean up markdown code blocks if present
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed: DayPlanResponse = JSON.parse(cleanJson);
        return parsed.suggestions || [];
      } catch (e) {
        console.error('Failed to parse JSON:', cleanJson);
        throw new Error('Invalid JSON response from AI');
      }

    } catch (error) {
      console.error('Gemini Service Error:', error);
      throw error;
    }
  }
};
