import { Dfa } from '../types';

export const DFAS: Dfa[] = [
  {
    id: 'dfa1',
    name: 'DFA 1: a/b',
    regex: '(b + aa + ab) (a + b)* (bb + aba + ab)* (aaa + bbb) (a + b) (a + b + ab)*',
    alphabet: ['a', 'b'],
    startState: 'q0',
    sampleInput: 'baaaa',
    sampleInputInvalid: 'aba',
    description: 'Processes strings composed of "a" and "b". A path traversing through a series of cosmic clusters, terminating in the bright star system q8.',
    states: [
      { id: 'q0', label: 'q₀', x: 60, y: 200, isStart: true },
      { id: 'q1', label: 'q₁', x: 180, y: 90 },
      { id: 'q2', label: 'q₂', x: 180, y: 310 },
      { id: 'q4', label: 'q₄', x: 340, y: 90 },
      { id: 'q3', label: 'q₃', x: 340, y: 310 },
      { id: 'q6', label: 'q₆', x: 500, y: 280 },
      { id: 'q5', label: 'q₅', x: 660, y: 90 },
      { id: 'q7', label: 'q₇', x: 660, y: 310 },
      { id: 'q8', label: 'q₈', x: 780, y: 200, isAccepting: true }
    ],
    transitions: [
      { from: 'q0', to: 'q1', symbol: 'a' },
      { from: 'q0', to: 'q2', symbol: 'b' },
      
      { from: 'q1', to: 'q2', symbol: 'a' },
      { from: 'q1', to: 'q2', symbol: 'b' },
      
      { from: 'q2', to: 'q3', symbol: 'a' },
      { from: 'q2', to: 'q4', symbol: 'b' },
      
      { from: 'q3', to: 'q5', symbol: 'a' },
      { from: 'q3', to: 'q4', symbol: 'b' },
      
      { from: 'q4', to: 'q3', symbol: 'a' },
      { from: 'q4', to: 'q6', symbol: 'b' },
      
      { from: 'q5', to: 'q7', symbol: 'a' },
      { from: 'q5', to: 'q4', symbol: 'b' },
      
      { from: 'q6', to: 'q3', symbol: 'a' },
      { from: 'q6', to: 'q7', symbol: 'b' },
      
      { from: 'q7', to: 'q8', symbol: 'a' },
      { from: 'q7', to: 'q8', symbol: 'b' },
      
      { from: 'q8', to: 'q8', symbol: 'a' },
      { from: 'q8', to: 'q8', symbol: 'b' }
    ]
  },
  {
    id: 'dfa2',
    name: 'DFA 2: 0/1',
    regex: '(1 + 0)* (11 + 00 + 101 + 010) (1 + 0 + 11 + 00 + 101)* (11 + 00) (11 + 00 + 101)* (1 + 0) (1 + 0 + 11)*',
    alphabet: ['0', '1'],
    startState: 'q0',
    sampleInput: '11111',
    sampleInputInvalid: '101',
    description: 'Processes binary digits ("0" and "1"). Features a gravitational sinkhole pulling in unstable orbits.',
    states: [
      { id: 'q0', label: 'q₀', x: 60, y: 200, isStart: true },
      { id: 'q1', label: 'q₁', x: 180, y: 80 },
      { id: 'q2', label: 'q₂', x: 180, y: 320 },
      { id: 'q3', label: 'q₃', x: 180, y: 200 },
      { id: 'q4', label: 'q₄', x: 320, y: 200 },
      { id: 'q5', label: 'q₅', x: 480, y: 80 },
      { id: 'q6', label: 'q₆', x: 480, y: 320 },
      { id: 'q7', label: 'q₇', x: 650, y: 200 },
      { id: 'q8', label: 'q₈', x: 780, y: 200, isAccepting: true }
    ],
    transitions: [
      { from: 'q0', to: 'q2', symbol: '0' },
      { from: 'q0', to: 'q1', symbol: '1' },
      
      { from: 'q1', to: 'q3', symbol: '0' },
      { from: 'q1', to: 'q4', symbol: '1' },
      
      { from: 'q2', to: 'q4', symbol: '0' },
      { from: 'q2', to: 'q3', symbol: '1' },
      
      { from: 'q3', to: 'q4', symbol: '0' },
      { from: 'q3', to: 'q4', symbol: '1' },
      
      { from: 'q4', to: 'q6', symbol: '0' },
      { from: 'q4', to: 'q5', symbol: '1' },
      
      { from: 'q5', to: 'q6', symbol: '0' },
      { from: 'q5', to: 'q7', symbol: '1' },
      
      { from: 'q6', to: 'q7', symbol: '0' },
      { from: 'q6', to: 'q5', symbol: '1' },
      
      { from: 'q7', to: 'q8', symbol: '0' },
      { from: 'q7', to: 'q8', symbol: '1' },
      
      { from: 'q8', to: 'q8', symbol: '0' },
      { from: 'q8', to: 'q8', symbol: '1' }
    ]
  }
];
