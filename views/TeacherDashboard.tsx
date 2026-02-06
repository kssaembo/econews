
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/storage.ts';
import { geminiService } from '../services/gemini.ts';
import { newsApiService } from '../services/newsApi.ts';
import { NewsArticle, NewsComment, User } from '../types.ts';

const TeacherDashboard: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [comments, setComments] = useState<NewsComment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [recommendedNews, setRecommendedNews] = useState<any[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [selectedArticleDetail, setSelectedArticleDetail] = useState<any>(null);
  const [selectedArticleComments, setSelectedArticleComments] = useState<{title: string, comments: NewsComment[]} | null>(null);

  // 직접 올리기 및 수정 관련 상태
  const [isDirectUploadOpen, setIsDirectUploadOpen] = useState(false);
  const [directTitle, setDirectTitle] = useState('');
  const [directContent, setDirectContent] = useState('');
  
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);

  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
  });
  
  const [selectedStudentComments, setSelectedStudentComments] = useState<{name: string, userId: string} | null>(null);
  const [studentCommentsLimit, setStudentCommentsLimit] = useState(10);

  const loadData = async () => {
    setLoading(true);
    try {
      const [arts, comms, usrs] = await Promise.all([
        db.getArticles(),
        db.getComments(),
        db.getUsers()
      ]);
      setArticles(arts);
      setComments(comms);
      setUsers(usrs.filter(u => u.role === 'student'));
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFetchAiNews = async () => {
    setIsRecommending(true);
    try {
      const rawResults = await newsApiService.searchNews('경제 금융 뉴스');
      if (!rawResults || rawResults.length === 0) {
        alert('뉴스를 찾지 못했습니다.');
        return;
      }
      const curatedNews = await geminiService.recommendNews(rawResults);
      setRecommendedNews(curatedNews);
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    } finally {
      setIsRecommending(false);
    }
  };

  const handleApprove = async (newsItem: any) => {
    try {
      await db.addArticle({
        title: newsItem.title,
        content: newsItem.content,
        url: newsItem.url || '',
        keywords: newsItem.keywords || ['경제', '금융'],
        is_approved: true
      });
      alert('승인되었습니다!');
      setRecommendedNews(prev => prev.filter(n => n.title !== newsItem.title));
      loadData();
    } catch (err: any) {
      console.error("승인 중 오류 발생:", err);
      alert('승인 중 오류가 발생했습니다.');
    }
  };

  const handleDirectUpload = async () => {
    if (!directTitle.trim() || !directContent.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    try {
      await db.addArticle({
        title: directTitle,
        content: directContent,
        url: '',
        keywords: ['직접입력', '경제'],
        is_approved: true
      });
      alert('기사가 성공적으로 등록되었습니다.');
      setIsDirectUploadOpen(false);
      setDirectTitle('');
      setDirectContent('');
      loadData();
    } catch (err) {
      console.error(err);
      alert('기사 등록 중 오류가 발생했습니다.');
    }
  };

  const startEditing = () => {
    setEditTitle(selectedArticleDetail.title);
    setEditContent(selectedArticleDetail.content);
    setIsEditingDetail(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      // 1. 이미 승인되어 ID가 있는 기사인 경우 (DB 업데이트)
      if (selectedArticleDetail.id) {
        await db.updateArticle(selectedArticleDetail.id, { 
          title: editTitle, 
          content: editContent 
        });
        alert('기사가 수정되었습니다.');
      } 
      // 2. 실시간 불러온 뉴스(미승인)인 경우 (로컬 상태 업데이트)
      else {
        setRecommendedNews(prev => prev.map(n => 
          n.title === selectedArticleDetail.title ? { ...n, title: editTitle, content: editContent } : n
        ));
        alert('화면의 뉴스 내용이 수정되었습니다. [승인 및 공개] 버튼을 누르면 저장됩니다.');
      }
      
      setSelectedArticleDetail({ ...selectedArticleDetail, title: editTitle, content: editContent });
      setIsEditingDetail(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const confirmResetArticles = async () => {
    try {
      await db.resetArticles();
      alert('초기화되었습니다.');
      setResetConfirmOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('초기화 중 오류 발생');
    }
  };

  const confirmDeleteArticle = async () => {
    if (!deletingArticleId) return;
    try {
      await db.deleteArticle(deletingArticleId);
      alert('삭제되었습니다.');
      setDeletingArticleId(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert('삭제 중 오류 발생');
    }
  };

  const weekRange = useMemo(() => {
    const start = new Date(baseDate);
    const end = new Date(baseDate);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [baseDate]);

  const changeWeek = (offset: number) => {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + (offset * 7));
    setBaseDate(next);
  };

  const weeklyComments = useMemo(() => {
    return comments.filter(c => {
      const date = new Date(c.created_at);
      return date >= weekRange.start && date <= weekRange.end;
    });
  }, [comments, weekRange]);

  const approvedArticles = articles.filter(a => a.is_approved);

  const currentStudentComments = useMemo(() => {
    if (!selectedStudentComments) return [];
    return comments
      .filter(c => c.userId === selectedStudentComments.userId)
      .slice(0, studentCommentsLimit);
  }, [selectedStudentComments, studentCommentsLimit, comments]);

  const totalStudentCommentsCount = useMemo(() => {
    if (!selectedStudentComments) return 0;
    return comments.filter(c => c.userId === selectedStudentComments.userId).length;
  }, [selectedStudentComments, comments]);

  if (loading) return <div className="text-center py-20 font-kids text-xl">로딩 중... 📊</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12">
      <section className="bg-white rounded-3xl p-8 shadow-sm border-2 border-yellow-200">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-kids text-yellow-600 mb-1">🗞️ 리얼 뉴스 큐레이션</h2>
            <p className="text-gray-500 text-sm">실제 뉴스를 아이들 눈높이로 다듬어줍니다.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDirectUploadOpen(true)}
              className="px-6 py-4 bg-white border-2 border-yellow-400 text-yellow-600 font-bold rounded-2xl hover:bg-yellow-50 transition-all shadow-md flex items-center gap-2"
            >
              <span className="text-xl">✍️</span>
              직접 기사 올리기
            </button>
            <button 
              onClick={handleFetchAiNews}
              disabled={isRecommending}
              className="px-8 py-4 bg-yellow-400 text-yellow-900 font-bold rounded-2xl hover:bg-yellow-500 transition-all shadow-lg disabled:opacity-50 flex items-center gap-3"
            >
              {isRecommending ? <span className="animate-spin text-xl">⏳</span> : <span className="text-xl">🔍</span>}
              {isRecommending ? '뉴스 분석 중...' : '실시간 뉴스 불러오기'}
            </button>
          </div>
        </div>

        {recommendedNews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {recommendedNews.map((news, idx) => (
              <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div onClick={() => { setSelectedArticleDetail(news); setIsEditingDetail(false); }} className="cursor-pointer">
                  <h4 className="font-bold text-gray-800 line-clamp-2 mb-2 text-sm leading-tight hover:text-blue-600">{news.title}</h4>
                  <p className="text-[11px] text-gray-500 line-clamp-3 leading-relaxed">{news.content}</p>
                </div>
                <button 
                  onClick={() => handleApprove(news)}
                  className="mt-4 w-full py-2 bg-white border-2 border-yellow-400 text-yellow-700 text-xs font-bold rounded-xl hover:bg-yellow-400 hover:text-white transition-all"
                >
                  승인 및 공개
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 직접 올리기 모달 */}
      {isDirectUploadOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden">
            <div className="p-8 pb-4 flex justify-between items-center border-b">
              <h3 className="text-2xl font-kids text-yellow-600">✍️ 직접 기사 올리기</h3>
              <button onClick={() => setIsDirectUploadOpen(false)} className="text-2xl text-slate-300">✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">기사 제목</label>
                <input 
                  type="text"
                  value={directTitle}
                  onChange={(e) => setDirectTitle(e.target.value)}
                  placeholder="아이들의 눈길을 끄는 제목을 입력하세요"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-yellow-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">기사 내용</label>
                <textarea 
                  value={directContent}
                  onChange={(e) => setDirectContent(e.target.value)}
                  placeholder="경제 지식을 이야기처럼 쉽게 풀어 써주세요"
                  className="w-full h-64 px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-yellow-400 outline-none resize-none"
                ></textarea>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setIsDirectUploadOpen(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-500">취소</button>
                <button onClick={handleDirectUpload} className="flex-1 py-4 bg-yellow-400 rounded-2xl font-bold text-yellow-900">기사 공개하기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-kids text-blue-600">✅ 현재 노출 중인 뉴스 ({approvedArticles.length})</h2>
          <button 
            onClick={() => setResetConfirmOpen(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 text-xs font-bold rounded-xl transition-colors border border-slate-200"
          >
            목록 초기화 🔄
          </button>
        </div>
        
        <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide snap-x">
          {approvedArticles.map(article => (
            <div 
              key={article.id}
              className="min-w-[280px] max-w-[280px] snap-start p-5 bg-blue-50/50 rounded-2xl border border-blue-100 relative group"
            >
              <div onClick={() => { setSelectedArticleDetail(article); setIsEditingDetail(false); }} className="cursor-pointer">
                <h4 className="font-bold text-gray-800 line-clamp-2 mb-4 h-10 leading-snug group-hover:text-blue-600">{article.title}</h4>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <button 
                  onClick={() => setSelectedArticleComments({ title: article.title, comments: comments.filter(c => c.article_id === article.id) })}
                  className="text-blue-600 font-bold bg-white px-2 py-1 rounded shadow-sm hover:bg-blue-600 hover:text-white transition-colors"
                >
                  댓글: {comments.filter(c => c.article_id === article.id).length}개
                </button>
                <button 
                  onClick={() => setDeletingArticleId(article.id)}
                  className="text-red-400 font-bold hover:text-red-600"
                >
                  삭제 🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {resetConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold mb-2">정말 초기화할까요?</h3>
            <p className="text-gray-500 text-sm mb-6">현재 노출 중인 모든 뉴스 기사와 관련 댓글이 삭제됩니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setResetConfirmOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">취소</button>
              <button onClick={confirmResetArticles} className="flex-1 py-3 bg-red-500 rounded-xl font-bold text-white">전부 삭제</button>
            </div>
          </div>
        </div>
      )}

      {deletingArticleId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="text-4xl mb-4">🗑️</div>
            <h3 className="text-xl font-bold mb-2">이 뉴스를 삭제할까요?</h3>
            <p className="text-gray-500 text-sm mb-6">해당 기사와 댓글 정보가 영구적으로 삭제됩니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingArticleId(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">취소</button>
              <button onClick={confirmDeleteArticle} className="flex-1 py-3 bg-red-500 rounded-xl font-bold text-white">삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 기사 상세/수정 모달 (요청 1 반영하여 UI 개선) */}
      {selectedArticleDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* 상단 헤더 영역 */}
            <div className="p-8 pb-4 flex justify-between items-center border-b">
              {isEditingDetail ? (
                <h3 className="text-xl font-kids text-blue-600">기사 수정하기</h3>
              ) : (
                <h3 className="text-2xl font-bold text-gray-900 flex-1 pr-4 line-clamp-1">{selectedArticleDetail.title}</h3>
              )}
              <div className="flex items-center gap-4">
                {!isEditingDetail ? (
                  <>
                    <button 
                      onClick={startEditing}
                      className="px-4 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      수정
                    </button>
                    <button onClick={() => setSelectedArticleDetail(null)} className="text-3xl text-slate-300 hover:text-gray-500">✕</button>
                  </>
                ) : (
                  <button onClick={() => setIsEditingDetail(false)} className="text-3xl text-slate-300 hover:text-gray-500">✕</button>
                )}
              </div>
            </div>
            
            {/* 본문 영역 */}
            <div className="p-8 overflow-y-auto flex-1">
              {isEditingDetail ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">기사 제목</label>
                    <input 
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-400 outline-none font-bold"
                      placeholder="수정할 제목을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">기사 본문</label>
                    <textarea 
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-80 p-4 rounded-xl border-2 border-blue-100 focus:border-blue-400 outline-none resize-none leading-relaxed"
                      placeholder="수정할 본문 내용을 입력하세요"
                    ></textarea>
                  </div>
                </div>
              ) : (
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{selectedArticleDetail.content}</p>
              )}
            </div>

            {/* 하단 버튼 영역 (수정 모드일 때만 노출, 요청 1 반영) */}
            {isEditingDetail && (
              <div className="p-6 border-t bg-slate-50 flex gap-3">
                <button 
                  onClick={() => setIsEditingDetail(false)} 
                  className="flex-1 py-4 bg-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={handleSaveEdit} 
                  className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg transition-colors"
                >
                  수정 내용 저장하기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedArticleComments && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-8 pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{selectedArticleComments.title}</h3>
                <p className="text-sm text-blue-500 font-bold">댓글 {selectedArticleComments.comments.length}개</p>
              </div>
              <button onClick={() => setSelectedArticleComments(null)} className="text-3xl text-slate-300 hover:text-gray-500">✕</button>
            </div>
            <div className="px-8 pb-8 overflow-y-auto flex-1 space-y-4">
              {selectedArticleComments.comments.length === 0 ? (
                <p className="text-center py-10 text-gray-400">댓글이 없습니다.</p>
              ) : (
                selectedArticleComments.comments.map(c => {
                  const user = users.find(u => u.userId === c.userId);
                  return (
                    <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between mb-2">
                        <span className="font-bold text-sm text-gray-700">{user ? `${user.name} (${user.number}번)` : '알 수 없음'}</span>
                        <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600">{c.content}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {selectedStudentComments && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-8 pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedStudentComments.name} 학생의 댓글</h3>
                <p className="text-sm text-green-600 font-bold">전체 {totalStudentCommentsCount}개 중 최근 {currentStudentComments.length}개</p>
              </div>
              <button onClick={() => setSelectedStudentComments(null)} className="text-3xl text-slate-300 hover:text-gray-500">✕</button>
            </div>
            <div className="px-8 pb-8 overflow-y-auto flex-1 space-y-4">
              {currentStudentComments.length === 0 ? (
                <p className="text-center py-10 text-gray-400">작성한 댓글이 없습니다.</p>
              ) : (
                currentStudentComments.map(c => {
                  const article = articles.find(a => a.id === c.article_id);
                  return (
                    <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between mb-2">
                        <span className="font-bold text-xs text-blue-600">{article ? article.title : '삭제된 기사'}</span>
                        <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600">{c.content}</p>
                    </div>
                  );
                })
              )}
              {totalStudentCommentsCount > studentCommentsLimit && (
                <button 
                  onClick={() => setStudentCommentsLimit(prev => prev + 10)}
                  className="w-full py-3 text-slate-500 font-bold text-sm hover:text-blue-600 transition-colors"
                >
                  더 보기 (+10)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-2xl font-kids text-green-600">📊 학생 활동 통계</h2>
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
            <button onClick={() => changeWeek(-1)}>◀️</button>
            <div className="flex flex-col items-center min-w-[140px]">
              <span className="text-[10px] text-gray-400">{weekRange.start.toLocaleDateString()} - {weekRange.end.toLocaleDateString()}</span>
            </div>
            <button onClick={() => changeWeek(1)}>▶️</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {users.map(student => {
            const studentComms = weeklyComments.filter(c => c.userId === student.userId);
            return (
              <div key={student.userId} className="p-4 bg-white border border-slate-100 rounded-2xl text-center">
                <span className="text-[10px] text-slate-300 font-bold block mb-1">{student.number}번</span>
                <span className="font-bold text-gray-800 block mb-3">{student.name}</span>
                <button 
                  onClick={() => {
                    setSelectedStudentComments({ name: student.name, userId: student.userId });
                    setStudentCommentsLimit(10);
                  }}
                  className={`w-full py-1.5 rounded-xl text-xs font-bold ${
                    studentComms.length > 0 ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  댓글 {studentComms.length}개
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default TeacherDashboard;
