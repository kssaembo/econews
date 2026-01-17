
export type UserRole = 'teacher' | 'student';

export interface User {
  userId: string;
  name: string;
  grade: number;
  class: number;
  number: number;
  role: UserRole;
}

export interface Account {
  accountId: string;
  userId: string;
  balance: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  url: string;
  is_approved: boolean;
  created_at: string;
  keywords: string[];
}

export interface NewsComment {
  id: string;
  userId: string;
  article_id: string;
  content: string;
  is_passed: boolean;
  created_at: string;
}

export interface NewsAiUsage {
  userId: string;
  free_usage_count: number;
  last_reset_date: string;
}

export interface VerificationResult {
  passed: boolean;
  reason: string;
}

export interface SummaryResult {
  summary: string;
  easy_words: { word: string; meaning: string }[];
}
