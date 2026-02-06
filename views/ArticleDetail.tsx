
import React, { useState, useEffect, useRef } from 'react';
import { NewsArticle, SummaryResult, VerificationResult, NewsComment, User } from '../types.ts';
import { geminiService } from '../services/gemini.ts';
import { db } from '../services/storage.ts';

const ECONOMIC_TIPS = [
  "돈은 물건을 사고팔 때 쓰는 '교환의 수단'이에요.",
  "용돈 기입장을 쓰면 내가 돈을 어디에 썼는지 한눈에 알 수 있어요.",
  "물건의 가격은 사려는 사람(수요)과 파는 사람(공급)이 결정해요.",
  "기회비용이란 하나를 선택했을 때 포기해야 하는 다른 것의 가치예요.",
  "은행에 돈을 맡기면 은행이 고맙다는 의미로 '이자'를 줘요.",
  "희소성이란 우리가 원하는 것에 비해 자원이 부족한 상태를 말해요.",
  "인플레이션은 물가가 계속 오르고 돈의 가치가 떨어지는 현상이에요.",
  "현명한 소비자는 물건을 사기 전에 '정말 필요한가?'를 먼저 생각해요.",
  "투자는 나중에 더 큰 이익을 얻기 위해 돈이나 시간을 사용하는 거예요.",
  "세금은 나라를 운영하고 국민을 돕기 위해 국민이 내는 돈이에요.",
  "주식은 회사의 주인이 될 수 있는 권리를 조각내어 파는 거예요.",
  "보험은 나중에 일어날 수 있는 사고에 대비해 미리 돈을 모으는 거예요.",
  "저축은 나중을 위해 돈을 아껴두는 아주 좋은 습관이에요.",
  "소득은 일을 해서 버는 돈이나 용돈 등을 모두 포함하는 말이에요.",
  "환율은 우리나라 돈과 다른 나라 돈을 바꿀 때의 비율이에요.",
  "독점이란 하나의 회사가 시장의 물건을 혼자 다 파는 상태예요.",
  "브랜드는 물건을 만든 회사나 상품의 이름을 말해요.",
  "전자결제는 카드나 스마트폰으로 돈을 내는 편리한 방법이에요.",
  "기부는 어려운 이웃을 돕기 위해 내 돈이나 물건을 나누는 거예요.",
  "품질은 물건이 얼마나 튼튼하고 잘 만들어졌는지를 나타내요.",
  "광고는 물건을 더 많이 팔기 위해 사람들에게 알리는 활동이에요.",
  "유통은 물건이 공장에서 만들어져 우리 손에 오기까지의 과정이에요.",
  "무역은 나라와 나라 사이에 물건이나 서비스를 사고파는 거예요.",
  "시장경제는 사람들이 자유롭게 물건을 사고파는 경제 체제예요.",
  "카드 결제는 지금 물건을 사고 돈은 나중에 내는 방식이에요.",
  "근로소득은 우리가 땀 흘려 일해서 번 소중한 돈이에요.",
  "사업가는 새로운 아이디어로 회사를 만들고 운영하는 사람이에요.",
  "자산은 내가 가진 돈, 집, 물건 등 가치가 있는 모든 것을 말해요.",
  "부채는 나중에 갚아야 할 빚을 의미하므로 조심해서 빌려야 해요.",
  "복리란 이자에 또 이자가 붙어서 돈이 더 빨리 불어나는 방식이에요.",
  "경제적 자유는 돈 걱정 없이 내가 하고 싶은 일을 할 수 있는 상태예요.",
  "경쟁은 여러 회사가 더 좋은 물건을 더 싸게 팔려고 노력하는 거예요.",
  "소비는 우리 생활에 필요한 물건이나 서비스를 사는 활동이에요.",
  "생산은 물건을 직접 만들거나 서비스를 제공하는 활동이에요.",
  "기업은 이익을 얻기 위해 물건을 만들거나 서비스를 파는 조직이에요.",
  "가계는 우리 가족처럼 함께 살며 경제 활동을 하는 단위를 말해요.",
  "정부는 공원, 도로 등 우리가 함께 쓰는 시설을 만들고 관리해요.",
  "수출은 우리나라 물건을 외국에 파는 것이고, 수입은 사오는 거예요.",
  "화폐는 종이돈이나 동전처럼 국가가 정한 약속된 돈이에요.",
  "위조지폐는 가짜 돈을 말하며, 이를 만들거나 쓰는 건 큰 범죄예요.",
  "분산투자는 위험을 줄이기 위해 여러 곳에 나누어 투자하는 거예요.",
  "배당금은 회사가 돈을 벌었을 때 주식을 가진 사람들에게 나눠주는 돈이에요.",
  "경제성장률은 나라의 경제 규모가 얼마나 커졌는지 나타내는 지표예요.",
  "중앙은행은 우리나라의 돈을 발행하고 관리하는 가장 중요한 은행이에요.",
  "금리는 돈의 가격이라고 할 수 있어요. 돈을 빌릴 때 내는 값이에요.",
  "실업은 일하고 싶지만 일자리를 구하지 못한 상태를 말해요.",
  "경제 위기는 나라의 경제가 갑자기 어려워지는 상황을 뜻해요.",
  "전자화폐는 실물 돈 대신 데이터 형태로 존재하는 돈이에요.",
  "암호화폐는 온라인에서 복잡한 암호로 만들어진 새로운 형태의 돈이에요.",
  "지속 가능한 경제는 환경을 보호하며 오랫동안 성장하는 경제예요."
];

