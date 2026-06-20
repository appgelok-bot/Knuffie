
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, RummiTile, UserProfile } from '../types';
import { updateGameState } from '../services/firebaseService';
import { 
  Trophy, Loader2, Clock, AlertTriangle, LogOut, Heart, Hash, Pipette, PlusCircle, Move, RotateCcw, BrainCircuit
} from 'lucide-react';

interface RummikubProps {
  coupleId: string;
  gameState: GameState | null;
  userId: string;
  userName: string;
  partnerProfile: UserProfile | null;
}

interface DragState {
  tileIds: string[];
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  origin: 'hand' | 'board';
  originRowIndex?: number;
}

const TURN_TIME_LIMIT = 60;
const AI_UID = 'ai_bot_99';

// Semi-intelligent AI Play Finder
const findAIPlay = (hand: RummiTile[]): { meld: RummiTile[]; remainingHand: RummiTile[] } | null => {
    // 1. Try to find a Group (3 same number, different colors)
    const byNumber: { [num: number]: RummiTile[] } = {};
    hand.forEach(t => {
        if (t.isJoker) return;
        if (!byNumber[t.number]) byNumber[t.number] = [];
        byNumber[t.number].push(t);
    });

    for (const numStr of Object.keys(byNumber)) {
        const num = parseInt(numStr);
        const tiles = byNumber[num];
        // Filter unique colors
        const uniqueColorTiles: { [color: string]: RummiTile } = {};
        tiles.forEach(t => {
            if (t.color !== 'joker') {
                uniqueColorTiles[t.color] = t;
            }
        });
        const uniqueTiles = Object.values(uniqueColorTiles);
        if (uniqueTiles.length >= 3) {
            const meld = uniqueTiles.slice(0, 3);
            const meldIds = meld.map(t => t.id);
            const remainingHand = hand.filter(t => !meldIds.includes(t.id));
            return { meld, remainingHand };
        }
    }

    // 2. Try to find a Sequence (3 same color consecutive numbers)
    const byColor: { [color: string]: RummiTile[] } = {};
    hand.forEach(t => {
        if (t.isJoker) return;
        if (t.color !== 'joker') {
            if (!byColor[t.color]) byColor[t.color] = [];
            byColor[t.color].push(t);
        }
    });

    for (const color of Object.keys(byColor)) {
        const tiles = byColor[color];
        // Unique numbers sorted
        const uniqueNumTiles = [...new Map(tiles.map(t => [t.number, t])).values()].sort((a,b) => a.number - b.number);
        for (let i = 0; i < uniqueNumTiles.length - 2; i++) {
            if (uniqueNumTiles[i+1].number === uniqueNumTiles[i].number + 1 &&
                uniqueNumTiles[i+2].number === uniqueNumTiles[i+1].number + 1) {
                const meld = [uniqueNumTiles[i], uniqueNumTiles[i+1], uniqueNumTiles[i+2]];
                const meldIds = meld.map(t => t.id);
                const remainingHand = hand.filter(t => !meldIds.includes(t.id));
                return { meld, remainingHand };
            }
        }
    }

    return null;
};

const Candle = ({ position }: { position: 'left' | 'right' }) => (
  <div className={`fixed top-1/2 -translate-y-1/2 ${position === 'left' ? 'left-4' : 'right-4'} flex flex-col items-center z-50 pointer-events-none scale-125 md:scale-150`}>
    <div className="candle-flame"></div>
    <div className="candle-body shadow-2xl"></div>
    <div className={`absolute w-[500px] h-[500px] bg-orange-500/10 blur-[120px] -z-10 rounded-full ${position === 'left' ? '-left-32' : '-right-32'}`}></div>
  </div>
);

