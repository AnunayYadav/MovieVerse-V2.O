import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query, category } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'VITE_GEMINI_API_KEY environment variable is not configured' });
  }

  const cat = typeof category === 'string' ? category.toLowerCase() : 'all';

  let prompt = "";
  if (cat === 'manga') {
    prompt = `You are an extremely strict and aggressive semantic manga search assistant. The user is searching for manga matching this query: "${query}". 
YOUR MAIN RULE:
You MUST adhere 100% strictly and aggressively to the user's thoughts, constraints, genres, moods, themes, or years specified in the query. 
- If the user specifies or implies a category/genre like "horror", EVERY SINGLE title you return MUST be a horror manga. Absolutely NO exceptions. Do NOT return standard action, romance, or general manga if they do not fit the horror category.
- If the user specifies a year, decade, or status, EVERY SINGLE title MUST fit that constraint.
- Do NOT make loose associations. Stick to the literal and semantic meaning of the query. 
- Do NOT try to be helpful by adding popular manga that are outside the query's criteria.

Return a JSON array of strings containing the top 8-12 manga titles matching this query. 
Only return the JSON array, with no other text, markdown formatting, or explanation. 
Example format: ["Berserk", "Monster", "Death Note"]`;
  } else if (cat === 'people') {
    prompt = `You are an extremely strict and aggressive semantic entertainment search assistant. The user is looking for actors/creators matching this query: "${query}". 
YOUR MAIN RULE:
You MUST adhere 100% strictly and aggressively to the user's thoughts, constraints, genres, roles, or characteristics specified in the query. 
- If the user specifies a constraint (e.g. "horror actors", "directors of sci-fi"), EVERY SINGLE name you return MUST strictly fit that description. Absolutely NO exceptions.
- Do NOT make loose associations or return generic famous names that do not fit.

Return a JSON array of strings containing the top 5-8 names of people matching this query. 
Only return the JSON array, with no other text, markdown formatting, or explanation. 
Example format: ["Leonardo DiCaprio", "Christopher Nolan"]`;
  } else if (cat === 'anime') {
    prompt = `You are an extremely strict and aggressive semantic anime search assistant. The user is searching for anime matching this query: "${query}". 
YOUR MAIN RULE:
You MUST adhere 100% strictly and aggressively to the user's thoughts, constraints, genres, moods, themes, or years specified in the query. 
- If the user specifies or implies a category/genre like "horror", EVERY SINGLE title you return MUST be a horror anime series/movie. Absolutely NO exceptions. Do NOT return standard action, romance, or general anime if they do not fit the horror category.
- If the user specifies a year, decade, or studio, EVERY SINGLE title MUST fit that constraint.
- Do NOT make loose associations. Stick to the literal and semantic meaning of the query. 
- Do NOT try to be helpful by adding popular anime that are outside the query's criteria.

Return a JSON array of strings containing the top 8-12 anime series/movie titles matching this query. 
Only return the JSON array, with no other text, markdown formatting, or explanation. 
Example format: ["Attack on Titan", "Death Note", "Spirited Away"]`;
  } else {
    prompt = `You are an extremely strict and aggressive semantic movie and TV show search assistant. The user is searching for content matching this query: "${query}". 
YOUR MAIN RULE:
You MUST adhere 100% strictly and aggressively to the user's thoughts, constraints, genres, moods, themes, or years specified in the query. 
- If the user specifies or implies a category/genre like "horror", EVERY SINGLE title you return MUST be a horror movie or TV show. Absolutely NO exceptions. Do NOT return standard dramas, thrillers, or general movies if they do not fit the horror category.
- If the user specifies a year or decade (e.g. "80s"), EVERY SINGLE title MUST be from that era.
- Do NOT make loose associations. Stick to the literal and semantic meaning of the query. 
- Do NOT try to be helpful by adding popular movies/shows that are outside the query's criteria.

Return a JSON array of strings containing the top 10-15 movie or TV show titles matching this query. 
Only return the JSON array, with no other text, markdown formatting, or explanation. 
Example format: ["Inception", "Interstellar", "Stranger Things"]`;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Gemini API error: ${errorText}` });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean JSON response
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const titles = JSON.parse(cleanedText);

    if (!Array.isArray(titles)) {
      throw new Error('Gemini did not return an array of titles');
    }

    return res.status(200).json({ success: true, results: titles });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to process AI search' });
  }
}
