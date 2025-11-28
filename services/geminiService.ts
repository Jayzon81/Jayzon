
import { GoogleGenAI, Type } from "@google/genai";
import { ImageAspectRatio, VideoResolution, TrainingExample, ChatMessage } from "../types";

// Helper to get fresh client instance to ensure latest key is used
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Retry configuration
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 20; // Significantly increased to allow "unlimited" feel by waiting out quotas
const MAX_BACKOFF_MS = 10000; // Cap wait time at 10 seconds per retry

// Generic retry wrapper for API calls
const withRetry = async <T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = RETRY_DELAY_MS): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = 
      retries > 0 && (
        error?.status === 429 || 
        error?.status === 503 || 
        error?.message?.includes('429') || 
        error?.message?.includes('503') ||
        error?.message?.includes('quota') || 
        error?.message?.includes('limit') ||
        error?.message?.includes('QuotaExceeded')
      );

    if (isRetryable) {
      console.warn(`API call hit rate limit. Retrying in ${delay}ms... (Attempts left: ${retries})`);
      await new Promise(r => setTimeout(r, delay));
      // Exponential backoff with cap
      const nextDelay = Math.min(delay * 1.5, MAX_BACKOFF_MS);
      return withRetry(fn, retries - 1, nextDelay); 
    }
    throw error;
  }
};

export const checkApiKey = async (): Promise<boolean> => {
  const aistudio = (window as any).aistudio;
  if (!aistudio) return false;
  return await aistudio.hasSelectedApiKey();
};

export const promptForKeySelection = async (): Promise<void> => {
  const aistudio = (window as any).aistudio;
  if (aistudio) {
    await aistudio.openSelectKey();
  }
};

export const generateImage = async (
  prompt: string,
  aspectRatio: ImageAspectRatio,
  highQuality: boolean = false
): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient();
    const model = highQuality ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";

    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio,
      },
    };

    if (highQuality) {
      config.imageConfig.imageSize = "2K"; // Request higher res for pro model
    }

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: prompt }],
      },
      config,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated.");
  });
};

export const editImage = async (
  base64Image: string,
  prompt: string,
  mimeType: string,
  highQuality: boolean = false,
  aspectRatio: ImageAspectRatio = ImageAspectRatio.SQUARE
): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient();
    // Use Pro model for high quality edits (Upscale/Remaster)
    const model = highQuality ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";

    const config: any = {};
    
    // For Pro model, we can specify size and aspect ratio
    if (highQuality) {
      config.imageConfig = {
        imageSize: "2K",
        aspectRatio: aspectRatio
      };
    } else {
      // Flash model also supports aspect ratio
      config.imageConfig = {
        aspectRatio: aspectRatio
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: Object.keys(config).length > 0 ? config : undefined,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image generated.");
  });
};

export const generateVideo = async (
  prompt: string,
  resolution: VideoResolution,
  aspectRatio: string,
  referenceImages?: string[],
  startImage?: string
): Promise<string> => {
  const ai = getClient();
  
  // Logic: 
  // 1. If referenceImages exist -> Use veo-3.1-generate-preview (consistency)
  // 2. If startImage exists -> Use veo-3.1-fast-generate-preview (animation)
  // 3. Default -> veo-3.1-fast-generate-preview
  
  const hasRefs = referenceImages && referenceImages.length > 0;
  
  const model = hasRefs ? "veo-3.1-generate-preview" : "veo-3.1-fast-generate-preview";

  const config: any = {
    numberOfVideos: 1,
    resolution: hasRefs ? '720p' : resolution, // Ref images require 720p currently
    aspectRatio: hasRefs ? '16:9' : aspectRatio, // Ref images require 16:9 currently
  };

  const options: any = {
    model,
    prompt: prompt || (startImage ? "Animate this image" : "A cinematic video"), // Prompt is optional for startImage but usually good to have
    config,
  };

  if (hasRefs) {
    // Take up to 3 images
    const refsToUse = referenceImages!.slice(0, 3);
    config.referenceImages = refsToUse.map(img => ({
      image: {
        imageBytes: img,
        mimeType: 'image/png'
      },
      referenceType: 'ASSET' // This locks the character visual
    }));
  } else if (startImage) {
    // Image to Video
    options.image = {
        imageBytes: startImage,
        mimeType: 'image/png' // Assuming png/jpeg converted to base64
    };
  }

  let operation: any = await withRetry(() => ai.models.generateVideos(options));

  // Polling loop
  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5s
    // Also retry the polling operation in case of transient network issues
    operation = await withRetry(() => ai.operations.getVideosOperation({ operation }));
  }

  const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) throw new Error("Video generation failed or returned no URI.");

  // Fetch the actual video bytes using the key
  const videoResponse = await fetch(`${uri}&key=${process.env.API_KEY}`);
  if (!videoResponse.ok) throw new Error("Failed to download generated video.");
  
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};

