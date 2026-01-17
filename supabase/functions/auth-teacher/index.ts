
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
    const { password, loginType } = await req.json()
    
    // DB 접속을 위한 설정 (Secrets에서 가져옴)
    const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    if (loginType === 'main') {
      // 1. 전체 관리자 모드: Secrets에 설정된 TEACHER_PASSWORD와 비교
      const correctPassword = (globalThis as any).Deno.env.get("TEACHER_PASSWORD");
      if (!correctPassword) throw new Error("서버에 TEACHER_PASSWORD가 설정되지 않았습니다.");
      
      return new Response(JSON.stringify({ success: password === correctPassword }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } else {
      // 2. 학급 테스트 모드: DB의 users 테이블에서 '테스트'라는 이름을 가진 교사의 비번 확인
      const { data: user, error } = await supabase
        .from('users')
        .select('password')
        .eq('role', 'teacher')
        .eq('name', '테스트')
        .maybeSingle();

      if (error) throw error;
      
      if (!user) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'DB에 "테스트"라는 이름의 교사 계정이 없습니다. SQL이 정상적으로 실행되었는지 확인하세요.' 
        }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 입력한 비밀번호와 DB에 저장된 비밀번호 비교
      return new Response(JSON.stringify({ success: password === user.password }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  } catch (error: any) {
    console.error("Auth Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400 
    })
  }
})
