
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { db } from '../services/storage';

interface LoginViewProps {
  onLogin: (user: User) => Promise<void>;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>('student');
  const [teacherMode, setTeacherMode] = useState<'main' | 'test'>('main');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(6);
  const [classNum, setClassNum] = useState(1);
  const [number, setNumber] = useState(1);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (role === 'teacher') {
        const isPasswordCorrect = await db.verifyTeacherPassword(password, teacherMode);
        
        if (isPasswordCorrect) {
          // 'test' 모드인 경우 이름이 '테스트'인 계정을 가져오고, 'main'은 기본 관리자 계정
          const teacherUser = await db.getTeacherUser(teacherMode === 'test' ? '테스트' : undefined);
          if (teacherUser) {
            await onLogin(teacherUser);
          } else {
            alert('DB에 등록된 선생님 정보가 없습니다. 관리자 페이지에서 확인해주세요.');
          }
        } else {
          alert('비밀번호가 틀렸습니다!');
        }
      } else {
        if (!name.trim()) {
          alert('이름을 입력해주세요!');
          setIsSubmitting(false);
          return;
        }

        const verifiedUser = await db.verifyUser({
          name,
          grade,
          class: classNum,
          number,
          role: 'student'
        });

        if (verifiedUser) {
          await onLogin(verifiedUser);
        } else {
          alert('학생 정보를 다시 확인해주세요.');
        }
      }
    } catch (err: any) {
      console.error("Login verification error:", err);
      alert("로그인 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-100 to-yellow-100">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border-4 border-white">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏦</div>
          <h1 className="text-4xl font-kids text-yellow-600 mb-2">우리 반 경제 뉴스</h1>
          <p className="text-gray-500">어린이들을 위한 즐거운 경제 공부!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setRole('student')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${role === 'student' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
            >
              학생 로그인
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setRole('teacher')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${role === 'teacher' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}
            >
              교사 로그인
            </button>
          </div>

          {role === 'student' ? (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="등록된 이름을 적어주세요"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-yellow-400 outline-none transition-all disabled:bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">학년</label>
                  <input
                    type="number"
                    min="1" max="6"
                    disabled={isSubmitting}
                    value={grade}
                    onChange={(e) => setGrade(parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-yellow-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">반</label>
                  <input
                    type="number"
                    min="1" max="15"
                    disabled={isSubmitting}
                    value={classNum}
                    onChange={(e) => setClassNum(parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-yellow-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">번호</label>
                  <input
                    type="number"
                    min="1" max="40"
                    disabled={isSubmitting}
                    value={number}
                    onChange={(e) => setNumber(parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-yellow-400 outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex gap-2 p-1 bg-green-50 rounded-xl border border-green-100">
                <button
                  type="button"
                  onClick={() => setTeacherMode('main')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${teacherMode === 'main' ? 'bg-white shadow-sm text-green-700 border border-green-200' : 'text-green-400'}`}
                >
                  전체 관리자
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherMode('test')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${teacherMode === 'test' ? 'bg-white shadow-sm text-green-700 border border-green-200' : 'text-green-400'}`}
                >
                  학급 테스트
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  {teacherMode === 'main' ? '전체 관리자 비밀번호' : '테스트 계정 비밀번호'}
                </label>
                <input
                  type="password"
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-green-400 outline-none transition-all disabled:bg-gray-50"
                />
              </div>
              <p className="text-[10px] text-gray-400 text-center leading-tight">
                {teacherMode === 'main' 
                  ? '모든 학생의 활동 내역을 관리할 수 있습니다.' 
                  : '설정된 특정 학급의 데이터만 확인할 수 있습니다.'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 ${role === 'student' ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-yellow-200' : 'bg-green-500 hover:bg-green-600 text-white shadow-green-200'} font-bold rounded-2xl text-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 mt-4`}
          >
            {isSubmitting ? '확인 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
