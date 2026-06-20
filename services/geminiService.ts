
import { GoogleGenAI, Type } from "@google/genai";
import { DateIdea } from "../types";

// Helper to initialize Gemini with the API key from environment
const getAI = () => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  return new GoogleGenAI({
    apiKey: key || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

/**
 * Generates a thought-provoking daily question for a couple to answer.
 */
export const generateDailyQuestion = async (): Promise<string> => {
  try {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      console.warn("Gemini API key is not configured.");
      return "Wat is je favoriete herinnering aan ons?";
    }
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Bedenk een originele, diepgaande of grappige vraag voor een koppel om elkaar beter te leren kennen. Antwoord alleen met de vraag zelf in het Nederlands.',
    });
    return response.text?.trim() || "Wat is je favoriete herinnering aan ons?";
  } catch (error) {
    console.error("Gemini daily question error:", error);
    return "Wat is je favoriete herinnering aan ons?";
  }
};

/**
 * Generates structured date ideas using Gemini with a specific JSON schema.
 */
export const generateDateIdeas = async (city: string, vibe: string, budget: string): Promise<DateIdea[]> => {
  try {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      console.warn("Gemini API key is not configured.");
      return [
        {
          title: "Romantische Wandeling",
          description: `Een heerlijke wandeling in ${city || 'het park'} met de sfeer: ${vibe}.`,
          estimatedCost: budget,
          locationType: "Buiten",
          romanticTip: "Neem een thermoskan warme chocolademelk of een flesje wijn mee!"
        }
      ];
    }
    const ai = getAI();
    const prompt = `Genereer 3 unieke date ideeën voor een koppel.
      Stad/Locatie: ${city || 'een willekeurige stad'}
      Sfeer: ${vibe}
      Budget: ${budget}
      Taal: Nederlands.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedCost: { type: Type.STRING },
              locationType: { type: Type.STRING },
              romanticTip: { type: Type.STRING },
            },
            required: ["title", "description", "estimatedCost", "locationType", "romanticTip"],
          },
        },
      },
    });

    const jsonStr = response.text || "[]";
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini date ideas error:", error);
    return [];
  }
};

/**
 * Generates a creative love letter based on user-provided keywords and tone.
 */
export const generateLoveLetter = async (
  partnerName: string, 
  tone: string, 
  language: 'English' | 'Dutch', 
  keywords: string
): Promise<string> => {
  try {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      console.warn("Gemini API key is not configured.");
      return `Lieve ${partnerName},\n\nIk denk aan je en wou je laten weten hoe belangrijk je voor me bent.\n\nLiefs.`;
    }
    const ai = getAI();
    const prompt = `Schrijf een persoonlijke liefdesbrief voor ${partnerName || 'mijn partner'}.
      Toon: ${tone}
      Taal: ${language}
      Trefwoorden: ${keywords || 'onze liefde'}
      Zorg dat de brief ontroerend en oprecht is.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview', // High-quality writing task
      contents: prompt,
    });

    return response.text || "Ik hou van je!";
  } catch (error) {
    console.error("Gemini love letter error:", error);
    return "Ik hou van je met heel mijn hart.";
  }
};

/**
 * Generates a short sweet note for the sticky board.
 */
export const generateSweetNote = async (): Promise<string> => {
  try {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      console.warn("Gemini API key is not configured.");
      return "Ik hou van je!";
    }
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Schrijf een kort en krachtig liefdesberichtje (max 10 woorden). Nederlands.',
    });
    return response.text?.trim() || "Ik hou van je!";
  } catch (error) {
    return "Ik hou van je!";
  }
};
