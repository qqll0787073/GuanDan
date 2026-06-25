import React, { useState, useEffect } from 'react';
import { User, Room, ScoreRecord } from './types';
import PlayerPortal, { SOLAR_TERMS } from './components/PlayerPortal';
import AdminPortal from './components/AdminPortal';
import { getTranslation } from './i18n';
import { 
  User as UserIcon, Shield, ChevronRight, CheckCircle, Flame, Layers, Award, Activity 
} from 'lucide-react';
import { motion } from 'motion/react';

// Predefined mock database keys for localStorage
const LOCAL_USERS_KEY = 'guandan_users_db_v1';
const LOCAL_ROOMS_KEY = 'guandan_rooms_db_v1';
const LOCAL_SCORES_KEY = 'guandan_scores_db_v1';

// Seed initial player accounts
const SEED_USERS: User[] = [
  {
    id: 'user-seed-1',
    fullName: 'David Lee',
    displayName: 'GuanDan Master David',
    email: 'player1@guandan.com',
    phone: '13800000001',
    role: 'player',
    status: 'Approved',
    preferredLanguage: 'zh',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'user-seed-2',
    fullName: 'Sarah Connor',
    displayName: 'Sarah Poker Pro',
    email: 'player2@guandan.com',
    phone: '13911111111',
    role: 'player',
    status: 'Approved',
    preferredLanguage: 'en',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'user-seed-3',
    fullName: 'Rookie Wang',
    displayName: 'Wang Rookie',
    email: 'pending@guandan.com',
    phone: '13522222222',
    role: 'player',
    status: 'Pending',
    preferredLanguage: 'zh',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  }
];

// Initialize 24 Solar-term rooms
const SEED_ROOMS: Room[] = SOLAR_TERMS.map((term, idx) => ({
  id: idx + 1,
  nameEn: term.nameEn,
  nameZh: term.nameZh,
  maxPlayers: 4,
  currentPlayerCount: 0,
  status: 'Waiting',
  isVoiceActive: true,
  isVideoActive: true,
  players: [],
}));

// Seed initial game records
const SEED_SCORES: ScoreRecord[] = [
  {
    id: 'score-seed-1',
    gameId: 'game-seed-1',
    roomName: 'Spring Equinox（春分）',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toLocaleDateString() + ' 15:30:20',
    teamAName: 'Dragon Team（龙队）',
    teamBName: 'Tiger Team（虎队）',
    teamAScoreChange: 3,
    teamBScoreChange: 0,
    teamAFinalLevel: '5',
    teamBFinalLevel: '2',
    winningTeam: 'A',
    scoringMode: 'auto',
    notes: 'Double Win! Partner finished second.',
  },
  {
    id: 'score-seed-2',
    gameId: 'game-seed-2',
    roomName: 'Summer Solstice（夏至）',
    date: new Date(Date.now() - 2 * 3600 * 1000).toLocaleDateString() + ' 19:42:01',
    teamAName: 'ShengLi Team',
    teamBName: 'KuaLe Team',
    teamAScoreChange: 0,
    teamBScoreChange: 2,
    teamAFinalLevel: '2',
    teamBFinalLevel: '4',
    winningTeam: 'B',
    scoringMode: 'manual',
    notes: 'Manually logged score. Clean finish.',
  }
];

