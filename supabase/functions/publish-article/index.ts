
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { password, article } = await req.json()
    
    const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. 비밀번호 검증
    // (1) 전체 관리자 비밀번호(Secret) 확인
    const adminPassword = (globalThis as any).Deno.env.get("TEACHER_PASSWORD");
    let isAuthorized = (adminPassword && password === adminPassword);

    // (2) 관리자 비번이 아닐 경우, DB에 해당 비번을 가진 교사가 있는지 확인
    if (!isAuthorized) {
      const { data: teacher } = await supabase
        .from('users')
        .select('name')
        .eq('role', 'teacher')
        .eq('password', password)
        .maybeSingle();
      
      if (teacher) isAuthorized = true;
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "선생님 인증에 실패했습니다." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401
      })
    }

    // 2. 뉴스 기사 저장
    const { data, error } = await supabase
      .from('news_articles')
      .insert({
        title: article.title,
        content: article.content,
        url: article.url || '',
        is_approved: true,
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    })
  }
})
