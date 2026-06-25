import React, { useState, useEffect } from 'react';
import { 
  User, Room, Card, PlayAction, GameState, ScoreRecord, Suit 
} from '../types';
import { getTranslation } from '../i18n';
import { 
  generateDecks, shuffleCards, sortCards, canBeat, analyzeCombination, makeBotMove, calculateGameScore, getNextLevel 
} from '../utils/guandanEngine';
import { 
  User as UserIcon, LogOut, Video, VideoOff, Mic, MicOff, Users, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Shield, RefreshCw, Layers, SortAsc, HelpCircle, Eye, ChevronRight, Edit2, Play, Circle, Trophy, History
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

    // Update global room lists to simulate a new player joining
    const updatedRooms = rooms.map(r => {
      if (r.id === roomId) {
        const playersList = [...r.players, currentUser.id];
        // Populate with bots if less than 4 to allow instant play
        while (playersList.length < 4) {
          playersList.push(`bot-id-${playersList.length}`);
        }
        return {
          ...r,
          currentPlayerCount: 4,
          players: playersList,
          status: 'Full' as const,
        };
      }
      return r;
    });
    updateRooms(updatedRooms);

    // Initialize the gameplay!
    initGame(roomId);
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
    setGame(null);
    setSelectedCards({});
    setShowHistory(false);
  };

  // Start / Init game
  const initGame = (roomId: number) => {
    const levelCard = '2'; // Starting level card is always 2
    const allCards = generateDecks(levelCard);
    const shuffled = shuffleCards(allCards);

    // Deal 27 cards to each of the 4 players
    const hand0 = shuffled.slice(0, 27);
    const hand1 = shuffled.slice(27, 54);
    const hand2 = shuffled.slice(54, 81);
    const hand3 = shuffled.slice(81, 108);

    const initialGame: GameState = {
      id: `game-${Date.now()}`,
      roomId,
      status: 'playing',
      scoringMode: 'auto',
      currentLevel: '2',
      levelCardValue: '2',
      players: [
        { id: currentUser?.id || 'player-1', displayName: currentUser?.displayName || 'Player', seat: 0, team: 'A', cards: sortCards(hand0, 'rank', levelCard), hasFinished: false },
        { id: 'bot-1', displayName: language === 'en' ? 'AlphaBot' : '智多星电脑', seat: 1, team: 'B', cards: sortCards(hand1, 'rank', levelCard), hasFinished: false },
        { id: 'bot-2', displayName: language === 'en' ? 'OmegaBot (Partner)' : '大将军对家', seat: 2, team: 'A', cards: sortCards(hand2, 'rank', levelCard), hasFinished: false },
        { id: 'bot-3', displayName: language === 'en' ? 'SigmaBot' : '无双刀电脑', seat: 3, team: 'B', cards: sortCards(hand3, 'rank', levelCard), hasFinished: false },
      ],
      teamA: { name: teamAName, playerIds: [currentUser?.id || 'player-1', 'bot-2'] },
      teamB: { name: teamBName, playerIds: ['bot-1', 'bot-3'] },
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

  // Re-deal cards
  const handleRedeal = () => {
    if (selectedRoomId) {
      initGame(selectedRoomId);
    }
  };

  // Sort current player cards
  const handleSort = (strategy: 'rank' | 'suit' | 'combo') => {
    if (!game) return;
    setSortStrategy(strategy);
    const levelCard = game.currentLevel;

    setGame(prev => {
      if (!prev) return null;
      const updatedPlayers = prev.players.map(p => {
        if (p.seat === 0) {
          return {
            ...p,
            cards: sortCards(p.cards, strategy, levelCard)
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
    const cards = [...game.players[0].cards];
    const dragIdx = cards.findIndex(c => c.id === draggedId);
    if (dragIdx === -1) return;

    const [draggedCard] = cards.splice(dragIdx, 1);
    const midPoint = Math.ceil((cards.length + 1) / 2);
    
    if (rowNum === 1) {
      const insertIdx = Math.max(0, midPoint - 1);
      cards.splice(insertIdx, 0, draggedCard);
    } else {
      cards.push(draggedCard);
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
  };

  const handleMoveSelectedLeft = () => {
    if (!game) return;
    const cards = [...game.players[0].cards];
    for (let i = 1; i < cards.length; i++) {
      if (selectedCards[cards[i].id] && !selectedCards[cards[i - 1].id]) {
        const temp = cards[i];
        cards[i] = cards[i - 1];
        cards[i - 1] = temp;
      }
    }
    setGame(prev => {
      if (!prev) return null;
      const updatedPlayers = prev.players.map((p, idx) => idx === 0 ? { ...p, cards } : p);
      return { ...prev, players: updatedPlayers };
    });
  };

  const handleMoveSelectedRight = () => {
    if (!game) return;
    const cards = [...game.players[0].cards];
    for (let i = cards.length - 2; i >= 0; i--) {
      if (selectedCards[cards[i].id] && !selectedCards[cards[i + 1].id]) {
        const temp = cards[i];
        cards[i] = cards[i + 1];
        cards[i + 1] = temp;
      }
    }
    setGame(prev => {
      if (!prev) return null;
      const updatedPlayers = prev.players.map((p, idx) => idx === 0 ? { ...p, cards } : p);
      return { ...prev, players: updatedPlayers };
    });
  };

  const handleMoveSelectedToUpperRow = () => {
    if (!game) return;
    const cards = [...game.players[0].cards];
    const midPoint = Math.ceil(cards.length / 2);
    
    const selectedLowerIndices: number[] = [];
    for (let i = midPoint; i < cards.length; i++) {
      if (selectedCards[cards[i].id]) {
        selectedLowerIndices.push(i);
      }
    }

    if (selectedLowerIndices.length === 0) return;

    const movedCards: Card[] = [];
    for (let i = selectedLowerIndices.length - 1; i >= 0; i--) {
      const idx = selectedLowerIndices[i];
      const [card] = cards.splice(idx, 1);
      movedCards.unshift(card);
    }

    const newInsertPoint = Math.ceil((cards.length + movedCards.length) / 2) - movedCards.length;
    const insertIdx = Math.max(0, newInsertPoint);
    cards.splice(insertIdx, 0, ...movedCards);

    setGame(prev => {
      if (!prev) return null;
      const updatedPlayers = prev.players.map((p, idx) => idx === 0 ? { ...p, cards } : p);
      return { ...prev, players: updatedPlayers };
    });
  };

  const handleMoveSelectedToLowerRow = () => {
    if (!game) return;
    const cards = [...game.players[0].cards];
    const midPoint = Math.ceil(cards.length / 2);

    const selectedUpperIndices: number[] = [];
    for (let i = 0; i < midPoint; i++) {
      if (selectedCards[cards[i].id]) {
        selectedUpperIndices.push(i);
      }
    }

    if (selectedUpperIndices.length === 0) return;

    const movedCards: Card[] = [];
    for (let i = selectedUpperIndices.length - 1; i >= 0; i--) {
      const idx = selectedUpperIndices[i];
      const [card] = cards.splice(idx, 1);
      movedCards.unshift(card);
    }

    cards.push(...movedCards);

    setGame(prev => {
      if (!prev) return null;
      const updatedPlayers = prev.players.map((p, idx) => idx === 0 ? { ...p, cards } : p);
      return { ...prev, players: updatedPlayers };
    });
  };

  // Player action: Play selected cards
  const handlePlaySelected = () => {
    if (!game || game.activePlayerIndex !== 0) return;

    const myHand = game.players[0].cards;
    const playList = myHand.filter(c => selectedCards[c.id]);

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
      const nextCards = player.cards.filter(c => !cardsPlayed.some(cp => cp.id === c.id));
      const hasFinishedNow = nextCards.length === 0 && !player.hasFinished;

      // Track finish order
      const currentFinishersCount = prev.players.filter(p => p.hasFinished || (p.seat === seatIndex && nextCards.length === 0)).length;
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

                        <div className="mt-5 pt-4 border-t border-slate-800">
                          <button
                            onClick={() => handleJoinRoom(room.id)}
                            disabled={room.currentPlayerCount >= 4}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wide uppercase transition ${room.currentPlayerCount >= 4 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/5'}`}
                          >
                            {room.currentPlayerCount >= 4 ? t('gameInProgress') : t('joinRoom')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                          {game.history[0]?.playerId === 'bot-2' && (
                            <div className="bg-slate-900/95 border border-emerald-900/40 p-2 rounded-xl text-center shadow-lg">
                              {game.history[0].isPass ? (
                                <span className="text-xs font-black text-slate-500 italic uppercase">PASS</span>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{game.history[0].cardType}</span>
                                  <div className="flex space-x-1 mt-1">
                                    {game.history[0].cards.map((c, i) => (
                                      <span key={i} className={`text-xs font-bold px-1.5 py-0.5 bg-white rounded shadow ${getSuitColor(c.suit)}`}>
                                        {c.value === 'red_joker' || c.value === 'black_joker' ? 'J' : c.value}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
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
                            {game.history[0]?.playerId === 'bot-3' && (
                              <div className="bg-slate-900/95 border border-emerald-900/40 p-2 rounded-xl text-center shadow-lg">
                                {game.history[0].isPass ? (
                                  <span className="text-xs font-black text-slate-500 italic uppercase">PASS</span>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{game.history[0].cardType}</span>
                                    <div className="flex space-x-1 mt-1">
                                      {game.history[0].cards.map((c, i) => (
                                        <span key={i} className={`text-xs font-bold px-1.5 py-0.5 bg-white rounded shadow ${getSuitColor(c.suit)}`}>
                                          {c.value === 'red_joker' || c.value === 'black_joker' ? 'J' : c.value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
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
                            {game.history[0]?.playerId === 'bot-1' && (
                              <div className="bg-slate-900/95 border border-emerald-900/40 p-2 rounded-xl text-center shadow-lg">
                                {game.history[0].isPass ? (
                                  <span className="text-xs font-black text-slate-500 italic uppercase">PASS</span>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{game.history[0].cardType}</span>
                                    <div className="flex space-x-1 mt-1">
                                      {game.history[0].cards.map((c, i) => (
                                        <span key={i} className={`text-xs font-bold px-1.5 py-0.5 bg-white rounded shadow ${getSuitColor(c.suit)}`}>
                                          {c.value === 'red_joker' || c.value === 'black_joker' ? 'J' : c.value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* BOTTOM SEAT (YOU - South) */}
                      <div className="flex flex-col items-center">
                        {/* Human last played display */}
                        <div className="h-16 mb-2 flex items-center justify-center">
                          {game.history[0]?.playerId === (currentUser?.id || 'player-1') && (
                            <div className="bg-slate-900/95 border border-emerald-900/40 p-2 rounded-xl text-center shadow-lg">
                              {game.history[0].isPass ? (
                                <span className="text-xs font-black text-slate-500 italic uppercase">PASS</span>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{game.history[0].cardType}</span>
                                  <div className="flex space-x-1 mt-1">
                                    {game.history[0].cards.map((c, i) => (
                                      <span key={i} className={`text-xs font-bold px-1.5 py-0.5 bg-white rounded shadow ${getSuitColor(c.suit)}`}>
                                        {c.value === 'red_joker' || c.value === 'black_joker' ? 'J' : c.value}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
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
                          {t('yourHand')} ({game.players[0].cards.length} / 27) {language === 'zh' ? '· 每行最多20张 · 允许任意拖拽排序或使用平移按钮' : '· Max 20/row · Drag cards to reorder or use shift buttons'}
                        </span>

                        <div className="w-full overflow-x-auto pb-4 px-4 flex flex-col items-center space-y-4">
                          {(() => {
                            const cards = game.players[0].cards;
                            const midPoint = Math.ceil(cards.length / 2);
                            const row1Cards = cards.slice(0, midPoint);
                            const row2Cards = cards.slice(midPoint);

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
                                    <span className="text-xs text-slate-600 font-mono italic px-8">{language === 'zh' ? '拖拽卡牌至此行 (最多20张)' : 'Drag cards here (Max 20)'}</span>
                                  ) : (
                                    row1Cards.map((card) => {
                                      const globalIdx = cards.findIndex(c => c.id === card.id);
                                      const isSel = !!selectedCards[card.id];
                                      const isDragged = draggedCardId === card.id;
                                      const isDragOver = dragOverCardId === card.id;

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
                                              <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full font-bold uppercase leading-none">LEVEL</span>
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
                                    <span className="text-xs text-slate-600 font-mono italic px-8">{language === 'zh' ? '拖拽卡牌至此行 (最多20张)' : 'Drag cards here (Max 20)'}</span>
                                  ) : (
                                    row2Cards.map((card) => {
                                      const globalIdx = cards.findIndex(c => c.id === card.id);
                                      const isSel = !!selectedCards[card.id];
                                      const isDragged = draggedCardId === card.id;
                                      const isDragOver = dragOverCardId === card.id;

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
                                              <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full font-bold uppercase leading-none">LEVEL</span>
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
