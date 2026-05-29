import React from 'react';
import { PageId } from '../types';
import { Network, Cpu, Braces, Compass } from 'lucide-react';

interface TabsProps {
  activeTab: PageId;
  onChange: (tab: PageId) => void;
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, onChange }) => {
  const tabs = [
    {
      id: 'dfa' as const,
      name: 'Deterministic Finite Automata (DFA)',
      short: 'DFA Tracer',
      icon: Network,
      color: 'from-blue-500 to-indigo-500',
      activeColor: 'text-indigo-400 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.25)]',
      desc: 'Active Tracing Model'
    },
    {
      id: 'cfg' as const,
      name: 'Context-Free Grammar (CFG)',
      short: 'CFG Tracer',
      icon: Braces,
      color: 'from-emerald-500 to-teal-500',
      activeColor: 'text-emerald-400 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
      desc: 'Empty / Future Projector'
    },
    {
      id: 'pda' as const,
      name: 'Pushdown Automata (PDA)',
      short: 'PDA Tracer',
      icon: Cpu,
      color: 'from-purple-500 to-pink-500',
      activeColor: 'text-purple-400 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.25)]',
      desc: 'Empty / Future Projector'
    },
  ];

  return (
    <div className="w-full">
      {/* Tab Navigation header */}
      <div className="flex border-b border-slate-800/80 bg-slate-950/60 p-1.5 rounded-xl gap-2 md:gap-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex-1 flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 pb-2 pt-2.5 px-3 md:px-4 rounded-lg border text-center md:text-left transition-all duration-300 cursor-pointer ${
                isActive
                  ? `bg-slate-900 border-slate-700/80 ${tab.activeColor}`
                  : 'bg-transparent border-transparent hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-md ${isActive ? 'bg-indigo-950/80 text-indigo-400' : 'bg-slate-900/60 text-slate-500'}`}>
                <Icon size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-semibold tracking-wide font-sans">
                  {tab.short}
                </span>
                <span className="hidden md:inline text-[9px] font-mono text-slate-500 leading-none mt-0.5">
                  {tab.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Mini Breadcrumb showing active space coordinates */}
      <div className="flex justify-between items-center px-2 py-2 mt-2 text-[10px] font-mono text-slate-500 tracking-wider">
        <div className="flex items-center space-x-1.5">
          <Compass size={11} className="text-indigo-400 animate-spin" style={{ animationDuration: '40s' }} />
          <span>CELESTIAL SYSTEM COORDINATOR</span>
        </div>
        <div>
          <span>STATUS: &ldquo;{activeTab.toUpperCase()}_SPACE_MOUNTED&rdquo;</span>
        </div>
      </div>
    </div>
  );
};
