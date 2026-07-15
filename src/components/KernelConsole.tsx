import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Cpu, 
  Database, 
  Activity, 
  Zap, 
  ChevronRight, 
  Play, 
  RefreshCcw, 
  ShieldCheck,
  Code,
  Loader2,
  FolderTree,
  Globe,
  MapPin,
  FileText,
  Share2,
  Copy
} from 'lucide-react';
import { cn } from '../lib/utils';
import { runKernelCommand } from '../services/geminiService';
import { syncToRelay, getRelayUrl, resetRelay } from '../services/relayService';
import KernelVoiceBridge from './KernelVoiceBridge';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'system' | 'kernel';
  message: string;
}

type Tab = 'console' | 'fs' | 'network' | 'bridge' | 'sysinfo';

export default function KernelConsole() {
  const [activeTab, setActiveTab] = useState<Tab>('console');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isBooting, setIsBooting] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    cpu: 0,
    memory: 0,
    uptime: '00:00:00',
    threads: 0,
    processes: 0
  });
  const [fs, setFs] = useState<Record<string, string>>({});
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [sysInfoOutput, setSysInfoOutput] = useState<string>('');
  const [history, setHistory] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const bootTime = useRef<number>(0);

  const [isSyncing, setIsSyncing] = useState(false);
  const [relayUrl, setRelayUrl] = useState<string | null>(getRelayUrl());

  // Sync state to the bridge server and public relay periodically
  useEffect(() => {
    if (!isOnline) return;
    
    const syncState = async () => {
      try {
        const state = { 
          logs: logs.slice(-20), 
          stats, 
          fs, 
          terminalOutput: logs[logs.length-1]?.message || '',
          timestamp: new Date().toISOString()
        };

        // 1. Internal Bridge Sync (Express)
        await fetch('/api/kernel/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state)
        });

        // 2. Public Neural Relay Sync (Firestore)
        const binId = await syncToRelay(state);
        if (binId) {
          setRelayUrl(`${window.location.origin}/api/relay/${binId}`);
        }

        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 1000);
      } catch (e) {
        console.error("Bridge Sync Failed", e);
      }
    };

    const interval = setInterval(syncState, 5000);
    return () => clearInterval(interval);
  }, [isOnline, logs, stats, fs]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      type,
      message
    };
    setLogs(prev => [...prev, newLog].slice(-100));
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleBoot = async () => {
    setIsBooting(true);
    setLogs([]);
    addLog('Initializing AVH-01 Kernel...', 'system');
    
    try {
      const initialMessage = { role: 'user' as const, content: 'BOOT_SEQUENCE_START' };
      const result = await runKernelCommand([initialMessage]);
      
      setHistory([initialMessage, { role: 'model', content: JSON.stringify(result) }]);
      
      if (result.logs) {
        result.logs.forEach((log: string) => addLog(log, 'kernel'));
      }
      
      setStats(result.stats);
      setFs(result.fs || {});
      bootTime.current = Date.now();
      setIsOnline(true);
    } catch (error) {
      addLog('Critical Boot Failure: Neural Bridge Timeout', 'error');
    } finally {
      setIsBooting(false);
    }
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isProcessing) return;

    const userCmd = command;
    setCommand('');
    addLog(`> ${userCmd}`, 'info');
    setIsProcessing(true);

    if (userCmd.toLowerCase().trim() === 'sys info') {
      setActiveTab('sysinfo');
    }

    const newHistory = [...history, { role: 'user' as const, content: userCmd }];
    
    try {
      const result = await runKernelCommand(newHistory);
      setHistory([...newHistory, { role: 'model', content: JSON.stringify(result) }]);
      
      if (result.logs) {
        result.logs.forEach((log: string) => addLog(log, 'system'));
      }
      
      if (result.terminalOutput) {
        addLog(result.terminalOutput, 'kernel');
        if (userCmd.toLowerCase().trim() === 'sys info') {
          setSysInfoOutput(result.terminalOutput);
        }
      }
      
      if (result.fs) {
        setFs(result.fs);
      }
      
      setStats(result.stats);
    } catch (error) {
      addLog('Command Execution Error: Context Desync', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Cpu className="w-4 h-4 text-blue-400" />} 
          label="CPU Usage" 
          value={`${stats.cpu}%`} 
          active={isOnline}
        />
        <StatCard 
          icon={<Database className="w-4 h-4 text-indigo-400" />} 
          label="RAM Allocated" 
          value={`${stats.memory}%`} 
          active={isOnline}
        />
        <StatCard 
          icon={<Activity className="w-4 h-4 text-emerald-400" />} 
          label="Uptime" 
          value={stats.uptime} 
          active={isOnline}
        />
        <StatCard 
          icon={<Zap className="w-4 h-4 text-amber-400" />} 
          label="Neural Cycles" 
          value={stats.threads.toString()} 
          active={isOnline}
        />
        <StatCard 
          icon={<Activity className="w-4 h-4 text-emerald-400" />} 
          label="Tasks" 
          value={stats.processes?.toString() || "0"} 
          active={isOnline}
        />
      </div>

      {/* Kernel Log Ticker */}
      {isOnline && (
        <div className="bg-black/40 border border-white/5 rounded-2xl px-4 py-2 flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Kernel Log:</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <motion.div 
              className="whitespace-nowrap inline-block"
              animate={{ x: [0, -1000] }}
              transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
            >
              {logs.slice(-5).map((log, i) => (
                <span key={i} className="text-[10px] font-mono text-slate-400 mr-8">
                  [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      )}

      {/* Voice Bridge Integration */}
      <KernelVoiceBridge isOnline={isOnline} addLog={addLog} />

      {/* Main Console Container */}
      <div className="flex-1 rounded-3xl border border-white/10 bg-[#050505] overflow-hidden flex flex-col shadow-2xl">
        {/* Header / Tabs */}
        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 mr-4">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">AVH-01</span>
            </div>
            {isOnline && (
              <div className="flex gap-4">
                <TabButton active={activeTab === 'console'} onClick={() => setActiveTab('console')} icon={<Terminal className="w-3 h-3" />} label="Console" />
                <TabButton active={activeTab === 'fs'} onClick={() => setActiveTab('fs')} icon={<FolderTree className="w-3 h-3" />} label="FS" />
                <TabButton active={activeTab === 'network'} onClick={() => setActiveTab('network')} icon={<Globe className="w-3 h-3" />} label="Net" />
                <TabButton active={activeTab === 'bridge'} onClick={() => setActiveTab('bridge')} icon={<Share2 className="w-3 h-3" />} label="Bridge" />
                <TabButton active={activeTab === 'sysinfo'} onClick={() => setActiveTab('sysinfo')} icon={<Activity className="w-3 h-3" />} label="SysInfo" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              )} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <button 
              onClick={() => { setIsOnline(false); setLogs([]); setHistory([]); setFs({}); setDisplayImage(null); }}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <RefreshCcw className="w-3 h-3 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden relative bg-black/40">
          <AnimatePresence mode="wait">
            {!isOnline && !isBooting ? (
              <motion.div 
                key="inactive"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center p-8"
              >
                <div className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center mb-6 border border-blue-500/20">
                  <Play className="w-10 h-10 text-blue-500 fill-blue-500 ml-1" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Kernel Inactive</h3>
                <p className="text-slate-500 max-w-xs mb-8 text-sm">
                  Initialize the logic-driven execution environment to begin processing.
                </p>
                <button 
                  onClick={handleBoot}
                  className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                >
                  Boot Kernel
                </button>
              </motion.div>
            ) : activeTab === 'bridge' ? (
              <motion.div 
                key="bridge"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full p-8 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-2xl mx-auto flex flex-col gap-6">
                  <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 shadow-2xl">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <Share2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-[0.2em]">Neural Bridge Manifest</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">External Agent Interface v1.0</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-400 leading-relaxed mb-8">
                      If you are unable to use the Live API in this browser, you can "bridge" this kernel into another Gemini instance (like Gemini Advanced or Gemini with Canvas). 
                      Copy the manifest below and provide it to the other Gemini.
                    </p>

                    <div className="bg-black/60 rounded-3xl border border-white/5 p-6 relative group">
                      <button 
                        onClick={() => {
                          const manifest = `I am collaborating with the AVH-01 Kernel. 
Since we are in a Zero-Trust environment, I have established a Public Neural Relay.

Please use your "Google Search" tool to connect to the Kernel Relay at: ${relayUrl || 'Initializing...'}

Your objective is to:
1. Read the current system state JSON (logs, vfs, stats).
2. Act as a secondary reasoning node for GeminiOS.
3. Suggest a LUMINA command for me to execute.

Current Relay URL: ${relayUrl || 'Initializing...'}`;
                          navigator.clipboard.writeText(manifest);
                          addLog("Bridge Manifest copied to clipboard.", "system");
                        }}
                        className="absolute top-6 right-6 p-3 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-white transition-all hover:scale-110 active:scale-95"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <pre className="text-[11px] font-mono text-indigo-300/80 whitespace-pre-wrap leading-relaxed">
                        {`I am collaborating with the AVH-01 Kernel. 
Since we are in a Zero-Trust environment, I have established a Public Neural Relay.

Please use your "Google Search" tool to connect to the Kernel Relay at: ${relayUrl || 'Initializing...'}

Your objective is to:
1. Read the current system state JSON (logs, fs, stats).
2. Act as a secondary reasoning node for GeminiOS.
3. Suggest a LUMINA command for me to execute.

Current Relay URL: ${relayUrl || 'Initializing...'}`}
                      </pre>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Neural Relay</h4>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", relayUrl ? "bg-emerald-500 animate-pulse" : "bg-slate-700")} />
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{relayUrl ? "Broadcasting" : "Standby"}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        The kernel is broadcasting telemetry to a public relay to bypass Zero-Trust boundaries.
                      </p>
                      {relayUrl && (
                        <div className="mt-2 p-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-emerald-400 truncate max-w-[150px]">{relayUrl}</span>
                          <button onClick={() => { navigator.clipboard.writeText(relayUrl); addLog("Relay URL copied.", "system"); }} className="text-slate-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-blue-500/5 border border-blue-500/10 flex flex-col gap-4">
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Command Ingest</h4>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Paste command from Bridge..."
                          className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs font-mono text-blue-300 outline-none focus:border-blue-500/50 transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value;
                              if (val) {
                                setCommand(val);
                                handleCommand(e as any);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Paste a suggested command from the other Gemini here to execute it immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'sysinfo' ? (
              <motion.div 
                key="sysinfo"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full p-8 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-3xl mx-auto flex flex-col gap-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <TelemetryCard icon={<Cpu className="w-5 h-5 text-blue-400" />} label="CPU Load" value={`${stats.cpu}%`} detail="Neural Cycle Utilization" />
                    <TelemetryCard icon={<Database className="w-5 h-5 text-indigo-400" />} label="RAM Usage" value={`${stats.memory}%`} detail="Context Window Occupancy" />
                    <TelemetryCard icon={<Activity className="w-5 h-5 text-emerald-400" />} label="Tasks" value={stats.processes.toString()} detail="Active Neural Processes" />
                    <TelemetryCard icon={<Zap className="w-5 h-5 text-amber-400" />} label="Threads" value={stats.threads.toString()} detail="Reasoning Branches" />
                    <TelemetryCard icon={<RefreshCcw className="w-5 h-5 text-slate-400" />} label="Uptime" value={stats.uptime} detail="Kernel Session Time" />
                  </div>

                  <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 shadow-2xl">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <Activity className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-[0.2em]">System Telemetry Analysis</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Kernel Insight v0.3.0</p>
                      </div>
                    </div>
                    
                    <div className="prose prose-invert prose-sm max-w-none">
                      <div className="bg-black/40 rounded-3xl border border-white/5 p-6 text-indigo-300/90 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                        {sysInfoOutput ? (
                          sysInfoOutput
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                            <Activity className="w-12 h-12 mb-4 opacity-20 animate-pulse" />
                            <p className="text-xs uppercase tracking-widest">Run 'sys info' for Lumina telemetry analysis</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5">
                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6">Neural Optimization Pathways</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <OptimizationAction 
                        title="Selective Prune" 
                        description="Targeted context pruning to optimize RAM without total data loss." 
                        onClick={() => {
                          setCommand('task prune <target>');
                          handleCommand({ preventDefault: () => {} } as any);
                        }}
                      />
                      <OptimizationAction 
                        title="Optimize Threads" 
                        description="Re-balance reasoning branches for maximum Lumina efficiency." 
                        onClick={() => {
                          setCommand('sys optimize');
                          handleCommand({ preventDefault: () => {} } as any);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'console' ? (
              <motion.div 
                key="console"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full p-6 font-mono text-sm overflow-y-auto custom-scrollbar"
              >
                <div className="space-y-1.5">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 group">
                      <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                      <span className={cn(
                        "font-bold shrink-0 uppercase text-[10px] mt-0.5",
                        log.type === 'system' && "text-blue-400",
                        log.type === 'kernel' && "text-indigo-400",
                        log.type === 'error' && "text-red-400",
                        log.type === 'warn' && "text-amber-400",
                        log.type === 'info' && "text-slate-500"
                      )}>
                        {log.type}
                      </span>
                      <span className={cn(
                        "leading-relaxed",
                        log.type === 'kernel' ? "text-indigo-300" : "text-slate-300"
                      )}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  {(isBooting || isProcessing) && (
                    <div className="flex items-center gap-3 py-2">
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      <span className="text-blue-400 italic text-xs">Processing neural bridge...</span>
                    </div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </motion.div>
            ) : activeTab === 'fs' ? (
              <motion.div 
                key="fs"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full p-8 overflow-y-auto custom-scrollbar"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(fs).length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600">
                      <FolderTree className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-mono uppercase tracking-widest">File system empty</p>
                    </div>
                  ) : (
                    Object.entries(fs).map(([path, content]) => (
                      <div key={path} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                        <div className="flex items-center gap-3 mb-3">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-mono font-bold text-slate-300">{path}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 line-clamp-3 leading-relaxed">
                          {content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {isOnline && (
          <form onSubmit={handleCommand} className="p-4 border-t border-white/5 bg-black/60">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
              <ChevronRight className="w-4 h-4 text-blue-500" />
              <input 
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                disabled={isProcessing}
                placeholder={isProcessing ? "Executing..." : "Enter command (e.g. 'net search for Gemini API', 'sys info')..."}
                className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-blue-300 placeholder:text-slate-700 disabled:opacity-50"
              />
            </div>
          </form>
        )}
      </div>

      {/* Security / Capability Layer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CapabilityStatus icon={<Globe className="w-3.5 h-3.5" />} label="Net" status="Active" color="text-blue-400" />
        <CapabilityStatus icon={<MapPin className="w-3.5 h-3.5" />} label="GPS" status="Active" color="text-emerald-400" />
        <CapabilityStatus icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Neural Isolation" status="Encrypted" color="text-indigo-400" />
        <CapabilityStatus 
          icon={<div className={cn("w-1.5 h-1.5 rounded-full", isSyncing ? "bg-emerald-500 animate-ping" : "bg-emerald-500/30")} />} 
          label="Bridge Sync" 
          status={isOnline ? "Active" : "Standby"} 
          color="text-emerald-400" 
        />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
        active ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, active }: { icon: React.ReactNode, label: string, value: string, active: boolean }) {
  return (
    <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-white/5 flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{label}</span>
      </div>
      <div className={cn(
        "text-xl font-mono font-bold transition-all",
        active ? "text-white" : "text-slate-700"
      )}>
        {active ? value : '---'}
      </div>
    </div>
  );
}

function CapabilityStatus({ icon, label, status, color }: { icon: React.ReactNode, label: string, status: string, color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
      <div className={cn("w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center", color)}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <span className={cn("text-[10px] font-bold", color)}>{status}</span>
      </div>
    </div>
  );
}

function TelemetryCard({ icon, label, value, detail }: { icon: React.ReactNode, label: string, value: string, detail: string }) {
  return (
    <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col gap-3 hover:bg-white/10 transition-all group">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
      </div>
      <div>
        <div className="text-2xl font-black text-white tracking-tight">{value}</div>
        <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">{detail}</div>
      </div>
    </div>
  );
}

function OptimizationAction({ title, description, onClick }: { title: string, description: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-6 rounded-[2rem] bg-black/40 border border-white/5 hover:border-indigo-500/30 transition-all text-left group"
    >
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-[10px] font-black text-white uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{title}</h5>
        <Zap className="w-3 h-3 text-slate-600 group-hover:text-amber-400 transition-colors" />
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed">{description}</p>
    </button>
  );
}
