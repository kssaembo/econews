import React, { useState, useEffect } from 'react';
import { db } from '../services/storage';
import { NewsArticle, User } from '../types';
import ArticleDetail from './ArticleDetail';

interface StudentDashboardProps {
  user: User;
  onUpdate: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onUpdate }) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await db.getArticles();
        setArticles(data.filter(a => a.is_approved));
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  if (selectedArticle) {
    return (
      <ArticleDetail 
        article={selectedArticle} 
        user={user} 
        onBack={() => setSelectedArticle(null)}
        onUpdate={onUpdate}
      />
    );
  }

  if (loading) return <div className="text-center py-20 font-kids text-xl">뉴스를 배달 중이에요... 🗞️</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-kids text-blue-700 mb-2">오늘의 경제 뉴스 🗞️</h2>
        <p className="text-gray-500">뉴스를 읽고 AI 요약도 듣고 포인트도 모아보세요!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {articles.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 text-lg">선생님이 뉴스를 준비 중이에요! 잠시만 기다려주세요.</p>
          </div>
        ) : (
          articles.map(article => (
            <div 
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border border-gray-100 group"
            >
              <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
                {article.keywords && article.keywords[0] === '금리' ? '📈' : article.keywords && article.keywords[0] === '물가' ? '🍔' : '💹'}
              </div>
              <div className="p-6">
                <div className="flex gap-2 mb-3">
                  {article.keywords && article.keywords.map(k => (
                    <span key={k} className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">#{k}</span>
                  ))}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {article.content}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-xs text-gray-400">{new Date(article.created_at).toLocaleDateString()}</span>
                  <span className="text-blue-500 font-bold text-sm">읽어보기 ➡️</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;