
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, password } = await req.json()
    
    const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL");
    const supabaseKey = (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("서버 설정(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)이 누락되었습니다.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1단계: RPC(check_teacher_password)를 호출하여 암호화된 비밀번호 검증
    const { data: authData, error: authError } = await supabase.rpc('check_teacher_password', {
      p_login_id: name,
      p_password: password
    });

    if (authError) throw authError;

    // authData는 보통 배열로 반환됨
    const teacherResult = authData && authData.length > 0 ? authData[0] : null;

    if (!teacherResult || !teacherResult.id) {
      return new Response(
        JSON.stringify({ success: false, error: "아이디 또는 비밀번호가 틀렸습니다." }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      )
    }

    const teacherUuid = teacherResult.id;

    // 2단계: teachers 테이블에서 teacherAlias 정보를 가져옴 (요청 3 반영)
    const { data: teacherRecord, error: teacherInfoError } = await supabase
      .from('teachers')
      .select('teacherAlias')
      .eq('id', teacherUuid)
      .maybeSingle();

    if (teacherInfoError) console.error("Teacher Alias Fetch Error:", teacherInfoError);

    // 3단계: UUID를 문자열로 변환하여 users.userId(TEXT)와 매칭 시도
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('userId', String(teacherUuid))
      .maybeSingle();

    if (profileError) throw profileError;

    if (!userProfile) {
      return new Response(
        JSON.stringify({ success: false, error: "교사 계정은 확인되었으나, 연결된 사용자 프로필을 찾을 수 없습니다." }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      )
    }

    // 교사 별칭(teacherAlias)이 있다면 userProfile.name을 해당 별칭으로 교체 (요청 2 반영)
    if (teacherRecord && teacherRecord.teacherAlias && teacherRecord.teacherAlias.trim() !== "") {
      userProfile.name = teacherRecord.teacherAlias;
    }

    return new Response(
      JSON.stringify({ success: true, user: userProfile }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    )
  } catch (error: any) {
    console.error("Auth Teacher Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    )
  }
})
