import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, 
  Sliders, 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Compass, 
  Terminal,
  Layers
} from 'lucide-react';

interface DerivationNode {
  id: string;
  symbol: string;
  children: DerivationNode[];
  isVariable: boolean;
  x?: number;
  y?: number;
}

interface DerivationStep {
  sententialForm: { symbol: string; id: string; isActive: boolean; isTerminal: boolean }[];
  ruleApplied: string;
  matchedString: string;
}

interface GrammarConfig {
  id: string;
  name: string;
  regex: string;
  variables: string[];
  alphabet: string[];
  productionRules: { lhs: string; rhs: string[] }[];
  startSymbol: string;
  sampleInput: string;
  sampleInputInvalid: string;
  description: string;
}

const GRAMMARS: GrammarConfig[] = [
  {
    id: 'cfg1',
    name: 'CFG #1: a/b Grammar (S → X A B Y Z C)',
    regex: '(b + aa + ab) (a + b)* (bbb + abab + abb)* (aaa + bbb) (a + b) (a + b + ab)*',
    variables: ['S', 'X', 'A', 'B', 'Y', 'Z', 'C'],
    alphabet: ['a', 'b'],
    startSymbol: 'S',
    sampleInput: 'baaaa',
    sampleInputInvalid: 'aba',
    description: 'Calculates structural star maps on strings composed of "a" and "b" matching the first orbital formula.',
    productionRules: [
      { lhs: 'S', rhs: ['X', 'A', 'B', 'Y', 'Z', 'C'] },
      { lhs: 'X', rhs: ['b', 'aa', 'ab'] },
      { lhs: 'A', rhs: ['aA', 'bA', 'λ'] },
      { lhs: 'B', rhs: ['bbbB', 'ababB', 'abbB', 'λ'] },
      { lhs: 'Y', rhs: ['aaa', 'bbb'] },
      { lhs: 'Z', rhs: ['a', 'b'] },
      { lhs: 'C', rhs: ['aC', 'bC', 'abC', 'λ'] }
    ]
  },
  {
    id: 'cfg2',
    name: 'CFG #2: 0/1 Grammar (S → A X B Y C Z D)',
    regex: '(1 + 0)* (11 + 00 + 101 + 010) (1 + 0 + 11 + 00 + 101)* (11 + 00) (11 + 00 + 101)* (1 + 0) (1 + 0 + 11)*',
    variables: ['S', 'A', 'X', 'B', 'Y', 'C', 'Z', 'D'],
    alphabet: ['0', '1'],
    startSymbol: 'S',
    sampleInput: '11111',
    sampleInputInvalid: '101',
    description: 'Builds binary constellation coordinates using 7 deep recursive stages, aligned with the second orbit formula.',
    productionRules: [
      { lhs: 'S', rhs: ['A', 'X', 'B', 'Y', 'C', 'Z', 'D'] },
      { lhs: 'A', rhs: ['1A', '0A', 'λ'] },
      { lhs: 'X', rhs: ['11', '00', '101', '010'] },
      { lhs: 'B', rhs: ['1B', '0B', '11B', '00B', '101B', 'λ'] },
      { lhs: 'Y', rhs: ['11', '00'] },
      { lhs: 'C', rhs: ['11C', '00C', '101C', 'λ'] },
      { lhs: 'Z', rhs: ['1', '0'] },
      { lhs: 'D', rhs: ['1D', '0D', '11D', 'λ'] }
    ]
  }
];

