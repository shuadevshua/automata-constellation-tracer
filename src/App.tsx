import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  HelpCircle, 
  Sparkles, 
  Sliders, 
  Activity, 
  BookOpen,
  Compass,
  Database,
  Logs,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Layers
} from 'lucide-react';
import { DFAS } from './data/dfas';
import { PDA_NODES, PDA_TRANSITIONS, PDA2_NODES, PDA2_TRANSITIONS } from './data/pdas';
import { PageId, SimulationStatus, LogEntry, DfaTransition, PdaLogEntry } from './types';
import { CfgPage } from './components/CfgPage';
// Twinkle star properties for background constellation effect
interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  color: string;
}

export default function App() {
  // Navigation & Page State
  const [selectedTab, setSelectedTab] = useState<PageId>('dfa');
  
  // DFA Simulation State
  const [selectedDfaId, setSelectedDfaId] = useState<string>('dfa1');
  const activeDfa = useMemo(() => {
    return DFAS.find(d => d.id === selectedDfaId) || DFAS[0];
  }, [selectedDfaId]);

  // Input & validation state
  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');
  const [inputString, setInputString] = useState<string>(activeDfa.sampleInput);
  const [batchInputs, setBatchInputs] = useState<string[]>(['baaaab', 'abab', 'bbbbb', '']);
  const [batchResults, setBatchResults] = useState<{input: string, verdict: 'accepted' | 'rejected' | 'error'}[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [batchNotification, setBatchNotification] = useState<string | null>(null);
  const [showBatchSummary, setShowBatchSummary] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(800);
  
  // Real-time Simulation Traversal state
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus>('idle');
  const [currentStateId, setCurrentStateId] = useState<string>(activeDfa.startState);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [historyLog, setHistoryLog] = useState<LogEntry[]>([]);
  const [isHowToOpen, setIsHowToOpen] = useState<boolean>(false);

  // PDA / CFG empty pages mock states
  const [selectedPdaId, setSelectedPdaId] = useState<string>('pda1');

  // PDA Simulation State
  const [pdaInputString, setPdaInputString] = useState<string>('baaaab');
  const [pdaSpeedMs, setPdaSpeedMs] = useState<number>(800);
  const [pdaStatus, setPdaStatus] = useState<SimulationStatus>('idle');
  const [pdaCurrentNodeId, setPdaCurrentNodeId] = useState<string>('START');
  const [pdaIndex, setPdaIndex] = useState<number>(0);
  const [pdaStack, setPdaStack] = useState<string[]>([]);
  const [pdaHistory, setPdaHistory] = useState<PdaLogEntry[]>([]);
  const [isStackTelemetryExpanded, setIsStackTelemetryExpanded] = useState<boolean>(true);

  const pdaStuckState = useMemo(() => {
    if (pdaHistory.length === 0) return 'START';
    const lastLog = pdaHistory[pdaHistory.length - 1];
    return lastLog.currentState;
  }, [pdaHistory]);

  const pdaNodes = useMemo(() => {
    return selectedPdaId === 'pda1' ? PDA_NODES : PDA2_NODES;
  }, [selectedPdaId]);

  const pdaTransitions = useMemo(() => {
    return selectedPdaId === 'pda1' ? PDA_TRANSITIONS : PDA2_TRANSITIONS;
  }, [selectedPdaId]);

  const pdaRegex = selectedPdaId === 'pda1' 
    ? '(b + aa + ab)(a + b)*(bb + aba + ab)*(aaa + bbb)(a + b)(a + b + ab)*'
    : '(1 + 0)* (11 + 00 + 101 + 010) (1 + 0 + 11 + 00 + 101)* (11 + 00) (11 + 00 + 101)* (1 + 0) (1 + 0 + 11)*';

  const pdaDescription = selectedPdaId === 'pda1'
    ? 'Matches strings starting with b, aa, or ab, then continues through a series of loops checking for the substring aaa or bbb, accepts after pop verification of initial symbol.'
    : 'Matches strings containing specific patterns over {0,1}, pushes the first read symbol onto the stack, and accepts if the stack is popped clean at the end.';

  const pdaSampleInput = selectedPdaId === 'pda1' ? 'baaaab' : '00000';
  const pdaSampleInputInvalid = selectedPdaId === 'pda1' ? 'aba' : '1010';

  useEffect(() => {
    const defaultInput = selectedPdaId === 'pda1' ? 'baaaab' : '00000';
    setPdaInputString(defaultInput);
    resetPdaSimulation();
  }, [selectedPdaId]);

  // Trigger auto-timer refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pdaTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep stars stable over lifetimes
  const stars: Star[] = useMemo(() => {
    const starList: Star[] = [];
    const colors = ['bg-white', 'bg-purple-200', 'bg-violet-300', 'bg-fuchsia-300', 'bg-indigo-300'];
    for (let i = 0; i < 80; i++) {
      starList.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.5,
        duration: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    return starList;
  }, []);

  // Update input text when switching DFA
  useEffect(() => {
    setInputString(activeDfa.sampleInput);
    setBatchInputs([activeDfa.sampleInput, activeDfa.sampleInputInvalid, '']);
    resetSimulation();
  }, [selectedDfaId]);

  // Validate the whole input string for the active DFA alphabet
  const validationError = useMemo(() => {
    if (inputMode === 'single') {
      if (!inputString) return null;
      for (let i = 0; i < inputString.length; i++) {
        const char = inputString[i];
        if (!activeDfa.alphabet.includes(char)) {
          return `Symbol "${char}" is not in the alphabet {${activeDfa.alphabet.join(', ')}}`;
        }
      }
      return null;
    } else {
      for (let index = 0; index < batchInputs.length; index++) {
        const str = batchInputs[index];
        if (!str) continue; // skip empty
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          if (!activeDfa.alphabet.includes(char)) {
            return `String ${index + 1}: Symbol "${char}" is not in the alphabet {${activeDfa.alphabet.join(', ')}}`;
          }
        }
      }
      return null;
    }
  }, [inputString, batchInputs, activeDfa, inputMode]);

  // Validate PDA input string for only a and b
  const pdaValidationError = useMemo(() => {
    if (!pdaInputString) return null;
    const allowed = selectedPdaId === 'pda1' ? ['a', 'b'] : ['0', '1'];
    const allowedStr = selectedPdaId === 'pda1' ? 'a and b' : '0 and 1';
    for (let i = 0; i < pdaInputString.length; i++) {
      const char = pdaInputString[i];
      if (!allowed.includes(char)) {
        return `Invalid symbol. This PDA only accepts ${allowedStr}.`;
      }
    }
    return null;
  }, [pdaInputString, selectedPdaId]);

  // Auto clean timer on unmount o state update
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pdaTimerRef.current) clearInterval(pdaTimerRef.current);
    };
  }, []);

  // Sync timers to play speed or play actions
  useEffect(() => {
    if (simulationStatus === 'running') {
      startInterval();
    } else {
      stopInterval();
    }
  }, [simulationStatus, speedMs, currentIndex, currentStateId]);

  const startInterval = () => {
    stopInterval();
    timerRef.current = setInterval(() => {
      executeNextStepForTimer();
    }, speedMs);
  };

  const stopInterval = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Sync PDA timers to play speed or play actions
  useEffect(() => {
    if (pdaStatus === 'running') {
      startPdaInterval();
    } else {
      stopPdaInterval();
    }
  }, [pdaStatus, pdaSpeedMs, pdaIndex, pdaCurrentNodeId]);

  const startPdaInterval = () => {
    stopPdaInterval();
    pdaTimerRef.current = setInterval(() => {
      executePdaStepLogic();
    }, pdaSpeedMs);
  };

  const stopPdaInterval = () => {
    if (pdaTimerRef.current) {
      clearInterval(pdaTimerRef.current);
      pdaTimerRef.current = null;
    }
  };

  const finalizeVerdict = (finalStateId: string) => {
    stopInterval();
    const finalStateObj = activeDfa.states.find(s => s.id === finalStateId);
    if (finalStateObj?.isAccepting) {
      setSimulationStatus('accepted');
    } else {
      setSimulationStatus('rejected');
    }
  };

  // Process batch progression
  useEffect(() => {
    if (isBatchRunning && (simulationStatus === 'accepted' || simulationStatus === 'rejected' || simulationStatus === 'error')) {
      const currentInput = batchInputs[currentBatchIndex];
      const verdict = simulationStatus as 'accepted' | 'rejected' | 'error';
      
      setBatchResults(prev => {
        const newResults = [...prev];
        newResults[currentBatchIndex] = { input: currentInput, verdict };
        return newResults;
      });

      // Find next non-empty input
      let nextIndex = currentBatchIndex + 1;
      while (nextIndex < batchInputs.length && !batchInputs[nextIndex]) {
        nextIndex++;
      }
      
      if (nextIndex < batchInputs.length) {
        // Schedule next run
        setBatchNotification(`Starting Next String: "${batchInputs[nextIndex]}"`);
        setTimeout(() => setBatchNotification(null), 2500);

        setTimeout(() => {
          setCurrentBatchIndex(nextIndex);
          setInputString(batchInputs[nextIndex]);
          
          // reset and start next
          setSimulationStatus('idle');
          setCurrentStateId(activeDfa.startState);
          setCurrentIndex(0);
          setHistoryLog([]);
          
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
  }, [simulationStatus, isBatchRunning]);

  // ================= PDA Tracing & Simulation Logic =================
  const resetPdaSimulation = () => {
    stopPdaInterval();
    setPdaStatus('idle');
    setPdaCurrentNodeId('START');
    setPdaIndex(0);
    setPdaStack([]);
    setPdaHistory([]);
  };

  const startPdaSimulation = () => {
    if (pdaValidationError) return;
    if (pdaStatus === 'accepted' || pdaStatus === 'rejected' || pdaStatus === 'error') {
      setPdaCurrentNodeId('START');
      setPdaIndex(0);
      setPdaStack([]);
      setPdaHistory([]);
    }
    setPdaStatus('running');
  };

  const pausePdaSimulation = () => {
    setPdaStatus('paused');
  };

  const executePdaSingleStep = () => {
    if (pdaValidationError) return;
    if (pdaStatus === 'idle' || pdaStatus === 'accepted' || pdaStatus === 'rejected' || pdaStatus === 'error') {
      setPdaCurrentNodeId('START');
      setPdaIndex(0);
      setPdaStack([]);
      setPdaHistory([]);
      setPdaStatus('paused');
      // Trigger first step START -> READ0
      setTimeout(() => {
        setPdaHistory([
          {
            step: 1,
            currentState: 'START',
            symbolRead: 'Δ',
            stackBefore: '[]',
            operation: 'None',
            nextState: 'READ0',
            stackAfter: '[]'
          }
        ]);
        setPdaCurrentNodeId('READ0');
        setPdaStack([]);
        setPdaIndex(0);
      }, 50);
      return;
    }
    executePdaStepLogic();
  };

  const executePdaStepLogic = () => {
    if (pdaStatus === 'accepted' || pdaStatus === 'rejected' || pdaStatus === 'error') {
      return;
    }

    if (pdaCurrentNodeId === 'START') {
      const nextNode = 'READ0';
      const log: PdaLogEntry = {
        step: 1,
        currentState: 'START',
        symbolRead: 'Δ',
        stackBefore: '[]',
        operation: 'None',
        nextState: nextNode,
        stackAfter: '[]'
      };
      setPdaHistory([log]);
      setPdaCurrentNodeId(nextNode);
      setPdaStack([]);
      setPdaIndex(0);
      return;
    }

    const stepNumber = pdaHistory.length + 1;
    const currentStackStr = `[${pdaStack.join(', ')}]`;

    if (selectedPdaId === 'pda1') {
      if (pdaCurrentNodeId === 'READ0') {
        if (pdaIndex >= pdaInputString.length) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ0',
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: 'READ0',
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId('READ0');
          setPdaStatus('rejected');
          return;
        }

        const char = pdaInputString[pdaIndex];
        if (char === 'a') {
          const nextNode = 'PUSH_A';
          const newStack = ['a'];
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ0',
            symbolRead: 'a',
            stackBefore: currentStackStr,
            operation: 'PUSH a',
            nextState: nextNode,
            stackAfter: `[${newStack.join(', ')}]`
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(nextNode);
          setPdaStack(newStack);
          setPdaIndex(1);
        } else if (char === 'b') {
          const nextNode = 'PUSH_B';
          const newStack = ['b'];
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ0',
            symbolRead: 'b',
            stackBefore: currentStackStr,
            operation: 'PUSH b',
            nextState: nextNode,
            stackAfter: `[${newStack.join(', ')}]`
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(nextNode);
          setPdaStack(newStack);
          setPdaIndex(1);
        } else {
          setPdaStatus('error');
        }
        return;
      }

      if (pdaCurrentNodeId === 'PUSH_A') {
        const nextNode = 'READ1';
        const log: PdaLogEntry = {
          step: stepNumber,
          currentState: 'PUSH_A',
          symbolRead: 'Δ',
          stackBefore: currentStackStr,
          operation: 'None',
          nextState: nextNode,
          stackAfter: currentStackStr
        };
        setPdaHistory(prev => [...prev, log]);
        setPdaCurrentNodeId(nextNode);
        return;
      }

      if (pdaCurrentNodeId === 'PUSH_B') {
        const nextNode = 'READ2';
        const log: PdaLogEntry = {
          step: stepNumber,
          currentState: 'PUSH_B',
          symbolRead: 'Δ',
          stackBefore: currentStackStr,
          operation: 'None',
          nextState: nextNode,
          stackAfter: currentStackStr
        };
        setPdaHistory(prev => [...prev, log]);
        setPdaCurrentNodeId(nextNode);
        return;
      }

      if (pdaCurrentNodeId === 'READ1') {
        if (pdaIndex >= pdaInputString.length) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ1',
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: 'REJECT1',
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId('REJECT1');
          setPdaStatus('rejected');
          return;
        }

        const char = pdaInputString[pdaIndex];
        if (char === 'a' || char === 'b') {
          const nextNode = 'READ2';
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ1',
            symbolRead: char,
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: nextNode,
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(nextNode);
          setPdaIndex(prev => prev + 1);
        }
        return;
      }

      const readStates = ['READ2', 'READ3', 'READ4', 'READ5', 'READ6', 'READ7'];
      if (readStates.includes(pdaCurrentNodeId)) {
        if (pdaIndex >= pdaInputString.length) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: pdaCurrentNodeId,
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: pdaCurrentNodeId,
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(pdaCurrentNodeId);
          setPdaStatus('rejected');
          return;
        }

        const char = pdaInputString[pdaIndex];
        let nextNode = '';
        if (pdaCurrentNodeId === 'READ2') {
          nextNode = char === 'a' ? 'READ3' : 'READ4';
        } else if (pdaCurrentNodeId === 'READ3') {
          nextNode = char === 'a' ? 'READ5' : 'READ4';
        } else if (pdaCurrentNodeId === 'READ4') {
          nextNode = char === 'a' ? 'READ3' : 'READ6';
        } else if (pdaCurrentNodeId === 'READ5') {
          nextNode = char === 'a' ? 'READ7' : 'READ4';
        } else if (pdaCurrentNodeId === 'READ6') {
          nextNode = char === 'a' ? 'READ3' : 'READ7';
        } else if (pdaCurrentNodeId === 'READ7') {
          nextNode = 'READ8';
        }

        if (nextNode) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: pdaCurrentNodeId,
            symbolRead: char,
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: nextNode,
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(nextNode);
          setPdaIndex(prev => prev + 1);
        }
        return;
      }

      if (pdaCurrentNodeId === 'READ8') {
        if (pdaIndex < pdaInputString.length) {
          const char = pdaInputString[pdaIndex];
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ8',
            symbolRead: char,
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: 'READ8',
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaIndex(prev => prev + 1);
        } else {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ8',
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: 'POP',
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId('POP');
        }
        return;
      }

      if (pdaCurrentNodeId === 'POP') {
        if (pdaStack.length === 0) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'POP',
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: 'POP failed (Empty)',
            nextState: 'REJECT2',
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId('REJECT2');
          setPdaStatus('rejected');
          return;
        }

        const poppedElement = pdaStack[pdaStack.length - 1];
        const newStack = pdaStack.slice(0, -1);
        const newStackStr = `[${newStack.join(', ')}]`;

        if (newStack.length > 0) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'POP',
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: `POP ${poppedElement} failed (Content remaining)`,
            nextState: 'REJECT2',
            stackAfter: newStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaStack(newStack);
          setPdaCurrentNodeId('REJECT2');
          setPdaStatus('rejected');
          return;
        }

        const log: PdaLogEntry = {
          step: stepNumber,
          currentState: 'POP',
          symbolRead: 'Δ',
          stackBefore: currentStackStr,
          operation: `POP ${poppedElement}`,
          nextState: 'ACCEPT',
          stackAfter: newStackStr
        };
        setPdaHistory(prev => [...prev, log]);
        setPdaStack(newStack);
        setPdaCurrentNodeId('ACCEPT');
        setPdaStatus('accepted');
        return;
      }
    } else {
      // PDA 2 logic
      const rejectNode = 'REJECT';

      if (pdaCurrentNodeId === 'READ0') {
        if (pdaIndex >= pdaInputString.length) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ0',
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: 'READ0',
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId('READ0');
          setPdaStatus('rejected');
          return;
        }

        const char = pdaInputString[pdaIndex];
        if (char === '0') {
          const nextNode = 'PUSH_0';
          const newStack = ['0'];
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ0',
            symbolRead: '0',
            stackBefore: currentStackStr,
            operation: 'PUSH 0',
            nextState: nextNode,
            stackAfter: `[${newStack.join(', ')}]`
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(nextNode);
          setPdaStack(newStack);
          setPdaIndex(1);
        } else if (char === '1') {
          const nextNode = 'PUSH_1';
          const newStack = ['1'];
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ0',
            symbolRead: '1',
            stackBefore: currentStackStr,
            operation: 'PUSH 1',
            nextState: nextNode,
            stackAfter: `[${newStack.join(', ')}]`
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(nextNode);
          setPdaStack(newStack);
          setPdaIndex(1);
        } else {
          setPdaStatus('error');
        }
        return;
      }

      if (pdaCurrentNodeId === 'PUSH_0') {
        const nextNode = 'READ2';
        const log: PdaLogEntry = {
          step: stepNumber,
          currentState: 'PUSH_0',
          symbolRead: 'Δ',
          stackBefore: currentStackStr,
          operation: 'None',
          nextState: nextNode,
          stackAfter: currentStackStr
        };
        setPdaHistory(prev => [...prev, log]);
        setPdaCurrentNodeId(nextNode);
        return;
      }

      if (pdaCurrentNodeId === 'PUSH_1') {
        const nextNode = 'READ1';
        const log: PdaLogEntry = {
          step: stepNumber,
          currentState: 'PUSH_1',
          symbolRead: 'Δ',
          stackBefore: currentStackStr,
          operation: 'None',
          nextState: nextNode,
          stackAfter: currentStackStr
        };
        setPdaHistory(prev => [...prev, log]);
        setPdaCurrentNodeId(nextNode);
        return;
      }

      if (pdaCurrentNodeId === 'READ1') {
        if (pdaIndex >= pdaInputString.length) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ1',
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: 'READ1',
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId('READ1');
          setPdaStatus('rejected');
          return;
        }

        const char = pdaInputString[pdaIndex];
        if (char === '0' || char === '1') {
          const nextNode = char === '0' ? 'READ3' : 'READ4';
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ1',
            symbolRead: char,
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: nextNode,
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(nextNode);
          setPdaIndex(prev => prev + 1);
        } else {
          setPdaStatus('error');
        }
        return;
      }

      if (pdaCurrentNodeId === 'READ2') {
        if (pdaIndex >= pdaInputString.length) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ2',
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: 'READ2',
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId('READ2');
          setPdaStatus('rejected');
          return;
        }

        const char = pdaInputString[pdaIndex];
        if (char === '0' || char === '1') {
          const nextNode = char === '1' ? 'READ3' : 'READ4';
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ2',
            symbolRead: char,
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: nextNode,
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(nextNode);
          setPdaIndex(prev => prev + 1);
        } else {
          setPdaStatus('error');
        }
        return;
      }

      const readStates = ['READ3', 'READ4', 'READ5', 'READ6', 'READ7'];
      if (readStates.includes(pdaCurrentNodeId)) {
        if (pdaIndex >= pdaInputString.length) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: pdaCurrentNodeId,
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: pdaCurrentNodeId,
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(pdaCurrentNodeId);
          setPdaStatus('rejected');
          return;
        }

        const char = pdaInputString[pdaIndex];
        let nextNode = '';
        if (pdaCurrentNodeId === 'READ3') {
          nextNode = 'READ4';
        } else if (pdaCurrentNodeId === 'READ4') {
          nextNode = char === '0' ? 'READ6' : 'READ5';
        } else if (pdaCurrentNodeId === 'READ5') {
          nextNode = char === '0' ? 'READ6' : 'READ7';
        } else if (pdaCurrentNodeId === 'READ6') {
          nextNode = char === '1' ? 'READ5' : 'READ7';
        } else if (pdaCurrentNodeId === 'READ7') {
          nextNode = 'READ8';
        }

        if (nextNode) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: pdaCurrentNodeId,
            symbolRead: char,
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: nextNode,
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(nextNode);
          setPdaIndex(prev => prev + 1);
        } else {
          setPdaStatus('error');
        }
        return;
      }

      if (pdaCurrentNodeId === 'READ8') {
        if (pdaIndex < pdaInputString.length) {
          const char = pdaInputString[pdaIndex];
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ8',
            symbolRead: char,
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: 'READ8',
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaIndex(prev => prev + 1);
        } else {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'READ8',
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: 'None',
            nextState: 'POP',
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId('POP');
        }
        return;
      }

      if (pdaCurrentNodeId === 'POP') {
        if (pdaStack.length === 0) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'POP',
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: 'POP failed (Empty)',
            nextState: rejectNode,
            stackAfter: currentStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaCurrentNodeId(rejectNode);
          setPdaStatus('rejected');
          return;
        }

        const poppedElement = pdaStack[pdaStack.length - 1];
        const newStack = pdaStack.slice(0, -1);
        const newStackStr = `[${newStack.join(', ')}]`;

        if (newStack.length > 0) {
          const log: PdaLogEntry = {
            step: stepNumber,
            currentState: 'POP',
            symbolRead: 'Δ',
            stackBefore: currentStackStr,
            operation: `POP ${poppedElement} failed (Content remaining)`,
            nextState: rejectNode,
            stackAfter: newStackStr
          };
          setPdaHistory(prev => [...prev, log]);
          setPdaStack(newStack);
          setPdaCurrentNodeId(rejectNode);
          setPdaStatus('rejected');
          return;
        }

        const log: PdaLogEntry = {
          step: stepNumber,
          currentState: 'POP',
          symbolRead: 'Δ',
          stackBefore: currentStackStr,
          operation: `POP ${poppedElement}`,
          nextState: 'ACCEPT',
          stackAfter: newStackStr
        };
        setPdaHistory(prev => [...prev, log]);
        setPdaStack(newStack);
        setPdaCurrentNodeId('ACCEPT');
        setPdaStatus('accepted');
        return;
      }
    }
  };

  const visitedPdaNodes = useMemo(() => {
    const visited = new Set<string>();
    visited.add('START');
    pdaHistory.forEach(log => {
      visited.add(log.currentState);
      visited.add(log.nextState);
    });
    return Array.from(visited);
  }, [pdaHistory]);

  // Reset function to clear and start fresh for DFA
  const resetSimulation = () => {
    stopInterval();
    setSimulationStatus('idle');
    setCurrentStateId(activeDfa.startState);
    setCurrentIndex(0);
    setHistoryLog([]);
    setIsBatchRunning(false);
    setShowBatchSummary(false);
  };

  // Run full simulation instantly (if needed) or trace slowly
  const startSimulation = () => {
    if (validationError) return;
    
    // If completed or running, reset first to start at beginning
    if (simulationStatus === 'accepted' || simulationStatus === 'rejected' || simulationStatus === 'error') {
      setCurrentStateId(activeDfa.startState);
      setCurrentIndex(0);
      setHistoryLog([]);
    }
    
    setSimulationStatus('running');
  };

  const pauseSimulation = () => {
    setSimulationStatus('paused');
  };

  // Take a single step manually
  const executeSingleStep = () => {
    if (validationError) return;

    if (simulationStatus === 'idle' || simulationStatus === 'accepted' || simulationStatus === 'rejected' || simulationStatus === 'error') {
      // Start fresh
      setCurrentStateId(activeDfa.startState);
      setCurrentIndex(0);
      setHistoryLog([]);
      setSimulationStatus('paused');
      return;
    }

    executeStepLogic();
  };

  // Internal transition logic triggered by timer loops or step triggers
  const executeStepLogic = () => {
    // Check if string fully processed
    if (currentIndex >= inputString.length) {
      finalizeVerdict(currentStateId);
      return;
    }

    const symbol = inputString[currentIndex];
    
    // Find transition
    const transition = activeDfa.transitions.find(
      t => t.from === currentStateId && t.symbol === symbol
    );

    if (!transition) {
      // No transition matches
      setSimulationStatus('error');
      return;
    }

    // Capture transition and log it
    const nextState = transition.to;
    
    const newLog: LogEntry = {
      step: currentIndex + 1,
      fromState: currentStateId,
      symbol: symbol,
      toState: nextState
    };

    setHistoryLog(prev => [...prev, newLog]);
    setCurrentStateId(nextState);
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    // If that was the last symbol, decide outcome immediately for crisp tracing animations
    if (nextIndex >= inputString.length) {
      finalizeVerdict(nextState);
    }
  };

  // Special wrapper to ensure state reacts correctly in timer closures
  const executeNextStepForTimer = () => {
    if (currentIndex >= inputString.length) {
      finalizeVerdict(currentStateId);
      return;
    }
    executeStepLogic();
  };

  // Collect set of visited state ids to render trail highlight
  const visitedStates = useMemo(() => {
    const visited = new Set<string>();
    visited.add(activeDfa.startState); // always start state visited initially
    historyLog.forEach(log => {
      visited.add(log.fromState);
      visited.add(log.toState);
    });
    return Array.from(visited);
  }, [historyLog, activeDfa]);

  // Group transitions by from -> to coordinates to solve overlapping lines beautifully
  const groupedTransitions = useMemo(() => {
    const graph: { [key: string]: { transitions: DfaTransition[]; isCurved: boolean } } = {};
    
    // First, find all connections
    activeDfa.transitions.forEach(trans => {
      const key = `${trans.from}->${trans.to}`;
      if (!graph[key]) {
        graph[key] = { transitions: [], isCurved: false };
      }
      graph[key].transitions.push(trans);
    });

    // Determine if bidirectional pairs exist so both can be curved
    Object.keys(graph).forEach(key => {
      const [from, to] = key.split('->');
      if (from !== to) {
        const oppositeKey = `${to}->${from}`;
        if (graph[oppositeKey]) {
          graph[key].isCurved = true;
          graph[oppositeKey].isCurved = true;
        }
      }
    });

    return graph;
  }, [activeDfa]);

  // Check if string is currently being traversed
  const displayProgressPercent = useMemo(() => {
    if (!inputString.length) return 0;
    return Math.min(100, Math.floor((currentIndex / inputString.length) * 100));
  }, [currentIndex, inputString]);

  // Load preset sample string directly
  const loadPreset = (presetValue: string) => {
    resetSimulation();
    setInputString(presetValue);
  };

  return (
    <div id="automata-tracer-app" className="min-h-screen bg-[#020617] text-slate-100 font-sans flex flex-col relative overflow-x-hidden md:h-screen">
      
      {/* Twilight CSS Keyframe Inline Styles */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .star-item {
          animation: twinkle var(--duration, 4s) infinite ease-in-out;
        }
        @keyframes beam-flow {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        .animated-beam {
          stroke-dasharray: 6, 4;
          animation: beam-flow 1.5s linear infinite;
        }
        .text-glow {
          text-shadow: 0 0 10px rgba(168, 85, 247, 0.6);
        }
        .gold-glow {
          text-shadow: 0 0 12px rgba(251, 191, 36, 0.7);
        }
      `}</style>

      {/* Dynamic Cosmic Backdrops */}
      <div className="absolute inset-0 select-none pointer-events-none z-0 overflow-hidden">
        {/* Deep gaseous cluster filters */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-950/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-purple-950/10 rounded-full blur-[150px]"></div>
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-80 h-80 bg-violet-950/15 rounded-full blur-[100px]"></div>

        {/* Twinkling Starfield Layer */}
        {stars.map(star => (
          <div
            key={star.id}
            className={`absolute rounded-full star-item ${star.color}`}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              '--duration': `${star.duration}s`,
              opacity: star.size > 1.5 ? 0.9 : 0.4,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Primary Immersive Top Header */}
      <header id="main-header" className="h-16 shrink-0 border-b border-purple-950/50 bg-slate-950/40 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-purple-400 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.4)]">
            <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-ping"></div>
          </div>
          <div>
            <span className="text-[10px] tracking-widest text-purple-400 uppercase font-bold block leading-none">Automata Project</span>
            <h1 className="text-sm md:text-base font-extrabold tracking-wider uppercase text-white mt-0.5">Constellation <span className="text-purple-400 text-glow">Tracer</span></h1>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex bg-slate-900/60 p-1 border border-white/5 rounded-full shadow-inner">
          <button
            id="tab-dfa"
            onClick={() => setSelectedTab('dfa')}
            className={`px-4 md:px-6 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 ${
              selectedTab === 'dfa' 
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 font-bold scale-105' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>DFA</span>
          </button>
          <button
            id="tab-pda"
            onClick={() => setSelectedTab('pda')}
            className={`px-4 md:px-6 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 ${
              selectedTab === 'pda' 
                ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-900/40 font-bold scale-105' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>PDA</span>
          </button>
          <button
          id="tab-cfg"
          onClick={() => setSelectedTab('cfg')}
          className={`px-4 md:px-6 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 ${
            selectedTab === 'cfg' 
              ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40 font-bold scale-105' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>CFG</span>
        </button>
        </nav>

        {/* Metadata Badging */}
        <div className="hidden lg:flex items-center gap-2.5 text-xs text-slate-500 font-mono">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>FINALS ENGINE Ready</span>
        </div>
      </header>

      {/* Main Container Setup */}
      <main id="main-content" className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10 w-full max-w-[1920px] mx-auto">
        
        {/* ======================= TAB 1: DFA SYSTEM ======================= */}
        {selectedTab === 'dfa' && (
          <>
            {/* Sidebar Controls Panel */}
            <aside id="sidebar-dfa" className="w-full md:w-80 shrink-0 border-r border-purple-950/40 bg-slate-950/40 backdrop-blur-md p-5 flex flex-col gap-5 overflow-y-auto max-h-screen md:max-h-full">
              
              {/* Box 1: Dropdown selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="dfa-select" className="text-[10px] uppercase font-bold tracking-widest text-purple-400">Selected Orbit</label>
                  <span className="text-[10px] font-mono bg-purple-950/60 border border-purple-500/20 px-2 py-0.5 rounded text-purple-300 font-bold shrink-0 whitespace-nowrap">ALPHABET: {activeDfa.alphabet.join(', ')}</span>
                </div>
                <select 
                  id="dfa-select" 
                  value={selectedDfaId}
                  onChange={(e) => setSelectedDfaId(e.target.value)}
                  className="w-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors shadow-inner font-medium cursor-pointer"
                >
                  {DFAS.map(dfa => (
                    <option key={dfa.id} value={dfa.id} className="bg-slate-950 text-slate-200">
                      {dfa.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Box 2: Regex & Specifications Panel */}
              <div className="bg-purple-950/15 border border-purple-500/10 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold text-purple-200">System Formula (Regex)</span>
                </div>
                <div className="bg-slate-950/60 rounded-lg p-2 border border-purple-950 font-mono text-[11px] text-purple-300 tracking-wide overflow-x-auto break-all scrollbar-thin whitespace-pre-wrap">
                  {activeDfa.regex}
                </div>
                <p className="text-[11px] text-slate-400 italic font-sans leading-relaxed">
                  {activeDfa.description}
                </p>
              </div>

              {/* Box 3: Mode Toggle & Inputs */}
              <div className="space-y-3">
                <div className="flex bg-slate-900/60 p-1 border border-white/5 rounded-lg shadow-inner">
                  <button
                    onClick={() => { setInputMode('single'); resetSimulation(); }}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold tracking-wider transition-all duration-300 ${
                      inputMode === 'single' ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Single Mode
                  </button>
                  <button
                    onClick={() => { setInputMode('batch'); resetSimulation(); }}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold tracking-wider transition-all duration-300 ${
                      inputMode === 'batch' ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Batch Mode
                  </button>
                </div>
                
                {inputMode === 'single' ? (
                  <>
                    <label htmlFor="string-input" className="text-[10px] uppercase font-bold tracking-widest text-purple-400 block">String Stream Selector</label>
                    <div className="relative">
                      <input 
                        id="string-input"
                        type="text" 
                        placeholder={`Enter symbol streams (${activeDfa.alphabet.join(', ')})...`} 
                        value={inputString} 
                        onChange={(e) => {
                          resetSimulation();
                          setInputString(e.target.value);
                        }}
                        className={`w-full bg-slate-900/90 border rounded-xl pl-3 pr-8 py-2 text-sm focus:outline-none transition-colors font-mono tracking-widest ${
                          validationError 
                            ? 'border-rose-500/50 bg-rose-950/10 text-rose-200 focus:border-rose-500' 
                            : 'border-white/10 text-purple-100 focus:border-purple-500'
                        }`}
                      />
                      {inputString && (
                        <button 
                          onClick={() => {
                            setInputString('');
                            resetSimulation();
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none font-mono text-xs"
                          title="Clear string"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Validation Errors banner */}
                    {validationError && (
                      <div className="flex items-start gap-1.5 p-2 bg-rose-950/30 border border-rose-500/20 rounded-lg text-rose-300 text-[10px] leading-tight font-sans">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span>{validationError}</span>
                      </div>
                    )}

                    {/* Suggestions triggers */}
                    <div className="space-y-1.5 pt-1.5">
                      <span className="text-[10px] text-slate-500 block font-semibold uppercase">Helpful Presets:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => loadPreset(activeDfa.sampleInput)}
                          className="text-[10px] font-mono bg-emerald-950/50 hover:bg-emerald-900/40 border border-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md transition-colors"
                        >
                          Suggest Action ({activeDfa.sampleInput})
                        </button>
                        <button
                          onClick={() => loadPreset(activeDfa.sampleInputInvalid)}
                          className="text-[10px] font-mono bg-rose-950/50 hover:bg-rose-900/40 border border-rose-500/20 text-rose-300 px-2.5 py-1 rounded-md transition-colors"
                        >
                          Suggest Trap ({activeDfa.sampleInputInvalid})
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-purple-400 block">Batch Input Queue</label>
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
                              newBatch[idx] = e.target.value;
                              setBatchInputs(newBatch);
                              resetSimulation();
                            }}
                            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 transition-colors font-mono tracking-widest text-purple-100"
                          />
                        </div>
                      ))}
                      <div className="flex justify-between items-center px-1">
                        <button onClick={() => setBatchInputs([...batchInputs, ''])} className="text-[10px] text-purple-400 hover:text-purple-300 uppercase font-bold">+ Add String</button>
                        {batchInputs.length > 3 && (
                          <button onClick={() => setBatchInputs(batchInputs.slice(0, -1))} className="text-[10px] text-rose-400 hover:text-rose-300 uppercase font-bold">- Remove</button>
                        )}
                      </div>
                    </div>

                    {validationError && (
                      <div className="flex items-start gap-1.5 p-2 bg-rose-950/30 border border-rose-500/20 rounded-lg text-rose-300 text-[10px] leading-tight font-sans">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span>{validationError}</span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        resetSimulation();
                        setBatchResults([]);
                        
                        // find first non-empty input
                        let firstIndex = 0;
                        while (firstIndex < batchInputs.length && !batchInputs[firstIndex]) {
                          firstIndex++;
                        }
                        
                        if (firstIndex < batchInputs.length) {
                          setCurrentBatchIndex(firstIndex);
                          setInputString(batchInputs[firstIndex]);
                          setIsBatchRunning(true);
                          setTimeout(() => setSimulationStatus('running'), 50);
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
                  </>
                )}
              </div>

              {/* Box 4: Execution Controllers */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-purple-400 block">Orbits Controller</label>
                <div className="grid grid-cols-2 gap-2">
                  {simulationStatus === 'running' ? (
                    <button
                      onClick={pauseSimulation}
                      disabled={isBatchRunning}
                      className={`bg-purple-700 hover:bg-purple-600 text-white rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-950/40 ${isBatchRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>PAUSE</span>
                    </button>
                  ) : (
                    <button
                      onClick={startSimulation}
                      disabled={!!validationError || isBatchRunning}
                      className={`rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        validationError || isBatchRunning
                          ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
                          : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-950/60'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>AUTO TRACE</span>
                    </button>
                  )}

                  <button
                    onClick={executeSingleStep}
                    disabled={!!validationError || simulationStatus === 'accepted' || simulationStatus === 'rejected' || isBatchRunning}
                    className={`rounded-xl py-2 px-3 text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      validationError || simulationStatus === 'accepted' || simulationStatus === 'rejected' || isBatchRunning
                        ? 'bg-slate-900/20 text-slate-600 border-white/5 cursor-not-allowed opacity-45'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-white/10'
                    }`}
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>NEXT STEP</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1.5">
                  <button
                    onClick={resetSimulation}
                    className="bg-slate-950 hover:bg-slate-900 text-slate-300 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>RESET SIMULATION</span>
                  </button>
                </div>
              </div>

              {/* Box 5: Simulation Speed slider */}
              <div className="space-y-2 bg-slate-950/20 border border-white/5 p-3 rounded-xl">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  <span className="flex items-center gap-1"><Sliders className="w-3 h-3" /> Trans Rate</span>
                  <span className="font-mono text-purple-400">{speedMs}ms</span>
                </div>
                <input 
                  type="range" 
                  min="200" 
                  max="2000" 
                  step="100"
                  value={speedMs}
                  onChange={(e) => setSpeedMs(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-medium">
                  <span>Fast (200ms)</span>
                  <span>Slow (2.0s)</span>
                </div>
              </div>

              {/* Box 6: Active state orbit meter (at bottom of sidebar) */}
              <div className="mt-auto border-t border-purple-950/30 pt-3">
                <div className="bg-purple-950/20 rounded-xl p-3 border border-purple-500/10 flex items-center gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-full border border-purple-500/20 bg-slate-950/80 flex items-center justify-center relative">
                    <div className="absolute inset-0.5 rounded-full border border-dashed border-purple-400/40 animate-spin" style={{ animationDuration: '6s' }}></div>
                    <span className="text-sm font-mono font-black text-purple-400 tracking-tight">{currentStateId}</span>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">Space Coordinate</div>
                    <div className="text-xs font-bold font-mono text-white mt-0.5">
                      {simulationStatus === 'idle' ? 'LOCKED AT START' : simulationStatus.toUpperCase()}
                    </div>
                    {currentIndex < inputString.length ? (
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
                        Reading input: <span className="p-[1px_4px] bg-sky-500/20 border border-sky-400/20 rounded text-sky-300 font-bold font-mono">{inputString[currentIndex]}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mt-1 font-sans">Queue Empty</div>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* Visualization and History Arena */}
            <section id="visualization-arena" className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-slate-900/30 to-slate-950/80 relative">
              
              {/* Star-Map Canvas Controls toolbar */}
              <div className="h-10 shrink-0 border-b border-white/5 px-4 flex items-center justify-between text-xs text-slate-400 z-10 bg-slate-950/15">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                  <span className="font-bold tracking-wide uppercase text-[10px] text-slate-300">Constellation Chart: {activeDfa.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Start
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Accepting
                  </span>
                  {activeDfa.states.some(s => s.isTrap) && (
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-700"></span> Trap Horizon
                    </span>
                  )}
                  <button 
                    onClick={() => setIsHowToOpen(true)}
                    className="ml-2 hover:text-white transition-colors flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-white/5 font-sans font-semibold cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3 text-purple-400" />
                    How to trace?
                  </button>
                </div>
              </div>

              {/* The Interactive Interactive SVG Map Canvas */}
              <div id="svg-stage-container" className="flex-1 relative cursor-crosshair overflow-hidden p-2 min-h-[300px]">
                
                <svg 
                  className="absolute inset-0 w-full h-full text-purple-500"
                  viewBox="0 0 850 400"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* SVG GLOW FILTERS AND MARKERS DEFINITIONS */}
                  <defs>
                    <filter id="glow-active-star" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="9" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    
                    <filter id="glow-accept-star" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="11" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    <filter id="glow-line" filterUnits="userSpaceOnUse" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Standard Traverse Edge Head Arrow */}
                    <marker
                      id="arrow-std"
                      viewBox="0 0 10 10"
                      refX="9" 
                      refY="5"
                      markerWidth="6.5"
                      markerHeight="6.5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 1 2 L 9 5 L 1 8 z" fill="#c084fc" />
                    </marker>

                    {/* Highly active/glowing beam arrowhead */}
                    <marker
                      id="arrow-hot"
                      viewBox="0 0 10 10"
                      refX="10"
                      refY="5"
                      markerWidth="7.5"
                      markerHeight="7.5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" />
                    </marker>
                    
                    {/* Dark Horizon trap arrowhead */}
                    <marker
                      id="arrow-trap"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 1 2 L 9 5 L 1 8 z" fill="#ef4444" />
                    </marker>

                    {/* Green Start state marker */}
                    <marker
                      id="arrow-green"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6.5"
                      markerHeight="6.5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 1 2 L 9 5 L 1 8 z" fill="#10b981" />
                    </marker>

                    {/* Blue Accept state marker */}
                    <marker
                      id="arrow-blue"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6.5"
                      markerHeight="6.5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 1 2 L 9 5 L 1 8 z" fill="#3b82f6" />
                    </marker>
                  </defs>

                  {/* STEP 1: CONSTELLATION LINK ORBITS (TRANSITION ARROWS) */}
                  {Object.entries(groupedTransitions).map(([key, val]) => {
                    const groupValue = val as any;
                    const [fromStateId, toStateId] = key.split('->');
                    
                    const fromNode = activeDfa.states.find(s => s.id === fromStateId);
                    const toNode = activeDfa.states.find(s => s.id === toStateId);

                    if (!fromNode || !toNode) return null;

                    // Group labels together
                    const symbolsText = groupValue.transitions.map(t => t.symbol).join(', ');

                    // Check if current connection beam is active (i.e. just traversed in last logged step)
                    const isLastTransitionTaken = historyLog.length > 0 && 
                      historyLog[historyLog.length - 1].fromState === fromStateId && 
                      historyLog[historyLog.length - 1].toState === toStateId;

                    const isAnyTransitionTaken = historyLog.some(log => log.fromState === fromStateId && log.toState === toStateId);

                    const isSelfLoop = fromStateId === toStateId;

                    // Core line stroke styling
                    let strokeColor: string | undefined = 'rgba(168, 85, 247, 0.18)'; 
                    let strokeWidth: number | string | undefined = 1.5;
                    let markerEndSuffix = 'std';
                    let isAnimated = false;

                    if (isLastTransitionTaken) {
                      if (isSelfLoop) {
                        strokeColor = undefined;
                        strokeWidth = undefined;
                        markerEndSuffix = 'hot';
                      } else {
                        strokeColor = '#fbbf24'; // hot transition glowing
                        strokeWidth = 3;
                        markerEndSuffix = 'hot';
                        isAnimated = true;
                      }
                    } else if (isAnyTransitionTaken && simulationStatus !== 'idle') {
                      strokeColor = 'rgba(124, 58, 237, 0.5)'; // previously visited trail link
                      strokeWidth = 1.8;
                    }

                    if (toNode.isTrap) {
                      strokeColor = isLastTransitionTaken ? '#ef4444' : 'rgba(239, 68, 68, 0.16)';
                      strokeWidth = isLastTransitionTaken ? 2.5 : 1.2;
                      markerEndSuffix = 'trap';
                    } else if (toNode.isAccepting) {
                      strokeColor = isLastTransitionTaken 
                        ? '#fbbf24' 
                        : isAnyTransitionTaken && simulationStatus !== 'idle'
                          ? 'rgba(59, 130, 246, 0.75)' 
                          : 'rgba(59, 130, 246, 0.28)';
                      strokeWidth = isLastTransitionTaken ? 3 : 1.8;
                      markerEndSuffix = isLastTransitionTaken ? 'hot' : 'blue';
                    }

                    // Dynamically calculate sizes to clip transitions exactly at the border
                    const isFromStart = fromStateId === activeDfa.startState;
                    const isToStart = toStateId === activeDfa.startState;
                    const rFrom = isFromStart ? 20 : fromNode.isAccepting ? 24 : 20;
                    const rTo = isToStart ? 20 : toNode.isAccepting ? 24 : 20;

                    // Render curved or straight lines/loops
                    const transitionKey = isLastTransitionTaken ? `${key}-${historyLog.length}` : key;
                    let animatedClass = isAnimated ? 'animated-beam flash-path' : '';
                    if (isSelfLoop && isLastTransitionTaken) {
                      animatedClass = 'animated-beam self-loop-active';
                    }

                    if (isSelfLoop) {
                      // Curved circle path above the star node, sized tightly to avoid cropping
                      const R = rFrom;
                      const xStart = fromNode.x - R * 0.6;
                      const yStart = fromNode.y - R * 0.8;
                      const xEnd = fromNode.x + R * 0.6;
                      const yEnd = fromNode.y - R * 0.8;
                      
                      const cp1x = fromNode.x - R * 1.1;
                      const cp1y = fromNode.y - R * 1.6;
                      const cp2x = fromNode.x + R * 1.1;
                      const cp2y = fromNode.y - R * 1.6;

                      const arcPath = `M ${xStart} ${yStart} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${xEnd} ${yEnd}`;
                      return (
                        <g key={transitionKey}>
                          <path
                            d={arcPath}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            markerEnd={`url(#arrow-${markerEndSuffix})`}
                            className={animatedClass}
                            style={isLastTransitionTaken ? { filter: 'url(#glow-line)' } : {}}
                          />
                          <rect
                            x={fromNode.x - Math.max(24, symbolsText.length * 7 + 10) / 2}
                            y={fromNode.y - R - 30}
                            width={Math.max(24, symbolsText.length * 7 + 10)}
                            height="13"
                            rx="4"
                            fill="#090d1f"
                            className="stroke-purple-500/10 stroke-[0.5]"
                          />
                          <text
                            x={fromNode.x}
                            y={fromNode.y - R - 20}
                            textAnchor="middle"
                            className="fill-purple-300 font-mono font-bold"
                            style={{ fontSize: '10px' }}
                          >
                            {symbolsText}
                          </text>
                        </g>
                      );
                    } else if (groupValue.isCurved) {
                      // Quadratic bezier to space lines apart
                      const dx = toNode.x - fromNode.x;
                      const dy = toNode.y - fromNode.y;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      const px = -dy / len;
                      const py = dx / len;
                      
                      const mx = (fromNode.x + toNode.x) / 2;
                      const my = (fromNode.y + toNode.y) / 2;
                      
                      // A constant offset naturally curves bidirectional lines apart 
                      // because px, py swap signs when to/from are reversed.
                      const offsetDistance = 45;
                      const cx = mx + px * offsetDistance;
                      const cy = my + py * offsetDistance;

                      // Tangent vectors for clean on-the-circle-edge calculations
                      const tdx = toNode.x - cx;
                      const tdy = toNode.y - cy;
                      const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
                      const tux = tdx / tlen;
                      const tuy = tdy / tlen;
                      
                      const arrowOffset = 1.5; 
                      const endPointX = toNode.x - (rTo + arrowOffset) * tux;
                      const endPointY = toNode.y - (rTo + arrowOffset) * tuy;

                      const sdx = cx - fromNode.x;
                      const sdy = cy - fromNode.y;
                      const slen = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
                      const sux = sdx / slen;
                      const suy = sdy / slen;
                      
                      const startPointX = fromNode.x + rFrom * sux;
                      const startPointY = fromNode.y + rFrom * suy;

                      const bezierPath = `M ${startPointX} ${startPointY} Q ${cx} ${cy} ${endPointX} ${endPointY}`;
                      
                      // Calculate exact midpoint on bezier for symbols bubble
                      const bx = 0.25 * startPointX + 0.5 * cx + 0.25 * endPointX;
                      const by = 0.25 * startPointY + 0.5 * cy + 0.25 * endPointY;

                      return (
                        <g key={transitionKey}>
                          <path
                            d={bezierPath}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            markerEnd={`url(#arrow-${markerEndSuffix})`}
                            className={animatedClass}
                            style={isLastTransitionTaken ? { filter: 'url(#glow-line)' } : {}}
                          />
                          <rect
                            x={bx - Math.max(24, symbolsText.length * 7 + 10) / 2}
                            y={by - 8}
                            width={Math.max(24, symbolsText.length * 7 + 10)}
                            height="13"
                            rx="4"
                            fill="#090d1f"
                            className="stroke-purple-500/10 stroke-[0.5]"
                          />
                          <text
                            x={bx}
                            y={by + 2}
                            textAnchor="middle"
                            className="fill-purple-400 font-mono font-bold"
                            style={{ fontSize: '9px' }}
                          >
                            {symbolsText}
                          </text>
                        </g>
                      );
                    } else {
                      // Straightforward line connecting nodes
                      const dx = toNode.x - fromNode.x;
                      const dy = toNode.y - fromNode.y;
                      const len = Math.sqrt(dx * dx + dy * dy) || 1;
                      const ux = dx / len;
                      const uy = dy / len;
                      
                      const arrowOffset = 1.5;
                      const startPointX = fromNode.x + rFrom * ux;
                      const startPointY = fromNode.y + rFrom * uy;
                      const endPointX = toNode.x - (rTo + arrowOffset) * ux;
                      const endPointY = toNode.y - (rTo + arrowOffset) * uy;

                      const textX = (fromNode.x + toNode.x) / 2;
                      const textY = (fromNode.y + toNode.y) / 2;

                      return (
                        <g key={transitionKey}>
                          <line
                            x1={startPointX}
                            y1={startPointY}
                            x2={endPointX}
                            y2={endPointY}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            markerEnd={`url(#arrow-${markerEndSuffix})`}
                            className={animatedClass}
                            style={isLastTransitionTaken ? { filter: 'url(#glow-line)' } : {}}
                          />
                          <rect
                            x={textX - Math.max(24, symbolsText.length * 7 + 10) / 2}
                            y={textY - 8}
                            width={Math.max(24, symbolsText.length * 7 + 10)}
                            height="13"
                            rx="4"
                            fill="#090d1f"
                            className="stroke-purple-500/10 stroke-[0.5]"
                          />
                          <text
                            x={textX}
                            y={textY + 2}
                            textAnchor="middle"
                            className="fill-purple-400 font-mono font-bold"
                            style={{ fontSize: '9px' }}
                          >
                            {symbolsText}
                          </text>
                        </g>
                      );
                    }
                  })}

                  {/* START STATE ARROW INDICATOR */}
                  {(() => {
                    const startNode = activeDfa.states.find(s => s.isStart);
                    if (!startNode) return null;
                    return (
                      <g>
                        <line
                          x1={startNode.x - 55}
                          y1={startNode.y}
                          x2={startNode.x - 22}
                          y2={startNode.y}
                          stroke="#10b981"
                          strokeWidth="2"
                          markerEnd="url(#arrow-green)"
                        />
                        <text
                          x={startNode.x - 41}
                          y={startNode.y - 6}
                          textAnchor="middle"
                          style={{ fill: '#34d399', fontSize: '9px', fontWeight: 'bold' }}
                        >
                          START
                        </text>
                      </g>
                    );
                  })()}

                  {/* STEP 2: CONSTELLATION NODES (STATE STAR CIRCLES) */}
                  {activeDfa.states.map(state => {
                    const isCurrent = state.id === currentStateId;
                    const isStart = state.id === activeDfa.startState;
                    const isVisited = visitedStates.includes(state.id);
                    const isAccepting = state.isAccepting;
                    const isTrap = state.isTrap;

                    // Pick border styling dynamically to reflect states
                    let borderFill = '#1e293b'; 
                    let borderStroke = 'rgba(255, 255, 255, 0.3)';
                    let labelColor = '#e2e8f0';
                    let glowFilter = '';
                    let circleRadius = 20;

                    if (isCurrent) {
                      if (isStart) {
                        // Green start state (active)
                        borderFill = '#10b981'; 
                        borderStroke = '#34d399';
                        labelColor = '#064e3b';
                        glowFilter = 'url(#glow-active-star)';
                      } else if (isAccepting) {
                        // Blue accept state (active)
                        borderFill = '#3b82f6'; 
                        borderStroke = '#60a5fa';
                        labelColor = '#eff6ff';
                        glowFilter = 'url(#glow-accept-star)';
                      } else if (isTrap) {
                        borderFill = '#f43f5e'; // burning pulsar core for traps
                        borderStroke = '#e11d48';
                        labelColor = '#0f172a';
                        glowFilter = 'url(#glow-active-star)';
                      } else {
                        borderFill = '#c084fc'; // glowing cobalt purple active state
                        borderStroke = '#c084fc';
                        labelColor = '#0f172a';
                        glowFilter = 'url(#glow-active-star)';
                      }
                    } else {
                      // Inactive state options
                      if (isStart) {
                        // Green start state (inactive)
                        borderFill = '#022c22';
                        borderStroke = '#059669';
                        labelColor = '#a7f3d0';
                      } else if (isAccepting) {
                        // Blue accept state (inactive)
                        borderFill = '#1e3a8a';
                        borderStroke = '#3b82f6';
                        labelColor = '#bfdbfe';
                      } else if (isTrap) {
                        borderFill = '#1c050c';
                        borderStroke = '#b91c1c'; // deep red crimson gravity borders
                        labelColor = '#fca5a5';
                      } else if (isVisited) {
                        borderFill = '#0f172a';
                        borderStroke = '#c084fc'; // soft purple trail border
                        labelColor = '#e9d5ff';
                      } else {
                        borderFill = '#070a1e';
                        borderStroke = 'rgba(168, 85, 247, 0.22)';
                        labelColor = '#94a3b8';
                      }
                    }

                    return (
                      <g 
                        key={state.id}
                        className="transition-all duration-300 transform"
                      >
                        {/* Outer Glow Ring for active or accepting states */}
                        {isAccepting && (
                          <circle
                            cx={state.x}
                            cy={state.y}
                            r={circleRadius + 4}
                            fill="none"
                            stroke={isCurrent ? '#bfdbfe' : 'rgba(59, 130, 246, 0.45)'}
                            strokeWidth={isCurrent ? 2 : 1}
                            strokeDasharray="4, 2"
                            className={isCurrent ? 'animate-spin' : ''}
                            style={{ transformOrigin: `${state.x}px ${state.y}px`, animationDuration: '10s' }}
                          />
                        )}

                        {/* Core Star Node Circle */}
                        <circle
                          cx={state.x}
                          cy={state.y}
                          r={circleRadius}
                          fill={borderFill}
                          stroke={borderStroke}
                          strokeWidth={isCurrent ? 3.5 : isAccepting ? 2.2 : 1.5}
                          filter={glowFilter}
                          className="transition-all duration-300"
                        />

                        {/* Double inner ring for accepting states */}
                        {isAccepting && !isCurrent && (
                          <circle
                            cx={state.x}
                            cy={state.y}
                            r={circleRadius - 4}
                            fill="none"
                            stroke="rgba(59, 130, 246, 0.35)"
                            strokeWidth="1"
                          />
                        )}

                        {/* Star core sparkles trigger */}
                        {isCurrent && (
                          <circle
                            cx={state.x}
                            cy={state.y}
                            r={6}
                            fill="rgba(255, 255, 255, 0.7)"
                            className="animate-ping"
                          />
                        )}

                        {/* State Labels */}
                        <text
                          x={state.x}
                          y={state.y}
                          dy={isStart || isAccepting ? "4.5" : "4"}
                          textAnchor="middle"
                          className="font-mono font-extrabold select-none pointer-events-none"
                          fill={labelColor}
                          style={{ fontSize: isStart || isAccepting ? '15px' : '11px', letterSpacing: '-0.5px' }}
                        >
                          {isStart ? '−' : isAccepting ? '＋' : state.label}
                        </text>

                        {/* Little helper role badges */}
                        {isStart && (
                          <text
                            x={state.x}
                            y={state.y + 28}
                            textAnchor="middle"
                            className="fill-emerald-400 font-sans font-bold select-none text-[8px] uppercase tracking-wider"
                          >
                            START
                          </text>
                        )}
                        {isAccepting && !isStart && (
                          <text
                            x={state.x}
                            y={state.y + 28}
                            textAnchor="middle"
                            className="fill-blue-400 font-sans font-extrabold select-none text-[8px] uppercase tracking-wider animate-pulse"
                          >
                            ACCEPT
                          </text>
                        )}
                        {isTrap && (
                          <text
                            x={state.x}
                            y={state.y + 28}
                            textAnchor="middle"
                            className="fill-rose-500 font-sans font-bold select-none text-[8.5px] uppercase tracking-wider text-glow"
                          >
                            TRAP
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Overlaid Float Alert Notification on success/failure */}
                {(simulationStatus === 'accepted' || simulationStatus === 'rejected') && (
                  <div 
                    id="simulation-verdict"
                    className={`absolute bottom-4 right-4 md:bottom-6 md:right-6 border p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 transition-all duration-500 scale-100 z-10 animate-bounce ${
                      simulationStatus === 'accepted'
                        ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50'
                        : 'bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      simulationStatus === 'accepted' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-slate-100'
                    }`}>
                      {simulationStatus === 'accepted' ? (
                        <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                      ) : (
                        <XCircle className="w-6 h-6 stroke-[2.5]" />
                      )}
                    </div>
                    <div>
                      <div className={`text-sm tracking-widest uppercase font-black ${
                        simulationStatus === 'accepted' ? 'text-emerald-400 text-glow' : 'text-rose-400 text-glow'
                      }`}>
                        String {simulationStatus.toUpperCase()}!
                      </div>
                      <div className="text-[10px] text-slate-300 mt-0.5 font-medium">
                        {simulationStatus === 'accepted' 
                          ? 'Complete pattern matched perfectly' 
                          : `Stuck at state ${currentStateId} on final check`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Overlaid Batch Summary Notification */}
                {showBatchSummary && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                      <div className="bg-purple-900/40 border-b border-purple-500/30 p-4 flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-purple-400" /> Batch Execution Summary</h3>
                        <button onClick={() => setShowBatchSummary(false)} className="text-slate-400 hover:text-white">×</button>
                      </div>
                      <div className="p-4 max-h-[60vh] overflow-y-auto">
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

              {/* Traversal Logs & Core Status Footer */}
              <footer id="history-footer" className="h-56 border-t border-purple-950/50 bg-[#04081c]/90 p-4 md:p-5 flex flex-col md:flex-row gap-5 shrink-0 z-10 relative">
                
                {/* Scrollable transition logs */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                      <Logs className="w-3.5 h-3.5 text-purple-400" />
                      Constellation Transition Log
                    </label>
                    <span className="text-[9px] font-mono text-slate-500">{historyLog.length} Transitions made</span>
                  </div>
                  
                  <div 
                    id="transition-log-box" 
                    className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1.5 pr-2 border border-purple-950/40 bg-slate-950/50 rounded-xl p-3 scrollbar-thin"
                  >
                    {historyLog.length === 0 ? (
                      <div className="text-slate-500 italic text-center h-full flex items-center justify-center text-[10px]">
                        Simulation idle. Click AUTO TRACE or NEXT STEP to initiate.
                      </div>
                    ) : (
                      historyLog.map((log, i) => {
                        const isCurrentLog = i === historyLog.length - 1 && (simulationStatus === 'running' || simulationStatus === 'paused');
                        return (
                          <div 
                            key={log.step} 
                            className={`flex items-center gap-3 py-1 px-2.5 rounded transition-all ${
                              isCurrentLog 
                                ? 'bg-purple-500/10 text-white border border-purple-500/20 shadow-md' 
                                : 'text-slate-400 border border-transparent'
                            }`}
                          >
                            <span className="w-5 shrink-0 text-slate-600 font-bold text-right italic">#{String(log.step).padStart(2, '0')}</span>
                            <span className="font-semibold text-purple-400">({log.fromState})</span>
                            <span className="text-slate-500 flex items-center shrink-0">
                              ── <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-white/5 font-extrabold text-amber-400 scale-105">'{log.symbol}'</span> ──▶
                            </span>
                            <span className="font-semibold text-purple-300">({log.toState})</span>
                            {isCurrentLog ? (
                              <span className="ml-[auto] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded text-[8px] tracking-widest uppercase font-black">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="ml-[auto] text-slate-600 text-[8px] uppercase font-bold tracking-wider">
                                PASSED
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right side string processing tracker */}
                <div className="w-full md:w-72 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-5">
                  <div className="text-center md:text-left space-y-1">
                    <div className="text-[10px] uppercase text-slate-400 tracking-widest font-bold">Scanning Symbol Stream</div>
                    
                    {/* Character ticker list */}
                    {inputString ? (
                      <div id="character-ticker" className="flex flex-wrap gap-1 justify-center md:justify-start font-mono text-base md:text-lg font-black pt-1">
                        {inputString.split('').map((char, index) => {
                          const isActiveChar = index === currentIndex && (simulationStatus === 'running' || simulationStatus === 'paused');
                          const isParsedChar = index < currentIndex;
                          
                          let chrBgColor = 'bg-slate-900 border-white/5 text-slate-400';
                          if (isActiveChar) {
                            chrBgColor = 'bg-amber-500 border-amber-400 text-slate-900 font-extrabold scale-110 shadow-lg shadow-amber-500/20 active-char-glow';
                          } else if (isParsedChar) {
                            chrBgColor = 'bg-purple-950/60 border-purple-500/20 text-purple-300 opacity-60';
                          }
                          
                          return (
                            <span
                              key={index}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center border text-sm md:text-base font-mono transition-all ${chrBgColor}`}
                            >
                              {char}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-slate-600 italic text-xs py-2 font-mono">[No character to read]</div>
                    )}
                  </div>

                  {/* Percentage progression bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-400">
                      <span>STREAMING ACCURACY</span>
                      <span className="text-purple-400">{displayProgressPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 border border-white/5 rounded-full overflow-hidden p-[1px]">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${displayProgressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Live Simulation Indicator badge */}
                  <div className="pt-2 text-center">
                    {simulationStatus === 'idle' && (
                      <div className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-600"></span> WAITING TO ENGAGE
                      </div>
                    )}
                    {simulationStatus === 'running' && (
                      <div className="text-[10px] font-extrabold tracking-widest text-amber-400 uppercase flex items-center justify-center gap-1.5 animate-pulse gold-glow">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span> TRACING STAR SYSTEM...
                      </div>
                    )}
                    {simulationStatus === 'paused' && (
                      <div className="text-[10px] font-extrabold tracking-widest text-purple-400 uppercase flex items-center justify-center gap-1 text-glow">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span> ORBIT PAUSED
                      </div>
                    )}
                    {simulationStatus === 'accepted' && (
                      <div className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase flex items-center justify-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> SYSTEM ACCEPTED
                      </div>
                    )}
                    {simulationStatus === 'rejected' && (
                      <div className="text-[10px] font-extrabold tracking-widest text-rose-500 uppercase flex items-center justify-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> STRING REJECTED
                      </div>
                    )}
                    {simulationStatus === 'error' && (
                      <div className="text-[10px] font-extrabold tracking-widest text-rose-400 uppercase flex items-center justify-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span> TRACE FAIL
                      </div>
                    )}
                  </div>
                </div>
              </footer>
            </section>
          </>
        )}

        {/* ======================= TAB 2: PDA SYSTEM ======================= */}
        {selectedTab === 'pda' && (
          <>
            {/* Sidebar Controls Panel */}
            <aside id="sidebar-pda" className="w-full md:w-80 shrink-0 border-r border-purple-950/40 bg-slate-950/40 backdrop-blur-md p-5 flex flex-col gap-5 overflow-y-auto max-h-screen md:max-h-full">
              {/* Dropdown selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="pda-select" className="text-[10px] uppercase font-bold tracking-widest text-purple-400">Selected Pushdown Machine</label>
                  <span className="text-[10px] font-mono bg-purple-950/60 border border-purple-500/20 px-2 py-0.5 rounded text-purple-300 font-bold shrink-0 whitespace-nowrap">ALPHABET: {selectedPdaId === 'pda1' ? 'a, b' : '0, 1'}</span>
                </div>
                <select 
                  id="pda-select" 
                  value={selectedPdaId}
                  onChange={(e) => {
                    resetPdaSimulation();
                    setSelectedPdaId(e.target.value);
                  }}
                  className="w-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors shadow-inner font-medium cursor-pointer"
                >
                  <option value="pda1" className="bg-slate-950 text-slate-200">PDA 1: a/b</option>
                  <option value="pda2" className="bg-slate-950 text-slate-200">PDA 2: 0/1</option>
                </select>
              </div>

              {/* Specifications Panel */}
              <div className="bg-purple-950/15 border border-purple-500/10 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold text-purple-200">System Formula (Regex)</span>
                </div>
                <div className="bg-slate-950/60 rounded-lg p-2 border border-purple-950 font-mono text-[11px] text-purple-300 tracking-wide overflow-x-auto break-all scrollbar-thin whitespace-pre-wrap">
                  {pdaRegex}
                </div>
                <p className="text-[11px] text-slate-400 italic font-sans leading-relaxed">
                  {pdaDescription}
                </p>
              </div>

              {/* String Inputs */}
              <div className="space-y-2">
                <label htmlFor="pda-string-input" className="text-[10px] uppercase font-bold tracking-widest text-purple-400 block">String Stream Selector</label>
                <div className="relative">
                  <input 
                    id="pda-string-input"
                    type="text" 
                    placeholder={`Enter symbol streams (${selectedPdaId === 'pda1' ? 'a, b' : '0, 1'})...`} 
                    value={pdaInputString} 
                    onChange={(e) => {
                      resetPdaSimulation();
                      setPdaInputString(e.target.value);
                    }}
                    className={`w-full bg-slate-900/90 border rounded-xl pl-3 pr-8 py-2 text-sm focus:outline-none transition-colors font-mono tracking-widest ${
                      pdaValidationError 
                        ? 'border-rose-500/50 bg-rose-950/10 text-rose-200 focus:border-rose-500' 
                        : 'border-white/10 text-purple-100 focus:border-purple-500'
                    }`}
                  />
                  {pdaInputString && (
                    <button 
                      onClick={() => {
                        setPdaInputString('');
                        resetPdaSimulation();
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none font-mono text-xs"
                      title="Clear string"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Validation Errors banner */}
                {pdaValidationError && (
                  <div className="flex items-start gap-1.5 p-2 bg-rose-950/30 border border-rose-500/20 rounded-lg text-rose-300 text-[10px] leading-tight font-sans">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span>{pdaValidationError}</span>
                  </div>
                )}

                {/* Preset triggers */}
                <div className="space-y-1.5 pt-1.5">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Helpful Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        resetPdaSimulation();
                        setPdaInputString(pdaSampleInput);
                      }}
                      className="text-[10px] font-mono bg-emerald-950/50 hover:bg-emerald-900/40 border border-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md transition-colors"
                    >
                      Suggest Action ({pdaSampleInput})
                    </button>
                    <button
                      onClick={() => {
                        resetPdaSimulation();
                        setPdaInputString(pdaSampleInputInvalid);
                      }}
                      className="text-[10px] font-mono bg-rose-950/50 hover:bg-rose-900/40 border border-rose-500/20 text-rose-300 px-2.5 py-1 rounded-md transition-colors"
                    >
                      Suggest Trap ({pdaSampleInputInvalid})
                    </button>
                  </div>
                </div>
              </div>

              {/* Execution Controllers */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-purple-400 block">PDA Controller</label>
                <div className="grid grid-cols-2 gap-2">
                  {pdaStatus === 'running' ? (
                    <button
                      onClick={pausePdaSimulation}
                      className="bg-purple-700 hover:bg-purple-600 text-white rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-950/40 cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>PAUSE</span>
                    </button>
                  ) : (
                    <button
                      onClick={startPdaSimulation}
                      disabled={!!pdaValidationError}
                      className={`rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        pdaValidationError
                          ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
                          : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-950/60'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>AUTO TRACE</span>
                    </button>
                  )}

                  <button
                    onClick={executePdaSingleStep}
                    disabled={!!pdaValidationError || pdaStatus === 'accepted' || pdaStatus === 'rejected'}
                    className={`rounded-xl py-2 px-3 text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      pdaValidationError || pdaStatus === 'accepted' || pdaStatus === 'rejected'
                        ? 'bg-slate-900/20 text-slate-600 border-white/5 cursor-not-allowed opacity-45'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-white/10'
                    }`}
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>NEXT STEP</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1.5">
                  <button
                    onClick={resetPdaSimulation}
                    className="bg-slate-950 hover:bg-slate-900 text-slate-300 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>RESET SIMULATION</span>
                  </button>
                </div>
              </div>

              {/* Simulation Speed slider */}
              <div className="space-y-2 bg-slate-950/20 border border-white/5 p-3 rounded-xl">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  <span className="flex items-center gap-1"><Sliders className="w-3 h-3" /> Trans Rate</span>
                  <span className="font-mono text-purple-400">{pdaSpeedMs}ms</span>
                </div>
                <input 
                  type="range" 
                  min="200" 
                  max="2000" 
                  step="100"
                  value={pdaSpeedMs}
                  onChange={(e) => setPdaSpeedMs(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-medium">
                  <span>Fast (200ms)</span>
                  <span>Slow (2.0s)</span>
                </div>
              </div>

              {/* Active state coordinate badge */}
              <div className="mt-auto border-t border-purple-950/30 pt-3">
                <div className="bg-purple-950/20 rounded-xl p-3 border border-purple-500/10 flex items-center gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-full border border-purple-500/20 bg-slate-950/80 flex items-center justify-center relative">
                    <div className="absolute inset-0.5 rounded-full border border-dashed border-purple-400/40 animate-spin" style={{ animationDuration: '6s' }}></div>
                    <span className="text-sm font-mono font-black text-purple-400 tracking-tight">{pdaCurrentNodeId}</span>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">PDA State</div>
                    <div className="text-xs font-bold font-mono text-white mt-0.5">
                      {pdaStatus === 'idle' ? 'LOCKED AT START' : pdaStatus.toUpperCase()}
                    </div>
                    {pdaIndex < pdaInputString.length ? (
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
                        Reading input: <span className="p-[1px_4px] bg-sky-500/20 border border-sky-400/20 rounded text-sky-300 font-bold font-mono">{pdaInputString[pdaIndex]}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mt-1 font-sans">Queue Empty</div>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* Visualization and History Arena */}
            <section id="pda-visualization-arena" className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-slate-900/30 to-slate-950/80 relative">
                
                {/* Header toolbar */}
                <div className="h-10 shrink-0 border-b border-white/5 px-4 flex items-center justify-between text-xs text-slate-400 z-10 bg-slate-950/15">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    <span className="font-bold tracking-wide uppercase text-[10px] text-slate-300">PDA Constellation: {pdaNodes.length} Nodes</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-1.5 bg-emerald-500 rounded-sm"></span> START
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full border border-dashed border-sky-400"></span> READ/POP
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2 bg-purple-500"></span> PUSH
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-sm"></span> ACCEPT
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-rose-500 rounded-sm"></span> REJECT
                    </span>
                  </div>
                </div>

                {/* SVG stage and Stack Panel container */}
                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
                  
                  {/* Stage pane wrapper to anchor the overlay at bottom-right */}
                  <div className="flex-1 relative h-full overflow-hidden">
                    {/* Scrollable SVG stage */}
                    <div id="pda-svg-stage-container" className="w-full h-full relative overflow-y-auto scrollbar-thin p-2">
                    <svg 
                      className="w-full text-purple-500"
                      viewBox="0 0 800 1050"
                      style={{ minHeight: '1050px' }}
                    >
                      {/* SVG Filters and Markers */}
                      <defs>
                        <filter id="pda-glow-active" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="9" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        <filter id="pda-glow-accept" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="11" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        <filter id="pda-glow-line" filterUnits="userSpaceOnUse" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>

                        {/* Arrows */}
                        <marker id="pda-arrow-std" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                          <path d="M 1 2 L 9 5 L 1 8 z" fill="#c084fc" />
                        </marker>
                        <marker id="pda-arrow-hot" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse">
                          <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" />
                        </marker>
                        <marker id="pda-arrow-trap" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 1 2 L 9 5 L 1 8 z" fill="#ef4444" />
                        </marker>
                        <marker id="pda-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                          <path d="M 1 2 L 9 5 L 1 8 z" fill="#10b981" />
                        </marker>
                        <marker id="pda-arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                          <path d="M 1 2 L 9 5 L 1 8 z" fill="#3b82f6" />
                        </marker>
                      </defs>

                      {/* Transitions */}
                      {pdaTransitions.map((transition, index) => {
                        const fromNode = pdaNodes.find(n => n.id === transition.from);
                        const toNode = pdaNodes.find(n => n.id === transition.to);
                        if (!fromNode || !toNode) return null;

                        const isLastTransitionTaken = pdaHistory.length > 0 && 
                          pdaHistory[pdaHistory.length - 1].currentState === transition.from && 
                          pdaHistory[pdaHistory.length - 1].nextState === transition.to &&
                          (pdaHistory[pdaHistory.length - 1].symbolRead === transition.symbol || (transition.symbol === '' && pdaHistory[pdaHistory.length - 1].symbolRead === 'Δ'));

                        const isAnyTransitionTaken = pdaHistory.some(log => log.currentState === transition.from && log.nextState === transition.to);

                        const isSelfLoop = transition.from === transition.to;

                        let strokeColor: string | undefined = 'rgba(168, 85, 247, 0.22)';
                        let strokeWidth: number | string | undefined = 1.5;
                        let markerEndSuffix = 'std';
                        let isAnimated = false;

                        if (isLastTransitionTaken) {
                          if (isSelfLoop) {
                            strokeColor = undefined;
                            strokeWidth = undefined;
                            markerEndSuffix = 'hot';
                          } else {
                            strokeColor = '#fbbf24';
                            strokeWidth = 3;
                            markerEndSuffix = 'hot';
                            isAnimated = true;
                          }
                        } else if (isAnyTransitionTaken && pdaStatus !== 'idle') {
                          strokeColor = 'rgba(124, 58, 237, 0.55)';
                          strokeWidth = 1.8;
                        }

                        if (toNode.type === 'REJECT') {
                          strokeColor = isLastTransitionTaken ? '#ef4444' : 'rgba(239, 68, 68, 0.16)';
                          strokeWidth = isLastTransitionTaken ? 2.5 : 1.2;
                          markerEndSuffix = 'trap';
                        } else if (toNode.type === 'ACCEPT') {
                          strokeColor = isLastTransitionTaken 
                            ? '#fbbf24' 
                            : isAnyTransitionTaken && pdaStatus !== 'idle'
                              ? 'rgba(59, 130, 246, 0.75)' 
                              : 'rgba(59, 130, 246, 0.28)';
                          strokeWidth = isLastTransitionTaken ? 3 : 1.8;
                          markerEndSuffix = isLastTransitionTaken ? 'hot' : 'blue';
                        }

                        const rFrom = 32;
                        const rTo = 32;
                        const arrowOffset = 2.5;
                        const transitionKey = isLastTransitionTaken ? `trans-${index}-${pdaHistory.length}` : `trans-${index}`;
                        let animatedClass = isAnimated ? 'animated-beam flash-path' : '';
                        if (isSelfLoop && isLastTransitionTaken) {
                          animatedClass = 'animated-beam self-loop-active';
                        }
                                    // self loop logic (drawn to the right side to avoid overlapping vertical lines)
                        if (isSelfLoop) {
                          const R = rFrom;
                          const xStart = fromNode.x + R * 0.7;
                          const yStart = fromNode.y - R * 0.5;
                          const xEnd = fromNode.x + R * 0.7;
                          const yEnd = fromNode.y + R * 0.5;
                          
                          const cp1x = fromNode.x + R * 2.0;
                          const cp1y = fromNode.y - R * 1.1;
                          const cp2x = fromNode.x + R * 2.0;
                          const cp2y = fromNode.y + R * 1.1;

                          const arcPath = `M ${xStart} ${yStart} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${xEnd} ${yEnd}`;
                          return (
                            <g key={transitionKey}>
                              <path
                                d={arcPath}
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth={strokeWidth}
                                markerEnd={`url(#pda-arrow-${markerEndSuffix})`}
                                className={animatedClass}
                                style={isLastTransitionTaken ? { filter: 'url(#pda-glow-line)' } : {}}
                              />
                              <rect
                                x={fromNode.x + R * 1.5 - 22}
                                y={fromNode.y - 6}
                                width="44"
                                height="12"
                                rx="3"
                                fill="#090d1f"
                                className="stroke-purple-500/10 stroke-[0.5]"
                              />
                              <text
                                x={fromNode.x + R * 1.5}
                                y={fromNode.y + 3}
                                textAnchor="middle"
                                className="fill-purple-300 font-mono font-bold"
                                style={{ fontSize: '9px' }}
                              >
                                {transition.symbol}
                              </text>
                            </g>
                          );
                        } else if (transition.isCurved && transition.curveOffset) {
                          const dx = toNode.x - fromNode.x;
                          const dy = toNode.y - fromNode.y;
                          const len = Math.sqrt(dx * dx + dy * dy);
                          const px = -dy / len;
                          const py = dx / len;
                          
                          const mx = (fromNode.x + toNode.x) / 2;
                          const my = (fromNode.y + toNode.y) / 2;
                          
                          const cx = mx + px * transition.curveOffset;
                          const cy = my + py * transition.curveOffset;

                          const sdx = cx - fromNode.x;
                          const sdy = cy - fromNode.y;
                          const slen = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
                          const startPointX = fromNode.x + rFrom * (sdx / slen);
                          const startPointY = fromNode.y + rFrom * (sdy / slen);

                          const tdx = toNode.x - cx;
                          const tdy = toNode.y - cy;
                          const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
                          const endPointX = toNode.x - (rTo + arrowOffset) * (tdx / tlen);
                          const endPointY = toNode.y - (rTo + arrowOffset) * (tdy / tlen);

                          const bezierPath = `M ${startPointX} ${startPointY} Q ${cx} ${cy} ${endPointX} ${endPointY}`;
                          const bx = 0.25 * startPointX + 0.5 * cx + 0.25 * endPointX;
                          const by = 0.25 * startPointY + 0.5 * cy + 0.25 * endPointY;

                          return (
                            <g key={transitionKey}>
                              <path
                                d={bezierPath}
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth={strokeWidth}
                                markerEnd={`url(#pda-arrow-${markerEndSuffix})`}
                                className={animatedClass}
                                style={isLastTransitionTaken ? { filter: 'url(#pda-glow-line)' } : {}}
                              />
                              {transition.symbol !== '' && (
                                <>
                                  <rect
                                    x={bx - 18}
                                    y={by - 7}
                                    width="36"
                                    height="13"
                                    rx="3"
                                    fill="#090d1f"
                                    className="stroke-purple-500/10 stroke-[0.5]"
                                  />
                                  <text
                                    x={bx}
                                    y={by + 2}
                                    textAnchor="middle"
                                    className="fill-purple-400 font-mono font-bold"
                                    style={{ fontSize: '9px' }}
                                  >
                                    {transition.symbol}
                                  </text>
                                </>
                              )}
                            </g>
                          );
                        } else {
                          const dx = toNode.x - fromNode.x;
                          const dy = toNode.y - fromNode.y;
                          const len = Math.sqrt(dx * dx + dy * dy) || 1;
                          const ux = dx / len;
                          const uy = dy / len;
                          
                          const startPointX = fromNode.x + rFrom * ux;
                          const startPointY = fromNode.y + rFrom * uy;
                          const endPointX = toNode.x - (rTo + arrowOffset) * ux;
                          const endPointY = toNode.y - (rTo + arrowOffset) * uy;

                          const textX = (fromNode.x + toNode.x) / 2;
                          const textY = (fromNode.y + toNode.y) / 2;

                          return (
                            <g key={transitionKey}>
                              <line
                                x1={startPointX}
                                y1={startPointY}
                                x2={endPointX}
                                y2={endPointY}
                                stroke={strokeColor}
                                strokeWidth={strokeWidth}
                                markerEnd={`url(#pda-arrow-${markerEndSuffix})`}
                                className={animatedClass}
                                style={isLastTransitionTaken ? { filter: 'url(#pda-glow-line)' } : {}}
                              />
                              {transition.symbol !== '' && (
                                <>
                                  <rect
                                    x={textX - 16}
                                    y={textY - 7}
                                    width="32"
                                    height="13"
                                    rx="3"
                                    fill="#090d1f"
                                    className="stroke-purple-500/10 stroke-[0.5]"
                                  />
                                  <text
                                    x={textX}
                                    y={textY + 2}
                                    textAnchor="middle"
                                    className="fill-purple-400 font-mono font-bold"
                                    style={{ fontSize: '9px' }}
                                  >
                                    {transition.symbol}
                                  </text>
                                </>
                              )}
                            </g>
                          );
                        }
                      })}

                      {/* Nodes */}
                      {pdaNodes.map((node) => {
                        const isCurrent = node.id === pdaCurrentNodeId;
                        const isVisited = visitedPdaNodes.includes(node.id);
                        
                        let borderFill = '#1e293b';
                        let borderStroke = 'rgba(255, 255, 255, 0.3)';
                        let labelColor = '#e2e8f0';
                        let glowFilter = '';

                        if (isCurrent) {
                          if (node.type === 'START') {
                            borderFill = '#10b981';
                            borderStroke = '#34d399';
                            labelColor = '#064e3b';
                            glowFilter = 'url(#pda-glow-active)';
                          } else if (node.type === 'ACCEPT') {
                            borderFill = '#3b82f6';
                            borderStroke = '#60a5fa';
                            labelColor = '#eff6ff';
                            glowFilter = 'url(#pda-glow-accept)';
                          } else if (node.type === 'REJECT') {
                            borderFill = '#f43f5e';
                            borderStroke = '#e11d48';
                            labelColor = '#eff6ff';
                            glowFilter = 'url(#pda-glow-active)';
                          } else {
                            borderFill = '#c084fc';
                            borderStroke = '#e9d5ff';
                            labelColor = '#0f172a';
                            glowFilter = 'url(#pda-glow-active)';
                          }
                        } else {
                          if (node.type === 'START') {
                            borderFill = '#022c22';
                            borderStroke = '#059669';
                            labelColor = '#a7f3d0';
                          } else if (node.type === 'ACCEPT') {
                            borderFill = '#1e3a8a';
                            borderStroke = '#3b82f6';
                            labelColor = '#bfdbfe';
                          } else if (node.type === 'REJECT') {
                            borderFill = '#1c050c';
                            borderStroke = '#b91c1c';
                            labelColor = '#fca5a5';
                          } else if (isVisited) {
                            borderFill = '#0f172a';
                            borderStroke = '#c084fc';
                            labelColor = '#e9d5ff';
                          } else {
                            borderFill = '#070a1e';
                            borderStroke = 'rgba(168, 85, 247, 0.22)';
                            labelColor = '#94a3b8';
                          }
                        }

                        // Shapes
                        if (node.shape === 'diamond') {
                          // points for diamond centering at (x,y)
                          const pts = `${node.x},${node.y - 28} ${node.x + 36},${node.y} ${node.x},${node.y + 28} ${node.x - 36},${node.y}`;
                          return (
                            <g key={node.id}>
                              {isCurrent && (
                                <polygon
                                  points={`${node.x},${node.y - 32} ${node.x + 40},${node.y} ${node.x},${node.y + 32} ${node.x - 40},${node.y}`}
                                  fill="none"
                                  stroke={node.type === 'POP' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(192, 132, 252, 0.4)'}
                                  strokeWidth="2"
                                  strokeDasharray="4,2"
                                  className="animate-spin"
                                  style={{ transformOrigin: `${node.x}px ${node.y}px`, animationDuration: '8s' }}
                                />
                              )}
                              <polygon
                                points={pts}
                                fill={borderFill}
                                stroke={borderStroke}
                                strokeWidth={isCurrent ? 3 : 1.5}
                                filter={glowFilter}
                                className="transition-all duration-300"
                              />
                              {isCurrent && (
                                <circle cx={node.x} cy={node.y} r="5" fill="rgba(255,255,255,0.75)" className="animate-ping" />
                              )}
                              <text
                                x={node.x}
                                y={node.y + 4}
                                textAnchor="middle"
                                className="font-mono font-extrabold select-none pointer-events-none"
                                fill={labelColor}
                                style={{ fontSize: '11px' }}
                              >
                                {node.label}
                              </text>
                            </g>
                          );
                        } else if (node.shape === 'rect' || node.shape === 'rounded_rect') {
                          const rx = node.shape === 'rounded_rect' ? 8 : 0;
                          const w = 90;
                          const h = 36;
                          return (
                            <g key={node.id}>
                              {isCurrent && (
                                <rect
                                  x={node.x - (w/2) - 4}
                                  y={node.y - (h/2) - 4}
                                  width={w + 8}
                                  height={h + 8}
                                  rx={rx + 2}
                                  ry={rx + 2}
                                  fill="none"
                                  stroke="rgba(192, 132, 252, 0.35)"
                                  strokeWidth="1.5"
                                  strokeDasharray="4,2"
                                />
                              )}
                              <rect
                                x={node.x - w/2}
                                y={node.y - h/2}
                                width={w}
                                height={h}
                                rx={rx}
                                ry={rx}
                                fill={borderFill}
                                stroke={borderStroke}
                                strokeWidth={isCurrent ? 3 : 1.5}
                                filter={glowFilter}
                                className="transition-all duration-300"
                              />
                              {isCurrent && (
                                <circle cx={node.x} cy={node.y} r="5" fill="rgba(255,255,255,0.75)" className="animate-ping" />
                              )}
                              <text
                                x={node.x}
                                y={node.y + 4}
                                textAnchor="middle"
                                className="font-mono font-extrabold select-none pointer-events-none"
                                fill={labelColor}
                                style={{ fontSize: '11px' }}
                              >
                                {node.label}
                              </text>
                            </g>
                          );
                        }
                        return null;
                      })}
                    </svg>
                  </div>

                  {/* Verdict popup overlays */}
                  {(pdaStatus === 'accepted' || pdaStatus === 'rejected') && (
                    <div 
                      id="pda-verdict-overlay"
                      className={`absolute bottom-4 right-4 md:bottom-6 md:right-6 border p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 transition-all duration-500 scale-100 z-20 animate-bounce ${
                        pdaStatus === 'accepted'
                          ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50'
                          : 'bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        pdaStatus === 'accepted' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-slate-100'
                      }`}>
                        {pdaStatus === 'accepted' ? (
                          <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                        ) : (
                          <XCircle className="w-6 h-6 stroke-[2.5]" />
                        )}
                      </div>
                      <div>
                        <div className={`text-sm tracking-widest uppercase font-black ${
                          pdaStatus === 'accepted' ? 'text-emerald-400 text-glow' : 'text-rose-400 text-glow'
                        }`}>
                          String {pdaStatus.toUpperCase()}!
                        </div>
                        <div className="text-[10px] text-slate-300 mt-0.5 font-medium leading-tight">
                          {pdaStatus === 'accepted' 
                            ? 'Regex matched & stack POP succeeded perfectly' 
                            : `Stuck at state ${pdaStuckState} on final check`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                  {/* Real-time Stack Memory visualization panel */}
                  <div 
                    id="pda-stack-telemetry-panel" 
                    className="w-full md:w-60 shrink-0 bg-[#020617]/70 backdrop-blur-md p-4 border-t md:border-t-0 md:border-l border-purple-950/40 flex flex-col h-auto md:h-fit md:max-h-full"
                  >
                    <div className="flex items-center justify-between text-purple-400 font-mono text-[10px] uppercase tracking-widest font-bold border-b border-purple-950/45 pb-2">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Stack Telemetry</span>
                      </div>
                      <button 
                        onClick={() => setIsStackTelemetryExpanded(!isStackTelemetryExpanded)}
                        className="text-purple-400 hover:text-purple-200 transition-colors focus:outline-none p-1 rounded hover:bg-purple-950/40 cursor-pointer text-xs"
                        title={isStackTelemetryExpanded ? "Minimize Telemetry" : "Expand Telemetry"}
                      >
                        {isStackTelemetryExpanded ? '[-]' : '[+]'}
                      </button>
                    </div>

                    {isStackTelemetryExpanded && (
                      <>
                        <p className="hidden md:block text-[9px] text-slate-500 leading-normal font-sans pt-1.5">
                          LIFO stack. Pushed at step 1.
                        </p>

                        {/* The stack pile area */}
                        <div className="h-28 w-full flex flex-col justify-end items-center my-3 relative bg-slate-950/50 rounded-xl border border-purple-950/30 p-2.5 overflow-y-auto custom-scrollbar">
                          {pdaStack.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                              <Database className="w-6 h-6 text-purple-950 animate-pulse mb-1" />
                              <span className="text-[9px] font-mono text-purple-900 uppercase tracking-wider font-semibold">Stack Empty</span>
                            </div>
                          ) : (
                            <div className="w-full space-y-1 flex flex-col-reverse justify-start">
                              {pdaStack.map((symbol, idx) => (
                                <div 
                                  key={`stack-item-${idx}`}
                                  className="w-full h-8 rounded-lg border border-purple-500/25 bg-gradient-to-r from-purple-950/50 via-purple-900/40 to-indigo-950/50 flex items-center justify-between px-2 text-[11px] font-mono text-purple-200 shadow-md shadow-fuchsia-950/20 transform transition-all duration-300 hover:scale-[1.02]"
                                >
                                  <span className="text-purple-400 text-[8px] font-sans uppercase">#{idx}</span>
                                  <span className="font-extrabold text-xs text-fuchsia-300 text-glow">{symbol}</span>
                                  <span className="text-slate-600 text-[7px] font-mono">[PUSHED {symbol}]</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Operation indicator */}
                        <div className="mt-auto border-t border-purple-950/30 pt-2 flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-slate-500 uppercase">Top:</span>
                            <span className="text-purple-300 font-bold font-mono">
                              {pdaStack.length > 0 ? `'${pdaStack[pdaStack.length - 1]}'` : 'NULL'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-slate-500 uppercase">Depth:</span>
                            <span className="text-purple-300 font-bold">{pdaStack.length} items</span>
                          </div>
                          
                          <div className="border border-purple-950 bg-purple-950/25 rounded-lg p-1.5 text-center text-[8.5px] font-mono text-purple-300 flex items-center justify-center space-x-1 mt-1">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping"></span>
                            <span>STACK: ONLINE</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                </div>

                {/* Traversal Logs & Stream ticker Footer */}
                <footer id="pda-history-footer" className="h-56 border-t border-purple-950/50 bg-[#04081c]/90 p-4 md:p-5 flex flex-col md:flex-row gap-5 shrink-0 z-10 relative">
                  
                  {/* Scrollable transition logs */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                        <Logs className="w-3.5 h-3.5 text-purple-400" />
                        PDA Simulation History logs
                      </label>
                      <span className="text-[9px] font-mono text-slate-500">{pdaHistory.length} Steps logged</span>
                    </div>

                    <div 
                      id="pda-transition-log-box" 
                      className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1.5 pr-2 border border-purple-950/40 bg-slate-950/50 rounded-xl p-3 scrollbar-thin"
                    >
                      {pdaHistory.length === 0 ? (
                        <div className="text-slate-500 italic text-center h-full flex items-center justify-center text-[10px]">
                          Simulation idle. Click AUTO TRACE or NEXT STEP to begin mapping stardust coordinates.
                        </div>
                      ) : (
                        pdaHistory.map((log, i) => {
                          const isCurrentLog = i === pdaHistory.length - 1 && (pdaStatus === 'running' || pdaStatus === 'paused');
                          return (
                            <div 
                              key={log.step} 
                              className={`grid grid-cols-12 gap-2 py-1 px-2.5 rounded border transition-all ${
                                isCurrentLog 
                                  ? 'bg-purple-500/10 text-white border-purple-500/20 shadow-md' 
                                  : 'text-slate-400 border-transparent'
                              }`}
                            >
                              <span className="col-span-1 text-slate-600 font-bold italic">#{String(log.step).padStart(2, '0')}</span>
                              <span className="col-span-2 text-purple-400 font-semibold">({log.currentState})</span>
                              
                              <span className="col-span-3 text-slate-500 flex items-center">
                                ── <span className="bg-slate-900 px-1 rounded border border-white/5 font-extrabold text-amber-400 mx-1">'{log.symbolRead}'</span> ──▶
                              </span>
                              
                              <span className="col-span-2 text-purple-300 font-semibold">({log.nextState})</span>
                              
                              <span className="col-span-2 text-fuchsia-400 font-medium truncate" title={`Stack: ${log.stackAfter}`}>
                                Stack: {log.stackAfter}
                              </span>

                              <span className="col-span-2 text-right">
                                {log.operation !== 'None' ? (
                                  <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[8px] font-bold">
                                    {log.operation}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 text-[8px]">SKIP</span>
                                )}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right side string processing tracker */}
                  <div className="w-full md:w-72 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-5">
                    <div className="text-center md:text-left space-y-1">
                      <div className="text-[10px] uppercase text-slate-400 tracking-widest font-bold">Scanning Symbol Stream</div>
                      
                      {/* Character ticker list */}
                      {pdaInputString ? (
                        <div id="pda-character-ticker" className="flex flex-wrap gap-1 justify-center md:justify-start font-mono text-base md:text-lg font-black pt-1">
                          {pdaInputString.split('').map((char, index) => {
                            const isActiveChar = index === pdaIndex && (pdaStatus === 'running' || pdaStatus === 'paused');
                            const isParsedChar = index < pdaIndex;
                            
                            let chrBgColor = 'bg-slate-900 border-white/5 text-slate-400';
                            if (isActiveChar) {
                              chrBgColor = 'bg-amber-500 border-amber-400 text-slate-900 font-extrabold scale-110 shadow-lg shadow-amber-500/20 active-char-glow';
                            } else if (isParsedChar) {
                              chrBgColor = 'bg-purple-950/60 border-purple-500/20 text-purple-300 opacity-60';
                            }
                            
                            return (
                              <span
                                key={index}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center border text-sm md:text-base font-mono transition-all ${chrBgColor}`}
                              >
                                {char}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-slate-600 italic text-xs py-2 font-mono">[No character to read]</div>
                      )}
                    </div>

                    {/* Percentage progression bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-400">
                        <span>STREAMING ACCURACY</span>
                        <span className="text-purple-400">
                          {pdaInputString.length > 0 ? Math.min(100, Math.floor((pdaIndex / pdaInputString.length) * 100)) : 0}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 border border-white/5 rounded-full overflow-hidden p-[1px]">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${pdaInputString.length > 0 ? Math.min(100, Math.floor((pdaIndex / pdaInputString.length) * 100)) : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Live Simulation Indicator badge */}
                    <div className="pt-2 text-center">
                      {pdaStatus === 'idle' && (
                        <div className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase flex items-center justify-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-slate-600"></span> WAITING TO ENGAGE
                        </div>
                      )}
                      {pdaStatus === 'running' && (
                        <div className="text-[10px] font-extrabold tracking-widest text-amber-400 uppercase flex items-center justify-center gap-1.5 animate-pulse gold-glow">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span> TRACING STAR SYSTEM...
                        </div>
                      )}
                      {pdaStatus === 'paused' && (
                        <div className="text-[10px] font-extrabold tracking-widest text-purple-400 uppercase flex items-center justify-center gap-1 text-glow">
                          <span className="w-2 h-2 rounded-full bg-purple-400"></span> ORBIT PAUSED
                        </div>
                      )}
                      {pdaStatus === 'accepted' && (
                        <div className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase flex items-center justify-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> SYSTEM ACCEPTED
                        </div>
                      )}
                      {pdaStatus === 'rejected' && (
                        <div className="text-[10px] font-extrabold tracking-widest text-rose-500 uppercase flex items-center justify-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> STRING REJECTED
                        </div>
                      )}
                      {pdaStatus === 'error' && (
                        <div className="text-[10px] font-extrabold tracking-widest text-rose-400 uppercase flex items-center justify-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span> TRACE FAIL
                        </div>
                      )}
                    </div>
                  </div>
                </footer>
              </section>
          </>
        )}

        {/* ======================= TAB 3: CFG MOUNT POINT ======================= */}
        {selectedTab === 'cfg' && (
          <div id="section-cfg" className="flex-1 overflow-y-auto w-full p-4 md:p-6 pb-20">
            <CfgPage />
          </div>
        )}
      </main>

      {/* ======================= INSTRUCTION MODAL POPUP ======================= */}
      {isHowToOpen && (
        <div id="help-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div id="help-modal" className="bg-[#0b1329] border border-sky-500/30 p-5 md:p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-sky-500/10 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm tracking-wider uppercase text-white">How to run the tracer</h3>
              </div>
              <button 
                onClick={() => setIsHowToOpen(false)}
                className="text-slate-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
              <p>
                This visual tracing sandbox compiles alphabet streams through state diagrams representing celestial star constellations in real-time.
              </p>
              
              <div className="space-y-2 font-sans bg-slate-950/50 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 text-sky-400 font-bold">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span> 
                  <span>Step 1: Choose or write a stream</span>
                </div>
                <p className="text-slate-400 pl-3.5 leading-snug">
                  Select a DFA model, then write your own test string, or load preset sample strings (Suggest Action/Trap buttons).
                </p>

                <div className="flex items-center gap-2 text-sky-400 font-bold">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span> 
                  <span>Step 2: Start Tracing</span>
                </div>
                <p className="text-slate-400 pl-3.5 leading-snug">
                  Click <span className="text-sky-300 font-extrabold">AUTO TRACE</span> to run automatically at user-specified speeds, or press <span className="text-sky-300 font-extrabold">NEXT STEP</span> to traverse manually.
                </p>

                <div className="flex items-center gap-2 text-sky-400 font-bold">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span> 
                  <span>Step 3: Analyze paths</span>
                </div>
                <p className="text-slate-400 pl-3.5 leading-snug">
                  Watch the stars glow. Read the traversal logs below to verify each transition taken. The stream will showcase an <span className="text-emerald-400 font-bold">ACCEPTED</span> or <span className="text-rose-400 font-bold">REJECTED</span> verdict on termination.
                </p>
              </div>

              <div className="p-3 bg-indigo-950/35 border border-indigo-500/20 rounded-xl flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0 pt-0.5" />
                <div className="text-[11px] text-slate-400 space-y-1">
                  <span className="font-bold text-slate-300 block">Theory Note:</span>
                  <span>
                    Deterministic Finite Automata (DFA) have exactly one path for any input symbol. No memory stack is used.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setIsHowToOpen(false)}
                className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-sky-950/60"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification Container */}
      {batchNotification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900/95 border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.3)] backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
            <span className="text-sm font-mono font-bold tracking-widest text-purple-200">
              {batchNotification}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
