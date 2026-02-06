
import React, { useState, useEffect } from 'react';
import { User, Account, NewsAiUsage } from './types.ts';
import { db } from './services/storage.ts';
import Header from './components/Header.tsx';
import LoginView from './views/LoginView.tsx';
import StudentDashboard from './views/StudentDashboard.tsx';
import TeacherDashboard from './views/TeacherDashboard.tsx';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | undefined>();
  const [aiUsage, setAiUsage] = useState<NewsAiUsage | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        const user = db.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          await refreshData(user);
        }
      } catch (err) {
        console.error("초기화 오류:", err);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  const refreshData = async (user: User) => {
    if (user.role === 'student') {
      try {
        const [acc, usage] = await Promise.all([
          db.getAccount(user.userId),
          db.getAiUsage(user.userId)
        ]);
        setAccount(acc);
        setAiUsage(usage);
      } catch (err) {
        console.warn("데이터 로드 실패:", err);
      }
    }
  };

  const handleLogin = async (user: User) => {
    setLoading(true);
    try {
      if (user.role === 'student') {
        await db.ensureStudentInitialized(user);
      }
      setCurrentUser(user);
      db.setCurrentUser(user);
      await refreshData(user);
    } catch (err: any) {
      alert(`오류가 발생했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    db.setCurrentUser(null);
    setAccount(undefined);
    setAiUsage(undefined);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-kids text-2xl flex-col gap-4 bg-blue-50">
      <div className="animate-bounce text-6xl">🚀</div>
      <div className="text-blue-600">데이터를 불러오는 중...</div>
    </div>
  );

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-blue-50/30">
      <Header 
        user={currentUser} 
        account={account} 
        aiUsage={aiUsage}
        onLogout={handleLogout} 
      />
      
      <main className="max-w-6xl mx-auto flex-1 w-full">
        {currentUser.role === 'teacher' ? (
          <TeacherDashboard />
        ) : (
          <StudentDashboard user={currentUser} onUpdate={() => refreshData(currentUser)} />
        )}
      </main>

      {/* 푸터 영역: 저작권 문구 추가 (요청 3 반영) */}
      <footer className="w-full py-8 text-center text-gray-400 text-xs font-medium border-t border-gray-100 mt-12 bg-white/50">
        ⓒ 2026. Kwon's class. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
