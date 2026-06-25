import React, { useState, useEffect } from 'react';
import { 
  User, Room, Card, PlayAction, GameState, ScoreRecord, Suit 
} from '../types';
import { getTranslation } from '../i18n';
import { 
  generateDecks, shuffleCards, sortCards, canBeat, analyzeCombination, makeBotMove, calculateGameScore, getNextLevel 
} from '../utils/guandanEngine';
import { 
  User as UserIcon, LogOut, Video, VideoOff, Mic, MicOff, Users, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Shield, RefreshCw, Layers, SortAsc, HelpCircle, Eye, ChevronRight, Edit2, Play, Circle, Trophy, History, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// 24 Solar Terms english and chinese pairs
export const SOLAR_TERMS = [
  { nameEn: "Start of Spring", nameZh: "立春" },
  { nameEn: "Rain Water", nameZh: "雨水" },
  { nameEn: "Awakening of Insects", nameZh: "惊蛰" },
  { nameEn: "Spring Equinox", nameZh: "春分" },
  { nameEn: "Clear and Bright", nameZh: "清明" },
  { nameEn: "Grain Rain", nameZh: "谷雨" },
  { nameEn: "Start of Summer", nameZh: "立夏" },
  { nameEn: "Grain Buds", nameZh: "小满" },
  { nameEn: "Grain in Ear", nameZh: "芒种" },
  { nameEn: "Summer Solstice", nameZh: "夏至" },
  { nameEn: "Minor Heat", nameZh: "小暑" },
  { nameEn: "Major Heat", nameZh: "大暑" },
  { nameEn: "Start of Autumn", nameZh: "立秋" },
  { nameEn: "End of Heat", nameZh: "处暑" },
  { nameEn: "White Dew", nameZh: "白露" },
  { nameEn: "Autumn Equinox", nameZh: "秋分" },
  { nameEn: "Cold Dew", nameZh: "寒露" },
  { nameEn: "Frost Descent", nameZh: "霜降" },
  { nameEn: "Start of Winter", nameZh: "立冬" },
  { nameEn: "Minor Snow", nameZh: "小雪" },
  { nameEn: "Major Snow", nameZh: "大雪" },
  { nameEn: "Winter Solstice", nameZh: "冬至" },
  { nameEn: "Minor Cold", nameZh: "小寒" },
  { nameEn: "Major Cold", nameZh: "大寒" }
];

interface PlayerPortalProps {
  language: 'en' | 'zh';
  setLanguage: (lang: 'en' | 'zh') => void;
  users: User[];
  onRegister: (newUser: Omit<User, 'id' | 'role' | 'status' | 'createdAt'>) => void;
  onLogin: (email: string, pass: string) => User | null;
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  rooms: Room[];
  updateRooms: (rooms: Room[]) => void;
  onRecordGame: (record: ScoreRecord) => void;
  scoresHistory: ScoreRecord[];
}

export default function PlayerPortal({
  language,
  setLanguage,
  users,
  onRegister,
  onLogin,
  currentUser,
  setCurrentUser,
  rooms,
  updateRooms,
  onRecordGame,
  scoresHistory,
}: PlayerPortalProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Registration state
  const [regFullName, setRegFullName] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLanguage, setRegLanguage] = useState<'en' | 'zh'>(language);
  const [regInvitationCode, setRegInvitationCode] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [authError, setAuthError] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Navigation and play state
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<{ [id: string]: boolean }>({});
  const [sortStrategy, setSortStrategy] = useState<'rank' | 'suit' | 'combo'>('rank');
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [cardRows, setCardRows] = useState<{ [cardId: string]: 1 | 2 }>({});
  const [seatedPlayers, setSeatedPlayers] = useState<{ id: string; displayName: string; seat: 0 | 1 | 2 | 3; team: 'A' | 'B'; isBot: boolean }[]>([]);
  const [autoWaitActive, setAutoWaitActive] = useState(false);
  const [loungeMode, setLoungeMode] = useState<'choose' | 'wait' | null>(null);

  // Interactive panels
  const [showHistory, setShowHistory] = useState(false);
  const [showRules, setShowRules] = useState(false);
  
  // Custom Team Names
  const [teamAName, setTeamAName] = useState('Dragon Team（龙队）');
  const [teamBName, setTeamBName] = useState('Tiger Team（虎队）');
  const [isEditingTeams, setIsEditingTeams] = useState(false);

  // WebRTC Simulation State
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);

  // Scoring details
  const [scoringMode, setScoringMode] = useState<'manual' | 'auto'>('auto');
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [manualWinner, setManualWinner] = useState<'A' | 'B'>('A');
  const [manualAdvance, setManualAdvance] = useState(1);
  const [manualNotes, setManualNotes] = useState('');

  const t = (key: string) => getTranslation(key, language);

  // Register Handler
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regNickname || !regEmail || !regPassword) {
      setAuthError(language === 'en' ? 'Please fill in all required fields.' : '请填写所有必填字段。');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError(language === 'en' ? 'Passwords do not match.' : '两次输入的密码不一致。');
      return;
    }
    onRegister({
      fullName: regFullName,
      displayName: regNickname,
      email: regEmail,
      phone: regPhone,
      preferredLanguage: regLanguage,
    });
    setRegSuccess(true);
    setAuthError('');
  };

  // Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const user = onLogin(loginEmail, loginPassword);
    if (!user) {
      setAuthError(language === 'en' ? 'Invalid credentials or account suspended.' : '无效的凭证或账号已被停用。');
      return;
    }
    if (user.status === 'Pending') {
      setAuthError(t('approvalNotice'));
      return;
    }
    if (user.status === 'Suspended' || user.status === 'Rejected') {
      setAuthError(language === 'en' ? 'Your account is disabled/rejected.' : '您的账号已被禁用或拒绝。');
      return;
    }
    setCurrentUser(user);
    setLanguage(user.preferredLanguage);
  };

  // Join Room
  const handleJoinRoom = (roomId: number) => {
    if (!currentUser) return;
    
    // Update seats and room status in the global state
    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return;

    if (targetRoom.currentPlayerCount >= 4) {
      alert(language === 'en' ? 'This room is full.' : '房间已满。');
      return;
    }

    // Set Room Info and transition to room view
    setSelectedRoomId(roomId);
    setLoungeMode('choose');

    // Initialize seated players list (User is South / Seat 0)
    setSeatedPlayers([
      { id: currentUser.id, displayName: currentUser.displayName, seat: 0, team: 'A', isBot: false }
    ]);
    setAutoWaitActive(false);

    // Update global room lists to reflect player joining
    const updatedRooms = rooms.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          currentPlayerCount: 1,
          players: [currentUser.id],
          status: 'Waiting' as const,
        };
      }
      return r;
    });
    updateRooms(updatedRooms);
  };

  // Leave Room
  const handleLeaveRoom = () => {
    if (!selectedRoomId) return;
    const updatedRooms = rooms.map(r => {
      if (r.id === selectedRoomId) {
        return {
          ...r,
          currentPlayerCount: 0,
          players: [],
          status: 'Waiting' as const,
        };
      }
      return r;
    });
    updateRooms(updatedRooms);
    setSelectedRoomId(null);
    setLoungeMode(null);
    setGame(null);
    setSelectedCards({});
    setShowHistory(false);
  };

  // Admin Reset Room
  const handleResetRoom = (roomId: number) => {
    const updatedRooms = rooms.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          currentPlayerCount: 0,
          players: [],
          status: 'Waiting' as const,
        };
      }
      return r;
    });
    updateRooms(updatedRooms);
    
    // If current user is in this room, redirect them back to lobby
    if (selectedRoomId === roomId) {
      setSelectedRoomId(null);
      setLoungeMode(null);
      setGame(null);
      setSelectedCards({});
      setShowHistory(false);
    }
  };

  // Start / Init game
  const initGame = (roomId: number, customPlayers?: { id: string; displayName: string; seat: 0 | 1 | 2 | 3; team: 'A' | 'B'; isBot: boolean }[]) => {
    const levelCard = '2'; // Starting level card is always 2
    const allCards = generateDecks(levelCard);
    const shuffled = shuffleCards(allCards);

    // Deal 27 cards to each of the 4 players
    const hand0 = shuffled.slice(0, 27);
    const hand1 = shuffled.slice(27, 54);
    const hand2 = shuffled.slice(54, 81);
    const hand3 = shuffled.slice(81, 108);

    const defaultPlayers = [
      { id: currentUser?.id || 'player-1', displayName: currentUser?.displayName || 'Player', seat: 0 as const, team: 'A' as const, isBot: false },
      { id: 'bot-1', displayName: language === 'en' ? 'AlphaBot' : '智多星电脑', seat: 1 as const, team: 'B' as const, isBot: true },
      { id: 'bot-2', displayName: language === 'en' ? 'OmegaBot (Partner)' : '大将军对家', seat: 2 as const, team: 'A' as const, isBot: true },
      { id: 'bot-3', displayName: language === 'en' ? 'SigmaBot' : '无双刀电脑', seat: 3 as const, team: 'B' as const, isBot: true },
    ];

    const finalPlayersDef = customPlayers && customPlayers.length === 4 ? customPlayers : defaultPlayers;

    const initialGame: GameState = {
      id: `game-${Date.now()}`,
      roomId,
      status: 'playing',
      scoringMode: 'auto',
      currentLevel: '2',
      levelCardValue: '2',
      players: finalPlayersDef.map((p, idx) => {
        const hand = idx === 0 ? hand0 : idx === 1 ? hand1 : idx === 2 ? hand2 : hand3;
        return {
          id: p.id,
          displayName: p.displayName,
          seat: p.seat,
          team: p.team,
          cards: sortCards(hand, 'rank', levelCard),
          hasFinished: false
        };
      }),
      teamA: { name: teamAName, playerIds: [finalPlayersDef[0].id, finalPlayersDef[2].id] },
      teamB: { name: teamBName, playerIds: [finalPlayersDef[1].id, finalPlayersDef[3].id] },
      activePlayerIndex: 0, // South starts
      lastPlay: null,
      history: [],
      scores: {
        teamAScore: 0,
        teamBScore: 0,
        teamALevel: '2',
        teamBLevel: '2',
      }
    };
    setGame(initialGame);
    setSelectedCards({});
  };

  // Simulate online players joining the room lounge over time
  useEffect(() => {
    if (!autoWaitActive || !selectedRoomId || game) return;

    const timer = setInterval(() => {
      setSeatedPlayers(prev => {
        if (prev.length >= 4) {
          setAutoWaitActive(false);
          return prev;
        }

        // Find the first empty seat
        const occupiedSeats = new Set(prev.map(p => p.seat));
        let nextSeat: 1 | 2 | 3 = 1;
        for (const s of [2, 1, 3] as const) {
          if (!occupiedSeats.has(s)) {
            nextSeat = s;
            break;
          }
        }

        const candidateNamesZh = ['大将军对家', '无双刀电脑', '智多星电脑', '对攻大师', '牌坛老手', '清风徐来', '掼蛋至尊', '江南皮皮虾'];
        const candidateNamesEn = ['AlphaBot', 'OmegaBot (Partner)', 'SigmaBot', 'PokerPro', 'GuandanKing', 'CardMaster'];
        const names = language === 'zh' ? candidateNamesZh : candidateNamesEn;
        
        const existingNames = new Set(prev.map(p => p.displayName));
        const availableName = names.find(n => !existingNames.has(n)) || `Player-${Math.floor(Math.random() * 1000)}`;

        const newPlayer = {
          id: `player-sim-${Date.now()}`,
          displayName: availableName,
          seat: nextSeat,
          team: nextSeat === 2 ? ('A' as const) : ('B' as const),
          isBot: false
        };

        return [...prev, newPlayer].sort((a, b) => a.seat - b.seat);
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [autoWaitActive, selectedRoomId, game, language]);

  // Synchronize seated players with global rooms list
  useEffect(() => {
    if (!selectedRoomId || game) return;
    const targetRoom = rooms.find(r => r.id === selectedRoomId);
    if (!targetRoom) return;

    if (targetRoom.currentPlayerCount !== seatedPlayers.length) {
      const updatedRooms = rooms.map(r => {
        if (r.id === selectedRoomId) {
          return {
            ...r,
            currentPlayerCount: seatedPlayers.length,
            players: seatedPlayers.map(p => p.id),
            status: seatedPlayers.length >= 4 ? ('Full' as const) : ('Waiting' as const)
          };
        }
        return r;
      });
      updateRooms(updatedRooms);
    }
  }, [seatedPlayers, selectedRoomId, game, rooms, updateRooms]);

  // If the room gets reset by an admin, redirect back to lobby
  useEffect(() => {
    if (!selectedRoomId) return;
    const targetRoom = rooms.find(r => r.id === selectedRoomId);
    if (targetRoom && targetRoom.currentPlayerCount === 0 && targetRoom.players.length === 0) {
      if (game || (seatedPlayers.length > 1) || loungeMode === 'wait') {
        setSelectedRoomId(null);
        setLoungeMode(null);
        setGame(null);
        setSelectedCards({});
        setShowHistory(false);
      }
    }
  }, [rooms, selectedRoomId, game, seatedPlayers, loungeMode]);

  // Seating management actions
  const handleSeatPlayer = (seat: 0 | 1 | 2 | 3, displayName: string, isBot: boolean) => {
    setSeatedPlayers(prev => {
      const filtered = prev.filter(p => p.seat !== seat);
      const newPlayer = {
        id: isBot ? `bot-${seat}-${Date.now()}` : `friend-${seat}-${Date.now()}`,
        displayName: displayName || (isBot ? (language === 'zh' ? '电脑机器人' : 'Bot') : (language === 'zh' ? '好友玩家' : 'Friend')),
        seat,
        team: (seat === 0 || seat === 2) ? ('A' as const) : ('B' as const),
        isBot
      };
      return [...filtered, newPlayer].sort((a, b) => a.seat - b.seat);
    });
  };

  const handleKickPlayer = (seat: 0 | 1 | 2 | 3) => {
    setSeatedPlayers(prev => prev.filter(p => p.seat !== seat));
  };

  const handleFillAllBots = () => {
    setSeatedPlayers(prev => {
      const occupiedSeats = new Set(prev.map(p => p.seat));
      const next = [...prev];
      
      const botNames = {
        1: language === 'zh' ? '智多星电脑' : 'AlphaBot',
        2: language === 'zh' ? '大将军对家' : 'OmegaBot (Partner)',
        3: language === 'zh' ? '无双刀电脑' : 'SigmaBot'
      };

      ([1, 2, 3] as const).forEach(seat => {
        if (!occupiedSeats.has(seat)) {
          next.push({
            id: `bot-${seat}-${Date.now()}`,
            displayName: botNames[seat],
            seat,
            team: seat === 2 ? ('A' as const) : ('B' as const),
            isBot: true
          });
        }
      });

      return next.sort((a, b) => a.seat - b.seat);
    });
  };

  // Find current trick's plays for each player
  const currentTrickActions = React.useMemo(() => {
    if (!game) return [];
    const actions: PlayAction[] = [];
    let passCount = 0;
    for (let i = 0; i < game.history.length; i++) {
      const act = game.history[i];
      if (act.isPass) {
        passCount++;
      } else {
        passCount = 0;
      }
      if (passCount >= 3) {
        break;
      }
      actions.push(act);
    }
    return actions;
  }, [game?.history]);

  const getPlayerCurrentTrickPlay = (seatIndex: number) => {
    if (!game) return null;
    const player = game.players[seatIndex];
    return currentTrickActions.find(act => act.playerId === player.id);
  };

  // Insert space between cards by adding a special spacer card
  const handleAddSpacer = () => {
    if (!game) return;
    const spacerId = `spacer-${Date.now()}-${Math.random()}`;
    const newSpacerCard: Card = {
      id: spacerId,
      suit: 'clubs',
      value: 'spacer',
      rank: -1,
      isLevelCard: false,
      isWild: false,
      deck: 1
    };
    setCardRows(prev => ({
      ...prev,
      [spacerId]: 1
    }));
    setGame(prev => {
      if (!prev) return null;
      const updatedPlayers = prev.players.map((p, idx) => {
        if (idx === 0) {
          return { ...p, cards: [...p.cards, newSpacerCard] };
        }
        return p;
      });
      return { ...prev, players: updatedPlayers };
    });
  };

  // Synchronize cardRows state when game player cards change
  useEffect(() => {
    if (!game) {
      setCardRows({});
      return;
    }
    const myCards = game.players[0].cards;
    if (myCards.length === 0) return;

    setCardRows(prev => {
      let changed = false;
      const nextRows = { ...prev };
      
      // Remove any old/played cards from state
      const activeIds = new Set(myCards.map(c => c.id));
      for (const id in nextRows) {
        if (!activeIds.has(id)) {
          delete nextRows[id];
          changed = true;
        }
      }

      // Add missing cards (defaulting to split 50/50 initially)
      const midPoint = Math.ceil(myCards.length / 2);
      myCards.forEach((c, idx) => {
        if (!nextRows[c.id]) {
          nextRows[c.id] = idx < midPoint ? 1 : 2;
          changed = true;
        }
      });

      return changed ? nextRows : prev;
    });
  }, [game?.players[0]?.cards]);

  // Re-deal cards
  const handleRedeal = () => {
    if (selectedRoomId) {
      initGame(selectedRoomId, seatedPlayers);
    }
  };

  // Sort current player cards
  const handleSort = (strategy: 'rank' | 'suit' | 'combo') => {
    if (!game) return;
    setSortStrategy(strategy);
    const levelCard = game.currentLevel;
    setCardRows({});

    setGame(prev => {
      if (!prev) return null;
      const updatedPlayers = prev.players.map(p => {
        if (p.seat === 0) {
          const realCardsOnly = p.cards.filter(c => c.value !== 'spacer');
          const spacersOnly = p.cards.filter(c => c.value === 'spacer');
          const sortedReal = sortCards(realCardsOnly, strategy, levelCard);
          return {
            ...p,
            cards: [...sortedReal, ...spacersOnly]
          };
        }
        return p;
      });
      return { ...prev, players: updatedPlayers };
    });
  };

  // Card Selection toggle
  const toggleSelectCard = (cardId: string) => {
    setSelectedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Drag and Drop card reordering
  const handleCardDrop = (draggedId: string, targetId: string) => {
    if (!game) return;
    const cards = [...game.players[0].cards];
    const dragIdx = cards.findIndex(c => c.id === draggedId);
    const dropIdx = cards.findIndex(c => c.id === targetId);
    if (dragIdx !== -1 && dropIdx !== -1 && dragIdx !== dropIdx) {
      const [draggedCard] = cards.splice(dragIdx, 1);
      cards.splice(dropIdx, 0, draggedCard);

      // Update row assignment to match target card's row
      setCardRows(prev => {
        const targetRow = prev[targetId] || 1;
        if (prev[draggedId] !== targetRow) {
          return {
            ...prev,
            [draggedId]: targetRow
          };
        }
        return prev;
      });

      setGame(prev => {
        if (!prev) return null;
        const updatedPlayers = prev.players.map((p, idx) => {
          if (idx === 0) {
            return { ...p, cards };
          }
          return p;
        });
        return { ...prev, players: updatedPlayers };
      });
    }
  };

  const handleCardDropToRow = (draggedId: string, rowNum: 1 | 2) => {
    if (!game) return;

    // 1. Update the row assignment state
    setCardRows(prev => ({
      ...prev,
      [draggedId]: rowNum
    }));

    // 2. Adjust position in master cards list
    const cards = [...game.players[0].cards];
    const dragIdx = cards.findIndex(c => c.id === draggedId);
    if (dragIdx !== -1) {
      const [draggedCard] = cards.splice(dragIdx, 1);
      
      const getRow = (id: string) => {
        if (id === draggedId) return rowNum;
        return cardRows[id] || 1;
      };

      const rowCardIndices = cards
        .map((c, idx) => ({ id: c.id, idx }))
        .filter(item => getRow(item.id) === rowNum);

      if (rowCardIndices.length > 0) {
        const lastIdxOfRow = rowCardIndices[rowCardIndices.length - 1].idx;
        cards.splice(lastIdxOfRow + 1, 0, draggedCard);
      } else {
        if (rowNum === 1) {
          cards.unshift(draggedCard);
        } else {
          cards.push(draggedCard);
        }
      }

      setGame(prev => {
        if (!prev) return null;
        const updatedPlayers = prev.players.map((p, idx) => {
          if (idx === 0) {
            return { ...p, cards };
          }
          return p;
        });
        return { ...prev, players: updatedPlayers };
      });
    }
  };

  const handleMoveSelectedLeft = () => {
    if (!game) return;
    const cards = [...game.players[0].cards];
    const row1Cards = cards.filter(c => (cardRows[c.id] || 1) === 1);
    const row2Cards = cards.filter(c => (cardRows[c.id] || 1) === 2);

    // Shift selected left in row1
    for (let i = 1; i < row1Cards.length; i++) {
      if (selectedCards[row1Cards[i].id] && !selectedCards[row1Cards[i - 1].id]) {
        const temp = row1Cards[i];
        row1Cards[i] = row1Cards[i - 1];
        row1Cards[i - 1] = temp;
      }
    }

    // Shift selected left in row2
    for (let i = 1; i < row2Cards.length; i++) {
      if (selectedCards[row2Cards[i].id] && !selectedCards[row2Cards[i - 1].id]) {
        const temp = row2Cards[i];
        row2Cards[i] = row2Cards[i - 1];
        row2Cards[i - 1] = temp;
      }
    }

    const newCards = [...row1Cards, ...row2Cards];
    setGame(prev => {
      if (!prev) return null;
      const updatedPlayers = prev.players.map((p, idx) => idx === 0 ? { ...p, cards: newCards } : p);
      return { ...prev, players: updatedPlayers };
    });
  };

  const handleMoveSelectedRight = () => {
    if (!game) return;
    const cards = [...game.players[0].cards];
    const row1Cards = cards.filter(c => (cardRows[c.id] || 1) === 1);
    const row2Cards = cards.filter(c => (cardRows[c.id] || 1) === 2);

    // Shift selected right in row1
    for (let i = row1Cards.length - 2; i >= 0; i--) {
      if (selectedCards[row1Cards[i].id] && !selectedCards[row1Cards[i + 1].id]) {
        const temp = row1Cards[i];
        row1Cards[i] = row1Cards[i + 1];
        row1Cards[i + 1] = temp;
      }
    }

    // Shift selected right in row2
    for (let i = row2Cards.length - 2; i >= 0; i--) {
      if (selectedCards[row2Cards[i].id] && !selectedCards[row2Cards[i + 1].id]) {
        const temp = row2Cards[i];
        row2Cards[i] = row2Cards[i + 1];
        row2Cards[i + 1] = temp;
      }
    }

    const newCards = [...row1Cards, ...row2Cards];
    setGame(prev => {
      if (!prev) return null;
      const updatedPlayers = prev.players.map((p, idx) => idx === 0 ? { ...p, cards: newCards } : p);
      return { ...prev, players: updatedPlayers };
    });
  };

  const handleMoveSelectedToUpperRow = () => {
    if (!game) return;
    const cards = [...game.players[0].cards];
    const row1Cards = cards.filter(c => (cardRows[c.id] || 1) === 1);
    const row2Cards = cards.filter(c => (cardRows[c.id] || 1) === 2);

    // Find selected cards in row 2
    const toMove = row2Cards.filter(c => selectedCards[c.id]);
    if (toMove.length === 0) return;

    // Remove from row 2
    const remainingRow2 = row2Cards.filter(c => !selectedCards[c.id]);
    // Add to row 1 (at the end)
    const newRow1 = [...row1Cards, ...toMove];

    // Update cardRows state for moved cards
    setCardRows(prev => {
      const next = { ...prev };
      toMove.forEach(c => {
        next[c.id] = 1;
      });
      return next;
    });

    const newCards = [...newRow1, ...remainingRow2];
    setGame(prev => {
      if (!prev) return null;
      const updatedPlayers = prev.players.map((p, idx) => idx === 0 ? { ...p, cards: newCards } : p);
      return { ...prev, players: updatedPlayers };
    });
  };

  const handleMoveSelectedToLowerRow = () => {
    if (!game) return;
    const cards = [...game.players[0].cards];
    const row1Cards = cards.filter(c => (cardRows[c.id] || 1) === 1);
    const row2Cards = cards.filter(c => (cardRows[c.id] || 1) === 2);

    // Find selected cards in row 1
    const toMove = row1Cards.filter(c => selectedCards[c.id]);
    if (toMove.length === 0) return;

    // Remove from row 1
    const remainingRow1 = row1Cards.filter(c => !selectedCards[c.id]);
    // Add to row 2 (at the beginning)
    const newRow2 = [...toMove, ...row2Cards];

    // Update cardRows state for moved cards
    setCardRows(prev => {
      const next = { ...prev };
      toMove.forEach(c => {
        next[c.id] = 2;
      });
      return next;
    });

    const newCards = [...remainingRow1, ...newRow2];
    setGame(prev => {
      if (!prev) return null;
      const updatedPlayers = prev.players.map((p, idx) => idx === 0 ? { ...p, cards: newCards } : p);
      return { ...prev, players: updatedPlayers };
    });
  };

  // Player action: Play selected cards
  const handlePlaySelected = () => {
    if (!game || game.activePlayerIndex !== 0) return;

    const myHand = game.players[0].cards;
    const playList = myHand.filter(c => selectedCards[c.id] && c.value !== 'spacer');

    if (playList.length === 0) {
      alert(t('mustPlayValid'));
      return;
    }

    // Validate play combo
    const combo = analyzeCombination(playList, game.currentLevel);
    if (combo.type === 'invalid') {
      alert(t('invalidPlay'));
      return;
    }

    // Check if it beats the previous play
    if (game.lastPlay && !canBeat(playList, game.lastPlay, game.currentLevel)) {
      alert(t('invalidPlay'));
      return;
    }

    // Execute Play!
    executePlay(0, playList, combo.label, combo.labelZh, false);
  };

  // Player action: Pass / Check
  const handlePass = () => {
    if (!game || game.activePlayerIndex !== 0) return;
    if (!game.lastPlay) {
      alert(language === 'en' ? "You must lead a play, you cannot pass!" : "首出不能过牌！");
      return;
    }

    executePlay(0, [], 'Pass', '不要', true);
  };

  // Execute a play (could be human or bot)
  const executePlay = (
    seatIndex: number, 
    cardsPlayed: Card[], 
    typeEn: string, 
    typeZh: string, 
    isPass: boolean
  ) => {
    setGame(prev => {
      if (!prev) return null;

      const player = prev.players[seatIndex];
      const nextSeatIndex = (seatIndex + 1) % 4;

      // Filter hand
      let nextCards = player.cards.filter(c => !cardsPlayed.some(cp => cp.id === c.id));
      const hasRealCardsLeft = nextCards.some(c => c.value !== 'spacer');
      if (!hasRealCardsLeft) {
        nextCards = []; // if only spacers are left, clear them to treat it as empty
      }
      const hasFinishedNow = nextCards.length === 0 && !player.hasFinished;

      // Track finish order
      const currentFinishersCount = prev.players.filter(p => {
        if (p.hasFinished) return true;
        if (p.seat === seatIndex) return nextCards.length === 0;
        return p.cards.filter(c => c.value !== 'spacer').length === 0;
      }).length;
      const finishOrder = hasFinishedNow ? currentFinishersCount : player.finishOrder;

      // Create log
      const playAction: PlayAction = {
        id: `play-${Date.now()}-${seatIndex}`,
        playerId: player.id,
        playerName: player.displayName,
        team: player.team,
        cards: cardsPlayed,
        cardType: language === 'en' ? typeEn : typeZh,
        timestamp: new Date().toLocaleTimeString(),
        isPass,
      };

      // Update history and last play
      const updatedHistory = [playAction, ...prev.history];
      
      // Determine new lead. If all other active players pass, the lead clears.
      // In Guandan, if there is a play, then 3 consecutive passes, the trick is completed and the last player who played leads next.
      let nextLastPlay = prev.lastPlay;
      if (!isPass) {
        nextLastPlay = playAction;
      }

      // Check if trick completed (3 consecutive passes since last real play)
      // For this simplified logic, if the next active player was the one who played lastPlay, clear lastPlay
      const isNextPlayerOwnerOfLastPlay = nextLastPlay && nextLastPlay.playerId === prev.players[nextSeatIndex].id;
      const clearedLastPlay = isNextPlayerOwnerOfLastPlay ? null : nextLastPlay;

      // Update player hand & stats
      const updatedPlayers = prev.players.map(p => {
        if (p.seat === seatIndex) {
          return {
            ...p,
            cards: nextCards,
            hasFinished: nextCards.length === 0 ? true : p.hasFinished,
            finishOrder: hasFinishedNow ? currentFinishersCount : p.finishOrder,
          };
        }
        return p;
      });

      // Check if Game Completed (All players on a team have finished, or only one player remains with cards)
      const finishedPlayers = updatedPlayers.filter(p => p.hasFinished);
      const gameFinished = finishedPlayers.length >= 3;

      let gameStatus = prev.status;
      if (gameFinished) {
        gameStatus = 'ended';
      }

      return {
        ...prev,
        players: updatedPlayers,
        activePlayerIndex: nextSeatIndex,
        lastPlay: clearedLastPlay,
        history: updatedHistory,
        status: gameStatus,
      };
    });

    // Reset selected cards for human
    if (seatIndex === 0) {
      setSelectedCards({});
    }
  };

  // Bot Turn Simulator Loop
  useEffect(() => {
    if (!game || game.status !== 'playing' || game.activePlayerIndex === 0) return;

    // Trigger bot play after a realistic short delay
    const timer = setTimeout(() => {
      const activeSeat = game.activePlayerIndex;
      const bot = game.players[activeSeat];

      // If the bot has already finished, skip their turn instantly
      if (bot.hasFinished) {
        setGame(prev => {
          if (!prev) return null;
          return {
            ...prev,
            activePlayerIndex: (activeSeat + 1) % 4
          };
        });
        return;
      }

      // Compute Bot Action
      const botMove = makeBotMove(bot.cards, game.lastPlay, game.currentLevel);

      if (botMove.isPass) {
        executePlay(activeSeat, [], 'Pass', '不要', true);
      } else {
        const combo = analyzeCombination(botMove.playCards, game.currentLevel);
        executePlay(activeSeat, botMove.playCards, combo.label, combo.labelZh, false);
      }

    }, 1200);

    return () => clearTimeout(timer);
  }, [game?.activePlayerIndex, game?.status]);

  // Automatically skip finished players' turns & handle "接风" (Wind Catching) rule
  useEffect(() => {
    if (!game || game.status !== 'playing') return;

    const activeSeat = game.activePlayerIndex;
    const activePlayer = game.players[activeSeat];
    
    if (activePlayer.hasFinished) {
      setGame(prev => {
        if (!prev) return null;
        
        let nextSeat = (activeSeat + 1) % 4;
        let nextLastPlay = prev.lastPlay;

        // "接风" (Wind Catching) Rule:
        // If a player has finished and the lead is returned to them (i.e., lastPlay was theirs and everyone else passed,
        // which means lastPlay.playerId === activePlayer.id), then their partner gets the lead!
        if (prev.lastPlay && prev.lastPlay.playerId === activePlayer.id) {
          // Clear lastPlay (ends the trick)
          nextLastPlay = null;
          // Partner of active player leads!
          const partnerSeat = (activeSeat + 2) % 4;
          nextSeat = partnerSeat;
        } else {
          // Otherwise, normal skip. If the next seat is the owner of lastPlay, clear trick.
          if (nextLastPlay && nextLastPlay.playerId === prev.players[nextSeat].id) {
            nextLastPlay = null;
          }
        }

        return {
          ...prev,
          activePlayerIndex: nextSeat,
          lastPlay: nextLastPlay
        };
      });
    }
  }, [game?.activePlayerIndex, game?.status, game?.lastPlay]);

  // Handle automatic scoring on game end
  useEffect(() => {
    if (game && game.status === 'ended' && game.scoringMode === 'auto' && !showScoringModal) {
      // Find completion order of players
      const orderedPlayers = [...game.players]
        .filter(p => p.hasFinished)
        .sort((a, b) => (a.finishOrder || 0) - (b.finishOrder || 0))
        .map(p => p.seat.toString() as '0' | '1' | '2' | '3');

      // Add remaining player to the end
      game.players.forEach(p => {
        if (!p.hasFinished) {
          orderedPlayers.push(p.seat.toString() as '0' | '1' | '2' | '3');
        }
      });

      const scoreResult = calculateGameScore(orderedPlayers);
      
      // Update levels in state and show scoring confirmation modal
      setManualWinner(scoreResult.winningTeam);
      setManualAdvance(scoreResult.levelAdvance);
      setManualNotes(language === 'en' ? scoreResult.scoreText : scoreResult.scoreTextZh);
      setShowScoringModal(true);
    }
  }, [game?.status]);

  // Confirm and save score sheet
  const handleConfirmScore = () => {
    if (!game) return;

    const nextLevelValue = getNextLevel(game.currentLevel, manualAdvance);

    const scoreRecord: ScoreRecord = {
      id: `score-${Date.now()}`,
      gameId: game.id,
      roomName: language === 'en' 
        ? `${SOLAR_TERMS[selectedRoomId! - 1].nameEn}` 
        : `${SOLAR_TERMS[selectedRoomId! - 1].nameZh}`,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      teamAName: teamAName,
      teamBName: teamBName,
      teamAScoreChange: manualWinner === 'A' ? manualAdvance : 0,
      teamBScoreChange: manualWinner === 'B' ? manualAdvance : 0,
      teamAFinalLevel: manualWinner === 'A' ? nextLevelValue : game.currentLevel,
      teamBFinalLevel: manualWinner === 'B' ? nextLevelValue : game.currentLevel,
      winningTeam: manualWinner,
      scoringMode: scoringMode,
      notes: manualNotes,
    };

    onRecordGame(scoreRecord);
    setShowScoringModal(false);

    // Update game to ended lobby state
    setGame(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentLevel: nextLevelValue,
        status: 'lobby'
      };
    });
  };

  // Color generator for Card suits
  const getSuitColor = (suit: Suit) => {
    if (suit === 'hearts' || suit === 'diamonds') return 'text-red-600';
    if (suit === 'spades' || suit === 'clubs') return 'text-slate-900';
    return 'text-amber-600'; // Jokers
  };

  // Render suit icons
  const renderSuitIcon = (suit: Suit, val: string) => {
    if (suit === 'hearts') return '♥️';
    if (suit === 'diamonds') return '♦️';
    if (suit === 'spades') return '♠️';
    if (suit === 'clubs') return '♣️';
    if (val === 'red_joker') return '🃏🟥';
    return '🃏⬛';
  };

  const renderPlayerHandCard = (card: Card, cards: Card[], globalIdx: number) => {
    const isSel = !!selectedCards[card.id];
    const isDragged = draggedCardId === card.id;
    const isDragOver = dragOverCardId === card.id;

    if (card.value === 'spacer') {
      return (
        <motion.div
          key={card.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', card.id);
            setDraggedCardId(card.id);
          }}
          onDragEnd={() => {
            setDraggedCardId(null);
            setDragOverCardId(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (dragOverCardId !== card.id) {
              setDragOverCardId(card.id);
            }
          }}
          onDragLeave={() => {
            if (dragOverCardId === card.id) {
              setDragOverCardId(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId) {
              handleCardDrop(draggedId, card.id);
            }
            setDragOverCardId(null);
          }}
          onClick={() => toggleSelectCard(card.id)}
          className={`w-12 h-18 sm:w-14 sm:h-22 bg-slate-900/60 rounded-xl border-2 border-dashed flex flex-col items-center justify-between p-1 cursor-pointer relative group transition-all duration-200 ${isSel ? '-translate-y-4 ring-2 ring-emerald-500 shadow-emerald-500/20 border-emerald-500' : 'border-slate-700/60'} ${isDragged ? 'opacity-40' : ''} ${isDragOver ? 'border-emerald-400 scale-105' : ''}`}
          style={{ zIndex: globalIdx }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-full flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGame(prev => {
                  if (!prev) return null;
                  const updatedPlayers = prev.players.map((p, idx) => {
                    if (idx === 0) {
                      return { ...p, cards: p.cards.filter(c => c.id !== card.id) };
                    }
                    return p;
                  });
                  return { ...prev, players: updatedPlayers };
                });
              }}
              className="text-slate-400 hover:text-red-400 p-0.5 rounded transition absolute top-0.5 right-0.5 z-10"
              title={language === 'zh' ? '删除空格' : 'Remove gap'}
            >
              <span className="text-[10px] font-bold">✕</span>
            </button>
          </div>
          <div className="text-center text-[10px] sm:text-xs text-slate-500 font-mono select-none font-bold">
            {language === 'zh' ? '空格' : 'GAP'}
          </div>
          <div></div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={card.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', card.id);
          setDraggedCardId(card.id);
        }}
        onDragEnd={() => {
          setDraggedCardId(null);
          setDragOverCardId(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (dragOverCardId !== card.id) {
            setDragOverCardId(card.id);
          }
        }}
        onDragLeave={() => {
          if (dragOverCardId === card.id) {
            setDragOverCardId(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedId = e.dataTransfer.getData('text/plain');
          if (draggedId) {
            handleCardDrop(draggedId, card.id);
          }
          setDragOverCardId(null);
        }}
        onClick={() => toggleSelectCard(card.id)}
        className={`w-12 h-18 sm:w-14 sm:h-22 bg-white rounded-xl border border-slate-200 shadow-md flex flex-col justify-between p-1.5 cursor-pointer select-none transition-all duration-200 ${isSel ? '-translate-y-4 ring-2 ring-emerald-500 shadow-emerald-500/20' : 'hover:-translate-y-2'} ${isDragged ? 'opacity-40' : ''} ${isDragOver ? 'border-emerald-400 scale-105' : ''}`}
        style={{ zIndex: globalIdx }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Top rank value and suit */}
        <div className="flex flex-col items-start leading-none">
          <span className={`text-[11px] sm:text-xs font-black ${getSuitColor(card.suit)}`}>
            {card.value === 'red_joker' ? 'RJ' : card.value === 'black_joker' ? 'BJ' : card.value}
          </span>
          <span className="text-[9px] sm:text-[10px] mt-0.5">
            {card.suit !== 'jokers' && renderSuitIcon(card.suit, card.value)}
          </span>
        </div>

        {/* Center decorative suit / status icon */}
        <div className="text-center">
          {card.isWild ? (
            <span className="text-[8px] bg-red-100 text-red-600 px-1 py-0.5 rounded-full font-bold uppercase leading-none">WILD</span>
          ) : card.isLevelCard ? (
            <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full font-bold uppercase leading-none font-sans">LEVEL</span>
          ) : (
            <span className="text-[14px] sm:text-[16px] opacity-70">
              {renderSuitIcon(card.suit, card.value)}
            </span>
          )}
        </div>

        {/* Bottom reversed rank */}
        <div className="flex items-end justify-end leading-none rotate-180">
          <span className={`text-[11px] sm:text-xs font-black ${getSuitColor(card.suit)}`}>
            {card.value === 'red_joker' ? 'RJ' : card.value === 'black_joker' ? 'BJ' : card.value}
          </span>
        </div>
      </motion.div>
    );
  };

  const renderLoungeSeat = (player: typeof seatedPlayers[number] | undefined, seatIndex: 1 | 2 | 3) => {
    if (!player) {
      return (
        <div className="border border-dashed border-slate-800 bg-slate-950/40 p-4 rounded-2xl w-36 text-center flex flex-col items-center justify-center min-h-[110px] space-y-2">
          <span className="text-[10px] text-slate-600 italic font-mono uppercase tracking-wider">{language === 'zh' ? '等待玩家...' : 'Waiting...'}</span>
          <button
            onClick={() => {
              const botNames = {
                1: language === 'zh' ? '智多星电脑' : 'AlphaBot',
                2: language === 'zh' ? '大将军对家' : 'OmegaBot (Partner)',
                3: language === 'zh' ? '无双刀电脑' : 'SigmaBot'
              };
              setSeatedPlayers(prev => {
                const next = prev.filter(p => p.seat !== seatIndex);
                next.push({
                  id: `bot-${seatIndex}-${Date.now()}`,
                  displayName: botNames[seatIndex],
                  seat: seatIndex,
                  team: seatIndex === 2 ? ('A' as const) : ('B' as const),
                  isBot: true
                });
                return next.sort((a, b) => a.seat - b.seat);
              });
            }}
            className="text-[9px] font-bold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20 hover:bg-teal-500/25 transition uppercase"
          >
            + {language === 'zh' ? '电脑' : 'Bot'}
          </button>
        </div>
      );
    }

    return (
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl w-36 text-center shadow-lg relative min-h-[110px] flex flex-col justify-between">
        {/* Kick button */}
        <button
          onClick={() => handleKickPlayer(seatIndex)}
          className="absolute top-1.5 right-1.5 text-slate-500 hover:text-red-400 transition"
          title={language === 'zh' ? '踢出座位' : 'Kick player'}
        >
          <span className="text-xs">✕</span>
        </button>
        <div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
              {player.isBot ? '🤖' : 'P'}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-200 block truncate">{player.displayName}</span>
          <span className="text-[8px] font-mono text-slate-500 block uppercase mt-0.5">
            {player.isBot ? (language === 'zh' ? '电脑机器人' : 'AI Bot') : (language === 'zh' ? '在线玩家' : 'Online Player')}
          </span>
        </div>
      </div>
    );
  };

  const renderTrickPlayBox = (seatIndex: number) => {
    if (!game) return null;
    const act = getPlayerCurrentTrickPlay(seatIndex);
    const isTheirTurn = game.activePlayerIndex === seatIndex;
    const player = game.players[seatIndex];

    if (player.hasFinished) {
      return (
        <div className="w-32 py-2 px-3 bg-slate-900/40 border border-slate-800 rounded-xl text-center flex flex-col items-center justify-center h-14">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {language === 'zh' ? `已出完 (#${player.finishOrder})` : `Finished (#${player.finishOrder})`}
          </span>
        </div>
      );
    }

    if (act) {
      return (
        <div className="bg-slate-900/95 border border-emerald-900/40 p-2 rounded-xl text-center shadow-lg min-w-[120px] h-14 flex flex-col justify-center">
          {act.isPass ? (
            <span className="text-xs font-black text-slate-500 italic uppercase">PASS</span>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{act.cardType}</span>
              <div className="flex space-x-1 mt-1">
                {act.cards.map((c, i) => (
                  <span key={i} className={`text-[10px] font-black px-1.5 py-0.5 bg-white rounded shadow ${getSuitColor(c.suit)}`}>
                    {c.value === 'red_joker' ? 'RJ' : c.value === 'black_joker' ? 'BJ' : c.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (isTheirTurn) {
      return (
        <div className="w-32 py-2 px-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-center flex flex-col items-center justify-center h-14 animate-pulse">
          <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">
            {language === 'zh' ? '思考中...' : 'Thinking...'}
          </span>
        </div>
      );
    }

    return (
      <div className="w-32 py-2 px-3 border border-dashed border-slate-800 rounded-xl text-center flex flex-col items-center justify-center h-14 opacity-50">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
          {language === 'zh' ? '等待出牌' : 'Waiting...'}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* HEADER BAR */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-xl shadow-lg">
            <span className="text-xl font-bold text-slate-950">掼</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">{t('title')}</h1>
            <p className="text-xs text-slate-400 font-mono hidden md:block">{t('subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Rules trigger */}
          <button 
            onClick={() => setShowRules(!showRules)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title={t('rulesTitle')}
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Bilingual Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-lg text-xs font-mono">
            <button
              onClick={() => setLanguage('zh')}
              className={`px-2 py-1 rounded transition ${language === 'zh' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              中文
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded transition ${language === 'en' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              EN
            </button>
          </div>

          {currentUser && (
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <UserIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-200">{currentUser.displayName}</span>
              <button 
                onClick={() => setCurrentUser(null)}
                className="text-slate-400 hover:text-red-400 transition ml-1"
                title={t('leaveLobby')}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* NOT AUTHENTICATED STATE */}
      {!currentUser && (
        <div className="max-w-md mx-auto py-16 px-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {authMode === 'login' ? t('playerLogin') : t('registerTitle')}
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                {authMode === 'login' ? t('dontHaveAccount') : t('alreadyHaveAccount')}{' '}
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthError('');
                    setRegSuccess(false);
                  }}
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  {authMode === 'login' ? t('applyNow') : t('loginNow')}
                </button>
              </p>
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm mb-6 font-medium">
                {authError}
              </div>
            )}

            {regSuccess && authMode === 'register' && (
              <div className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 p-4 rounded-xl text-sm mb-6">
                {t('approvalNotice')}
              </div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">{t('email')}</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="player@guandan.com"
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl focus:border-emerald-500 focus:outline-none text-white placeholder-slate-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">{t('password')}</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl focus:border-emerald-500 focus:outline-none text-white placeholder-slate-600 transition"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg hover:shadow-emerald-500/10 transition duration-300 flex items-center justify-center space-x-2"
                >
                  <span>{t('loginNow')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t('fullName')} *</label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl focus:border-emerald-500 focus:outline-none text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t('nickname')} *</label>
                  <input
                    type="text"
                    required
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    placeholder="GuanDanMaster"
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl focus:border-emerald-500 focus:outline-none text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t('email')} *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl focus:border-emerald-500 focus:outline-none text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t('phone')}</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+123456789"
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl focus:border-emerald-500 focus:outline-none text-white text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t('password')} *</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl focus:border-emerald-500 focus:outline-none text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t('confirmPassword')} *</label>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl focus:border-emerald-500 focus:outline-none text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t('preferredLanguage')}</label>
                  <select
                    value={regLanguage}
                    onChange={(e) => setRegLanguage(e.target.value as 'en' | 'zh')}
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl focus:border-emerald-500 focus:outline-none text-white text-sm"
                  >
                    <option value="zh">中文 (Chinese)</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t('invitationCode')}</label>
                  <input
                    type="text"
                    value={regInvitationCode}
                    onChange={(e) => setRegInvitationCode(e.target.value)}
                    placeholder="GD-2026"
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl focus:border-emerald-500 focus:outline-none text-white text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>{t('submitApplication')}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PLAYER IS LOGGED IN - SHOW LOBBY OR GAME ROOM */}
      {currentUser && (
        <main className="max-w-7xl mx-auto px-4 py-8">
          
          {/* LOBBY VIEW (NO SELECTED ROOM) */}
          {!selectedRoomId ? (
            <div className="space-y-8">
              
              {/* Welcome banner */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-xl">
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="max-w-2xl relative z-10">
                  <span className="text-xs font-bold text-emerald-400 font-mono tracking-widest uppercase bg-emerald-500/10 px-3 py-1 rounded-full">{t('welcome')}</span>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mt-3">{currentUser.displayName}</h2>
                  <p className="text-slate-300 mt-2 text-sm leading-relaxed">{t('lobbyDesc')}</p>
                </div>
              </div>

              {/* Lobby grid */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 tracking-tight flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <span>{t('lobbyTitle')}</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {rooms.map((room) => {
                    const statusText = room.currentPlayerCount >= 4 ? t('gameInProgress') : t('waitingPlayers');
                    const statusColor = room.currentPlayerCount >= 4 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                    return (
                      <div 
                        key={room.id}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 hover:shadow-xl transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-500">#{room.id.toString().padStart(2, '0')}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {statusText}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-white mt-2.5">
                            {language === 'en' ? room.nameEn : room.nameZh}
                          </h4>
                          <div className="mt-4 space-y-2 text-sm text-slate-400">
                            <div className="flex items-center justify-between">
                              <span>{t('playersInRoom')}</span>
                              <span className="font-mono font-bold text-slate-200">{room.currentPlayerCount} / 4</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span>{t('voiceChat')} / {t('videoChat')}</span>
                              <span className="font-medium text-emerald-400 flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span>
                                {t('active')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
                          <button
                            onClick={() => handleJoinRoom(room.id)}
                            disabled={room.currentPlayerCount >= 4}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wide uppercase transition ${room.currentPlayerCount >= 4 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/5'}`}
                          >
                            {room.currentPlayerCount >= 4 ? t('gameInProgress') : t('joinRoom')}
                          </button>
                          {currentUser && currentUser.role === 'admin' && (
                            <button
                              onClick={() => handleResetRoom(room.id)}
                              className="w-full py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase transition flex items-center justify-center space-x-1"
                            >
                              <span>{language === 'zh' ? '管理员重置房间' : 'Admin Reset Room'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : !game ? (
            
            /* LOUNGE SCREEN */
            <div className="space-y-6">
              {loungeMode === 'choose' ? (
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Back button */}
                  <button
                    onClick={handleLeaveRoom}
                    className="text-xs font-mono font-bold text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl hover:text-white hover:border-slate-700 transition flex items-center space-x-1"
                  >
                    <span>← {language === 'zh' ? '返回大厅' : 'Back to Lobby'}</span>
                  </button>

                  <div className="text-center space-y-3">
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      {language === 'zh' ? '准备进入掼蛋桌' : 'Prepare for Guandan Table'}
                    </h2>
                    <p className="text-sm text-slate-400 max-w-lg mx-auto">
                      {language === 'zh' 
                        ? '请选择您想要的游戏模式。您可以直接与电脑机器人打牌，也可以在大厅中等待其他玩家或好友加入。' 
                        : 'Please select your preferred game mode. You can play directly with AI bots, or wait for other players to join.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Option 1: Direct Play with Bots */}
                    <motion.div
                      whileHover={{ y: -4, scale: 1.01 }}
                      onClick={() => {
                        const botNames = {
                          1: language === 'zh' ? '智多星电脑' : 'AlphaBot',
                          2: language === 'zh' ? '大将军对家' : 'OmegaBot (Partner)',
                          3: language === 'zh' ? '无双刀电脑' : 'SigmaBot'
                        };
                        const finalPlayers = [
                          { id: currentUser.id, displayName: currentUser.displayName, seat: 0 as const, team: 'A' as const, isBot: false },
                          { id: 'bot-1', displayName: botNames[1], seat: 1 as const, team: 'B' as const, isBot: true },
                          { id: 'bot-2', displayName: botNames[2], seat: 2 as const, team: 'A' as const, isBot: true },
                          { id: 'bot-3', displayName: botNames[3], seat: 3 as const, team: 'B' as const, isBot: true }
                        ];
                        setSeatedPlayers(finalPlayers);
                        initGame(selectedRoomId, finalPlayers);
                      }}
                      className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-850 rounded-3xl p-8 cursor-pointer hover:border-emerald-500/50 transition-all flex flex-col justify-between h-[300px] text-left group shadow-xl"
                    >
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                          <Cpu className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {language === 'zh' ? '直接与电脑对战' : 'Play Directly with AI'}
                          </h3>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            {language === 'zh' 
                              ? '立即开始！系统将为您自动匹配三位智能电脑机器人（一位盟友、两位对手），让您无需等待即可畅快掼蛋。' 
                              : 'Start instantly! The system will seat 3 smart AI bots (1 partner, 2 opponents) so you can enjoy playing without any wait.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 group-hover:underline">
                        <span>{language === 'zh' ? '直接开局' : 'Start Playing'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </motion.div>

                    {/* Option 2: Wait for Players */}
                    <motion.div
                      whileHover={{ y: -4, scale: 1.01 }}
                      onClick={() => {
                        setLoungeMode('wait');
                        setAutoWaitActive(true);
                      }}
                      className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-850 rounded-3xl p-8 cursor-pointer hover:border-teal-500/50 transition-all flex flex-col justify-between h-[300px] text-left group shadow-xl"
                    >
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20 group-hover:bg-teal-500/20 transition-colors">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors">
                            {language === 'zh' ? '等待其他玩家加入' : 'Wait for Other Players'}
                          </h3>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            {language === 'zh' 
                              ? '进入等待室。该房间在首页大厅中仍可见，其他在线玩家可以随时加入您的房间，共同组队约局玩牌。' 
                              : 'Enter the waiting lounge. This room remains open and visible in the lobby for other players to join and team up with you.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-xs font-bold text-teal-400 group-hover:underline">
                        <span>{language === 'zh' ? '进入等待室' : 'Enter Waiting Room'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </motion.div>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Header and Back/Leave buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl shadow-lg">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleLeaveRoom}
                        className="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition"
                      >
                        ← {language === 'zh' ? '退出掼蛋室' : 'Exit Room'}
                      </button>
                      <div className="h-5 w-px bg-slate-800"></div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {language === 'en' 
                            ? SOLAR_TERMS[selectedRoomId - 1].nameEn 
                            : SOLAR_TERMS[selectedRoomId - 1].nameZh} - {language === 'zh' ? '等待室' : 'Lobby'}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          {language === 'zh' ? `当前座位人数: ` : `Seated: `}
                          <span className="text-teal-400 font-bold">{seatedPlayers.length} / 4</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleFillAllBots}
                        disabled={seatedPlayers.length >= 4}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-bold rounded-xl transition border border-slate-700 flex items-center space-x-1"
                      >
                        <span>🤖 {language === 'zh' ? '一键加满电脑' : 'Fill with Bots'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Seating Layout Map */}
                  <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.04)_0%,transparent_70%)] pointer-events-none"></div>

                    <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase mb-6 block">
                      {language === 'zh' ? '· 掼蛋座位示意图 ·' : '· GUANDAN SEATING CHART ·'}
                    </span>

                    {/* 4 seats layout in a circle/cross */}
                    <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto py-6">
                      {/* Row 1: NORTH (Partner - Seat 2) */}
                      <div></div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-mono text-slate-500 uppercase mb-1">{language === 'zh' ? '北座 (对家)' : 'North (Partner)'}</span>
                        {(() => {
                          const player = seatedPlayers.find(p => p.seat === 2);
                          return renderLoungeSeat(player, 2);
                        })()}
                      </div>
                      <div></div>

                      {/* Row 2: WEST (Opponent - Seat 3) and EAST (Opponent - Seat 1) */}
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[10px] font-mono text-slate-500 uppercase mb-1">{language === 'zh' ? '西座 (对手)' : 'West (Opponent)'}</span>
                        {(() => {
                          const player = seatedPlayers.find(p => p.seat === 3);
                          return renderLoungeSeat(player, 3);
                        })()}
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border border-teal-500/20 bg-teal-500/5 flex items-center justify-center font-bold text-teal-400 animate-pulse text-xs font-mono">
                          GD
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[10px] font-mono text-slate-500 uppercase mb-1">{language === 'zh' ? '东座 (对手)' : 'East (Opponent)'}</span>
                        {(() => {
                          const player = seatedPlayers.find(p => p.seat === 1);
                          return renderLoungeSeat(player, 1);
                        })()}
                      </div>

                      {/* Row 3: SOUTH (Me - Seat 0) */}
                      <div></div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-mono text-slate-500 uppercase mb-1">{language === 'zh' ? '南座 (自己)' : 'South (Me)'}</span>
                        <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl w-36 text-center shadow-lg relative">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center mb-2">
                            <span className="text-emerald-400 font-extrabold text-xs">ME</span>
                          </div>
                          <span className="text-xs font-bold text-emerald-400 block truncate">{currentUser.displayName}</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block uppercase">Host</span>
                        </div>
                      </div>
                      <div></div>
                    </div>

                    {/* Actions below chart */}
                    <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-slate-400 max-w-md text-left leading-relaxed">
                        💡 <strong className="text-teal-400">{language === 'zh' ? '游戏规则: ' : 'Info: '}</strong>
                        {language === 'zh' 
                          ? '当所有4个座位都坐满玩家或电脑时，开始游戏按钮将激活。您可以点击空位上的添加电脑按钮，或者等待模拟玩家陆续加入。' 
                          : 'The start game button activates when all 4 seats are full. You can manually fill spots with AI bots or wait for simulate players.'}
                      </p>
                      
                      <button
                        disabled={seatedPlayers.length < 4}
                        onClick={() => {
                          setAutoWaitActive(false);
                          initGame(selectedRoomId, seatedPlayers);
                        }}
                        className={`px-8 py-3 rounded-xl font-black text-sm tracking-wide uppercase transition duration-300 ${seatedPlayers.length < 4 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/10'}`}
                      >
                        🚀 {language === 'zh' ? '开始游戏 (满4人)' : 'Start Game (Full)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            
            /* ACTIVE GAME TABLE VIEW */
            <div className="space-y-6">
              
              {/* Back to lobby & status header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl shadow-lg">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleLeaveRoom}
                    className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition"
                  >
                    ← {t('backToHome')}
                  </button>
                  {currentUser && currentUser.role === 'admin' && (
                    <button
                      onClick={() => handleResetRoom(selectedRoomId!)}
                      className="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition"
                    >
                      ⚠️ {language === 'zh' ? '管理员重置' : 'Admin Reset'}
                    </button>
                  )}
                  <div className="h-5 w-px bg-slate-800"></div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {language === 'en' 
                        ? SOLAR_TERMS[selectedRoomId - 1].nameEn 
                        : SOLAR_TERMS[selectedRoomId - 1].nameZh}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {t('currentLevel')}: <span className="text-amber-400 font-bold">{game?.currentLevel || '2'}</span>
                    </p>
                  </div>
                </div>

                {/* Team naming and actions */}
                <div className="flex flex-wrap items-center gap-3">
                  {isEditingTeams ? (
                    <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        value={teamAName}
                        onChange={(e) => setRegFullName(e.target.value)} // reuse placeholder for input edit
                        placeholder="Team A"
                        className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => {
                          setTeamAName(regFullName || 'Team A');
                          setIsEditingTeams(false);
                          setRegFullName('');
                        }}
                        className="bg-emerald-500 text-slate-950 font-bold px-2.5 py-1 rounded text-[10px] uppercase"
                      >
                        {t('save')}
                      </button>
                      <button
                        onClick={() => setIsEditingTeams(false)}
                        className="text-slate-400 hover:text-white px-2 py-1 text-[10px]"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400">{t('teamName')}: <strong className="text-slate-200">{teamAName}</strong></span>
                      <button 
                        onClick={() => {
                          setRegFullName(teamAName);
                          setIsEditingTeams(true);
                        }}
                        className="p-1 text-slate-400 hover:text-white transition"
                        title={t('renameTeam')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleRedeal}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-xl transition border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('dealCards')}</span>
                  </button>

                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-xl transition border border-slate-700"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>{t('roundHistory')}</span>
                  </button>
                </div>
              </div>

              {/* DUAL SCREEN: FELT POKER TABLE (LEFT) + PLAY HISTORY LOG (RIGHT) */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* INTERACTIVE POKER BOARD (SPAN 3) */}
                <div className="lg:col-span-3 bg-gradient-to-b from-emerald-950 to-slate-950 border border-emerald-900/30 rounded-3xl p-6 min-h-[580px] flex flex-col justify-between shadow-2xl relative overflow-hidden">
                  
                  {/* Table Felt Accent */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)] pointer-events-none"></div>

                  {game && (
                    <>
                      {/* TOP SEAT (PARTNER - North) */}
                      <div className="flex flex-col items-center">
                        <div className="relative flex flex-col items-center bg-slate-900/80 border border-slate-800 p-3 rounded-2xl w-44 shadow-lg text-center">
                          {game.activePlayerIndex === 2 && (
                            <span className="absolute -top-1.5 px-2 py-0.5 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full uppercase tracking-wider animate-pulse">
                              TURN
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-200">{game.players[2].displayName}</span>
                          <span className="text-[10px] font-mono text-emerald-400 mt-0.5 uppercase tracking-wide">{t('partner')} (A)</span>
                          <span className="text-xs font-mono text-slate-400 mt-1">{game.players[2].cards.length} Cards</span>
                          {game.players[2].hasFinished && (
                            <span className="mt-1 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                              #{game.players[2].finishOrder} Finished
                            </span>
                          )}
                        </div>

                        {/* Top Seat last played display */}
                        <div className="h-16 mt-3 flex items-center justify-center">
                          {renderTrickPlayBox(2)}
                        </div>
                      </div>

                      {/* MIDDLE SEATS (WEST & EAST) */}
                      <div className="flex items-center justify-between my-2">
                        
                        {/* WEST SEAT (Bot 3 - Team B) */}
                        <div className="flex flex-col items-center">
                          <div className="relative flex flex-col items-center bg-slate-900/80 border border-slate-800 p-3 rounded-2xl w-36 shadow-lg text-center">
                            {game.activePlayerIndex === 3 && (
                              <span className="absolute -top-1.5 px-2 py-0.5 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full uppercase tracking-wider animate-pulse">
                                TURN
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-200">{game.players[3].displayName}</span>
                            <span className="text-[10px] font-mono text-amber-500 mt-0.5 uppercase tracking-wide">{t('opponent')} (B)</span>
                            <span className="text-xs font-mono text-slate-400 mt-1">{game.players[3].cards.length} Cards</span>
                            {game.players[3].hasFinished && (
                              <span className="mt-1 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                                #{game.players[3].finishOrder} Finished
                              </span>
                            )}
                          </div>

                          {/* West Seat last played display */}
                          <div className="h-16 mt-3 flex items-center justify-center">
                            {renderTrickPlayBox(3)}
                          </div>
                        </div>

                        {/* CENTER CHAT / STATUS PANEL */}
                        <div className="flex flex-col items-center justify-center text-center max-w-sm px-6 py-4 bg-slate-900/40 border border-slate-800/40 rounded-2xl backdrop-blur-sm shadow-xl">
                          <span className="text-xs font-bold text-emerald-400 font-mono tracking-widest uppercase mb-1.5">WEBRTC LIVE COMM</span>
                          
                          {/* Live Video Indicator */}
                          <div className="flex items-center justify-center space-x-3 mb-3">
                            <div className="relative">
                              <span className="absolute top-0 right-0 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl flex items-center justify-center">
                                {camActive ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-red-400" />}
                              </div>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl flex items-center justify-center">
                              {micActive ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-red-400" />}
                            </div>
                          </div>

                          <span className="text-[10px] text-slate-500 font-mono leading-relaxed mb-4">
                            {t('connectionStatus')}: <strong className="text-emerald-400 font-bold uppercase">{t('connected')} (4/4)</strong>
                          </span>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => setMicActive(!micActive)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${micActive ? 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'}`}
                            >
                              {micActive ? t('micOn') : t('micOff')}
                            </button>
                            <button
                              onClick={() => setCamActive(!camActive)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${camActive ? 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'}`}
                            >
                              {camActive ? t('camOn') : t('camOff')}
                            </button>
                          </div>
                        </div>

                        {/* EAST SEAT (Bot 1 - Team B) */}
                        <div className="flex flex-col items-center">
                          <div className="relative flex flex-col items-center bg-slate-900/80 border border-slate-800 p-3 rounded-2xl w-36 shadow-lg text-center">
                            {game.activePlayerIndex === 1 && (
                              <span className="absolute -top-1.5 px-2 py-0.5 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full uppercase tracking-wider animate-pulse">
                                TURN
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-200">{game.players[1].displayName}</span>
                            <span className="text-[10px] font-mono text-amber-500 mt-0.5 uppercase tracking-wide">{t('opponent')} (B)</span>
                            <span className="text-xs font-mono text-slate-400 mt-1">{game.players[1].cards.length} Cards</span>
                            {game.players[1].hasFinished && (
                              <span className="mt-1 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                                #{game.players[1].finishOrder} Finished
                              </span>
                            )}
                          </div>

                          {/* East Seat last played display */}
                          <div className="h-16 mt-3 flex items-center justify-center">
                            {renderTrickPlayBox(1)}
                          </div>
                        </div>

                      </div>

                      {/* BOTTOM SEAT (YOU - South) */}
                      <div className="flex flex-col items-center">
                        {/* Human last played display */}
                        <div className="h-16 mb-2 flex items-center justify-center">
                          {renderTrickPlayBox(0)}
                        </div>

                        {/* Player Seat status and cards controls */}
                        <div className="relative flex items-center justify-between bg-slate-900 border border-slate-850 px-6 py-4 rounded-2xl w-full max-w-2xl shadow-xl">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                <span className="text-base font-bold text-emerald-400">P1</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-200 block">{game.players[0].displayName}</span>
                              <span className="text-[10px] font-semibold text-slate-500 uppercase font-mono">{t('teamAName')}</span>
                            </div>
                          </div>

                          {/* Control actions */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSort('rank')}
                              className={`p-2 rounded-lg border text-xs font-bold font-mono transition ${sortStrategy === 'rank' ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                              title={t('sortByRank')}
                            >
                              <SortAsc className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSort('suit')}
                              className={`p-2 rounded-lg border text-xs font-bold font-mono transition ${sortStrategy === 'suit' ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                              title={t('sortBySuit')}
                            >
                              <Layers className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSort('combo')}
                              className={`p-2 rounded-lg border text-xs font-bold font-mono transition ${sortStrategy === 'combo' ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                              title={t('sortByCombo')}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>

                            <div className="w-px h-6 bg-slate-800"></div>

                            <button
                              onClick={handleAddSpacer}
                              className="px-3 py-2 rounded-lg border border-emerald-900/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 text-xs font-bold transition flex items-center space-x-1"
                              title={language === 'zh' ? '插入空格' : 'Insert Gap'}
                            >
                              <span>+ {language === 'zh' ? '空格' : 'GAP'}</span>
                            </button>

                            <div className="w-px h-6 bg-slate-800"></div>

                            {/* Reordering/Adjustment helper buttons */}
                            <button
                              onClick={handleMoveSelectedLeft}
                              disabled={!Object.values(selectedCards).some(Boolean)}
                              className="p-2 rounded-lg border bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                              title={language === 'zh' ? '选中的牌向左平移' : 'Move selected cards left'}
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleMoveSelectedRight}
                              disabled={!Object.values(selectedCards).some(Boolean)}
                              className="p-2 rounded-lg border bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                              title={language === 'zh' ? '选中的牌向右平移' : 'Move selected cards right'}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleMoveSelectedToUpperRow}
                              disabled={!Object.values(selectedCards).some(Boolean)}
                              className="p-2 rounded-lg border bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                              title={language === 'zh' ? '选中的牌移至上行' : 'Move selected cards to top row'}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleMoveSelectedToLowerRow}
                              disabled={!Object.values(selectedCards).some(Boolean)}
                              className="p-2 rounded-lg border bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                              title={language === 'zh' ? '选中的牌移至下行' : 'Move selected cards to bottom row'}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>

                            <div className="w-px h-6 bg-slate-800"></div>

                            <button
                              onClick={handlePass}
                              disabled={game.activePlayerIndex !== 0}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition uppercase ${game.activePlayerIndex === 0 ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700' : 'bg-slate-950 text-slate-700 border-transparent cursor-not-allowed'}`}
                            >
                              {t('pass')}
                            </button>

                            <button
                              onClick={handlePlaySelected}
                              disabled={game.activePlayerIndex !== 0}
                              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition uppercase ${game.activePlayerIndex === 0 ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10' : 'bg-slate-950 text-slate-700 border-transparent cursor-not-allowed'}`}
                            >
                              {t('playSelected')}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ACTIVE HAND DISPLAY AREA */}
                      <div className="mt-6 flex flex-col items-center w-full">
                        <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase mb-3 text-center px-4">
                          {t('yourHand')} ({game.players[0].cards.length} / 27) {language === 'zh' ? '· 每行允许任意数量的牌 · 允许任意拖拽排序或使用平移按钮' : '· Any number of cards per row · Drag cards to reorder or use shift buttons'}
                        </span>

                        <div className="w-full overflow-x-auto pb-4 px-4 flex flex-col items-center space-y-4">
                          {(() => {
                            const cards = game.players[0].cards;
                            const row1Cards = cards.filter(c => (cardRows[c.id] || 1) === 1);
                            const row2Cards = cards.filter(c => (cardRows[c.id] || 1) === 2);

                            return (
                              <>
                                {/* Row 1 */}
                                <div 
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const draggedId = e.dataTransfer.getData('text/plain');
                                    if (draggedId) {
                                      handleCardDropToRow(draggedId, 1);
                                    }
                                  }}
                                  className="flex -space-x-4 sm:-space-x-5 min-w-max py-2 px-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800/60 min-h-[110px] sm:min-h-[130px] items-center justify-center transition-colors hover:bg-slate-900/60"
                                >
                                  {row1Cards.length === 0 ? (
                                    <span className="text-xs text-slate-600 font-mono italic px-8">{language === 'zh' ? '拖拽卡牌至此行 (允许任意数量)' : 'Drag cards here (Any number)'}</span>
                                  ) : (
                                    row1Cards.map((card) => {
                                      const globalIdx = cards.findIndex(c => c.id === card.id);
                                      return renderPlayerHandCard(card, cards, globalIdx);
                                    })
                                  )}
                                </div>

                                {/* Row 2 */}
                                <div 
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const draggedId = e.dataTransfer.getData('text/plain');
                                    if (draggedId) {
                                      handleCardDropToRow(draggedId, 2);
                                    }
                                  }}
                                  className="flex -space-x-4 sm:-space-x-5 min-w-max py-2 px-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800/60 min-h-[110px] sm:min-h-[130px] items-center justify-center transition-colors hover:bg-slate-900/60"
                                >
                                  {row2Cards.length === 0 ? (
                                    <span className="text-xs text-slate-600 font-mono italic px-8">{language === 'zh' ? '拖拽卡牌至此行 (允许任意数量)' : 'Drag cards here (Any number)'}</span>
                                  ) : (
                                    row2Cards.map((card) => {
                                      const globalIdx = cards.findIndex(c => c.id === card.id);
                                      return renderPlayerHandCard(card, cards, globalIdx);
                                    })
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                    </>
                  )}
                </div>

                {/* GAME TRICK LOG / PLAY HISTORY SIDEBAR (SPAN 1) */}
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between max-h-[580px]">
                  <div>
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                      <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                        <History className="text-emerald-400 w-4 h-4" />
                        <span>{t('historyTitle')}</span>
                      </h4>
                    </div>

                    {/* Chronological list */}
                    <div className="overflow-y-auto max-h-[360px] pr-1 mt-4 space-y-3.5">
                      {game && game.history.length > 0 ? (
                        game.history.map((log) => {
                          const isMe = log.playerId === currentUser?.id;
                          const actionBg = log.isPass 
                            ? 'bg-slate-950 text-slate-500' 
                            : log.team === 'A' 
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/20';

                          return (
                            <div 
                              key={log.id} 
                              className={`p-3 rounded-xl border border-slate-850/60 ${actionBg}`}
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-extrabold text-slate-200">
                                  {log.playerName} {isMe && `(${t('partner')})`}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">{log.timestamp}</span>
                              </div>
                              <div className="mt-2 flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.cardType}</span>
                                {!log.isPass && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {log.cards.map((c, i) => (
                                      <span key={i} className={`text-xs font-black px-1.5 py-0.5 bg-white rounded shadow-sm ${getSuitColor(c.suit)}`}>
                                        {c.value === 'red_joker' ? 'RJ' : c.value === 'black_joker' ? 'BJ' : c.value}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-500 text-center py-12 italic">{t('noHistory')}</p>
                      )}
                    </div>
                  </div>

                  {/* Manual scoring trigger (dispute resolution) */}
                  <div className="pt-4 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setScoringMode('manual');
                        setShowScoringModal(true);
                      }}
                      className="w-full py-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800/80 rounded-xl text-xs font-bold tracking-wide uppercase transition"
                    >
                      ⚠️ {t('scoringTitle')} (Manual / Dispute)
                    </button>
                  </div>
                </div>

              </div>

              {/* SAVED SCORES HISTORIC BOARD FOR THE ROOM */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h4 className="text-base font-bold text-white tracking-tight flex items-center space-x-2 mb-4">
                  <Trophy className="w-5 h-5 text-emerald-400" />
                  <span>{t('scoresHistory')}</span>
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">{t('roomName')}</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">{teamAName}</th>
                        <th className="px-4 py-3">{teamBName}</th>
                        <th className="px-4 py-3">Winner</th>
                        <th className="px-4 py-3">{t('scoringMode')}</th>
                        <th className="px-4 py-3">{t('notes')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {scoresHistory.length > 0 ? (
                        scoresHistory.map((record) => (
                          <tr key={record.id} className="hover:bg-slate-800/50 transition font-mono text-xs">
                            <td className="px-4 py-3 font-semibold text-slate-200">{record.roomName}</td>
                            <td className="px-4 py-3 text-slate-500">{record.date}</td>
                            <td className="px-4 py-3">
                              <span className="text-emerald-400 font-bold">+{record.teamAScoreChange}</span>
                              <span className="text-slate-500 text-[10px] ml-1">({record.teamAFinalLevel})</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-emerald-400 font-bold">+{record.teamBScoreChange}</span>
                              <span className="text-slate-500 text-[10px] ml-1">({record.teamBFinalLevel})</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${record.winningTeam === 'A' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                Team {record.winningTeam}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[10px] uppercase font-bold text-slate-500">{record.scoringMode}</td>
                            <td className="px-4 py-3 text-slate-400 italic max-w-xs truncate">{record.notes || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">No games recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </main>
      )}

      {/* RULES PANEL DRAWER OVERLAY */}
      <AnimatePresence>
        {showRules && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 h-full overflow-y-auto shadow-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <HelpCircle className="w-5 h-5 text-emerald-400" />
                    <span>{t('rulesTitle')}</span>
                  </h3>
                  <button 
                    onClick={() => setShowRules(false)}
                    className="text-slate-400 hover:text-white font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
                  <p>{t('rulesDesc')}</p>
                  
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <h4 className="font-bold text-white">🏆 Level Cards & Wilds (逢人配):</h4>
                    <p className="text-xs text-slate-400">
                      The game progresses rank by rank (2 up to Ace). The active rank is the **Level Card**. 
                      The **Red Heart Level Card** is wild and can substitute for any card except jokers to complete hands.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-white">💥 Combinations & Bombs Order:</h4>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400">
                      <li><strong>Single</strong>, <strong>Pair</strong>, <strong>Triple</strong></li>
                      <li><strong>Full House (3+2)</strong>: 3 of same rank + pair</li>
                      <li><strong>Straight (5 Cards)</strong>: e.g. 5-6-7-8-9 of any suit</li>
                      <li><strong>Consecutive Pairs (木板)</strong>: 3 consecutive pairs</li>
                      <li><strong>Consecutive Triples (钢板)</strong>: 2 consecutive triples</li>
                      <li><strong>Bomb (4+ Cards)</strong>: Beats all standard combos. More cards = stronger bomb.</li>
                      <li><strong>Straight Flush (同花顺)</strong>: 5 consecutive suit cards. Beats 5-card bomb.</li>
                      <li><strong>Four Jokers Ultimate Bomb (天王炸)</strong>: Beats everything.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowRules(false)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition uppercase mt-8 text-xs tracking-wide"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SCORING SHEET MODAL DIALOG */}
      <AnimatePresence>
        {showScoringModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                <span>{t('scoringTitle')}</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mb-6">
                {t('scoringMode')}: <strong className="text-emerald-400 uppercase font-black">{scoringMode === 'auto' ? t('autoScoring') : t('manualScoring')}</strong>
              </p>

              <div className="space-y-4">
                {/* Winner select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">{t('winnerTeamSelect')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setManualWinner('A')}
                      className={`py-3.5 rounded-xl font-bold text-xs uppercase transition border ${manualWinner === 'A' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      {teamAName} (Team A)
                    </button>
                    <button
                      onClick={() => setManualWinner('B')}
                      className={`py-3.5 rounded-xl font-bold text-xs uppercase transition border ${manualWinner === 'B' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      {teamBName} (Team B)
                    </button>
                  </div>
                </div>

                {/* Score change index slider/picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">{t('scoreChange')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((val) => (
                      <button
                        key={val}
                        onClick={() => setManualAdvance(val)}
                        className={`py-2.5 rounded-xl text-xs font-mono font-bold transition border ${manualAdvance === val ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                      >
                        +{val} {val === 3 ? 'Levels (双上)' : 'Levels'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">{t('notes')}</label>
                  <textarea
                    rows={3}
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Enter additional remarks or dispute summaries..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-emerald-500 focus:outline-none placeholder-slate-600 font-mono"
                  ></textarea>
                </div>
              </div>

              {/* Confirm submit buttons */}
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => setShowScoringModal(false)}
                  className="w-1/2 py-3 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs font-bold uppercase transition"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleConfirmScore}
                  className="w-1/2 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs uppercase shadow-lg shadow-emerald-500/5 transition"
                >
                  {t('confirmScore')}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
