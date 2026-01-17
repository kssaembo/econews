
import { createClient } from '@supabase/supabase-js';

// 1. Supabase 프로젝트 설정의 'API' 메뉴에서 확인할 수 있는 정보를 입력하세요.
// 환경 변수(env)를 사용하거나, 따옴표 안에 직접 주소와 키를 입력할 수 있습니다.
const supabaseUrl = process.env.SUPABASE_URL || 'https://anvdmcqszhmipbnxltsg.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudmRtY3FzemhtaXBibnhsdHNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MTc2MTYsImV4cCI6MjA3NzQ5MzYxNn0.nlvH4jRWwimBi54PaHVA0BF4t0z_H_Z5y2IHw4s74-s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
