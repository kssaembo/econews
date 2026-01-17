
import { supabase } from './supabase';

export interface ExternalArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
}

const stripHtml = (html: string) => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>?/gm, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
};

export const newsApiService = {
  /**
   * 서버(Supabase Edge Functions)에 배포된 'search-news' 함수를 호출하여
   * 네이버 실시간 뉴스를 가져옵니다.
   */
  searchNews: async (keyword: string): Promise<ExternalArticle[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('search-news', {
        body: { keyword }
      });

      if (error) {
        console.error("서버 뉴스 검색 에러:", error);
        return mockData(keyword);
      }

      if (data && data.items) {
        return data.items.map((item: any) => ({
          title: stripHtml(item.title),
          description: stripHtml(item.description),
          url: item.link,
          publishedAt: item.pubDate,
          source: { name: '네이버 뉴스' }
        }));
      }

      return [];
    } catch (error) {
      console.error("News API Service Error:", error);
      return mockData(keyword);
    }
  }
};

const mockData = (keyword: string): ExternalArticle[] => [
  {
    title: stripHtml(`<b>${keyword}</b> 관련 뉴스를 불러올 수 없습니다.`),
    description: stripHtml(`네이버 API 연결 상태를 확인해주세요. 현재는 임시 데이터를 표시합니다.`),
    url: 'https://news.naver.com',
    publishedAt: new Date().toUTCString(),
    source: { name: '연결 오류' }
  }
];
