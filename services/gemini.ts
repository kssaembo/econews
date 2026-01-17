
import { supabase } from './supabase';
import { VerificationResult, SummaryResult } from '../types';

export const geminiService = {
  /**
   * 실제 뉴스 목록을 기반으로 AI가 큐레이션 및 각색 요청
   */
  recommendNews: async (rawNews: any[]): Promise<any[]> => {
    const { data, error } = await supabase.functions.invoke('gemini-handler', {
      body: { 
        action: 'recommend_news',
        payload: { rawNews } // 검색된 실제 뉴스 데이터를 보냄
      }
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * 뉴스 요약 요청
   */
  summarizeNews: async (title: string, content: string): Promise<SummaryResult> => {
    const { data, error } = await supabase.functions.invoke('gemini-handler', {
      body: { 
        action: 'summarize',
        payload: { title, content }
      }
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * 댓글 검수 요청
   */
  verifyComment: async (articleContent: string, comment: string, keywords: string[]): Promise<VerificationResult> => {
    const { data, error } = await supabase.functions.invoke('gemini-handler', {
      body: { 
        action: 'verify',
        payload: { articleContent, comment, keywords }
      }
    });
    if (error) throw new Error(error.message);
    return data;
  }
};
