import { PdaNode, PdaTransition } from '../types';

export const PDA_NODES: PdaNode[] = [
  { id: 'START', label: 'START', x: 400, y: 45, type: 'START', shape: 'rounded_rect' },
  { id: 'READ0', label: 'READ0', x: 400, y: 135, type: 'READ', shape: 'diamond' },
  { id: 'PUSH_A', label: 'PUSH a', x: 540, y: 135, type: 'PUSH', shape: 'rect' },
  { id: 'PUSH_B', label: 'PUSH b', x: 400, y: 225, type: 'PUSH', shape: 'rect' },
  { id: 'READ1', label: 'READ1', x: 680, y: 135, type: 'READ', shape: 'diamond' },
  { id: 'READ2', label: 'READ2', x: 400, y: 315, type: 'READ', shape: 'diamond' },
  { id: 'READ4', label: 'READ4', x: 260, y: 435, type: 'READ', shape: 'diamond' },
  { id: 'READ3', label: 'READ3', x: 540, y: 435, type: 'READ', shape: 'diamond' },
  { id: 'READ6', label: 'READ6', x: 260, y: 555, type: 'READ', shape: 'diamond' },
  { id: 'READ5', label: 'READ5', x: 540, y: 555, type: 'READ', shape: 'diamond' },
  { id: 'READ7', label: 'READ7', x: 400, y: 675, type: 'READ', shape: 'diamond' },
  { id: 'READ8', label: 'READ8', x: 400, y: 775, type: 'READ', shape: 'diamond' },
  { id: 'POP', label: 'POP', x: 400, y: 875, type: 'POP', shape: 'diamond' },
  { id: 'ACCEPT', label: 'ACCEPT', x: 400, y: 975, type: 'ACCEPT', shape: 'rounded_rect' },
  { id: 'REJECT1', label: 'REJECT', x: 680, y: 45, type: 'REJECT', shape: 'rounded_rect' },
  { id: 'REJECT2', label: 'REJECT', x: 540, y: 875, type: 'REJECT', shape: 'rounded_rect' }
];

export const PDA_TRANSITIONS: PdaTransition[] = [
  { from: 'START', to: 'READ0', symbol: '' },
  { from: 'READ0', to: 'PUSH_A', symbol: 'a' },
  { from: 'PUSH_A', to: 'READ1', symbol: 'Δ' },
  { from: 'READ0', to: 'PUSH_B', symbol: 'b' },
  { from: 'PUSH_B', to: 'READ2', symbol: 'Δ' },
  { from: 'READ1', to: 'READ2', symbol: 'a,b' },
  { from: 'READ1', to: 'REJECT1', symbol: 'Δ' },
  { from: 'READ2', to: 'READ3', symbol: 'a' },
  { from: 'READ2', to: 'READ4', symbol: 'b' },
  
  // Bidirectional connections between READ3 and READ4
  { from: 'READ3', to: 'READ4', symbol: 'b', isCurved: true, curveOffset: 25 },
  { from: 'READ4', to: 'READ3', symbol: 'a', isCurved: true, curveOffset: 25 },
  
  { from: 'READ3', to: 'READ5', symbol: 'a' },
  { from: 'READ4', to: 'READ6', symbol: 'b' },
  
  // Curved transitions going back up
  { from: 'READ5', to: 'READ4', symbol: 'b', isCurved: true, curveOffset: -45 },
  { from: 'READ6', to: 'READ3', symbol: 'a', isCurved: true, curveOffset: 45 },
  
  { from: 'READ5', to: 'READ7', symbol: 'a' },
  { from: 'READ6', to: 'READ7', symbol: 'b' },
  
  { from: 'READ7', to: 'READ8', symbol: 'a,b' },
  { from: 'READ8', to: 'READ8', symbol: 'a,b' },
  
  { from: 'READ8', to: 'POP', symbol: 'Δ' },
  
  { from: 'POP', to: 'ACCEPT', symbol: 'a,b' },
  { from: 'POP', to: 'REJECT2', symbol: 'Δ' }
];

export const PDA2_NODES: PdaNode[] = [
  { id: 'START', label: 'START', x: 400, y: 45, type: 'START', shape: 'rounded_rect' },
  { id: 'READ0', label: 'READ0', x: 400, y: 135, type: 'READ', shape: 'diamond' },
  { id: 'PUSH_0', label: 'PUSH 0', x: 260, y: 135, type: 'PUSH', shape: 'rect' },
  { id: 'PUSH_1', label: 'PUSH 1', x: 540, y: 135, type: 'PUSH', shape: 'rect' },
  { id: 'READ2', label: 'READ2', x: 260, y: 245, type: 'READ', shape: 'diamond' },
  { id: 'READ1', label: 'READ1', x: 540, y: 245, type: 'READ', shape: 'diamond' },
  { id: 'READ3', label: 'READ3', x: 400, y: 345, type: 'READ', shape: 'diamond' },
  { id: 'READ4', label: 'READ4', x: 400, y: 455, type: 'READ', shape: 'diamond' },
  { id: 'READ6', label: 'READ6', x: 260, y: 565, type: 'READ', shape: 'diamond' },
  { id: 'READ5', label: 'READ5', x: 540, y: 565, type: 'READ', shape: 'diamond' },
  { id: 'READ7', label: 'READ7', x: 400, y: 675, type: 'READ', shape: 'diamond' },
  { id: 'READ8', label: 'READ8', x: 400, y: 785, type: 'READ', shape: 'diamond' },
  { id: 'POP', label: 'POP', x: 400, y: 895, type: 'POP', shape: 'diamond' },
  { id: 'ACCEPT', label: 'ACCEPT', x: 400, y: 995, type: 'ACCEPT', shape: 'rounded_rect' },
  { id: 'REJECT', label: 'REJECT', x: 580, y: 895, type: 'REJECT', shape: 'rounded_rect' }
];

export const PDA2_TRANSITIONS: PdaTransition[] = [
  { from: 'START', to: 'READ0', symbol: '' },
  { from: 'READ0', to: 'PUSH_0', symbol: '0' },
  { from: 'PUSH_0', to: 'READ2', symbol: 'Δ' },
  { from: 'READ0', to: 'PUSH_1', symbol: '1' },
  { from: 'PUSH_1', to: 'READ1', symbol: 'Δ' },
  { from: 'READ1', to: 'READ3', symbol: '0' },
  { from: 'READ1', to: 'READ4', symbol: '1' },
  { from: 'READ2', to: 'READ3', symbol: '1' },
  { from: 'READ2', to: 'READ4', symbol: '0' },
  { from: 'READ3', to: 'READ4', symbol: '0,1' },
  { from: 'READ4', to: 'READ6', symbol: '0' },
  { from: 'READ4', to: 'READ5', symbol: '1' },
  
  // Bidirectional connections between READ5 and READ6
  { from: 'READ5', to: 'READ6', symbol: '0', isCurved: true, curveOffset: 25 },
  { from: 'READ6', to: 'READ5', symbol: '1', isCurved: true, curveOffset: 25 },
  
  { from: 'READ5', to: 'READ7', symbol: '1' },
  { from: 'READ6', to: 'READ7', symbol: '0' },
  
  { from: 'READ7', to: 'READ8', symbol: '0,1' },
  
  // Self loop on READ8
  { from: 'READ8', to: 'READ8', symbol: '0,1' },
  { from: 'READ8', to: 'POP', symbol: 'Δ' },
  
  { from: 'POP', to: 'ACCEPT', symbol: '0,1' },
  { from: 'POP', to: 'REJECT', symbol: 'Δ' }
];

