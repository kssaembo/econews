
import { User, Account, NewsArticle, NewsComment, NewsAiUsage } from '../types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  CURRENT_USER: 'ecokid_current_user'
};

let sessionPassword = '';

export const db = {
  getCurrentUser: (): User | null => {
    const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
  },
  
  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      sessionPassword = '';
    }
  },

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data || [];
  },

  verifyUser: async (params: { name: string; grade: number; class: number; number: number; role: string }): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', params.name)
      .eq('grade', params.grade)
      .eq('class', params.class)
      .eq('number', params.number)
      .eq('role', params.role)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  verifyTeacherPassword: async (password: string, loginType: 'main' | 'test' = 'main'): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke('auth-teacher', {
      body: { password, loginType }
    });
    
    if (error) {
      console.error("Auth Function Error:", error);
      return false;
    }
    
    if (data?.success) {
      sessionPassword = password;
    }
    return data?.success === true;
  },

  getTeacherUser: async (name?: string): Promise<User | null> => {
    let query = supabase.from('users').select('*').eq('role', 'teacher');
    
    if (name) {
      query = query.eq('name', name);
    } else {
      // 전체 관리자(grade: 0)를 먼저 찾음
      query = query.eq('grade', 0).order('created_at', { ascending: true }).limit(1);
    }
    
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
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
    
    return (data || []).map(article => {
      let keywordsArr: string[] = [];
      if (Array.isArray(article.keywords)) {
        keywordsArr = article.keywords;
      } else if (typeof article.keywords === 'string') {
        keywordsArr = article.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
      }

      return {
        id: article.id,
        title: article.title,
        content: article.content,
        url: article.url,
        is_approved: article.is_approved ?? false,
        created_at: article.created_at,
        keywords: keywordsArr
      };
    });
  },

  addArticle: async (article: { title: string; content: string; url: string; keywords: string[]; is_approved?: boolean }): Promise<NewsArticle> => {
    if (!sessionPassword) {
      throw new Error("선생님 인증 정보가 없습니다. 다시 로그인해주세요.");
    }

    const { data, error } = await supabase.functions.invoke('publish-article', {
      body: { 
        password: sessionPassword,
        article: {
          title: article.title,
          content: article.content,
          url: article.url,
          keywords: article.keywords
        }
      }
    });

    if (error) throw error;
    
    return {
      ...data,
      is_approved: data.is_approved || false,
      keywords: Array.isArray(data.keywords) ? data.keywords : []
    };
  },

  resetArticles: async () => {
    const { error } = await supabase.rpc('reset_approved_articles_with_comments');
    if (error) throw error;
  },

  deleteArticle: async (articleId: string) => {
    const { error } = await supabase.rpc('delete_article_with_comments', { 
      target_article_id: articleId 
    });
    if (error) throw error;
  },

  getComments: async (articleId?: string): Promise<NewsComment[]> => {
    let query = supabase.from('news_comments').select('*').order('created_at', { ascending: false });
    if (articleId) {
      query = query.eq('article_id', articleId);
    }
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
    const { data: account } = await supabase.from('accounts').select('balance').eq('userId', userId).maybeSingle();
    if (account) {
      const newBalance = Number(account.balance) + amount;
      await supabase.from('accounts').update({ balance: newBalance }).eq('userId', userId);
    }
  },

  getAiUsage: async (userId: string): Promise<NewsAiUsage | undefined> => {
    const { data, error } = await supabase.from('news_ai_usage').select('*').eq('userId', userId).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    
    const now = new Date();
    const lastReset = new Date(data.last_reset_date);
    const isNewWeek = now.getTime() - lastReset.getTime() > 7 * 24 * 60 * 60 * 1000;

    if (isNewWeek) {
      const updated = { free_usage_count: 1, last_reset_date: now.toISOString() };
      await supabase.from('news_ai_usage').update(updated).eq('userId', userId);
      return { userId, ...updated };
    }
    return data;
  },

  useAi: async (userId: string) => {
    const { data: usage } = await supabase.from('news_ai_usage').select('free_usage_count').eq('userId', userId).maybeSingle();
    if (usage) {
      if (usage.free_usage_count > 0) {
        await supabase.from('news_ai_usage').update({ free_usage_count: usage.free_usage_count - 1 }).eq('userId', userId);
      } else {
        await db.updateBalance(userId, -3);
      }
    }
  }
};