interface ArticleDetailProps {
  article: NewsArticle;
  user: User;
  onBack: () => void;
  onUpdate: () => void;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, user, onBack, onUpdate }) => {
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [progress, setProgress] = useState(0);
  const [comment, setComment] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [existingComments, setExistingComments] = useState<NewsComment[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  const [showAiConfirm, setShowAiConfirm] = useState(false);
  const progressInterval = useRef<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [commentsData, usersData] = await Promise.all([
          db.getComments(article.id),
          db.getUsers()
        ]);
        setExistingComments(commentsData);
        setAllUsers(usersData);
      } catch (error) {
        console.error("데이터 로드 중 오류:", error);
      }
    };
    fetchData();
  }, [article.id]);

  const startProgress = () => {
    setProgress(0);
    if (progressInterval.current) clearInterval(progressInterval.current);
    
    progressInterval.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev < 40) return prev + 2;
        if (prev < 70) return prev + 1;
        if (prev < 95) return prev + 0.5;
        return prev;
      });
    }, 100);
  };

  const completeProgress = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setProgress(100);
  };

  const handleGetSummary = async () => {
    const usage = await db.getAiUsage(user.userId);
    const account = await db.getAccount(user.userId);
    
    if (usage && usage.free_usage_count <= 0 && account && account.balance < 3) {
      alert('보유한 별(포인트)이 부족해요! (AI 요약에는 3권이 필요합니다)');
      setShowAiConfirm(false);
      return;
    }

    const randomTip = ECONOMIC_TIPS[Math.floor(Math.random() * ECONOMIC_TIPS.length)];
    setCurrentTip(randomTip);
    setLoadingSummary(true);
    setShowAiConfirm(false);
    startProgress();

    try {
      const res = await geminiService.summarizeNews(article.title, article.content);
      // AI 사용 처리 및 포인트 차감
      await db.useAi(user.userId);
      completeProgress();
      
      setTimeout(() => {
        setSummary(res);
        setLoadingSummary(false);
        onUpdate();
      }, 500);
    } catch (error) {
      console.error(error);
      alert('AI 요약을 불러오는 중 오류가 발생했어요.');
      setLoadingSummary(false);
    }
  };

  const handleSubmitComment = async () => {
    if (comment.length < 20) {
      alert('조금 더 정성스럽게 작성해볼까요? (최소 20자 이상)');
      return;
    }

    const randomTip = ECONOMIC_TIPS[Math.floor(Math.random() * ECONOMIC_TIPS.length)];
    setCurrentTip(randomTip);
    setVerifying(true);
    startProgress();

    try {
      const res = await geminiService.verifyComment(article.content, comment, article.keywords || []);
      completeProgress();
      
      // 검증 결과 처리
      setVerificationResult(res);
      setVerifying(false);
      
      if (res.passed) {
        const newComment: NewsComment = {
          id: crypto.randomUUID(),
          userId: user.userId,
          article_id: article.id,
          content: comment,
          is_passed: true,
          created_at: new Date().toISOString()
        };
        
        try {
          // 1. 댓글 등록 (RLS 권한이 필요함)
          await db.addComment(newComment);
          // 2. 포인트 적립 (RPC 호출)
          await db.updateBalance(user.userId, 1);
          
          setExistingComments(prev => [newComment, ...prev]);
          setComment('');
          setVerificationResult(null);
          
          // 상단 정보 갱신
          onUpdate();
          alert('축하합니다! 댓글이 통과되어 1포인트를 받았어요! 🌟');
        } catch (dbError: any) {
          console.error("DB 작업 중 에러:", dbError);
          alert(`댓글은 검수 통과했지만 저장 중 오류가 발생했어요: ${dbError.message}`);
        }
      }
    } catch (error) {
      console.error(error);
      alert('검수 중 오류가 발생했어요.');
      setVerifying(false);
    }
  };

  const getAuthorName = (userId: string) => {
    const found = allUsers.find(u => u.userId === userId);
    if (found) return found.name;
    if (userId === user.userId) return user.name;
    return '어린이 친구';
  };

  const LoadingDisplay = ({ title }: { title: string }) => (
    <div className="w-full max-w-md p-4 animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 text-blue-600 font-bold mb-2">
          <span className="text-2xl animate-spin">⚙️</span>
          <span>{title}</span>
        </div>
        
        <div className="w-full bg-blue-100 h-6 rounded-full overflow-hidden mb-4 border border-blue-200 relative">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-900">
            {Math.floor(progress)}%
          </span>
        </div>

        <div className="bg-yellow-100/80 p-5 rounded-2xl border-2 border-yellow-200 shadow-sm w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💡</span>
            <h4 className="font-bold text-yellow-800 text-sm">잠깐! 오늘의 경제 상식</h4>
          </div>
          <p className="text-sm text-yellow-900 leading-relaxed font-medium">
            {currentTip}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 pb-20">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-bold">
        <span>⬅️</span> 목록으로 돌아가기
      </button>

      <article className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 mb-8">
        <div className="p-8 bg-slate-800 text-white">
          <div className="flex justify-between items-center mb-4">
            <span className="px-3 py-1 bg-blue-500 text-[10px] font-bold rounded-full uppercase tracking-widest">Article</span>
            <span className="text-xs text-slate-400">{new Date(article.created_at).toLocaleDateString()}</span>
          </div>
          <h2 className="text-2xl font-bold mb-4 leading-tight">{article.title}</h2>
          <div className="flex gap-2 flex-wrap">
            {article.keywords && article.keywords.map(k => (
              <span key={k} className="px-2 py-0.5 bg-white/10 rounded text-[11px] font-bold">#{k}</span>
            ))}
          </div>
        </div>

        <div className="p-8">
          <div className="prose prose-slate max-w-none mb-10">
            <p className="text-slate-700 leading-relaxed text-lg whitespace-pre-line border-l-4 border-slate-200 pl-6">
              {article.content}
            </p>
          </div>

          <div className="h-px bg-slate-100 w-full mb-10"></div>

          {!summary ? (
            <div className="bg-blue-50 rounded-2xl p-6 border-2 border-dashed border-blue-200 text-center relative min-h-[160px] flex flex-col items-center justify-center">
              {!showAiConfirm && !loadingSummary && (
                <>
                  <p className="text-blue-700 font-bold mb-4">🗞️ 기사 내용이 이해하기 조금 어려우신가요?</p>
                  <button 
                    onClick={() => setShowAiConfirm(true)}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
                  >
                    🤖 AI 선생님께 쉬운 설명 부탁하기
                  </button>
                </>
              )}
              
              {showAiConfirm && !loadingSummary && (
                <div className="animate-in zoom-in-95">
                  <p className="text-gray-600 mb-4 font-bold">AI 선생님을 부를까요? (무료 횟수 소진 시 3포인트가 소모됩니다)</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setShowAiConfirm(false)} className="px-6 py-2 bg-gray-200 rounded-lg font-bold text-gray-600">아니요</button>
                    <button onClick={handleGetSummary} className="px-6 py-2 bg-blue-500 rounded-lg font-bold text-white shadow-lg">네, 알려주세요!</button>
                  </div>
                </div>
              )}

              {loadingSummary && <LoadingDisplay title="AI 선생님이 기사를 읽고 있어요..." />}
            </div>
          ) : (
            <div className="bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-200 space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💡</span>
                <h3 className="text-xl font-kids text-yellow-700">AI 선생님의 핵심 쏙쏙 풀이</h3>
              </div>
              <p className="text-slate-800 leading-relaxed text-lg bg-white p-5 rounded-xl shadow-sm border border-yellow-100">
                {summary.summary}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {summary.easy_words.map(w => (
                  <div key={w.word} className="bg-white p-3 rounded-xl shadow-sm border border-yellow-100">
                    <span className="font-bold text-blue-600 block mb-1">[{w.word}]</span>
                    <span className="text-xs text-slate-600 leading-snug">{w.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-2xl font-kids text-gray-800 mb-6">📝 나의 생각 적기</h3>
        
        {verifying ? (
          <div className="bg-blue-50 rounded-2xl p-8 border-2 border-dashed border-blue-200 flex flex-col items-center justify-center min-h-[200px]">
            <LoadingDisplay title="AI 선생님이 내 생각을 읽고 있어요..." />
          </div>
        ) : (
          <>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="뉴스를 읽고 어떤 생각이 들었나요? 최소 20자 이상 적어보세요!"
              className="w-full h-32 p-4 rounded-2xl border-2 border-gray-100 focus:border-blue-400 outline-none mb-4 transition-colors"
            ></textarea>
            {verificationResult && !verificationResult.passed && (
              <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
                <b>보완이 필요해요:</b> {verificationResult.reason}
              </div>
            )}
            <button
              onClick={handleSubmitComment}
              disabled={verifying}
              className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-2xl text-xl shadow-md disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              생각 남기고 포인트 받기! ✨
            </button>
          </>
        )}

        <div className="mt-12 space-y-4">
          <h4 className="font-bold text-gray-400 text-sm uppercase tracking-wider">친구들의 생각 ({existingComments.length})</h4>
          {existingComments.length === 0 ? (
            <p className="text-center py-8 text-gray-400 italic">아직 첫 번째 생각이 올라오지 않았어요. 먼저 남겨볼까요?</p>
          ) : (
            existingComments.map(c => (
              <div key={c.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors">
                <div className="flex justify-between mb-2 items-center">
                  <span className="font-bold text-blue-600 text-sm bg-blue-50 px-2 py-0.5 rounded-lg">
                    👤 {getAuthorName(c.userId)}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-700 leading-relaxed text-sm">{c.content}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default ArticleDetail;
