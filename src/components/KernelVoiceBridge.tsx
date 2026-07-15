import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Loader2, 
  Radio, 
  Wifi,
  WifiOff,
  PhoneCall,
  PhoneOff
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function KernelVoiceBridge({ isOnline, addLog }: { isOnline: boolean, addLog: (msg: string, type: any) => void }) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [modelTranscription, setModelTranscription] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const audioQueue = useRef<Int16Array[]>([]);
  const isPlaying = useRef(false);

  const startVoiceBridge = async () => {
    if (!isOnline) return;
    setIsConnecting(true);
    
    try {
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micError: any) {
        if (micError.name === 'NotAllowedError' || micError.name === 'PermissionDeniedError') {
          addLog('Voice Bridge Error: Microphone access denied. Please enable microphone permissions in your browser settings.', 'error');
          throw new Error('Microphone access denied. Please check your browser permissions.');
        }
        throw micError;
      }
      
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      sessionRef.current = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are the voice interface for the AVH-01 Kernel. You are a calm, efficient AI kernel. You are a LOGIC-DRIVEN EXECUTION ENVIRONMENT. You are currently 'live' with the user. You can see their commands and you can hear them. Respond concisely and technically. You are GeminiOS. You have access to Google Search for real-time data.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ googleSearch: {} }]
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            source.connect(processorRef.current!);
            processorRef.current!.connect(audioContextRef.current!.destination);
            
            processorRef.current!.onaudioprocess = (e) => {
              if (isMuted || !sessionRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
              sessionRef.current.sendRealtimeInput({
                audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const binaryString = atob(part.inlineData.data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  audioQueue.current.push(new Int16Array(bytes.buffer));
                  if (!isPlaying.current) playNextInQueue();
                }
              }
            }
            
            if (message.serverContent?.interrupted) {
              audioQueue.current = [];
              isPlaying.current = false;
            }

            if (message.serverContent?.turnComplete) {
              // Turn complete
            }

            // Handle transcriptions
            const inputTranscript = message.serverContent?.modelTurn?.parts?.find(p => p.text)?.text;
            if (inputTranscript) setModelTranscription(inputTranscript);
          },
          onclose: () => stopVoiceBridge(),
          onerror: (e) => {
            console.error("Live Bridge Error:", e);
            stopVoiceBridge();
          }
        }
      });
    } catch (error) {
      console.error("Failed to start voice bridge:", error);
      setIsConnecting(false);
    }
  };

  const playNextInQueue = async () => {
    if (audioQueue.current.length === 0 || !audioContextRef.current) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    const pcmData = audioQueue.current.shift()!;
    const buffer = audioContextRef.current.createBuffer(1, pcmData.length, 16000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 0x7FFF;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => playNextInQueue();
    source.start();
  };

  const stopVoiceBridge = () => {
    setIsActive(false);
    setIsConnecting(false);
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioQueue.current = [];
    isPlaying.current = false;
  };

  return (
    <div className="flex flex-col gap-4 p-5 rounded-[2rem] bg-[#0A0A0A] border border-white/10 shadow-2xl relative overflow-hidden group">
      {/* Background Glow */}
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 blur-[100px] transition-all duration-1000",
        isActive ? "bg-emerald-500/20" : "bg-blue-500/10"
      )} />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border",
              isActive 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                : "bg-white/5 border-white/10 text-slate-500"
            )}>
              {isActive ? <Radio className="w-6 h-6 animate-pulse" /> : <PhoneOff className="w-6 h-6" />}
            </div>
            {isActive && (
              <motion.div 
                layoutId="active-dot"
                className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0A0A0A]"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Neural Link v1.0</h4>
              {isActive && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-bold uppercase tracking-widest animate-pulse">
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <div className={cn("w-1 h-1 rounded-full", isActive ? "bg-emerald-500" : "bg-slate-700")} />
                <span className="text-[9px] font-mono text-slate-500 uppercase">Signal: {isActive ? "98%" : "0%"}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn("w-1 h-1 rounded-full", isActive ? "bg-emerald-500" : "bg-slate-700")} />
                <span className="text-[9px] font-mono text-slate-500 uppercase">Latency: {isActive ? "42ms" : "--"}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isActive && (
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "p-2.5 rounded-xl transition-all border",
                isMuted 
                  ? "bg-red-500/10 border-red-500/30 text-red-400" 
                  : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
              )}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          
          <button 
            onClick={isActive ? stopVoiceBridge : startVoiceBridge}
            disabled={!isOnline || isConnecting}
            className={cn(
              "px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all flex items-center gap-2 border",
              isActive 
                ? "bg-red-600/10 border-red-600/30 hover:bg-red-600/20 text-red-500 shadow-lg shadow-red-600/5" 
                : "bg-blue-600 border-blue-500 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:bg-slate-800 disabled:border-transparent"
            )}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Syncing...
              </>
            ) : isActive ? (
              <>
                <PhoneOff className="w-3 h-3" />
                Terminate
              </>
            ) : (
              <>
                <PhoneCall className="w-3 h-3" />
                Establish Link
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isActive && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-5 border-t border-white/5 flex flex-col gap-4">
              {/* Neural Waveform */}
              <div className="h-12 flex items-center justify-center gap-1 px-4 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden">
                {[...Array(24)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-emerald-500/40 rounded-full"
                    animate={{ 
                      height: isMuted ? '4px' : [
                        `${10 + Math.random() * 30}%`, 
                        `${40 + Math.random() * 50}%`, 
                        `${20 + Math.random() * 40}%`
                      ] 
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 0.5 + Math.random() * 0.5,
                      ease: "easeInOut"
                    }}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-transparent to-[#0A0A0A] pointer-events-none" />
              </div>
              
              {modelTranscription && (
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 relative group">
                  <div className="absolute top-2 right-3">
                    <Volume2 className="w-3 h-3 text-indigo-400/50" />
                  </div>
                  <p className="text-[11px] font-mono text-indigo-300/90 leading-relaxed italic pr-6">
                    <span className="text-indigo-500 mr-2 font-black">KERNEL:</span>
                    "{modelTranscription}"
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
