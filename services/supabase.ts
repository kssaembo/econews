
import { createClient } from '@supabase/supabase-js';

// 브라우저 환경에서 process.env가 정의되지 않았을 경우를 대비한 안전한 값 가져오기
const getEnv = (key: string, fallback: string): string => {
  try {
    // typeof process 체크를 통해 ReferenceError 방지
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
    return fallback;
  } catch {
    return fallback;
  }
};

// 실제 Supabase 접속 정보 (보안을 위해 환경 변수를 우선하되, 브라우저 직접 실행 시 fallback 사용)
const supabaseUrl = getEnv('SUPABASE_URL', 'https://anvdmcqszhmipbnxltsg.supabase.co');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudmRtY3FzemhtaXBibnhsdHNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MTc2MTYsImV4cCI6MjA3NzQ5MzYxNn0.nlvH4jRWwimBi54PaHVA0BF4t0z_H_Z5y2IHw4s74-s');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
