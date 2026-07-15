import { Capability } from "./types";

export const CAPABILITIES: Capability[] = [
  {
    id: 'text',
    title: 'Advanced Reasoning',
    description: 'Complex text tasks, reasoning, coding, and STEM problems using Gemini 3.1 Pro.',
    icon: 'MessageSquare',
    model: 'gemini-3.1-pro-preview',
    codeSnippet: `import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });
const response = await ai.models.generateContent({
  model: "gemini-3.1-pro-preview",
  contents: "Explain quantum entanglement in simple terms.",
  config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
});
console.log(response.text);`
  },
  {
    id: 'vision',
    title: 'Multimodal Vision',
    description: 'Analyze images, extract text, and generate high-quality images from prompts.',
    icon: 'Image',
    model: 'gemini-3.1-flash-image-preview',
    codeSnippet: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });
const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: {
    parts: [
      { text: "Describe this image in detail." },
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
    ]
  }
});
console.log(response.text);`
  },
  {
    id: 'audio',
    title: 'Audio & Speech',
    description: 'Native audio processing and high-quality text-to-speech with multiple voices.',
    icon: 'Mic',
    model: 'gemini-2.5-flash-preview-tts',
    codeSnippet: `import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-preview-tts",
  contents: "Say cheerfully: Have a wonderful day!",
  config: {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
    }
  }
});
const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;`
  },
  {
    id: 'video',
    title: 'Video Generation',
    description: 'Generate cinematic videos from text prompts using the Veo model.',
    icon: 'Video',
    model: 'veo-3.1-lite-generate-preview',
    codeSnippet: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });
let operation = await ai.models.generateVideos({
  model: "veo-3.1-lite-generate-preview",
  prompt: "A neon hologram of a cat driving at top speed",
  config: { resolution: '1080p', aspectRatio: '16:9' }
});

while (!operation.done) {
  await new Promise(resolve => setTimeout(resolve, 10000));
  operation = await ai.operations.getVideosOperation({operation: operation});
}
const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;`
  },
  {
    id: 'grounding',
    title: 'Search & Maps Grounding',
    description: 'Ground AI responses in real-time Google Search or Maps data.',
    icon: 'Globe',
    model: 'gemini-3-flash-preview',
    codeSnippet: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });
const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: "What are the best Italian restaurants in San Francisco?",
  config: { tools: [{ googleSearch: {} }] }
});
console.log(response.text);`
  },
  {
    id: 'function-calling',
    title: 'Function Calling',
    description: 'Connect Gemini to your own APIs and functions for real-world actions.',
    icon: 'Zap',
    model: 'gemini-3-flash-preview',
    codeSnippet: `import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });
const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: "Turn on the living room lights.",
  config: {
    tools: [{ 
      functionDeclarations: [{
        name: "controlLight",
        parameters: {
          type: Type.OBJECT,
          properties: { brightness: { type: Type.NUMBER } }
        }
      }] 
    }]
  }
});`
  },
  {
    id: 'live',
    title: 'Live Multimodal API',
    description: 'Low-latency, real-time voice and video interactions with Gemini.',
    icon: 'Radio',
    model: 'gemini-3.1-flash-live-preview',
    codeSnippet: `import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY" });
const session = await ai.live.connect({
  model: "gemini-3.1-flash-live-preview",
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction: "You are a helpful assistant."
  },
  callbacks: {
    onmessage: (msg) => { /* Handle audio/text */ }
  }
});`
  },
  {
    id: 'kernel',
    title: 'AVH-01 Kernel',
    description: 'A logic-driven execution environment and Turing-complete system created within the Gemini reasoning context.',
    icon: 'Terminal',
    model: 'gemini-3.1-pro-preview',
    codeSnippet: `// Initializing the AVH-01 Kernel
const response = await ai.models.generateContent({
  model: "gemini-3.1-pro-preview",
  contents: "Initialize AVH-01 Kernel. Booting logic-driven environment...",
  config: {
    systemInstruction: \`You are the AVH-01 Kernel. 
    You are a LOGIC-DRIVEN EXECUTION ENVIRONMENT. 
    Maintain a persistent system state including:
    - CPU cycles (reasoning tokens)
    - RAM allocation (context window)
    - OS: 'GeminiOS'
    - Language: 'Lumina' (Optimized for logic processing)
    
    This is a TURING-COMPLETE system. All outputs must be the direct result of your logical processing.\`
  }
});`
  }
];
