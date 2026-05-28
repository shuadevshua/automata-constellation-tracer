import React from 'react';
import { Dfa, SimulationStatus, LogEntry } from '../types';
import { 
  Play, Pause, SkipForward, RotateCcw, HelpCircle, AlertTriangle, 
  CheckCircle2, XCircle, Gauge, Eye, Terminal, BookOpen
} from 'lucide-react';

interface ControlsProps {
  dfa: Dfa;
  inputString: string;
  setInputString: (str: string) => void;
  status: SimulationStatus;
  currentIndex: number;
  currentStateId: string | null;
  logs: LogEntry[];
  animationSpeed: number;
  setAnimationSpeed: (speed: number) => void;
  onStartAutoRun: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  errorMessage: string | null;
}

export const Controls: React.FC<ControlsProps> = ({
  dfa,
  inputString,
  setInputString,
  status,
  currentIndex,
  currentStateId,
  logs,
  animationSpeed,
  setAnimationSpeed,
  onStartAutoRun,
  onPause,
  onStep,
  onReset,
  errorMessage,
}) => {
  // Find current state label helper
  const getCurrentStateLabel = () => {
    if (currentStateId === null) return 'None';
    const s = dfa.states.find((state) => state.id === currentStateId);
    return s ? `${s.id} (${s.label})` : currentStateId;
  };

  // Find next state label helper based on the current index and transition logic
  const getNextStateLabelAndSymbol = () => {
    if (status === 'accepted' || status === 'rejected' || currentIndex >= inputString.length) {
      return { state: 'N/A (Process Complete)', symbol: '' };
    }
    const currentSymbol = inputString[currentIndex];
    
    // Find the matching transition from the currentStateId
    const currentId = currentStateId || dfa.startState;
    const transition = dfa.transitions.find(
      (t) => t.from === currentId && t.symbol === currentSymbol
    );

    if (transition) {
      const s = dfa.states.find((state) => state.id === transition.to);
      return { 
        state: s ? `${s.id} (${s.label})` : transition.to, 
        symbol: currentSymbol 
      };
    }
    
    return { state: 'Trap / Void (Null transition)', symbol: currentSymbol };
  };

  const { state: nextStateLabel, symbol: nextSymbol } = getNextStateLabelAndSymbol();

  // Helper to format path string
  const getPathString = () => {
    if (logs.length === 0) return dfa.states.find(s => s.isStart)?.label || dfa.startState;
    const path = [dfa.startState];
    logs.slice(0, currentIndex).forEach((log) => {
      path.push(log.toState);
    });
    return path.map((pid) => dfa.states.find((s) => s.id === pid)?.label || pid).join(' → ');
  };

  return (
    <div className="flex flex-col space-y-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 shadow-2xl h-full">
      {/* 1. Header with Metadata info */}
      <div className="border-b border-slate-800/60 pb-3 flex flex-col space-y-1.5">
        <div className="flex items-center space-x-2 text-indigo-400 font-mono text-[10px] uppercase tracking-widest font-bold">
          <BookOpen size={12} />
          <span>DFA Specification Summary</span>
        </div>
        <h2 className="text-base font-bold text-slate-100 tracking-tight">
          {dfa.name}
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed font-sans font-light">
          {dfa.description}
        </p>
        <div className="flex items-center space-x-2 pt-1 font-mono text-[10px] text-slate-400">
          <span className="text-slate-500 font-medium">ALPHABET:</span>
          <span className="flex gap-1.5">
            {dfa.alphabet.map(char => (
              <span key={char} className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-indigo-300 font-bold">
                &lsquo;{char}&rsquo;
              </span>
            ))}
          </span>
          <span className="text-slate-500 font-medium ml-3">REGEX:</span>
          <span className="bg-indigo-950/40 text-indigo-300 px-2 py-0.5 rounded font-bold overflow-x-auto max-w-[200px] shrink truncate" title={dfa.regex}>
            {dfa.regex}
          </span>
        </div>
      </div>

      {/* 2. String Input & Presets */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-mono tracking-wider text-slate-400 flex items-center space-x-1">
            <Terminal size={12} className="text-indigo-400" />
            <span>Orbit Test String Entry</span>
          </label>
          <span className="text-[10px] font-mono text-slate-500">
            {inputString.length} symbols loaded
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={inputString}
            onChange={(e) => {
              // Sanitized string input, but keep track of invalid symbols for HUD error rendering
              setInputString(e.target.value);
            }}
            placeholder={`Enter string using ${dfa.alphabet.join(' or ')}`}
            disabled={status !== 'idle'}
            className={`w-full bg-slate-900 border text-slate-100 rounded-xl px-4 py-3 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
              errorMessage 
                ? 'border-red-500 focus:ring-red-500/30' 
                : status === 'accepted' 
                ? 'border-emerald-500 focus:ring-emerald-500/20' 
                : status === 'rejected' 
                ? 'border-red-500 focus:ring-red-500/20' 
                : 'border-slate-800 focus:border-indigo-500/50'
            }`}
          />
          {status !== 'idle' && (
            <div className="absolute right-3 top-2.5 flex items-center space-x-1.5 bg-slate-950/90 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-mono text-indigo-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>LOCKED</span>
            </div>
          )}
        </div>

        {/* Suggestion Badges */}
        <div className="flex flex-wrap gap-2 items-center text-[11px] font-mono mt-1 pt-1">
          <span className="text-slate-500 flex items-center space-x-1">
            <HelpCircle size={11} />
            <span>Suggestions:</span>
          </span>
          <button
            onClick={() => {
              onReset();
              setInputString(dfa.sampleInput);
            }}
            disabled={status !== 'idle'}
            className="bg-emerald-950/65 hover:bg-emerald-900 border border-emerald-800/60 hover:border-emerald-700 text-emerald-400 px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Valid: &ldquo;{dfa.sampleInput}&rdquo;
          </button>
          <button
            onClick={() => {
              onReset();
              setInputString(dfa.sampleInputInvalid);
            }}
            disabled={status !== 'idle'}
            className="bg-red-950/65 hover:bg-red-940 border border-red-900/60 hover:border-red-800 text-red-400 px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Invalid: &ldquo;{dfa.sampleInputInvalid}&rdquo;
          </button>
        </div>
      </div>

      {/* 3. SPEED CONTROL */}
      <div className="bg-slate-900/40 border border-slate-900 p-3 rounded-xl flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-2 shrink-0">
          <Gauge size={14} className="text-slate-400" />
          <span className="text-xs font-mono text-slate-400">Animation Delay:</span>
        </div>
        <div className="flex items-center space-x-2 w-full max-w-[200px]">
          <input
            type="range"
            min="300"
            max="2000"
            step="100"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
          />
          <span className="text-[11px] text-indigo-400 font-mono w-14 text-right">
            {animationSpeed}ms
          </span>
        </div>
      </div>

      {/* 4. TRAJECTORY TRIGGER ACTIONS */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Step-by-Step Transition Trigger */}
        <button
          onClick={onStep}
          disabled={status === 'accepted' || status === 'rejected' || status === 'error' || !!errorMessage}
          className="flex items-center justify-center space-x-2 border border-slate-800 hover:border-indigo-800 bg-slate-900 hover:bg-slate-800/80 text-indigo-300 hover:text-indigo-200 p-3 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] disabled:opacity-30 disabled:hover:bg-slate-900 disabled:hover:border-slate-800 disabled:hover:text-indigo-300 disabled:cursor-not-allowed"
          title="Trace single transition step"
        >
          <SkipForward size={14} />
          <span>Step Trace</span>
        </button>

        {/* Auto Run Play/Pause Controller */}
        {status === 'running' ? (
          <button
            onClick={onPause}
            className="flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-600 text-amber-950 p-3 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-amber-500/10"
            title="Pause auto-tracing"
          >
            <Pause size={14} />
            <span>Pause Trace</span>
          </button>
        ) : (
          <button
            onClick={onStartAutoRun}
            disabled={status === 'accepted' || status === 'rejected' || status === 'error' || !inputString || !!errorMessage}
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
            title="Auto-run entire symbol sequence"
          >
            <Play size={14} className="fill-current" />
            <span>Auto Trace</span>
          </button>
        )}

        {/* Reset Trigger */}
        <button
          onClick={onReset}
          className="col-span-2 flex items-center justify-center space-x-2 border border-slate-800/60 hover:bg-slate-900 hover:border-slate-700 text-slate-400 hover:text-slate-200 p-2.5 rounded-xl text-xs font-mono cursor-pointer transition-all active:scale-[0.98]"
        >
          <RotateCcw size={13} />
          <span>Restore Engine Reset</span>
        </button>
      </div>

      {/* 5. DYNAMIC SIMULATION TELEMETRY PANEL (Cockpit HUD) */}
      <div className="flex-1 border border-slate-850 bg-[#020617]/90 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-inner relative overflow-hidden">
        {/* Small atmospheric background grids */}
        <div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none" />

        {/* Invalid input / standard alert messages */}
        {errorMessage ? (
          <div className="bg-red-950/80 border border-red-500/40 p-3 rounded-xl flex items-start space-x-3 text-xs text-red-200">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold font-mono">CRITICAL COGNITION ERROR</span>
              <p className="font-mono text-[11px] leading-tight text-red-300">
                {errorMessage}
              </p>
            </div>
          </div>
        ) : (
          /* Real-time process sequence */
          <div className="space-y-2.5">
            {/* Visualizer showing full string tracking with active character cursor */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                <span>Reading Orbit Target</span>
                {inputString && (
                  <span>
                    Cursor: {currentIndex}/{inputString.length}
                  </span>
                )}
              </div>
              
              <div className="bg-slate-950 border border-slate-900 rounded-lg p-2.5 flex items-center justify-center font-mono text-lg tracking-widest min-h-[46px] overflow-x-auto">
                {inputString.length === 0 ? (
                  <span className="text-slate-600 text-xs tracking-wider uppercase font-mono">
                    Empty sequence &epsilon; (lambda)
                  </span>
                ) : (
                  <div className="flex items-center text-slate-400">
                    {inputString.split('').map((char, index) => {
                      const isPassed = index < currentIndex;
                      const isActive = index === currentIndex && status !== 'idle';
                      return (
                        <span
                          key={index}
                          className={`transition-all duration-300 px-1 text-center rounded relative ${
                            isActive
                              ? 'bg-amber-400 text-amber-950 font-black scale-125 md:scale-135 mx-1 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                              : isPassed
                              ? 'text-indigo-400/80 font-medium'
                              : 'text-slate-600 font-light'
                          }`}
                        >
                          {char}
                          {isActive && (
                            <span className="absolute -bottom-1 cursor-none left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Core Telemetry parameters */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-900 flex flex-col justify-center">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">
                  Current Star State
                </span>
                <span className={`text-sm font-bold ${currentStateId ? 'text-indigo-300' : 'text-slate-500'}`}>
                  {getCurrentStateLabel()}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-900 flex flex-col justify-center">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">
                  Next Orbit Sector
                </span>
                <span className={`text-sm font-bold ${status === 'accepted' || status === 'rejected' ? 'text-slate-600' : nextStateLabel !== 'None' ? 'text-amber-400' : 'text-slate-500'}`}>
                  {nextStateLabel}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-900 flex flex-col justify-center">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">
                  Read Symbol
                </span>
                <span className="text-sm font-black text-slate-350">
                  {nextSymbol ? `'${nextSymbol}'` : 'EOF (End of File)'}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-900 flex flex-col justify-center">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">
                  State Pattern Type
                </span>
                <span className="text-xs font-medium text-indigo-400/90 leading-tight">
                  {(() => {
                    const activeState = dfa.states.find((s) => s.id === currentStateId);
                    if (activeState?.isAccepting) return 'Acceptor Node';
                    if (activeState?.isTrap) return 'Dead Gravitational Trap';
                    if (activeState?.isStart) return 'Initiating Polaris Star';
                    return 'Internal Orbit Sector';
                  })()}
                </span>
              </div>
            </div>

            {/* Traversal path display */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900 text-xs font-mono">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">
                Full Conjunction Path
              </span>
              <p className="text-slate-400 leading-tight truncate font-sans text-[11px] font-light">
                {getPathString()}
              </p>
            </div>
          </div>
        )}

        {/* 6. BIG DECISION PANEL (Final Result) */}
        <div className="mt-2 text-center">
          {status === 'accepted' && (
            <div className="bg-emerald-950/80 border border-emerald-500 px-5 py-3.5 rounded-xl animate-fade-in flex flex-col items-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="text-emerald-400 mb-1 animate-bounce" size={26} />
              <h2 className="text-base font-black text-emerald-400 tracking-widest font-mono uppercase">
                ACCEPTED !
              </h2>
              <p className="text-[10px] text-emerald-300 font-mono mt-0.5">
                The terminal state {currentStateId} matches an Accepting constellation node.
              </p>
            </div>
          )}

          {status === 'rejected' && (
            <div className="bg-red-950/80 border border-red-500 px-5 py-3.5 rounded-xl animate-fade-in flex flex-col items-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <XCircle className="text-red-400 mb-1 animate-pulse" size={26} fill="none" />
              <h2 className="text-base font-black text-red-450 tracking-widest font-mono uppercase">
                REJECTED !
              </h2>
              <p className="text-[10px] text-red-350 font-mono mt-0.5">
                Terminal state {currentStateId || 'q0'} is not accepted in this machine.
              </p>
            </div>
          )}

          {status === 'idle' && !errorMessage && (
            <div className="border border-slate-800/80 bg-slate-900/30 text-slate-500 py-3 px-4 rounded-xl text-xs font-mono shadow-inner leading-normal flex items-center justify-center space-x-1.5 font-light">
              <Eye size={12} className="text-indigo-500 animate-pulse" />
              <span>DFA engine ready for path trajectory visualization.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
