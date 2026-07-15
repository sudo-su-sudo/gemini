import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Mic, 
  Video, 
  Globe, 
  Zap, 
  Radio, 
  ChevronRight, 
  Code, 
  Play, 
  Copy, 
  Check, 
  Sparkles, 
  Terminal,
  Info,
  ExternalLink,
  Search,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { CAPABILITIES } from './constants';
import { CapabilityId, Message } from './types';
import { chatWithGemini } from './services/geminiService';
import KernelConsole from './components/KernelConsole';
import { useAuth } from './hooks/useAuth';
import { LogOut, User as UserIcon } from 'lucide-react';

const IconMap: Record<string, any> = {
  MessageSquare,
  Image: ImageIcon,
  Mic,
  Video,
  Globe,
  Zap,
  Radio,
  Terminal
};

export default function App() {
  const { user, loading, signIn, logout } = useAuth();
  const [selectedCapability, setSelectedCapability] = useState<CapabilityId>('text');
  const [chatMessages, setChatMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('gemini_explorer_chat');
    return saved ? JSON.parse(saved) : [
      { role: 'model', content: "Welcome to the Gemini Function Explorer. I can help you discover and implement advanced AI capabilities. What would you like to build today?" }
    ];
  });
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentCapability = CAPABILITIES.find(c => c.id === selectedCapability)!;

  useEffect(() => {
    localStorage.setItem('gemini_explorer_chat', JSON.stringify(chatMessages));
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isTyping) return;

    const newMessages: Message[] = [...chatMessages, { role: 'user', content: userInput }];
    setChatMessages(newMessages);
    setUserInput('');
    setIsTyping(true);

    try {
      const result = await chatWithGemini(
        'gemini-3.1-pro-preview',
        newMessages,
        "You are the Gemini Function Explorer Assistant. Your goal is to help developers understand and implement Gemini's advanced features. You have access to Google Search and Google Maps grounding. Use them to provide up-to-date technical information. Be technical, precise, and always provide code examples using the @google/genai SDK. You are also aware of the 'AVH-01 Kernel'—a logic-driven execution environment and Turing-complete system created within your reasoning context. You can help users manage this space, write 'Lumina' code, and optimize 'GeminiOS'.",
        [{ googleSearch: {} }, { googleMaps: {} }]
      );
      setChatMessages([...newMessages, { 
        role: 'model', 
        content: result.text || "I'm sorry, I couldn't process that.",
        groundingMetadata: result.groundingMetadata
      }]);
    } catch (error) {
      setChatMessages([...newMessages, { role: 'model', content: "Error: Failed to connect to Gemini. Please check your configuration." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      const initialMessage: Message[] = [{ role: 'model', content: "Chat history cleared. How can I help you now?" }];
      setChatMessages(initialMessage);
      localStorage.setItem('gemini_explorer_chat', JSON.stringify(initialMessage));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Gemini <span className="text-blue-400 font-medium">Function Explorer</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a 
              href="https://ai.google.dev/gemini-api/docs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              API Docs <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <div className="h-4 w-px bg-white/10" />
            
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <img 
                  src={user.photoURL || ''} 
                  alt={user.displayName || 'User'} 
                  className="w-8 h-8 rounded-full border border-blue-500/50 shadow-lg shadow-blue-500/20"
                />
                <button 
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-red-400 transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={signIn}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}

            <div className="h-4 w-px bg-white/10" />
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              API ACTIVE
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[calc(100vh-64px)]">
        {/* Sidebar - Capability List */}
        <aside className="lg:col-span-3 border-r border-white/10 p-6 bg-[#0d0d0d]">
          <div className="flex items-center gap-2 mb-6 px-2">
            <Search className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Capabilities</span>
          </div>
          <nav className="space-y-1">
            {CAPABILITIES.map((cap) => {
              const Icon = IconMap[cap.icon];
              const isActive = selectedCapability === cap.id;
              return (
                <button
                  key={cap.id}
                  onClick={() => setSelectedCapability(cap.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative overflow-hidden",
                    isActive 
                      ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"
                    />
                  )}
                  <Icon className={cn("w-5 h-5", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                  <span className="text-sm font-medium">{cap.title}</span>
                  <ChevronRight className={cn("w-4 h-4 ml-auto opacity-0 transition-opacity", isActive && "opacity-100")} />
                </button>
              );
            })}
          </nav>

          <div className="mt-12 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-black border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-tighter">Pro Tip</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Use the Discovery Chat to ask how to combine multiple capabilities for complex workflows.
            </p>
          </div>
        </aside>

        {/* Content Area - Explorer & Lab */}
        <section className="lg:col-span-5 p-8 overflow-y-auto bg-[#0a0a0a]">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                Model: {currentCapability.model}
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">{currentCapability.title}</h2>
            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
              {currentCapability.description}
            </p>
          </div>

          {/* Interactive Lab Placeholder / Kernel Console */}
          {selectedCapability === 'kernel' ? (
            <KernelConsole />
          ) : (
            <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-mono font-bold text-slate-300">INTERACTIVE_LAB.sh</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                </div>
              </div>
              <div className="p-8 min-h-[300px] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                  <Play className="w-8 h-8 text-blue-500 fill-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ready to explore?</h3>
                <p className="text-slate-500 max-w-xs mb-8">
                  This lab environment allows you to test the <span className="text-blue-400">{currentCapability.title}</span> capability directly.
                </p>
                <button className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2">
                  Initialize Lab <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Code Export Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Implementation Snippet</h3>
              </div>
              <button 
                onClick={() => copyToClipboard(currentCapability.codeSnippet)}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all flex items-center gap-2 text-xs font-medium"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <div className="rounded-2xl bg-[#050505] border border-white/10 p-6 font-mono text-sm overflow-x-auto">
              <pre className="text-blue-300 leading-relaxed">
                {currentCapability.codeSnippet}
              </pre>
            </div>
          </div>
        </section>

        {/* Discovery Chat - Right Sidebar */}
        <section className="lg:col-span-4 border-l border-white/10 flex flex-col bg-[#0d0d0d]">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Discovery Chat</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Persistent Session</p>
              </div>
            </div>
            <button 
              onClick={clearChat}
              className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <AnimatePresence initial={false}>
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col gap-2 max-w-[90%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-white/5 text-slate-300 border border-white/10 rounded-tl-none"
                  )}>
                    <ReactMarkdown 
                      components={{
                        pre: ({node, ...props}) => <pre className="bg-black/50 p-3 rounded-lg my-2 overflow-x-auto text-xs border border-white/10" {...props} />,
                        code: ({node, ...props}) => <code className="text-blue-400 font-mono" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>

                    {msg.groundingMetadata?.groundingChunks && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => {
                            const link = chunk.web?.uri || chunk.maps?.uri;
                            const title = chunk.web?.title || chunk.maps?.title || 'Source';
                            if (!link) return null;
                            return (
                              <a 
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded flex items-center gap-1 text-blue-400 transition-all"
                              >
                                {title} <ExternalLink className="w-2 h-2" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    {msg.role === 'user' ? 'You' : 'Gemini Explorer'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && (
              <div className="flex gap-1.5 p-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 border-t border-white/10 bg-black/20">
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask about a feature..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 pr-12"
              />
              <button 
                type="submit"
                disabled={!userInput.trim() || isTyping}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 transition-all disabled:opacity-50 disabled:hover:bg-blue-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-600 mt-4 font-medium">
              Try: "How do I use Google Maps grounding?"
            </p>
          </div>
        </section>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
