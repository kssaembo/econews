
import { User, Account, NewsArticle, NewsComment, NewsAiUsage } from '../types.ts';
import { supabase } from './supabase.ts';

const STORAGE_KEYS = {
  CURRENT_USER: 'ecokid_current_user'
};

export const db = {
  getCurrentUser: (): User | null => {
    try {
      const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  
  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('number', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // 학생 로그인을 위해 Edge Function 호출 (name 대신 password 사용)
  verifyUser: async (params: { password: string; grade: number; class: number; number: number; role: string; classCode: string }): Promise<User | null> => {
    const { data, error } = await supabase.functions.invoke('auth-student', {
      body: params
    });
    if (error || (data && data.success === false)) return null;
    return data?.user || null;
  },

  verifyTeacherPassword: async (name: string, password: string): Promise<User | null> => {
    const { data, error } = await supabase.functions.invoke('auth-teacher', {
      body: { name, password }
    });
    if (error || (data && data.success === false)) return null;
    return data?.user || null;
  },

  ensureStudentInitialized: async (user: User) => {
    if (user.role !== 'student') return;
    const { data: acc } = await supabase.from('accounts').select('*').eq('userId', user.userId).maybeSingle();
    if (!acc) {
      await supabase.from('accounts').insert({
        accountId: `acc_${user.userId}`,
        userId: user.userId,
        balance: 10
      });
    }
    const { data: usage } = await supabase.from('news_ai_usage').select('*').eq('userId', user.userId).maybeSingle();
    if (!usage) {
      await supabase.from('news_ai_usage').insert({
        userId: user.userId,
        free_usage_count: 1,
        last_reset_date: new Date().toISOString()
      });
    }
  },

  getArticles: async (): Promise<NewsArticle[]> => {
    const { data, error } = await supabase.from('news_articles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(article => ({
      ...article,
      keywords: Array.isArray(article.keywords) ? article.keywords : (article.keywords || "").split(',')
    }));
  },

  addArticle: async (article: any): Promise<NewsArticle> => {
    const { data, error } = await supabase.from('news_articles').insert(article).select().single();
    if (error) throw error;
    return data;
  },

  updateArticle: async (id: string, updates: Partial<NewsArticle>) => {
    const { error } = await supabase.from('news_articles').update(updates).eq('id', id);
    if (error) throw error;
  },

  approveArticle: async (articleId: string) => {
    await supabase.from('news_articles').update({ is_approved: true }).eq('id', articleId);
  },

  resetArticles: async () => {
    await supabase.rpc('reset_approved_articles_with_comments');
  },

  deleteArticle: async (articleId: string) => {
    await supabase.rpc('delete_article_with_comments', { target_article_id: articleId });
  },

  getComments: async (articleId?: string): Promise<NewsComment[]> => {
    let query = supabase.from('news_comments').select('*').order('created_at', { ascending: false });
    if (articleId) query = query.eq('article_id', articleId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  addComment: async (comment: NewsComment) => {
    const { error } = await supabase.from('news_comments').insert(comment);
    if (error) throw error;
  },

  getAccount: async (userId: string): Promise<Account | undefined> => {
    const { data, error } = await supabase.from('accounts').select('*').eq('userId', userId).maybeSingle();
    if (error) throw error;
    return data || undefined;
  },

  updateBalance: async (userId: string, amount: number) => {
    const { error } = await supabase.rpc('update_user_balance', {
      p_user_id: userId,
      p_amount: amount
    });
    if (error) {
      console.error("Balance update error:", error);
      throw error;
    }
  },

  getAiUsage: async (userId: string): Promise<NewsAiUsage | undefined> => {
    const { data, error } = await supabase.from('news_ai_usage').select('*').eq('userId', userId).maybeSingle();
    if (error) throw error;
    return data || undefined;
  },

  useAi: async (userId: string) => {
    const usage = await db.getAiUsage(userId);
    if (usage) {
      if (usage.free_usage_count > 0) {
        const { error } = await supabase.from('news_ai_usage').update({ free_usage_count: usage.free_usage_count - 1 }).eq('userId', userId);
        if (error) throw error;
      } else {
        await db.updateBalance(userId, -3);
      }
    }
  }
};
