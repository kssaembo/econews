
import React, { useState } from 'react';
import { User, UserRole } from '../types.ts';
import { db } from '../services/storage.ts';

interface LoginViewProps {
  onLogin: (user: User) => Promise<void>;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(6);
  const [classNum, setClassNum] = useState(1);
  const [number, setNumber] = useState(1);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setLoginError(null);
    setIsSubmitting(true);
    try {
      if (role === 'teacher') {
        if (!name.trim()) {
          setLoginError('선생님 아이디를 입력해주세요!');
          setIsSubmitting(false);
          return;
        }
        
        const teacherUser = await db.verifyTeacherPassword(name, password);
        
        if (teacherUser) {
          await onLogin(teacherUser);
        } else {
          setLoginError('아이디(이메일)나 비밀번호를 다시 확인해주세요.');
        }
      } else {
        if (!name.trim()) {
          setLoginError('이름을 입력해주세요!');
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
          // 학생 로그인 실패 메시지 표시 (요청 1 반영)
          setLoginError('학생 정보를 다시 확인해주세요.');
        }
      }
    } catch (err: any) {
      console.error("Login verification error:", err);
      setLoginError("로그인 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-100 to-yellow-100">
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
              onClick={() => { setRole('student'); setName(''); setLoginError(null); }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${role === 'student' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
            >
              학생 로그인
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => { setRole('teacher'); setName(''); setLoginError(null); }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${role === 'teacher' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}
            >
              교사 로그인
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              {role === 'student' ? '이름' : '아이디'}
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'student' ? "등록된 이름을 적어주세요" : "선생님 아이디를 입력하세요"}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-yellow-400 outline-none transition-all disabled:bg-gray-50"
            />
          </div>

          {role === 'student' ? (
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
          ) : (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label>
              <input
                type="password"
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="선생님 비밀번호를 입력하세요"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-green-400 outline-none transition-all disabled:bg-gray-50"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 ${role === 'student' ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-yellow-200' : 'bg-green-500 hover:bg-green-600 text-white shadow-green-200'} font-bold rounded-2xl text-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 mt-4`}
          >
            {isSubmitting ? '확인 중...' : '시작하기'}
          </button>

          {loginError && (
            <p className="text-center text-red-500 font-bold text-sm mt-2 animate-bounce">
              ⚠️ {loginError}
            </p>
          )}
        </form>
      </div>
      
      <footer className="mt-8 text-gray-400 text-xs font-medium">
        ⓒ 2026. Kwon's class. All rights reserved.
      </footer>
    </div>
  );
};

export default LoginView;