const Rummikub: React.FC<RummikubProps> = ({ coupleId, gameState, userId, userName, partnerProfile }) => {
  const triggerAppVibration = (ms: number | number[] = 15) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch (e) {}
    }
  };

  const [tempBoard, setTempBoard] = useState<RummiTile[][]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  const [isModifiedLocally, setIsModifiedLocally] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [invalidRows, setInvalidRows] = useState<number[]>([]);
  
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredZone, setHoveredZone] = useState<{ type: 'row' | 'new-row' | 'hand', index?: number } | null>(null);
  
  const longPressTimer = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isMyTurn = gameState?.currentTurnUid === userId;
  const isAITurn = gameState?.currentTurnUid === AI_UID;

  const iAmPlayer1 = gameState ? gameState.player1.uid === userId : false;
  const myPlayer = gameState ? (iAmPlayer1 ? gameState.player1 : gameState.player2) : null;
  const rawHand = myPlayer?.hand || [];
  const opponentName = gameState ? (iAmPlayer1 ? gameState.player2.name : gameState.player1.name) : '';
  const opponentHandSize = gameState ? (iAmPlayer1 ? gameState.player2.hand.length : gameState.player1.hand.length) : 0;

  // Track player hand and board at turn start to verify isMyTurn and enable Undo/Recall
  const turnStartHand = useRef<RummiTile[] | null>(null);
  const turnStartBoard = useRef<RummiTile[][] | null>(null);

  useEffect(() => {
    if (isMyTurn && myPlayer) {
      if (!turnStartHand.current) {
        turnStartHand.current = rawHand;
        turnStartBoard.current = gameState?.board || [];
      }
    } else {
      turnStartHand.current = null;
      turnStartBoard.current = null;
    }
  }, [isMyTurn, gameState?.currentTurnUid, myPlayer]);

  // Initialisatie en sync
  useEffect(() => {
    if (gameState && (!isMyTurn || (!isModifiedLocally && tempBoard.length === 0))) {
        setTempBoard(gameState.board || []);
    }
  }, [gameState?.lastUpdate, gameState?.currentTurnUid, isMyTurn]);

  // Validatie Helper for rows/sequences/combinations based on official laws
  const isRowValid = useCallback((row: RummiTile[]) => {
      if (row.length < 3) return false;
      const nonJokers = row.filter(t => !t.isJoker);
      if (nonJokers.length === 0) return true;
      
      const allSameNum = nonJokers.every(t => t.number === nonJokers[0].number);
      const allSameColor = nonJokers.every(t => t.color === nonJokers[0].color);
      
      if (allSameNum) {
          const colors = new Set(nonJokers.map(t => t.color));
          if (colors.size !== nonJokers.length) return false;
          return row.length <= 4;
      }
      
      if (allSameColor) {
          if (row.length > 13) return false;
          
          const numbers = nonJokers.map(t => t.number);
          const uniqueNums = new Set(numbers);
          if (uniqueNums.size !== nonJokers.length) return false;
          
          const minNum = Math.min(...numbers);
          const maxNum = Math.max(...numbers);
          const L = row.length;
          
          const lowerBound = Math.max(1, maxNum - L + 1);
          const upperBound = Math.min(14 - L, minNum);
          
          return lowerBound <= upperBound;
      }
      return false;
  }, []);

  // Compute points of a valid group or run, correctly evaluating the Joker's represented value
  const calculateRowPoints = (row: RummiTile[]): number => {
      if (row.length < 3) return 0;
      const nonJokers = row.filter(t => !t.isJoker);
      if (nonJokers.length === 0) {
          return row.length * 30;
      }
      
      const allSameNum = nonJokers.every(t => t.number === nonJokers[0].number);
      if (allSameNum) {
          return row.length * nonJokers[0].number;
      } else {
          const numbers = nonJokers.map(t => t.number);
          const maxNum = Math.max(...numbers);
          const L = row.length;
          const S = Math.max(1, maxNum - L + 1);
          let sum = 0;
          for (let i = 0; i < L; i++) {
              sum += (S + i);
          }
          return sum;
      }
  };

  // Update invalid rows
  useEffect(() => {
    const invalid = tempBoard.map((row, i) => isRowValid(row) ? -1 : i).filter(i => i !== -1);
    setInvalidRows(invalid);
  }, [tempBoard, isRowValid]);

  // Real-time Turn Timeout Handler
  const handleTimeOut = useCallback(async () => {
      if (!gameState) return;
      setErrorMsg("Tijd is om! De tafel wordt hersteld en je trekt een steen.");
      setTimeout(() => setErrorMsg(''), 4000);
      
      // Revert local changes
      setTempBoard(gameState.board || []);
      setIsModifiedLocally(false);

      // Force draw tile
      const newDeck = [...gameState.deck];
      if (newDeck.length === 0) {
          // Empty deck - pass turn
          await updateGameState(coupleId, {
              ...gameState,
              currentTurnUid: gameState.isPracticeMode ? AI_UID : (iAmPlayer1 ? gameState.player2.uid : gameState.player1.uid),
              turnStartTime: Date.now(),
              lastUpdate: Date.now()
          });
          return;
      }
      const tile = newDeck.pop()!;
      const newHand = [...rawHand, tile];
      const newP1 = iAmPlayer1 ? { ...gameState.player1, hand: newHand } : gameState.player1;
      const newP2 = !iAmPlayer1 ? { ...gameState.player2, hand: newHand } : gameState.player2;
      await updateGameState(coupleId, { 
          ...gameState, 
          deck: newDeck, 
          player1: newP1, player2: newP2,
          currentTurnUid: gameState.isPracticeMode ? AI_UID : (iAmPlayer1 ? gameState.player2.uid : gameState.player1.uid),
          turnStartTime: Date.now(),
          lastUpdate: Date.now() 
      });
  }, [gameState, coupleId, userId, iAmPlayer1, rawHand]);

  // Turn Countdown Timer
  useEffect(() => {
    if (!gameState || !gameState.gameActive || gameState.winner) return;

    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.turnStartTime) / 1000);
      const remaining = Math.max(0, TURN_TIME_LIMIT - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0 && isMyTurn) {
        clearInterval(intervalId);
        handleTimeOut();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameState?.turnStartTime, gameState?.currentTurnUid, isMyTurn, handleTimeOut, gameState?.gameActive, gameState?.winner]);

  // AI Logica (Semi-intelligent bot with play finder)
  useEffect(() => {
    if (isAITurn && gameState?.gameActive && !gameState.winner) {
        const timer = setTimeout(async () => {
             const aiHand = gameState.player2.hand;
             const play = findAIPlay(aiHand);

             if (play) {
                 const updatedBoard = [...(gameState.board || []), play.meld];
                 const updatedHand = play.remainingHand;
                 
                  await updateGameState(coupleId, { 
                      ...gameState, 
                      board: updatedBoard,
                      player2: { ...gameState.player2, hand: updatedHand, hasMelded: true },
                      currentTurnUid: userId,
                      turnStartTime: Date.now(),
                      winner: updatedHand.length === 0 ? AI_UID : null,
                      gameActive: updatedHand.length > 0,
                      lastUpdate: Date.now() 
                  });
             } else {
                 const newDeck = [...gameState.deck];
                 if (newDeck.length === 0) {
                      await updateGameState(coupleId, { ...gameState, currentTurnUid: userId, turnStartTime: Date.now(), lastUpdate: Date.now() });
                      return;
                 }
                 const tile = newDeck.pop()!;
                 const newAIHand = [...aiHand, tile];
                 await updateGameState(coupleId, { 
                     ...gameState, 
                     deck: newDeck, 
                     player2: { ...gameState.player2, hand: newAIHand },
                     currentTurnUid: userId,
                     turnStartTime: Date.now(),
                     lastUpdate: Date.now() 
                 });
             }
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [isAITurn, gameState, coupleId, userId]);

  if (!gameState) return <div className="h-screen flex flex-col items-center justify-center bg-[#0f0205]"><Loader2 className="animate-spin text-rose-500 w-10 h-10" /></div>;

  const handlePointerDown = (e: React.PointerEvent, tileId: string, origin: 'hand' | 'board', rowIndex?: number) => {
      if (!isMyTurn) return;
      const startX = e.clientX;
      const startY = e.clientY;
      longPressTimer.current = setTimeout(() => {
          if (origin === 'board' && rowIndex !== undefined) {
              const rowTileIds = tempBoard[rowIndex].map(t => t.id);
              setDrag({ tileIds: rowTileIds, startX, startY, currentX: startX, currentY: startY, origin, originRowIndex: rowIndex });
          }
      }, 350);
      setDrag({ tileIds: [tileId], startX, startY, currentX: startX, currentY: startY, origin, originRowIndex: rowIndex });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!drag) return;
      if (Math.abs(e.clientX - drag.startX) > 5 || Math.abs(e.clientY - drag.startY) > 5) clearTimeout(longPressTimer.current);
      setDrag({ ...drag, currentX: e.clientX, currentY: e.clientY });
  };

  const handlePointerUp = async () => {
      clearTimeout(longPressTimer.current);
      if (!drag) return;
      const target = hoveredZone;
      let tilesToMove: RummiTile[] = [];
      let newBoard = [...tempBoard.map(row => [...row])];
      let newHand = [...rawHand];

      if (drag.origin === 'board' && drag.originRowIndex !== undefined) {
          tilesToMove = newBoard[drag.originRowIndex].filter(t => drag.tileIds.includes(t.id));
          newBoard[drag.originRowIndex] = newBoard[drag.originRowIndex].filter(t => !drag.tileIds.includes(t.id));
      } else {
          tilesToMove = newHand.filter(t => drag.tileIds.includes(t.id));
          newHand = newHand.filter(t => !drag.tileIds.includes(t.id));
      }

      if (tilesToMove.length > 0) {
          if (target?.type === 'row' && target.index !== undefined) {
              newBoard[target.index] = [...newBoard[target.index], ...tilesToMove];
              setIsModifiedLocally(true);
          } else if (target?.type === 'new-row') {
              newBoard.push(tilesToMove);
              setIsModifiedLocally(true);
          } else if (target?.type === 'hand') {
              tilesToMove.forEach(t => { if (!newHand.some(h => h.id === t.id)) newHand.push(t); });
          } else {
              if (drag.origin === 'hand') {
                  tilesToMove.forEach(t => { if (!newHand.some(h => h.id === t.id)) newHand.push(t); });
              } else if (drag.originRowIndex !== undefined) {
                  newBoard[drag.originRowIndex] = [...newBoard[drag.originRowIndex], ...tilesToMove];
              }
          }
      }

      newBoard = newBoard.filter(row => row.length > 0);
      setTempBoard(newBoard);
      const newP1 = iAmPlayer1 ? { ...gameState.player1, hand: newHand } : gameState.player1;
      const newP2 = !iAmPlayer1 ? { ...gameState.player2, hand: newHand } : gameState.player2;
      await updateGameState(coupleId, { ...gameState, player1: newP1, player2: newP2, lastUpdate: Date.now() });
      setDrag(null); setHoveredZone(null);
  };

  const finishTurn = async () => {
      const allValid = tempBoard.every(row => isRowValid(row));
      if (!allValid) {
          setErrorMsg("Sommige sets zijn ongeldig!");
          setTimeout(() => setErrorMsg(''), 3000);
          return;
      }

      if (myPlayer && !myPlayer.hasMelded) {
          // Direct check that they did not modify any existing board tiles during their initial meld
          const startBoardTileIds = new Set((gameState.board || []).flat().map(t => t.id));
          const currentBoardTileIds = new Set(tempBoard.flat().map(t => t.id));
          
          let touchedBoard = false;
          for (const id of startBoardTileIds) {
              if (!currentBoardTileIds.has(id)) {
                  touchedBoard = true;
                  break;
              }
          }
          
          const startBoardRowsStr = (gameState.board || []).map(row => JSON.stringify(row.map(t => t.id)));
          for (const row of tempBoard) {
              const hasStartTile = row.some(t => startBoardTileIds.has(t.id));
              if (hasStartTile) {
                  const rowStr = JSON.stringify(row.map(t => t.id));
                  if (!startBoardRowsStr.includes(rowStr)) {
                      touchedBoard = true;
                  }
              }
          }
          
          if (touchedBoard) {
              setErrorMsg("Eerste beurt: je mag stenen op het bord nog niet aanpassen!");
              setTimeout(() => setErrorMsg(''), 4000);
              return;
          }
          
          // Find newly placed sets (sets in tempBoard that don't match any row in gameState.board)
          const newRows = tempBoard.filter(row => !startBoardRowsStr.includes(JSON.stringify(row.map(t => t.id))));
          const points = newRows.reduce((sum, row) => sum + calculateRowPoints(row), 0);
          
          if (points < 30) {
              setErrorMsg(`Eerste beurt: 30 pnt nodig! (je hebt nu: ${points} pnt)`);
              setTimeout(() => setErrorMsg(''), 4000);
              return;
          }
      }

      await updateGameState(coupleId, {
          ...gameState,
          board: tempBoard,
          currentTurnUid: gameState.isPracticeMode ? AI_UID : (iAmPlayer1 ? gameState.player2.uid : gameState.player1.uid),
          turnStartTime: Date.now(),
          winner: myPlayer.hand.length === 0 ? userId : null,
          gameActive: myPlayer.hand.length > 0,
          lastUpdate: Date.now(),
          player1: iAmPlayer1 ? { ...gameState.player1, hasMelded: true } : gameState.player1,
          player2: !iAmPlayer1 ? { ...gameState.player2, hasMelded: true } : gameState.player2,
      });
      setIsModifiedLocally(false);
  };

  const drawTile = async () => {
      if (!isMyTurn || isModifiedLocally) return;
      triggerAppVibration(30);
      const newDeck = [...gameState.deck];
      if (newDeck.length === 0) return;
      const tile = newDeck.pop()!;
      const newHand = [...rawHand, tile];
      const newP1 = iAmPlayer1 ? { ...gameState.player1, hand: newHand } : gameState.player1;
      const newP2 = !iAmPlayer1 ? { ...gameState.player2, hand: newHand } : gameState.player2;
      await updateGameState(coupleId, { 
          ...gameState, 
          deck: newDeck, 
          player1: newP1, player2: newP2,
          currentTurnUid: gameState.isPracticeMode ? AI_UID : (iAmPlayer1 ? gameState.player2.uid : gameState.player1.uid),
          turnStartTime: Date.now(),
          lastUpdate: Date.now() 
      });
  };

  // Logic to sort the player's hand based on number (sets) or color (runs)
  const sortHand = async (type: '777' | '567') => {
      if (!gameState) return;
      triggerAppVibration(15);
      const sortedHand = [...rawHand];
      if (type === '777') {
          // Sort by number first, then color
          sortedHand.sort((a, b) => {
              if (a.isJoker && !b.isJoker) return 1;
              if (!a.isJoker && b.isJoker) return -1;
              if (a.number !== b.number) return a.number - b.number;
              return a.color.localeCompare(b.color);
          });
      } else {
          // Sort by color first, then number
          sortedHand.sort((a, b) => {
              if (a.isJoker && !b.isJoker) return 1;
              if (!a.isJoker && b.isJoker) return -1;
              if (a.color !== b.color) return a.color.localeCompare(b.color);
              return a.number - b.number;
          });
      }

      const newP1 = iAmPlayer1 ? { ...gameState.player1, hand: sortedHand } : gameState.player1;
      const newP2 = !iAmPlayer1 ? { ...gameState.player2, hand: sortedHand } : gameState.player2;
      await updateGameState(coupleId, { ...gameState, player1: newP1, player2: newP2, lastUpdate: Date.now() });
  };

  const resetTableAndRecoverHand = async () => {
      if (!gameState || !turnStartHand.current || !turnStartBoard.current) return;
      triggerAppVibration(20);
      setTempBoard(turnStartBoard.current);
      setIsModifiedLocally(false);
      
      const originalHand = turnStartHand.current;
      const newP1 = iAmPlayer1 ? { ...gameState.player1, hand: originalHand } : gameState.player1;
      const newP2 = !iAmPlayer1 ? { ...gameState.player2, hand: originalHand } : gameState.player2;
      
      await updateGameState(coupleId, {
          ...gameState,
          board: turnStartBoard.current,
          player1: newP1,
          player2: newP2,
          lastUpdate: Date.now()
      });
  };

  const handleDoubleTapHandTile = async (tile: RummiTile) => {
      if (!isMyTurn || !gameState) return;
      triggerAppVibration(15);
      const newBoard = [...tempBoard, [tile]];
      const newHand = rawHand.filter(t => t.id !== tile.id);
      setTempBoard(newBoard);
      setIsModifiedLocally(true);
      
      const newP1 = iAmPlayer1 ? { ...gameState.player1, hand: newHand } : gameState.player1;
      const newP2 = !iAmPlayer1 ? { ...gameState.player2, hand: newHand } : gameState.player2;
      await updateGameState(coupleId, { ...gameState, player1: newP1, player2: newP2, lastUpdate: Date.now() });
  };

  const handleDoubleTapBoardTile = async (tile: RummiTile, rowIndex: number) => {
      if (!isMyTurn || !gameState) return;
      triggerAppVibration(15);
      const newBoard = tempBoard.map((row, idx) => {
          if (idx === rowIndex) return row.filter(t => t.id !== tile.id);
          return row;
      }).filter(row => row.length > 0);
      
      const newHand = [...rawHand, tile];
      setTempBoard(newBoard);
      setIsModifiedLocally(true);
      
      const newP1 = iAmPlayer1 ? { ...gameState.player1, hand: newHand } : gameState.player1;
      const newP2 = !iAmPlayer1 ? { ...gameState.player2, hand: newHand } : gameState.player2;
      await updateGameState(coupleId, { ...gameState, player1: newP1, player2: newP2, lastUpdate: Date.now() });
  };

  const lastTap = useRef<{ [tileId: string]: number }>({});
  const handleTileClick = (e: React.PointerEvent, tile: RummiTile, location: 'hand' | 'board', rowIndex?: number) => {
      const now = Date.now();
      const prevTap = lastTap.current[tile.id] || 0;
      if (now - prevTap < 300) {
          if (location === 'hand') {
              handleDoubleTapHandTile(tile);
          } else if (location === 'board' && rowIndex !== undefined) {
              handleDoubleTapBoardTile(tile, rowIndex);
          }
          lastTap.current[tile.id] = 0;
      } else {
          lastTap.current[tile.id] = now;
      }
  };

  const render3DTile = (tile: RummiTile, location: 'hand' | 'board', rowIndex?: number) => {
      const colorGlow = { 
        'red': 'shadow-[0_0_15px_rgba(244,63,94,0.3)] text-rose-600 border-rose-500/30', 
        'blue': 'shadow-[0_0_15px_rgba(59,130,246,0.3)] text-blue-700 border-blue-500/30', 
        'black': 'shadow-[0_0_15px_rgba(255,255,255,0.1)] text-slate-900 border-slate-500/30', 
        'orange': 'shadow-[0_0_15px_rgba(249,115,22,0.3)] text-orange-600 border-orange-500/30', 
        'joker': 'shadow-[0_0_20px_rgba(168,85,247,0.4)] text-purple-600 border-purple-500/40' 
      };
      const isDragging = drag?.tileIds.includes(tile.id);

      return (
          <div 
            key={tile.id}
            onPointerDown={(e) => {
                handlePointerDown(e, tile.id, location, rowIndex);
                handleTileClick(e, tile, location, rowIndex);
            }}
            className={`
                relative w-10 h-16 md:w-14 md:h-20
                bg-white/10 backdrop-blur-md
                rounded-lg border-2
                flex flex-col items-center justify-center cursor-grab select-none transition-all touch-none
                ${colorGlow[tile.color as keyof typeof colorGlow]}
                ${isDragging ? 'opacity-0' : 'hover:-translate-y-2 hover:brightness-125 active:scale-95'}
            `}
            title="Dubbeltik om te verplaatsen"
          >
              <span className="font-black text-3xl md:text-5xl font-sans pointer-events-none drop-shadow-md">
                {tile.isJoker ? '☻' : tile.number}
              </span>
              <div className="absolute bottom-1 right-2 opacity-10 text-[8px] font-black uppercase tracking-tighter">RUMMI</div>
          </div>
      );
  };

  return (
    <div 
        ref={containerRef}
        className="flex flex-col h-[100dvh] relative overflow-hidden bg-[#0d0206] select-none text-white font-sans"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
    >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,#2d0a14_0%,#0d0206_100%)] opacity-50"></div>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")'}}></div>

        {/* Top bar */}
        <div className="flex justify-between items-center px-6 py-4 bg-black/40 backdrop-blur-3xl border-b border-white/5 z-50 shadow-2xl">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isMyTurn ? 'text-rose-500 animate-pulse' : 'text-white/20'}`}>
                        {isMyTurn ? 'Jouw Beurt' : `Aan zet: ${isAITurn ? 'AI Bot' : opponentName}`}
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full border-2 border-rose-500 bg-white/5 flex items-center justify-center overflow-hidden">
                                {partnerProfile?.photoURL ? <img src={partnerProfile.photoURL} className="w-full h-full object-cover" /> : <Heart size={14} className="text-rose-400" />}
                            </div>
                        </div>
                        <span className="text-sm font-bold text-rose-50">{gameState.isPracticeMode ? 'AI Bot' : opponentName}</span>
                        <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-black text-rose-300">{opponentHandSize}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                {gameState.isPracticeMode && <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] font-black text-purple-400 uppercase tracking-widest"><BrainCircuit size={12}/> Practice Mode</div>}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-colors ${timeLeft < 15 ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}>
                   <Clock size={16} className={timeLeft < 15 ? 'animate-bounce' : ''} />
                   <span className="text-sm font-black font-mono">{timeLeft}s</span>
                </div>
                <button onClick={() => setShowExitConfirm(true)} className="p-2.5 text-white/20 hover:text-rose-500 transition-colors bg-white/5 rounded-full border border-white/5"><LogOut size={20}/></button>
            </div>
        </div>

        {/* ORGANIC GAME BOARD */}
        <div 
            className="flex-1 overflow-y-auto no-scrollbar relative p-8 md:p-16 z-10 perspective-[2000px]"
            onPointerEnter={() => setHoveredZone(null)}
        >
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-12 origin-top rotate-x-[12deg] pb-72">
                {tempBoard.map((row, rIdx) => {
                    const valid = isRowValid(row);
                    const isHovered = hoveredZone?.type === 'row' && hoveredZone.index === rIdx;
                    
                    return (
                        <div 
                            key={rIdx} 
                            onPointerEnter={() => setHoveredZone({ type: 'row', index: rIdx })}
                            className={`
                                flex flex-wrap gap-4 p-8 rounded-[3rem] min-h-[140px] items-center transition-all relative border-4
                                ${valid ? 'bg-white/5 border-transparent shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-rose-500/10 border-rose-500/30 animate-shake shadow-[0_0_30px_rgba(244,63,94,0.1)]'}
                                ${isHovered ? 'ring-4 ring-rose-500/40 scale-[1.03]' : ''}
                                ${valid && row.length >= 3 ? 'after:absolute after:inset-0 after:rounded-[3rem] after:shadow-[inset_0_0_30px_rgba(255,215,0,0.05)] after:pointer-events-none' : ''}
                            `}
                        >
                            {row.map((tile) => render3DTile(tile, 'board', rIdx))}
                            {!valid && row.length > 0 && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-2xl flex items-center gap-2">
                                    <AlertTriangle size={12} /> Ongeldige Reeks
                                </div>
                            )}
                            {valid && (
                                <div className="absolute -bottom-3 right-8 opacity-20 text-[10px] font-black uppercase tracking-[0.3em] text-green-400">Geldig</div>
                            )}
                        </div>
                    );
                })}

                {isMyTurn && (
                    <div 
                        onPointerEnter={() => setHoveredZone({ type: 'new-row' })}
                        className={`
                            border-4 border-dashed rounded-[3rem] h-40 flex flex-col items-center justify-center transition-all
                            ${hoveredZone?.type === 'new-row' ? 'border-orange-500 bg-orange-500/10 scale-[1.02] shadow-[0_0_50px_rgba(249,115,22,0.2)]' : 'border-white/5 bg-white/5'}
                        `}
                    >
                        <PlusCircle size={40} className={`mb-3 transition-colors ${hoveredZone?.type === 'new-row' ? 'text-orange-500' : 'text-white/10'}`} />
                        <span className="text-xs font-black uppercase tracking-[0.5em] text-white/20">Nieuwe Combinatie</span>
                    </div>
                )}
            </div>
        </div>

        {/* PLAYER RACK (COZY) */}
        <div 
            onPointerEnter={() => setHoveredZone({ type: 'hand' })}
            className="bg-[#1a050d]/95 backdrop-blur-3xl p-8 border-t-2 border-rose-900/30 z-[100] relative shadow-[0_-30px_100px_rgba(0,0,0,0.9)]"
        >
            {errorMsg && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-10 py-4 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-[0_20px_50px_rgba(244,63,94,0.4)] animate-in slide-in-from-bottom-6 duration-300">
                    <AlertTriangle size={20} className="inline mr-2" /> {errorMsg}
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex gap-4">
                        <button onClick={() => sortHand('777')} className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-rose-500/20 rounded-2xl border border-white/10 transition-all text-[11px] font-black uppercase tracking-widest shadow-xl"><Hash size={16}/> Sets (777)</button>
                        <button onClick={() => sortHand('567')} className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-rose-500/20 rounded-2xl border border-white/10 transition-all text-[11px] font-black uppercase tracking-widest shadow-xl"><Pipette size={16}/> Runs (789)</button>
                    </div>

                    <div className="flex gap-4">
                        {isModifiedLocally && (
                            <button 
                                onClick={resetTableAndRecoverHand}
                                className="px-6 py-3 bg-white/5 hover:bg-rose-500/20 text-rose-300 rounded-2xl border border-rose-500/20 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                                title="Herstel de tafel en haal al je geplaatste stenen terug naar je rek"
                            >
                                <RotateCcw size={16} /> Herstel Tafel (Recall)
                            </button>
                        )}
                        {isMyTurn && (
                            <button 
                                onClick={isModifiedLocally ? finishTurn : drawTile}
                                className={`px-12 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_15px_40px_rgba(0,0,0,0.4)]
                                ${isModifiedLocally ? 'bg-green-600 text-white hover:bg-green-500 shadow-green-500/20' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20'}`}
                            >
                                {isModifiedLocally ? 'Beurt Beëindigen' : 'Pak Steen'}
                            </button>
                        )}
                    </div>
                </div>

                {isMyTurn && (
                    <div className="text-center text-[10px] font-black text-rose-400/40 uppercase tracking-[0.2em] mb-4">
                        💡 Dubbeltik op een steen om te verplaatsen tussen bord en rek
                    </div>
                )}

                <div className="bg-black/40 p-10 rounded-[4rem] min-h-[200px] border-t border-white/5 shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-rose-500/5 opacity-50 pointer-events-none"></div>
                    <div className="flex gap-4 flex-wrap items-center justify-center relative z-10">
                        {rawHand.map(t => render3DTile(t, 'hand'))}
                        {rawHand.length === 0 && <p className="text-rose-500/20 font-hand text-4xl animate-pulse">Je bent uit! Wacht op validatie...</p>}
                    </div>
                </div>
            </div>
        </div>

        {/* Drag Preview */}
        {drag && (
            <div 
                className="fixed z-[500] pointer-events-none flex gap-3"
                style={{ 
                    left: drag.currentX, 
                    top: drag.currentY, 
                    transform: 'translate(-50%, -100%) scale(1.2) rotateX(15deg)' 
                }}
            >
                {drag.tileIds.map(id => {
                    const tile = [...rawHand, ...tempBoard.flat()].find(t => t.id === id);
                    if (!tile) return null;
                    const colorGlow = { 'red': 'text-rose-600', 'blue': 'text-blue-700', 'black': 'text-slate-900', 'orange': 'text-orange-600', 'joker': 'text-purple-600' };
                    return (
                        <div key={id} className="w-14 h-20 bg-white/90 backdrop-blur-xl rounded-lg shadow-2xl border-2 border-white flex items-center justify-center">
                            <span className={`font-black text-4xl font-sans ${colorGlow[tile.color as keyof typeof colorGlow]}`}>
                                {tile.isJoker ? '☻' : tile.number}
                            </span>
                        </div>
                    );
                })}
            </div>
        )}

        {/* Exit Modal */}
        {showExitConfirm && (
            <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="glass-panel w-full max-w-sm p-12 rounded-[4rem] text-center border-2 border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
                    <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-rose-500/20">
                        <Heart className="text-rose-500 w-10 h-10 animate-pulse fill-rose-500" />
                    </div>
                    <h2 className="text-3xl font-black text-rose-50 mb-4 font-hand">Spel Vergeten?</h2>
                    <p className="text-sm text-white/40 mb-10 leading-relaxed font-medium">Weet je zeker dat je de tafel wilt verlaten? Jullie voortgang wordt opgeslagen.</p>
                    <div className="space-y-4">
                        <button onClick={() => setShowExitConfirm(false)} className="w-full py-5 bg-rose-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-rose-500/20 active:scale-95 transition-all">Verder Spelen</button>
                        <button onClick={async () => { await updateGameState(coupleId, { ...gameState, gameActive: false }); setShowExitConfirm(false); }} className="w-full py-4 text-rose-300/30 font-bold text-[11px] uppercase tracking-widest hover:text-rose-300 transition-colors">Tafel Verlaten</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Rummikub;
