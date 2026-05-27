import React from 'react';
import { LogEntry, Dfa } from '../types';
import { List, Clipboard, ArrowRight, CircleDot } from 'lucide-react';

interface HistoryLogProps {
  dfa: Dfa;
  logs: LogEntry[];
  currentIndex: number;
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ dfa, logs, currentIndex }) => {
  const getStateLabel = (id: string) => {
    const s = dfa.states.find(state => state.id === id);
    return s ? s.label : id;
  };

  return (
    <div className="flex flex-col h-full border border-slate-800/80 bg-slate-950/80 rounded-2xl overflow-hidden shadow-xl">
      {/* Container Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center space-x-2.5">
          <List size={16} className="text-indigo-400" />
          <h3 className="text-xs md:text-sm font-semibold text-slate-200 uppercase tracking-widest font-mono">
            Transition Telemetry History
          </h3>
        </div>
        <div className="bg-indigo-950/80 border border-indigo-800/50 rounded-full px-2 py-0.5 text-[10px] text-indigo-300 font-mono">
          {logs.length} transitions registered
        </div>
      </div>

      {/* Traversal path display */}
      {logs.length > 0 && (
        <div className="bg-slate-900/30 p-3 px-4 border-b border-slate-800/60 font-mono text-xs">
          <span className="text-slate-500 uppercase tracking-wider text-[10px] block mb-1">State Traversal Orbit</span>
          <div className="flex flex-wrap items-center gap-1.5 text-indigo-300">
            <span className="text-indigo-400 bg-indigo-950/80 border border-indigo-800/50 px-1.5 py-0.5 rounded text-[10px] font-bold">
              {getStateLabel(dfa.startState)}
            </span>
            {logs.map((log, index) => (
              <React.Fragment key={log.step}>
                <ArrowRight size={10} className="text-slate-600" />
                <span 
                  className={`px-1.5 py-0.5 rounded text-[10px] transition-all duration-300 ${
                    index + 1 === currentIndex 
                      ? 'bg-amber-400 text-amber-950 font-bold border border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                      : index < currentIndex
                      ? 'bg-indigo-950/40 border border-slate-800 text-indigo-300'
                      : 'text-slate-500'
                  }`}
                >
                  <span className="text-[8px] text-slate-500 mr-1">({log.symbol})</span>
                  {getStateLabel(log.toState)}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Telemetry Log list / table */}
      <div className="flex-1 overflow-y-auto max-h-[300px] p-2 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <Clipboard size={32} className="text-slate-700 mb-2 animate-pulse" />
            <p className="text-slate-500 text-xs font-mono">
              Warp engine standby. Entry strings pending trace.
            </p>
            <p className="text-[10px] text-slate-600 font-mono max-w-xs mt-1">
              Insert an input symbol sequence and select Auto-Run or Step-by-Step trajectory tracing.
            </p>
          </div>
        ) : (
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase border-b border-slate-800/50">
                <th className="py-2 px-3 w-12 text-center">Step</th>
                <th className="py-2 px-3">State Node</th>
                <th className="py-2 px-3 text-center">Symbol Node</th>
                <th className="py-2 px-3">Next Orbit State</th>
                <th className="py-2 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50">
              {logs.map((log, index) => {
                const isActive = index + 1 === currentIndex;
                const isPassed = index + 1 < currentIndex;

                return (
                  <tr 
                    key={log.step}
                    className={`transition-colors duration-200 ${
                      isActive 
                        ? 'bg-amber-950/30 text-amber-300 border-l-2 border-amber-500' 
                        : isPassed 
                        ? 'text-slate-400 bg-slate-900/10' 
                        : 'text-slate-600 opacity-60'
                    }`}
                  >
                    <td className="py-2 px-3 text-center text-slate-500 font-bold">
                      #{String(log.step).padStart(2, '0')}
                    </td>
                    <td className="py-2 px-3 font-semibold">
                      {log.fromState} ({getStateLabel(log.fromState)})
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isActive 
                          ? 'bg-amber-400 text-amber-950' 
                          : isPassed 
                          ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-900/50' 
                          : 'bg-slate-900 text-slate-600'
                      }`}>
                        {log.symbol}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold">
                      {log.toState} ({getStateLabel(log.toState)})
                    </td>
                    <td className="py-2 px-3 text-right text-[10px] font-bold lg:pr-4">
                      {isActive ? (
                        <span className="text-amber-400 flex items-center justify-end space-x-1 animate-pulse">
                          <CircleDot size={8} />
                          <span>ACTIVE</span>
                        </span>
                      ) : isPassed ? (
                        <span className="text-indigo-400">PASSED</span>
                      ) : (
                        <span className="text-slate-600">QUEUE</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
