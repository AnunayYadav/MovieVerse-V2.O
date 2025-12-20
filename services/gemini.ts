
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

const cleanJson = (text: string): string => {
  if (!text) return "{}";
  return text.replace(/```(json)?/gi, '').replace(/```/g, '').trim() || "{}";
};

export const generateMovieAnalysis = async (
  watchedTitles: string,
  favTitles: string,
  watchlistTitles: string
): Promise<AIAnalysisResult> => {
  // Use named parameter and process.env.API_KEY directly as per SDK requirements
  const ai = new GoogleGenAI({ apiKey: (process as any).env.API_KEY });
  const prompt = `Analyze my movie taste:
  Watched: ${watchedTitles}
  Favs: ${favTitles}
  Planning: ${watchlistTitles}
  Provide a 'persona', 'analysis' (2 sentences), 'suggestion' (1 genre), 'recommendations' (20 titles), 'community_vibe' (1 sentence), 'future_radar' (5 upcoming titles). Return JSON.`;

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

  return JSON.parse(cleanJson(response.text || "{}"));
};

export const generateTrivia = async (movieTitle: string, year: string): Promise<string> => {
  // Use named parameter and process.env.API_KEY directly as per SDK requirements
  const ai = new GoogleGenAI({ apiKey: (process as any).env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Tell one short, fascinating behind-the-scenes trivia fact about "${movieTitle}" (${year}). Max 30 words.`,
  });
  return response.text || "Trivia unavailable.";
};

export const generateSmartRecommendations = async (query: string): Promise<{ movies: string[], reason: string }> => {
  // Use named parameter and process.env.API_KEY directly as per SDK requirements
  const ai = new GoogleGenAI({ apiKey: (process as any).env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Act as a movie engine. User search: "${query}". Return 15 relevant movie titles and a fun reason for the selection. JSON format.`,
    config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                movies: { type: Type.ARRAY, items: { type: Type.STRING } },
                reason: { type: Type.STRING }
            },
            required: ["movies", "reason"]
        }
    }
  });
  return JSON.parse(cleanJson(response.text || "{}"));
};

export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  // Use named parameter and process.env.API_KEY directly as per SDK requirements
  const ai = new GoogleGenAI({ apiKey: (process as any).env.API_KEY });
  const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User typing: "${query}". Suggest 5 concise auto-complete search options. Return JSON array.`,
      config: { 
          responseMimeType: 'application/json',
          responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
  });
  return JSON.parse(cleanJson(response.text || "[]"));
};

export const getSimilarMoviesAI = async (title: string, year: string): Promise<string[]> => {
    // Use named parameter and process.env.API_KEY directly as per SDK requirements
    const ai = new GoogleGenAI({ apiKey: (process as any).env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Recommend 5 movies similar to "${title}" (${year}). Return JSON array of strings.`,
        config: { 
            responseMimeType: 'application/json',
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    return JSON.parse(cleanJson(response.text || "[]"));
};