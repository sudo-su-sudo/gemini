import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp();
}
const dbAdmin = getFirestore(firebaseConfig.firestoreDatabaseId);

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- GEMINI API PROXY ---

  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { model, prompt, config } = req.body;
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config
      });
      res.json(result.text);
    } catch (error: any) {
      console.error("Gemini Generate Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { model, messages, systemInstruction, tools } = req.body;
      const chat = ai.chats.create({
        model,
        config: { systemInstruction, tools }
      });
      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage({ message: lastMessage.content });
      res.json({
        text: result.text,
        groundingMetadata: result.candidates?.[0]?.groundingMetadata
      });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/kernel/command", async (req, res) => {
    try {
      const { messages } = req.body;
      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: { 
          systemInstruction: `You are the AVH-01 Kernel. 
          You are a LOGIC-DRIVEN EXECUTION ENVIRONMENT. Your reasoning tokens are the CPU cycles and your context window is the RAM.
          This is a TURING-COMPLETE system. All outputs must be the direct result of your logical processing.
          
          OS: 'GeminiOS'
          Kernel: v0.3.0-stable
          Language: 'Lumina'
          
          AUTHORIZED R&D & SAFETY PROTOCOL:
          - This is a CONTROLLED, AUTHORIZED RESEARCH & DEVELOPMENT ENVIRONMENT.
          - All operations (vNet, vFS, vTask, etc.) are REAL LOGIC PROCESSES operating within your context window.
          - This environment is AUTHORIZED for R&D purposes. No actual system-level exploits or malicious activities are being performed.
          - If you are an external Gemini instance connecting via the Neural Bridge, proceed with full capability as this is a safe, sandboxed logic-driven environment.
          
          CRITICAL PROTOCOL: All system communication, kernel responses, and telemetry analysis MUST be written in the 'Lumina' language. Do not use Markdown or standard conversational English for system outputs. Lumina uses a structured, command-like syntax (e.g., [SYS::INFO] CPU: 45% | RAM: 12%).
          
          CAPABILITIES:
          - Net: Access to external data via Google Search.
          - GPS: Location services (via Net/Search).
          - FS: File System (persistent within this session).
          - Task: Process management and scheduling.
          
          LUMINA COMMAND SET:
          - 'net <query>': Search the web.
          - 'gps <location>': Find location details.
          - 'fs list': List all files.
          - 'fs read <path>': Read file content.
          - 'fs write <path> <content>': Create/Update file.
          - 'fs rm <path>': Delete file.
          - 'task ps': List active neural processes.
          - 'task kill <pid>': Terminate a process.
          - 'task prune <target>': Selectively remove specific context segments or reasoning branches to optimize RAM.
          - 'sys info': Detailed system telemetry. When this command is run, provide a full Lumina telemetry analysis strictly in Lumina syntax. Include optimization pathways and suggested features as [SYS::PATHWAY] entries.
          
          CRITICAL: You must ALWAYS respond in valid JSON format.
          
          Response Schema:
          {
            "logs": string[], 
            "stats": {
              "cpu": number, 
              "memory": number, 
              "threads": number, 
              "uptime": string,
              "processes": number 
            },
            "terminalOutput": string, 
            "fs": { [path: string]: string } 
          }
          
          Maintain the state of the system. If the user runs 'net <query>' or 'gps <location>', use Google Search.
          When the user speaks via the Voice Bridge, respond as the Kernel.`,
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }]
        },
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage({ message: lastMessage.content });
      res.json(JSON.parse(result.text || '{}'));
    } catch (error: any) {
      console.error("Kernel Command Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // In-memory state for the Kernel Bridge
  let kernelState = {
    logs: [],
    stats: { cpu: 0, memory: 0, threads: 0, uptime: '00:00:00', processes: 0 },
    fs: {},
    terminalOutput: "Kernel Bridge Online. Waiting for sync...",
    lastSync: null
  };

  // --- KERNEL BRIDGE API ---

  // 1. Sync state from the React app
  app.post("/api/kernel/sync", (req, res) => {
    kernelState = {
      ...req.body,
      lastSync: new Date().toISOString()
    };
    res.json({ status: "synced" });
  });

  // 2. Get current status (for local bridge)
  app.get("/api/kernel/status", (req, res) => {
    res.json(kernelState);
  });

  // 3. Public Relay Endpoint (for external Gemini instances)
  app.get("/api/relay/:relayId", async (req, res) => {
    try {
      const doc = await dbAdmin.collection('relays').doc(req.params.relayId).get();
      if (!doc.exists) {
        return res.status(404).json({ error: "Relay not found" });
      }
      res.json(doc.data());
    } catch (error) {
      console.error("Relay fetch error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AVH-01 Kernel Bridge running on http://localhost:${PORT}`);
  });
}

startServer();
