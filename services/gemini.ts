
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";
import { getGeminiKey } from "../components/Shared";

const cleanJson = (text: string): string => {
  if (!text) return "{}";
  const cleaned = text.replace(/```(json)?/gi, '').replace(/```/g, '').trim();
  return cleaned || "{}";
};

export const generateMovieAnalysis = async (
  watchedTitles: string,
  favTitles: string,
  watchlistTitles: string
): Promise<AIAnalysisResult> => {
  try {
      const apiKey = getGeminiKey();
      if (!apiKey) throw new Error("No Gemini API Key found");

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
          My Movie Data:
          - Watched & Liked: ${watchedTitles}
          - All Time Favorites: ${favTitles}
          - Planning to Watch: ${watchlistTitles}

          1. Analyze my taste deeply in 2 sentences.
          2. Give me a fun 'Cinephile Persona Name'.
          3. Suggest ONE specific genre or sub-genre I haven't explored much but might like ("suggestion").
          4. Recommend exactly 20 specific movie titles I should watch next based on my history.
          5. Describe in 2 sentences what other people with similar taste typically enjoy ("community_vibe").
          6. List 5 upcoming or recent future movies that match my taste ("future_radar").
          
          Return JSON.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              persona: { type: Type.STRING },
              analysis: { type: Type.STRING },
              suggestion: { type: Type.STRING },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              community_vibe: { type: Type.STRING },
              future_radar: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["persona", "analysis", "suggestion", "recommendations", "community_vibe", "future_radar"]
          }
        }
      });

      if (response.text) {
        return JSON.parse(cleanJson(response.text)) as AIAnalysisResult;
      }
      throw new Error("No text response from Gemini");
  } catch (e) {
      console.error("AI Analysis Failed", e);
      throw e;
  }
};

export const generateTrivia = async (movieTitle: string, year: string): Promise<string> => {
  try {
      const apiKey = getGeminiKey();
      if (!apiKey) return "Trivia unavailable (Missing Key)";

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Tell me one short, fascinating, and lesser-known behind-the-scenes trivia fact about the movie "${movieTitle}" (${year}). Keep it under 30 words.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || "Trivia unavailable.";
  } catch (e) {
      console.error("Trivia Gen Failed", e);
      return "Trivia unavailable (Network Error)";
  }
};

export const generateSmartRecommendations = async (query: string): Promise<{ movies: string[], reason: string }> => {
  try {
      const apiKey = getGeminiKey();
      if (!apiKey) return { movies: [], reason: "API Key Missing" };

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Act as a premium movie recommendation engine. The user searched for: "${query}".
        
        1.  **Analyze Intent**: Is it a specific movie title, a genre (e.g., "90s action"), a mood (e.g., "sad movies"), or a plot?
        2.  **Select Best Fits**: Identify 15-20 specific movie titles that best match this query.
        3.  **Context**: Provide a very brief, fun one-sentence reason for this selection.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    movies: { 
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    reason: { type: Type.STRING }
                },
                required: ["movies", "reason"]
            }
        }
      });

      if (response.text) {
          return JSON.parse(cleanJson(response.text));
      }
  } catch (e) {
      console.error("Smart Recs Failed", e);
  }
  return { movies: [], reason: "Could not generate recommendations." };
};

export const getSimilarMoviesAI = async (title: string, year: string): Promise<string[]> => {
    try {
        const apiKey = getGeminiKey();
        if (!apiKey) return [];

        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Recommend 5 movies similar to "${title}" (${year}). Return a JSON array of strings.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        if(response.text) {
             const parsed = JSON.parse(cleanJson(response.text));
             return Array.isArray(parsed) ? parsed : [];
        }
    } catch (e) {
        console.error("Similar Movies AI Failed", e);
    }
    return [];
}

export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  try {
      const apiKey = getGeminiKey();
      if (!apiKey) return [];

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `The user is typing: "${query}". Suggest 5 concise auto-complete movie search options. Return JSON array.`;
      
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { 
              responseMimeType: 'application/json',
              responseSchema: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
              }
          }
      });

      if(response.text) {
          const parsed = JSON.parse(cleanJson(response.text));
          return Array.isArray(parsed) ? parsed : [];
      }
  } catch (e) {
      console.error("Suggestions AI Failed", e);
  }
  return [];
};
