
import React from 'react';
import { User, Account, NewsAiUsage } from '../types.ts';

interface HeaderProps {
  user: User;
  account?: Account;
  aiUsage?: NewsAiUsage;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, account, aiUsage, onLogout }) => {
  return (
    <header className="bg-white border-b-4 border-yellow-400 p-4 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">💰</span>
          <h1 className="text-2xl font-kids text-yellow-600">우리 반 경제 뉴스</h1>
        </div>

        <div className="flex items-center gap-3 md:gap-6 text-sm md:text-base w-full md:w-auto justify-between md:justify-end">
          {user.role === 'student' && account && aiUsage && (
            <div className="flex gap-2 md:gap-4 items-center bg-yellow-50 px-3 md:px-4 py-2 rounded-full border border-yellow-200">
              <div className="flex items-center gap-1">
                <span className="text-lg">⭐</span>
                <span className="font-bold text-yellow-800">
                  {account.balance.toFixed(1)}
                  <span className="hidden md:inline ml-0.5"> 권</span>
                </span>
              </div>
              <div className="h-4 w-px bg-yellow-200"></div>
              <div className="flex items-center gap-1">
                <span className="text-lg">🤖</span>
                <span className="text-gray-600">
                  <span className="hidden md:inline">AI 무료: </span>
                  <span className="font-bold text-blue-600">{aiUsage.free_usage_count}</span>
                  <span className="hidden md:inline">회</span>
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end md:items-start leading-tight text-right md:text-left">
              {/* 교사가 아닐 때만 학년 반 정보를 보여줌 (요청 1 반영) */}
              {user.role !== 'teacher' && (
                <span className="text-[10px] md:text-sm text-gray-500 font-medium">
                  {user.grade}학년 {user.class}반
                </span>
              )}
              <span className="font-bold text-gray-700 text-sm md:text-base">
                {user.name} {user.role === 'teacher' ? '교사' : '학생'}
              </span>
            </div>
            <button 
              onClick={onLogout}
              className="bg-gray-100 hover:bg-gray-200 text-gray-500 px-3 py-1 rounded text-xs md:text-sm transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
