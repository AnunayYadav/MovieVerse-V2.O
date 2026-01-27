
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

const cleanJson = (text: string): string => {
  if (!text) return "{}";
  // Handles ```json, ```JSON, or just ``` blocks
  const cleaned = text.replace(/```(json)?/gi, '').replace(/```/g, '').trim();
  return cleaned || "{}";
};

export const generateMovieAnalysis = async (
  watchedTitles: string,
  favTitles: string,
  watchlistTitles: string
): Promise<AIAnalysisResult> => {
  try {
      // Always use the object constructor for GoogleGenAI with process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
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

      // Use 'gemini-3-pro-preview' for complex analysis tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Tell me one short, fascinating, and lesser-known behind-the-scenes trivia fact about the movie "${movieTitle}" (${year}). Keep it under 30 words.`;
      
      // Use 'gemini-3-flash-preview' for quick basic text tasks
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Act as a premium media recommendation engine. The user searched for: "${query}".
        
        1.  **Analyze Intent**: Is it a specific title, a genre (e.g., "90s action"), a mood (e.g., "sad movies"), or a plot?
        2.  **Exact Match Priority**: IF the query looks like a specific Movie or TV Show name (e.g. "Inception", "Breaking Bad"), your FIRST recommendation MUST be that exact title.
        3.  **Select Best Fits**: Identify 15-20 specific, distinct, and popular titles (Movies OR TV Shows) that best match this query. 
        4.  **Prioritize Popularity**: Prefer well-known or critically acclaimed content.
        5.  **Context**: Provide a very brief, fun one-sentence reason for this selection.
      `;

      // Use 'gemini-3-flash-preview' for search/recommendation tasks
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
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Recommend 5 movies similar to "${title}" (${year}). Focus on genre, director style, and tone. Return a list of strings.`;
        
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        The user is typing in a media search bar: "${query}".
        Suggest 5 concise, relevant auto-complete options.
        These should be high-quality search terms (e.g. "Christopher Nolan best movies", "Romantic comedies", "Breaking Bad", "Inception").
      `;
      
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