export const analyzeMedia = async (
  base64Data: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient();
    const model = "gemini-2.5-flash"; // Good balance for analysis

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          { text: prompt || "Describe this media in detail." },
        ],
      },
    });

    return response.text || "No analysis available.";
  });
};

export const generateStoryboardPlan = async (prompt: string): Promise<string[]> => {
  return withRetry(async () => {
    const ai = getClient();
    const model = "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model,
      contents: `Create a 4-panel storyboard plan for the following story: "${prompt}". 
      Return ONLY a JSON array of strings, where each string describes one panel visually.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    try {
      const text = response.text;
      return JSON.parse(text || "[]");
    } catch (e) {
      console.error("Failed to parse storyboard plan", e);
      return ["Scene 1", "Scene 2", "Scene 3", "Scene 4"];
    }
  });
};

export const chatWithCustomModel = async (
  modelConfig: { systemInstruction: string; examples: TrainingExample[] },
  history: ChatMessage[],
  newMessage: string
): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient();
    const model = "gemini-2.5-flash";

    // Prepare history with few-shot examples prepended
    const historyContent: any[] = [];
    
    // Add examples as history turns for few-shot learning
    modelConfig.examples.forEach(ex => {
      historyContent.push({ role: 'user', parts: [{ text: ex.input }] });
      historyContent.push({ role: 'model', parts: [{ text: ex.output }] });
    });

    // Add actual chat history
    history.forEach(msg => {
      historyContent.push({
        role: msg.role,
        parts: [{ text: msg.text }]
      });
    });

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: modelConfig.systemInstruction,
      },
      history: historyContent
    });

    const response = await chat.sendMessage({ message: newMessage });
    return response.text || "";
  });
};

export const optimizeSystemInstruction = async (instruction: string): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient();
    const model = "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: `Optimize this system instruction for an AI persona to be more distinct, consistent, and effective. Keep the core intent. Return only the new instruction text.\n\nOriginal: "${instruction}"` }]
      }
    });

    return response.text?.trim() || instruction;
  });
};

export const analyzeCharacterReferences = async (base64Images: string[]): Promise<string> => {
  return withRetry(async () => {
    const ai = getClient();
    const model = "gemini-2.5-flash";

    const parts: any[] = base64Images.map(b64 => ({
      inlineData: {
        mimeType: "image/png",
        data: b64
      }
    }));
    
    parts.push({ text: `You are an expert character concept artist. Your task is to create a 'Visual Consistency Prompt' for this character based on the uploaded reference images.
  
  1. ANALYZE the images to find INVARIANT traits (traits present in all images).
  2. IGNORE background, lighting, and pose (unless they are constant).
  3. EXTRACT the following details:
     - Exact Hair style and color (e.g. "messy platinum blonde bob cut").
     - Facial structure and features (e.g. "sharp cheekbones, cybernetic left eye, scar on chin").
     - Distinctive Clothing/Armor (e.g. "neon orange bomber jacket with dragon patch").
     - Art Style/Medium (e.g. "3D render, octane style" or "loose watercolor").
  4. OUTPUT a single, dense paragraph of visual descriptors, formatted as an image generation prompt. Do not use conversational language. Focus on physical description.` });

    const response = await ai.models.generateContent({
      model,
      contents: { parts }
    });

    return response.text?.trim() || "A character with consistent features.";
  });
};

export const autoTrainCharacter = async (
  name: string,
  description: string,
  visualSeed?: string
): Promise<{
  systemInstruction: string;
  consistencyContext: string;
  examples: TrainingExample[];
}> => {
  return withRetry(async () => {
    const ai = getClient();
    const model = "gemini-2.5-flash";
    
    const prompt = `Create a detailed character persona for "${name}": ${description}. ${visualSeed ? `Visuals: ${visualSeed}` : ''}
    Output JSON with:
    - systemInstruction: A detailed instruction describing the character's personality, backstory, and voice.
    - consistencyContext: A dense image generation prompt describing the character's visual appearance. Format: [Subject Description, Face, Hair] + [Outfit, Accessories] + [Art Style]. Do not include generic poses.
    - examples: array of 3 dialogue examples.`;

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            systemInstruction: { type: Type.STRING },
            consistencyContext: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  output: { type: Type.STRING },
                }
              }
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    
    // Add IDs to examples
    const examples = (json.examples || []).map((ex: any, i: number) => ({
      id: `${Date.now()}-${i}`,
      input: ex.input || "",
      output: ex.output || ""
    }));

    return {
      systemInstruction: json.systemInstruction || "",
      consistencyContext: json.consistencyContext || "",
      examples
    };
  });
};