export default function App() {
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');
  const [portal, setPortal] = useState<'home' | 'player' | 'admin'>('home');
  
  // Local Database States
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [scoresHistory, setScoresHistory] = useState<ScoreRecord[]>([]);
  
  // Current logged in player
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Load and seed database from LocalStorage
  useEffect(() => {
    // 1. Users
    const localUsers = localStorage.getItem(LOCAL_USERS_KEY);
    if (localUsers) {
      setUsers(JSON.parse(localUsers));
    } else {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(SEED_USERS));
      setUsers(SEED_USERS);
    }

    // 2. Rooms
    const localRooms = localStorage.getItem(LOCAL_ROOMS_KEY);
    if (localRooms) {
      setRooms(JSON.parse(localRooms));
    } else {
      localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(SEED_ROOMS));
      setRooms(SEED_ROOMS);
    }

    // 3. Scores history
    const localScores = localStorage.getItem(LOCAL_SCORES_KEY);
    if (localScores) {
      setScoresHistory(JSON.parse(localScores));
    } else {
      localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(SEED_SCORES));
      setScoresHistory(SEED_SCORES);
    }
  }, []);

  const t = (key: string) => getTranslation(key, language);

  // Save users state helpers
  const saveUsersToStorage = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updatedUsers));
  };

  // Register Player applicant
  const handleRegisterUser = (newUser: Omit<User, 'id' | 'role' | 'status' | 'createdAt'>) => {
    const freshUser: User = {
      ...newUser,
      id: `user-${Date.now()}`,
      role: 'player',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    const nextUsers = [...users, freshUser];
    saveUsersToStorage(nextUsers);
  };

  // Validate Player login
  const handlePlayerLogin = (email: string, pass: string): User | null => {
    // Note: For preview offline-first experience, any password is valid for seed users!
    const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (matched) return matched;
    return null;
  };

  // Admin approvals
  const handleApproveUser = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, status: 'Approved' as const, approvedAt: new Date().toISOString() } : u);
    saveUsersToStorage(updated);
  };

  const handleRejectUser = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, status: 'Rejected' as const } : u);
    saveUsersToStorage(updated);
  };

  const handleSuspendUser = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, status: 'Suspended' as const } : u);
    saveUsersToStorage(updated);
  };

  const handleReactivateUser = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, status: 'Approved' as const } : u);
    saveUsersToStorage(updated);
  };

  const handleResetPassword = (userId: string) => {
    alert(language === 'en' ? 'Password reset successfully for user.' : '已成功重置该玩家的密码。');
  };

  // Save Rooms state
  const handleUpdateRooms = (updatedRooms: Room[]) => {
    setRooms(updatedRooms);
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(updatedRooms));
  };

  // Add recorded score game
  const handleRecordGame = (record: ScoreRecord) => {
    const nextScores = [record, ...scoresHistory];
    setScoresHistory(nextScores);
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(nextScores));
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* 1. HOMEPAGE PORTAL SELECTION */}
      {portal === 'home' && (
        <div className="min-h-screen flex flex-col justify-between relative overflow-hidden">
          
          {/* Ambient light circles */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Home Header */}
          <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900 z-10">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2.5 rounded-2xl shadow-xl shadow-emerald-500/10">
                <span className="text-2xl font-black text-slate-950">掼</span>
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white">{t('title')}</h1>
                <p className="text-xs text-slate-400 font-mono">{t('subtitle')}</p>
              </div>
            </div>

            {/* Language Switch */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setLanguage('zh')}
                className={`px-3 py-1.5 rounded-lg transition ${language === 'zh' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-lg transition ${language === 'en' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}`}
              >
                English
              </button>
            </div>
          </header>

          {/* SPLIT HERO SECTION: Player on Left, Admin on Right */}
          <main className="max-w-6xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center z-10">
            
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                {language === 'zh' ? '四人结对竞赛 · 掼响二十四节气' : 'Four-Player Team Poker · 24 Solar Terms'}
              </h2>
              <p className="text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
                {language === 'zh' 
                  ? '掼蛋是深受大众喜爱的智力运动，本系统支持真实发牌、二十四节气房间、音视频通话、中英文双语、自动与手动计分，以及完备的后台账号审批系统。' 
                  : 'Guandan is a beloved strategy card game. Experience realistic gameplay, solar-term rooms, WebRTC audio/video chat, manual/automatic scoring, and powerful admin account approvals.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
              
              {/* LEFT HALF: PLAYER PORTAL */}
              <motion.div 
                whileHover={{ y: -6, scale: 1.01 }}
                onClick={() => setPortal('player')}
                className="group cursor-pointer bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-900/30 hover:border-emerald-500/40 p-8 rounded-3xl shadow-xl transition relative overflow-hidden flex flex-col justify-between min-h-[340px]"
              >
                <div className="absolute -right-16 -top-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-colors"></div>
                
                <div>
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">{t('playerPortal')}</h3>
                  <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">
                    {language === 'zh' 
                      ? '加入二十四节气游戏房间，修改队名，管理手牌一键出牌，模拟对家Bot，进行实时音视频对局并自动计分升级。' 
                      : 'Join 24 solar-term poker rooms, rename your team, organize card combinations, play with smart bot partners, and automatically advance levels.'}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-850 flex items-center justify-between text-xs font-bold uppercase text-emerald-400 tracking-wider">
                  <span>{language === 'zh' ? '进入玩家通道' : 'Enter Player Portal'} →</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

              {/* RIGHT HALF: ADMIN PORTAL */}
              <motion.div 
                whileHover={{ y: -6, scale: 1.01 }}
                onClick={() => setPortal('admin')}
                className="group cursor-pointer bg-gradient-to-b from-teal-950/30 to-slate-900 border border-teal-950/20 hover:border-teal-500/40 p-8 rounded-3xl shadow-xl transition relative overflow-hidden flex flex-col justify-between min-h-[340px]"
              >
                <div className="absolute -right-16 -top-16 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/15 transition-colors"></div>
                
                <div>
                  <div className="w-12 h-12 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl flex items-center justify-center mb-6">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">{t('adminPortal')}</h3>
                  <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">
                    {language === 'zh' 
                      ? '管理员后台控制中心。审核玩家注册申请，重置密码，禁用/恢复账户，监控24个节气房间占用，以及查看全局历史对局记录。' 
                      : 'Secure administrative panel. Appraise pending account applications, reset player credentials, audit active game tables, and browse historic game sheets.'}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-850 flex items-center justify-between text-xs font-bold uppercase text-teal-400 tracking-wider">
                  <span>{language === 'zh' ? '进入管理员控制台' : 'Enter Admin Console'} →</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

            </div>
          </main>

          {/* Home Footer credits */}
          <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 font-mono z-10">
            <div>© 2026 Guandan Poker App Platform. {language === 'zh' ? '支持二十四节气雅致对战' : 'Dedicated Solar-Term Tables.'}</div>
          </footer>

        </div>
      )}

      {/* 2. PLAYER PORTAL VIEW */}
      {portal === 'player' && (
        <div>
          {/* Small navbar to leave portal and return home */}
          <div className="bg-slate-900/60 border-b border-slate-900 px-4 py-2 flex items-center justify-between">
            <button
              onClick={() => setPortal('home')}
              className="text-xs font-mono font-bold text-slate-400 hover:text-white transition flex items-center space-x-1"
            >
              <span>← {language === 'zh' ? '返回门户首页' : 'Return to Portal Home'}</span>
            </button>
            <span className="text-[10px] font-mono text-slate-500">PLAYER PORTAL ACTIVE</span>
          </div>

          <PlayerPortal
            language={language}
            setLanguage={setLanguage}
            users={users}
            onRegister={handleRegisterUser}
            onLogin={handlePlayerLogin}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            rooms={rooms}
            updateRooms={handleUpdateRooms}
            onRecordGame={handleRecordGame}
            scoresHistory={scoresHistory}
          />
        </div>
      )}

      {/* 3. ADMIN PORTAL VIEW */}
      {portal === 'admin' && (
        <div>
          {/* Small navbar to leave portal and return home */}
          <div className="bg-slate-900/60 border-b border-slate-900 px-4 py-2 flex items-center justify-between">
            <button
              onClick={() => setPortal('home')}
              className="text-xs font-mono font-bold text-slate-400 hover:text-white transition flex items-center space-x-1"
            >
              <span>← {language === 'zh' ? '返回门户首页' : 'Return to Portal Home'}</span>
            </button>
            <span className="text-[10px] font-mono text-slate-500">ADMIN CONTROL PORTAL</span>
          </div>

          <AdminPortal
            language={language}
            users={users}
            rooms={rooms}
            scoresHistory={scoresHistory}
            onApproveUser={handleApproveUser}
            onRejectUser={handleRejectUser}
            onSuspendUser={handleSuspendUser}
            onReactivateUser={handleReactivateUser}
            onResetPassword={handleResetPassword}
            roomsStatusUpdate={handleUpdateRooms}
          />
        </div>
      )}

    </div>
  );
}
