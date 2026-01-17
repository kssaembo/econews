
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS 프리플라이트 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { password, article } = await req.json()
    
    // 1. 비밀번호 검증
    const correctPassword = (globalThis as any).Deno.env.get("TEACHER_PASSWORD");
    if (!correctPassword || password !== correctPassword) {
      return new Response(JSON.stringify({ error: "비밀번호가 틀렸거나 설정되지 않았습니다." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401
      })
    }

    // 2. 관리자 권한용 Supabase 클라이언트 생성
    const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 3. 뉴스 기사 저장 (관리자 권한이므로 RLS를 무시하고 저장됨)
    const { data, error } = await supabase
      .from('news_articles')
      .insert({
        title: article.title,
        content: article.content,
        url: article.url || '',
        is_approved: true, // 에지 함수를 통해 들어온 것은 즉시 승인 상태로 저장
        keywords: article.keywords || []
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    })
  } catch (error: any) {
    console.error("Publish Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    })
  }
})
