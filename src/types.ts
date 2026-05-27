export interface DfaState {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart?: boolean;
  isAccepting?: boolean;
  isTrap?: boolean;
}

export interface DfaTransition {
  from: string;
  to: string;
  symbol: string;
}

export interface Dfa {
  id: string;
  name: string;
  regex: string;
  alphabet: string[];
  states: DfaState[];
  transitions: DfaTransition[];
  startState: string;
  sampleInput: string;
  sampleInputInvalid: string;
  description: string;
}

export interface LogEntry {
  step: number;
  fromState: string;
  symbol: string;
  toState: string;
}

export type PageId = 'dfa' | 'pda' | 'cfg';

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'accepted' | 'rejected' | 'error';

export interface PdaNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'START' | 'READ' | 'PUSH' | 'POP' | 'ACCEPT' | 'REJECT';
  shape: 'rounded_rect' | 'rect' | 'diamond';
}

export interface PdaTransition {
  from: string;
  to: string;
  symbol: string; // 'a', 'b', 'a,b', or 'Δ'
  isCurved?: boolean;
  curveOffset?: number;
}

export interface PdaLogEntry {
  step: number;
  currentState: string;
  symbolRead: string;
  stackBefore: string;
  operation: string;
  nextState: string;
  stackAfter: string;
}