export const CfgPage: React.FC = () => {
  const [selectedCfgId, setSelectedCfgId] = useState<string>('cfg1');
  const activeCfg = useMemo(() => {
    return GRAMMARS.find(g => g.id === selectedCfgId) || GRAMMARS[0];
  }, [selectedCfgId]);

  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');
  const [inputString, setInputString] = useState<string>(activeCfg.sampleInput);
  const [batchInputs, setBatchInputs] = useState<string[]>(['baaaa', 'aba', '']);
  const [batchResults, setBatchResults] = useState<{input: string, verdict: 'accepted' | 'rejected' | 'error'}[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [batchNotification, setBatchNotification] = useState<string | null>(null);
  const [showBatchSummary, setShowBatchSummary] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(1000);
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'paused' | 'accepted' | 'rejected'>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nodeCounterRef = useRef<number>(0);

  useEffect(() => {
    setInputString(activeCfg.sampleInput);
    setBatchInputs([activeCfg.sampleInput, activeCfg.sampleInputInvalid, '']);
    resetSimulation();
    setIsBatchRunning(false);
    setShowBatchSummary(false);
  }, [selectedCfgId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (simulationStatus === 'running') {
      startInterval();
    } else {
      stopInterval();
    }
  }, [simulationStatus, speedMs, currentStepIndex]);

  const startInterval = () => {
    stopInterval();
    timerRef.current = setInterval(() => {
      executeNextStep();
    }, speedMs);
  };

  const stopInterval = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const isDerivable = (variable: string, str: string): boolean => {
    if (activeCfg.id === 'cfg1') {
      return isDerivableCFG1(variable, str);
    } else {
      return isDerivableCFG2(variable, str);
    }
  };

  const isDerivableCFG1 = (variable: string, str: string): boolean => {
    if (variable === 'X') return str === 'b' || str === 'aa' || str === 'ab';
    if (variable === 'A') return /^[ab]*$/.test(str);
    if (variable === 'B') {
      if (str === '') return true;
      if (str.startsWith('bbb') && isDerivableCFG1('B', str.substring(3))) return true;
      if (str.startsWith('abab') && isDerivableCFG1('B', str.substring(4))) return true;
      if (str.startsWith('abb') && isDerivableCFG1('B', str.substring(3))) return true;
      return false;
    }
    if (variable === 'Y') return str === 'aaa' || str === 'bbb';
    if (variable === 'Z') return str === 'a' || str === 'b';
    if (variable === 'C') return /^[ab]*$/.test(str);
    return false;
  };

  const isDerivableCFG2 = (variable: string, str: string): boolean => {
    if (variable === 'A') return /^[01]*$/.test(str);
    if (variable === 'X') return str === '11' || str === '00' || str === '101' || str === '010';
    if (variable === 'B') return /^[01]*$/.test(str);
    if (variable === 'Y') return str === '11' || str === '00';
    if (variable === 'C') {
      if (str === '') return true;
      if (str.startsWith('11') && isDerivableCFG2('C', str.substring(2))) return true;
      if (str.startsWith('00') && isDerivableCFG2('C', str.substring(2))) return true;
      if (str.startsWith('101') && isDerivableCFG2('C', str.substring(3))) return true;
      return false;
    }
    if (variable === 'Z') return str === '1' || str === '0';
    if (variable === 'D') return /^[01]*$/.test(str);
    return false;
  };

  const findPartition = (str: string, variables: string[], index: number): string[] | null => {
    if (index === variables.length) return str === '' ? [] : null;
    const variable = variables[index];
    if (index === variables.length - 1) {
      return isDerivable(variable, str) ? [str] : null;
    }
    for (let len = 0; len <= str.length; len++) {
      const head = str.substring(0, len);
      if (isDerivable(variable, head)) {
        const tail = str.substring(len);
        const subPartition = findPartition(tail, variables, index + 1);
        if (subPartition !== null) return [head, ...subPartition];
      }
    }
    return null;
  };

  const buildDerivationNode = (symbol: string, str: string): DerivationNode => {
    const id = `${symbol}_${nodeCounterRef.current++}`;
    const isVar = activeCfg.variables.includes(symbol);

    if (!isVar) return { id, symbol, children: [], isVariable: false };
    const children: DerivationNode[] = [];

    if (activeCfg.id === 'cfg1') {
      if (symbol === 'X') {
        str.split('').forEach(c => children.push(buildDerivationNode(c, c)));
      } else if (symbol === 'A') {
        if (str === '') children.push(buildDerivationNode('λ', ''));
        else {
          children.push(buildDerivationNode(str[0], str[0]));
          children.push(buildDerivationNode('A', str.substring(1)));
        }
      } else if (symbol === 'B') {
        if (str === '') children.push(buildDerivationNode('λ', ''));
        else if (str.startsWith('bbb') && isDerivableCFG1('B', str.substring(3))) {
          ['b', 'b', 'b'].forEach(char => children.push(buildDerivationNode(char, char)));
          children.push(buildDerivationNode('B', str.substring(3)));
        } else if (str.startsWith('abab') && isDerivableCFG1('B', str.substring(4))) {
          ['a', 'b', 'a', 'b'].forEach(char => children.push(buildDerivationNode(char, char)));
          children.push(buildDerivationNode('B', str.substring(4)));
        } else if (str.startsWith('abb') && isDerivableCFG1('B', str.substring(3))) {
          ['a', 'b', 'b'].forEach(char => children.push(buildDerivationNode(char, char)));
          children.push(buildDerivationNode('B', str.substring(3)));
        }
      } else if (symbol === 'Y') {
        str.split('').forEach(c => children.push(buildDerivationNode(c, c)));
      } else if (symbol === 'Z') {
        children.push(buildDerivationNode(str, str));
      } else if (symbol === 'C') {
        if (str === '') children.push(buildDerivationNode('λ', ''));
        else if (str.startsWith('ab') && isDerivableCFG1('C', str.substring(2))) {
          ['a', 'b'].forEach(c => children.push(buildDerivationNode(c, c)));
          children.push(buildDerivationNode('C', str.substring(2)));
        } else {
          children.push(buildDerivationNode(str[0], str[0]));
          children.push(buildDerivationNode('C', str.substring(1)));
        }
      }
    } else {
      if (symbol === 'A') {
        if (str === '') children.push(buildDerivationNode('λ', ''));
        else {
          children.push(buildDerivationNode(str[0], str[0]));
          children.push(buildDerivationNode('A', str.substring(1)));
        }
      } else if (symbol === 'X') {
        str.split('').forEach(c => children.push(buildDerivationNode(c, c)));
      } else if (symbol === 'B') {
        if (str === '') children.push(buildDerivationNode('λ', ''));
        else if (str.startsWith('101') && isDerivableCFG2('B', str.substring(3))) {
          ['1', '0', '1'].forEach(c => children.push(buildDerivationNode(c, c)));
          children.push(buildDerivationNode('B', str.substring(3)));
        } else if (str.startsWith('11') && isDerivableCFG2('B', str.substring(2))) {
          ['1', '1'].forEach(c => children.push(buildDerivationNode(c, c)));
          children.push(buildDerivationNode('B', str.substring(2)));
        } else if (str.startsWith('00') && isDerivableCFG2('B', str.substring(2))) {
          ['0', '0'].forEach(c => children.push(buildDerivationNode(c, c)));
          children.push(buildDerivationNode('B', str.substring(2)));
        } else {
          children.push(buildDerivationNode(str[0], str[0]));
          children.push(buildDerivationNode('B', str.substring(1)));
        }
      } else if (symbol === 'Y') {
        str.split('').forEach(c => children.push(buildDerivationNode(c, c)));
      } else if (symbol === 'C') {
        if (str === '') children.push(buildDerivationNode('λ', ''));
        else if (str.startsWith('101') && isDerivableCFG2('C', str.substring(3))) {
          ['1', '0', '1'].forEach(c => children.push(buildDerivationNode(c, c)));
          children.push(buildDerivationNode('C', str.substring(3)));
        } else if (str.startsWith('11') && isDerivableCFG2('C', str.substring(2))) {
          ['1', '1'].forEach(c => children.push(buildDerivationNode(c, c)));
          children.push(buildDerivationNode('C', str.substring(2)));
        } else if (str.startsWith('00') && isDerivableCFG2('C', str.substring(2))) {
          ['0', '0'].forEach(c => children.push(buildDerivationNode(c, c)));
          children.push(buildDerivationNode('C', str.substring(2)));
        }
      } else if (symbol === 'Z') {
        children.push(buildDerivationNode(str, str));
      } else if (symbol === 'D') {
        if (str === '') children.push(buildDerivationNode('λ', ''));
        else if (str.startsWith('11') && isDerivableCFG2('D', str.substring(2))) {
          ['1', '1'].forEach(c => children.push(buildDerivationNode(c, c)));
          children.push(buildDerivationNode('D', str.substring(2)));
        } else {
          children.push(buildDerivationNode(str[0], str[0]));
          children.push(buildDerivationNode('D', str.substring(1)));
        }
      }
    }
    return { id, symbol, children, isVariable: true };
  };

  const layoutTree = (root: DerivationNode): void => {
    // 1. Calculate max depth to scale Y coordinates dynamically
    const getMaxDepth = (node: DerivationNode, currentDepth: number): number => {
      if (node.children.length === 0) return currentDepth;
      let max = currentDepth;
      node.children.forEach(child => {
        const d = getMaxDepth(child, currentDepth + 1);
        if (d > max) max = d;
      });
      return max;
    };
    const maxDepth = getMaxDepth(root, 0);
    // Reserve Y space from 50px to 310px (total 260px)
    const dy = maxDepth > 0 ? Math.min(55, 260 / maxDepth) : 55;

    // 2. Traversal to set Y and collect leaves for X
    const leafNodes: DerivationNode[] = [];
    const traverseAndSetY = (node: DerivationNode, depth: number) => {
      node.y = depth * dy + 50;
      if (node.children.length === 0) {
        leafNodes.push(node);
      } else {
        node.children.forEach(child => traverseAndSetY(child, depth + 1));
      }
    };
    traverseAndSetY(root, 0);

    // 3. Set X for all leaf nodes
    const L = leafNodes.length;
    const startX = 40;
    const endX = 760;
    const stepX = L > 1 ? (endX - startX) / (L - 1) : 0;
    leafNodes.forEach((leaf, i) => {
      leaf.x = L > 1 ? startX + i * stepX : (startX + endX) / 2;
    });

    // 4. Post-order traversal to set X for parents
    const computeParentX = (node: DerivationNode): number => {
      if (node.children.length === 0) {
        return node.x || 0;
      }
      let sumX = 0;
      node.children.forEach(child => {
        sumX += computeParentX(child);
      });
      node.x = sumX / node.children.length;
      return node.x;
    };
    computeParentX(root);
  };

  const validationError = useMemo(() => {
    if (inputMode === 'single') {
      for (let i = 0; i < inputString.length; i++) {
        if (!activeCfg.alphabet.includes(inputString[i])) {
          return `Symbol "${inputString[i]}" is not in the alphabet {${activeCfg.alphabet.join(', ')}}`;
        }
      }
      return null;
    } else {
      for (let index = 0; index < batchInputs.length; index++) {
        const str = batchInputs[index];
        if (!str) continue;
        for (let i = 0; i < str.length; i++) {
          if (!activeCfg.alphabet.includes(str[i])) {
            return `String ${index + 1}: Symbol "${str[i]}" is not in the alphabet {${activeCfg.alphabet.join(', ')}}`;
          }
        }
      }
      return null;
    }
  }, [inputString, batchInputs, activeCfg, inputMode]);

  const parsedData = useMemo(() => {
    for (let i = 0; i < inputString.length; i++) {
      if (!activeCfg.alphabet.includes(inputString[i])) {
        return { isValid: false, error: `Symbol "${inputString[i]}" is not in the alphabet {${activeCfg.alphabet.join(', ')}}` };
      }
    }
    nodeCounterRef.current = 0;
    const partitionVars = activeCfg.id === 'cfg1' 
      ? ['X', 'A', 'B', 'Y', 'Z', 'C'] 
      : ['A', 'X', 'B', 'Y', 'C', 'Z', 'D'];

    const partitions = findPartition(inputString, partitionVars, 0);
    if (!partitions) {
      return { isValid: false, error: 'Input is rejected: No valid Context-Free derivation exists for this string.' };
    }

    const rootChildren = partitionVars.map((v, idx) => buildDerivationNode(v, partitions[idx]));
    const root: DerivationNode = { id: 'S_root', symbol: 'S', children: rootChildren, isVariable: true };
    layoutTree(root);

    const steps: DerivationStep[] = [];
    let currentForm: DerivationNode[] = [root];

    steps.push({
      sententialForm: currentForm.map(n => ({ symbol: n.symbol, id: n.id, isActive: false, isTerminal: !n.isVariable })),
      ruleApplied: 'Start',
      matchedString: ''
    });

    while (true) {
      const leftVarIdx = currentForm.findIndex(n => n.isVariable);
      if (leftVarIdx === -1) break;

      const target = currentForm[leftVarIdx];
      const children = target.children;
      const nextForm: DerivationNode[] = [
        ...currentForm.slice(0, leftVarIdx),
        ...children,
        ...currentForm.slice(leftVarIdx + 1)
      ];

      currentForm = nextForm;
      const nextVarIdx = currentForm.findIndex(n => n.isVariable);
      const matchedNodes = nextVarIdx === -1 ? currentForm : currentForm.slice(0, nextVarIdx);
      const matchedString = matchedNodes.filter(n => n.symbol !== 'λ').map(n => n.symbol).join('');

      steps.push({
        sententialForm: currentForm.map((n, idx) => ({
          symbol: n.symbol,
          id: n.id,
          isActive: idx === nextVarIdx,
          isTerminal: !n.isVariable
        })),
        ruleApplied: `${target.symbol} → ${children.map(c => c.symbol).join('') || 'λ'}`,
        matchedString
      });
    }

    const allNodes: { node: DerivationNode; parentId: string | null }[] = [];
    const collectNodes = (node: DerivationNode, parent: string | null) => {
      allNodes.push({ node, parentId: parent });
      node.children.forEach(c => collectNodes(c, node.id));
    };
    collectNodes(root, null);

    return { isValid: true, root, steps, allNodes, partitionVars, partitions };
  }, [inputString, activeCfg]);

  const activeNodeIds = useMemo(() => {
    const active = new Set<string>();
    if (!parsedData.isValid || !parsedData.steps) return active;
    parsedData.steps[currentStepIndex]?.sententialForm.forEach(item => {
      if (item.isActive) active.add(item.id);
    });
    return active;
  }, [parsedData, currentStepIndex]);

  const expandedNodeIds = useMemo(() => {
    const expanded = new Set<string>();
    if (!parsedData.isValid || !parsedData.steps) return expanded;
    for (let i = 1; i <= currentStepIndex; i++) {
      const prevStep = parsedData.steps[i - 1];
      const firstVar = prevStep?.sententialForm.find(x => !x.isTerminal);
      if (firstVar) expanded.add(firstVar.id);
    }
    return expanded;
  }, [parsedData, currentStepIndex]);

  const startSimulation = () => {
    if (!parsedData.isValid) return;
    if (simulationStatus === 'accepted' || simulationStatus === 'rejected') {
      setCurrentStepIndex(0);
    }
    setSimulationStatus('running');
  };

  const pauseSimulation = () => setSimulationStatus('paused');

  const executeSingleStep = () => {
    if (!parsedData.isValid || !parsedData.steps) return;
    if (currentStepIndex >= parsedData.steps.length - 1) {
      setSimulationStatus('accepted');
      return;
    }
    setCurrentStepIndex(prev => prev + 1);
  };

  const executePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setSimulationStatus('paused');
    }
  };

  const executeNextStep = () => {
    if (!parsedData.isValid || !parsedData.steps) return;
    if (currentStepIndex >= parsedData.steps.length - 1) {
      stopInterval();
      setSimulationStatus('accepted');
      return;
    }
    setCurrentStepIndex(prev => prev + 1);
  };

  const resetSimulation = () => {
    stopInterval();
    setSimulationStatus('idle');
    setCurrentStepIndex(0);
  };

  const loadPreset = (presetValue: string) => {
    resetSimulation();
    setInputString(presetValue);
  };

  // Process CFG batch progression
  useEffect(() => {
    if (isBatchRunning) {
      if (!parsedData.isValid) {
        // String is rejected/invalid
        const currentInput = batchInputs[currentBatchIndex];
        setBatchResults(prev => {
          const newResults = [...prev];
          newResults[currentBatchIndex] = { input: currentInput, verdict: 'rejected' };
          return newResults;
        });

        // Find next non-empty input
        let nextIndex = currentBatchIndex + 1;
        while (nextIndex < batchInputs.length && !batchInputs[nextIndex]) {
          nextIndex++;
        }

        if (nextIndex < batchInputs.length) {
          setBatchNotification(`Starting Next String: "${batchInputs[nextIndex]}"`);
          setTimeout(() => setBatchNotification(null), 2500);

          setTimeout(() => {
            setCurrentBatchIndex(nextIndex);
            setInputString(batchInputs[nextIndex]);
            setSimulationStatus('idle');
            setCurrentStepIndex(0);
          }, 1500);
        } else {
          // Batch finished
          setTimeout(() => {
            setIsBatchRunning(false);
            setShowBatchSummary(true);
          }, 1500);
        }
      } else if (simulationStatus === 'accepted') {
        // String is accepted
        const currentInput = batchInputs[currentBatchIndex];
        setBatchResults(prev => {
          const newResults = [...prev];
          newResults[currentBatchIndex] = { input: currentInput, verdict: 'accepted' };
          return newResults;
        });

        // Find next non-empty input
        let nextIndex = currentBatchIndex + 1;
        while (nextIndex < batchInputs.length && !batchInputs[nextIndex]) {
          nextIndex++;
        }

        if (nextIndex < batchInputs.length) {
          setBatchNotification(`Starting Next String: "${batchInputs[nextIndex]}"`);
          setTimeout(() => setBatchNotification(null), 2500);

          setTimeout(() => {
            setCurrentBatchIndex(nextIndex);
            setInputString(batchInputs[nextIndex]);
            setSimulationStatus('idle');
            setCurrentStepIndex(0);
            
            setTimeout(() => {
              setSimulationStatus('running');
            }, 50);
          }, 1500);
        } else {
          // Batch finished
          setTimeout(() => {
            setIsBatchRunning(false);
            setShowBatchSummary(true);
          }, 1500);
        }
      }
    }
  }, [simulationStatus, isBatchRunning, parsedData.isValid, currentBatchIndex]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/80 border border-purple-500/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
            Context-Free Grammar (CFG) Specification
          </label>
          <p className="text-xs text-slate-400 font-light font-sans max-w-md">
            Trace input strings step-by-step through leftmost variable expansions and see the derivation map outline.
          </p>
        </div>
        <div className="w-full md:w-80">
          <select
            value={selectedCfgId}
            onChange={(e) => setSelectedCfgId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm font-mono tracking-tight outline-none cursor-pointer focus:ring-1 focus:ring-amber-500/50"
          >
            {GRAMMARS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950/40 backdrop-blur-md border border-amber-500/10 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-200 uppercase tracking-wider font-mono">Constellation Syntax (CFG)</span>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed font-sans font-light">
              This grammar maps orbital formulas using recursive variable rules. Leftmost derivation matches input sequences by expanding the leftmost variable first.
            </p>

            <div className="bg-slate-950/80 rounded-xl p-3 border border-amber-950/60 text-xs font-mono text-amber-300 space-y-2">
              <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-slate-500">Variables (V):</span> <span>{"{"}{activeCfg.variables.join(', ')}{"}"}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-slate-500">Alphabet (Σ):</span> <span>{"{"}{activeCfg.alphabet.join(', ')}{"}"}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-slate-500">Start Token:</span> <span>{activeCfg.startSymbol}</span></div>
              <div className="flex justify-between pb-1"><span className="text-slate-500">Null Token (λ):</span> <span className="text-amber-400 font-extrabold font-mono">Epsilon Transition</span></div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Production Rules (R):</span>
              <div className="grid grid-cols-1 gap-1.5 font-mono text-xs max-h-52 overflow-y-auto">
                {activeCfg.productionRules.map((rule, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-2 border border-white/5 rounded-lg flex items-center justify-between hover:bg-slate-900 transition-all">
                    <span className="text-amber-400 font-bold">{rule.lhs}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-slate-300 font-bold">{rule.rhs.join(' | ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-4">
            {/* Box 3: Mode Toggle & Inputs */}
            <div className="space-y-3">
              <div className="flex bg-slate-900/60 p-1 border border-white/5 rounded-lg shadow-inner">
                <button
                  onClick={() => { setInputMode('single'); resetSimulation(); }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold tracking-wider transition-all duration-300 ${
                    inputMode === 'single' ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Single Mode
                </button>
                <button
                  onClick={() => { setInputMode('batch'); resetSimulation(); }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold tracking-wider transition-all duration-300 ${
                    inputMode === 'batch' ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Batch Mode
                </button>
              </div>

              {inputMode === 'single' ? (
                <div className="space-y-2">
                  <label htmlFor="string-input" className="text-[10px] uppercase font-bold tracking-widest text-[#fbbf24] block">INPUT STRING STREAM</label>
                  <div className="relative">
                    <input 
                      id="string-input"
                      type="text" 
                      placeholder={`Enter alphabet symbols...`} 
                      value={inputString} 
                      onChange={(e) => {
                        resetSimulation();
                        setInputString(e.target.value.toLowerCase());
                      }}
                      className={`w-full bg-slate-900 border rounded-xl pl-3 pr-8 py-2 text-sm focus:outline-none transition-colors font-mono tracking-widest ${
                        !parsedData.isValid 
                          ? 'border-rose-500/40 bg-rose-950/10 text-rose-300 focus:border-rose-500' 
                          : 'border-white/10 text-amber-100 focus:border-amber-500'
                      }`}
                    />
                    {inputString && (
                      <button 
                        onClick={() => {
                          setInputString('');
                          resetSimulation();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 font-mono text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {!parsedData.isValid && (
                    <div className="flex items-start gap-1.5 p-2 bg-rose-950/30 border border-rose-500/20 rounded-lg text-rose-300 text-[10px] leading-tight">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>{parsedData.error}</span>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">Helpful Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => loadPreset(activeCfg.sampleInput)}
                        className="text-[10px] font-mono bg-emerald-950/50 hover:bg-emerald-900/40 border border-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md transition-all"
                      >
                        Suggest Match ({activeCfg.sampleInput})
                      </button>
                      <button
                        onClick={() => loadPreset(activeCfg.sampleInputInvalid)}
                        className="text-[10px] font-mono bg-rose-950/50 hover:bg-rose-900/40 border border-rose-500/20 text-rose-300 px-2.5 py-1 rounded-md transition-all"
                      >
                        Suggest Fail ({activeCfg.sampleInputInvalid})
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#fbbf24] block">Batch Input Queue</label>
                  <div className="space-y-2">
                    {batchInputs.map((str, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">{idx + 1}.</span>
                        <input 
                          type="text" 
                          placeholder={`String ${idx + 1}...`} 
                          value={str} 
                          onChange={(e) => {
                            const newBatch = [...batchInputs];
                            newBatch[idx] = e.target.value.toLowerCase();
                            setBatchInputs(newBatch);
                            resetSimulation();
                          }}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 transition-colors font-mono tracking-widest text-amber-100"
                        />
                      </div>
                    ))}
                    <div className="flex justify-between items-center px-1">
                      <button onClick={() => setBatchInputs([...batchInputs, ''])} className="text-[10px] text-amber-400 hover:text-amber-300 uppercase font-bold">+ Add String</button>
                      {batchInputs.length > 3 && (
                        <button onClick={() => setBatchInputs(batchInputs.slice(0, -1))} className="text-[10px] text-rose-400 hover:text-rose-300 uppercase font-bold">- Remove</button>
                      )}
                    </div>
                  </div>

                  {validationError && (
                    <div className="flex items-start gap-1.5 p-2 bg-rose-950/30 border border-rose-500/20 rounded-lg text-rose-300 text-[10px] leading-tight">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>{validationError}</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      resetSimulation();
                      setBatchResults([]);
                      
                      let firstIndex = 0;
                      while (firstIndex < batchInputs.length && !batchInputs[firstIndex]) {
                        firstIndex++;
                      }
                      
                      if (firstIndex < batchInputs.length) {
                        setCurrentBatchIndex(firstIndex);
                        setInputString(batchInputs[firstIndex]);
                        setIsBatchRunning(true);
                        setTimeout(() => {
                          setSimulationStatus('running');
                        }, 50);
                      }
                    }}
                    disabled={!!validationError || isBatchRunning || batchInputs.every(s => !s)}
                    className={`w-full rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2 ${
                      validationError || isBatchRunning || batchInputs.every(s => !s)
                        ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/60'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{isBatchRunning ? 'BATCH RUNNING...' : 'RUN BATCH'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#fbbf24] block">TRACER ACTIONS</label>
              <div className="grid grid-cols-2 gap-2">
                {simulationStatus === 'running' ? (
                  <button
                    onClick={pauseSimulation}
                    disabled={isBatchRunning}
                    className={`bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg ${isBatchRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>PAUSE</span>
                  </button>
                ) : (
                  <button
                    onClick={startSimulation}
                    disabled={!parsedData.isValid || isBatchRunning}
                    className={`rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      !parsedData.isValid || isBatchRunning
                        ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-950/60'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>AUTO DERIVE</span>
                  </button>
                )}

                <button
                  onClick={executeSingleStep}
                  disabled={!parsedData.isValid || simulationStatus === 'accepted' || (parsedData.steps && currentStepIndex >= parsedData.steps.length - 1) || isBatchRunning}
                  className={`rounded-xl py-2 px-3 text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                    !parsedData.isValid || simulationStatus === 'accepted' || (parsedData.steps && currentStepIndex >= parsedData.steps.length - 1) || isBatchRunning
                      ? 'bg-slate-900/20 text-slate-600 border-white/5 cursor-not-allowed opacity-45'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-white/10'
                  }`}
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>STEP NEXT</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={executePrevStep}
                  disabled={currentStepIndex === 0 || isBatchRunning}
                  className={`rounded-xl py-2 px-3 text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                    currentStepIndex === 0 || isBatchRunning
                      ? 'bg-slate-900/20 text-slate-600 border-white/5 cursor-not-allowed opacity-45'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-white/10'
                  }`}
                >
                  <span>STEP BACK</span>
                </button>

                <button
                  onClick={resetSimulation}
                  disabled={isBatchRunning}
                  className={`bg-slate-950 hover:bg-slate-900 text-slate-300 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isBatchRunning ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-white/5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[#fbbf24] flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-amber-500" />
                  <span>Animation Speed</span>
                </label>
                <span className="font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                  {speedMs} ms
                </span>
              </div>
              
              <input 
                type="range" 
                min="100" 
                max="4000" 
                step="50"
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="w-full accent-amber-500 hover:accent-amber-400 cursor-pointer h-1.5 bg-slate-900 rounded-lg border border-white/5"
              />

              <div className="flex justify-between items-center gap-1 text-[9px] font-mono">
                <button
                  type="button"
                  onClick={() => setSpeedMs(150)}
                  className={`flex-1 py-1 rounded border transition-colors ${speedMs === 150 ? 'bg-amber-500/20 border-amber-500/45 text-amber-300' : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-300 hover:bg-slate-900'}`}
                >
                  🚀 Turbo (150ms)
                </button>
                <button
                  type="button"
                  onClick={() => setSpeedMs(500)}
                  className={`flex-1 py-1 rounded border transition-colors ${speedMs === 500 ? 'bg-amber-500/20 border-amber-500/45 text-amber-300' : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-300 hover:bg-slate-900'}`}
                >
                  2x Fast (500ms)
                </button>
                <button
                  type="button"
                  onClick={() => setSpeedMs(1000)}
                  className={`flex-1 py-1 rounded border transition-colors ${speedMs === 1000 ? 'bg-amber-500/20 border-amber-500/45 text-amber-300' : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-300 hover:bg-slate-900'}`}
                >
                  1x Std (1s)
                </button>
                <button
                  type="button"
                  onClick={() => setSpeedMs(2500)}
                  className={`flex-1 py-1 rounded border transition-colors ${speedMs === 2500 ? 'bg-amber-500/20 border-amber-500/45 text-amber-300' : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-300 hover:bg-slate-900'}`}
                >
                  🐢 Slow (2.5s)
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-sans leading-normal">
                Adjust speed (100ms - 4000ms) or select presets for live presentations.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="relative min-h-[440px] border border-amber-500/10 bg-slate-950/20 rounded-3xl overflow-hidden flex flex-col p-4">
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-grid-white/[0.015]" />
            
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="text-[10px] font-mono bg-amber-950/80 border border-amber-500/20 px-2.5 py-1 rounded-full text-amber-300 font-bold backdrop-blur">
                SYSTEM MODEL: {activeCfg.id.toUpperCase()}
              </span>
              
              {parsedData.isValid && (
                <span className="text-[10px] font-mono bg-indigo-950/85 border border-indigo-500/20 px-2.5 py-1 rounded-full text-indigo-300 font-bold backdrop-blur">
                  STEP {currentStepIndex} / {parsedData.steps ? parsedData.steps.length - 1 : 0}
                </span>
              )}
            </div>

            <div className="absolute top-4 right-4 z-10">
              {simulationStatus === 'accepted' ? (
                <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accepted (Full derivation complete!)</span>
                </div>
              ) : !parsedData.isValid ? (
                <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-500/30 text-rose-300 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur">
                  <XCircle className="w-4 h-4" />
                  <span>Rejected</span>
                </div>
              ) : simulationStatus === 'running' ? (
                <div className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse shadow-lg backdrop-blur">
                  <Compass className="w-4 h-4 animate-spin" />
                  <span>Deriving...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full text-xs font-bold shadow backdrop-blur">
                  <span>Tracer {simulationStatus.toUpperCase()}</span>
                </div>
              )}
            </div>

            <div className="flex-1 w-full min-h-[350px] mt-8 flex items-center justify-center">
              {parsedData.isValid && parsedData.allNodes ? (
                <svg className="w-full h-[360px] overflow-visible" viewBox="0 0 800 360">
                  <defs>
                    <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {parsedData.allNodes.map((item, idx) => {
                    if (item.parentId === null) return null;
                    const parentNode = parsedData.allNodes!.find(n => n.node.id === item.parentId)?.node;
                    if (!parentNode) return null;

                    const isChildExpanded = expandedNodeIds.has(item.node.id);
                    const isChildActive = activeNodeIds.has(item.node.id);
                    const isParentExpanded = expandedNodeIds.has(parentNode.id) || parentNode.id === 'S_root';
                    const isLinkHigh = isParentExpanded && (isChildExpanded || isChildActive || currentStepIndex > 0);

                    return (
                      <g key={`link-${idx}`}>
                        {isLinkHigh && (
                          <line
                            x1={parentNode.x}
                            y1={parentNode.y}
                            x2={item.node.x}
                            y2={item.node.y}
                            className="stroke-amber-400/20"
                            strokeWidth="4"
                          />
                        )}
                        <line
                          x1={parentNode.x}
                          y1={parentNode.y}
                          x2={item.node.x}
                          y2={item.node.y}
                          className={`${
                            isLinkHigh 
                              ? 'stroke-amber-500/80 stroke-dasharray-[4,2] animated-beam' 
                              : 'stroke-slate-800/60'
                          } transition-all`}
                          style={{ transitionDuration: `${Math.min(300, speedMs / 3)}ms` }}
                          strokeWidth={isLinkHigh ? '1.5' : '1'}
                        />
                      </g>
                    );
                  })}

                  {parsedData.allNodes.map((item) => {
                    const node = item.node;
                    const isVar = node.isVariable;
                    const isNodeActive = activeNodeIds.has(node.id);
                    const isNodeExpanded = expandedNodeIds.has(node.id) || node.id === 'S_root';
                    const isParentExpanded = item.parentId === null || expandedNodeIds.has(item.parentId) || item.parentId === 'S_root';

                    let circleColor = 'fill-slate-900 stroke-slate-700';
                    let textColor = 'fill-slate-500';
                    let scale = 1;
                    
                    if (isVar) {
                      if (isNodeActive) {
                        circleColor = 'fill-[#fbbf24] stroke-[#f59e0b] filter-[url(#glow-amber)]';
                        textColor = 'fill-slate-950 font-extrabold';
                        scale = 1.25;
                      } else if (isNodeExpanded) {
                        circleColor = 'fill-stone-900 stroke-amber-500/80';
                        textColor = 'fill-amber-400 font-bold';
                        scale = 1.1;
                      } else {
                        circleColor = 'fill-slate-950/80 stroke-slate-800/80';
                        textColor = 'fill-slate-500';
                        scale = 0.95;
                      }
                    } else {
                      if (node.symbol === 'λ') {
                        if (isParentExpanded) {
                          circleColor = 'fill-amber-950 stroke-amber-400 filter-[url(#glow-amber)]';
                          textColor = 'fill-amber-200 font-extrabold';
                          scale = 1.35;
                        } else {
                          circleColor = 'fill-slate-950/55 stroke-slate-800/40';
                          textColor = 'fill-slate-600 font-light';
                          scale = 0.85;
                        }
                      } else if (isNodeExpanded || currentStepIndex > 0) {
                        circleColor = 'fill-indigo-950 stroke-indigo-400 filter-[url(#glow-indigo)]';
                        textColor = 'fill-indigo-300 font-bold';
                        scale = 1.05;
                      } else {
                        circleColor = 'fill-slate-950/80 stroke-slate-850';
                        textColor = 'fill-slate-500';
                        scale = 0.9;
                      }
                    }

                    const hasPulseRing = isNodeActive || (node.symbol === 'λ' && isParentExpanded);

                    return (
                      <g 
                        key={`node-${node.id}`} 
                        transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
                        className="transition-all"
                        style={{ transitionDuration: `${Math.min(400, speedMs / 2.5)}ms` }}
                      >
                        {hasPulseRing && (
                          <circle 
                            r={node.symbol === 'λ' ? "15" : "16"} 
                            className={`fill-none ${node.symbol === 'λ' ? 'stroke-amber-400/60' : 'stroke-amber-400/30'} animate-pulse`} 
                            strokeWidth="2"
                          />
                        )}
                        <circle
                          r={isVar ? '11' : node.symbol === 'λ' ? '7' : '10'}
                          className={`${circleColor} transition-colors`}
                          style={{ transitionDuration: `${Math.min(300, speedMs / 3)}ms` }}
                          strokeWidth="1.5"
                        />
                        <text
                          y={isVar ? '4' : '3'}
                          textAnchor="middle"
                          className={`${textColor} text-[9px] font-mono select-none`}
                        >
                          {node.symbol}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="space-y-4 max-w-sm mt-8 text-center">
                  <div className="mx-auto w-12 h-12 bg-rose-950/40 border border-rose-500/35 rounded-full flex items-center justify-center text-rose-400">
                    <XCircle size={22} className="animate-pulse" />
                  </div>
                  <h3 className="text-sm font-mono tracking-widest text-rose-300 uppercase font-bold">
                    REJECTED FORMULA PATH
                  </h3>
                  <p className="text-xs text-slate-500 font-sans font-light">
                    The sequence entered is invalid. Standard syntactic derivations cannot partition this string based on current grammar transition variables.
                  </p>
                </div>
              )}
            </div>

            {parsedData.isValid && parsedData.steps && (
              <div className="mt-auto border-t border-white/5 pt-3 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-500 uppercase tracking-widest text-[9px] font-bold">Matched Terminals:</span>
                <div className="text-right flex items-center gap-1">
                  <span className="text-emerald-400 font-extrabold">
                    &ldquo;{parsedData.steps[currentStepIndex].matchedString || 'λ'}&rdquo;
                  </span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-400">
                    &ldquo;{inputString}&rdquo;
                  </span>
                </div>
              </div>
            )}

            {/* Overlaid CFG Batch Summary Notification */}
            {showBatchSummary && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                  <div className="bg-amber-900/40 border-b border-amber-500/30 p-4 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <Layers className="w-5 h-5 text-amber-400" /> CFG Batch Execution Summary
                    </h3>
                    <button onClick={() => setShowBatchSummary(false)} className="text-slate-400 hover:text-white">×</button>
                  </div>
                  <div className="p-4 max-h-[60vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-xs text-slate-400">
                          <th className="pb-2 font-semibold">Input String</th>
                          <th className="pb-2 font-semibold text-right">Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((res, idx) => (
                          <tr key={idx} className="border-b border-white/5 text-sm font-mono">
                            <td className="py-3 text-slate-200">{res.input || '<empty>'}</td>
                            <td className="py-3 text-right">
                              {res.verdict === 'accepted' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> ACCEPTED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-400/10 px-2 py-1 rounded text-xs font-bold">
                                  <XCircle className="w-3.5 h-3.5" /> REJECTED
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t border-white/5 bg-slate-950">
                    <button onClick={() => setShowBatchSummary(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-2 text-sm font-bold transition-colors">
                      Close Summary
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-950/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-200 uppercase tracking-wider font-mono">Leftmost Derivation Trail</span>
              </div>
              {parsedData.isValid && parsedData.steps && (
                <span className="font-mono text-[10px] text-slate-500">
                  RULE APPLIED: <strong className="text-amber-400">{parsedData.steps[currentStepIndex].ruleApplied}</strong>
                </span>
              )}
            </div>

            {parsedData.isValid && parsedData.steps ? (
              <div className="space-y-3">
                <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5 overflow-x-auto flex items-center gap-2 font-mono text-sm max-w-full">
                  {parsedData.steps[currentStepIndex].sententialForm.map((item, idx) => (
                    <span 
                      key={`step-form-${idx}`}
                      className={`px-2 py-1 rounded transition-all duration-300 ${
                        item.isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35 font-extrabold animate-bounce'
                          : item.isTerminal
                            ? 'text-indigo-300'
                            : 'text-slate-400 font-bold border border-white/5'
                      }`}
                    >
                      {item.symbol}
                    </span>
                  ))}
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {parsedData.steps.map((st, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`p-2 rounded-lg text-xs font-mono flex items-center justify-between border cursor-pointer transition-all ${
                        idx === currentStepIndex
                          ? 'bg-amber-950/35 border-amber-500/35 text-amber-300'
                          : 'bg-slate-950/30 border-transparent text-slate-500 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                          idx <= currentStepIndex ? 'bg-amber-500/25 text-amber-400' : 'bg-slate-900 text-slate-600'
                        }`}>
                          {idx}
                        </span>
                        <span>{st.ruleApplied === 'Start' ? 'Derivation initialized with S.' : `Expanded leftmost variable: step rule ${st.ruleApplied}`}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase">
                        {idx === currentStepIndex ? 'ACTIVE' : 'SELECT'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-600 text-xs italic font-mono bg-slate-950/20 rounded-xl border border-white/5">
                Waiting for syntax checks to complete.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Toast Notification Bar for Batch Messages */}
      {batchNotification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900/95 border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.3)] backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span className="text-sm font-mono font-bold tracking-widest text-amber-200">
              {batchNotification}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};