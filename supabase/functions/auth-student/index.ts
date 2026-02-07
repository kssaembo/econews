
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
    const { password, grade, class: classNum, number, classCode } = await req.json()
    
    const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL");
    const supabaseKey = (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("서버 설정(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)이 누락되었습니다.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1단계: 학급 코드로 선생님(학급) 정보 찾기
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id')
      .eq('class_code', classCode)
      .maybeSingle();

    if (teacherError) {
      console.error("Teacher Lookup Error:", teacherError);
      throw teacherError;
    }

    if (!teacher) {
      return new Response(
        JSON.stringify({ success: false, error: "올바르지 않은 학급 코드입니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 2단계: RPC(check_student_password)를 호출하여 암호화된 비밀번호 및 학급 소속 확인
    // p_teacher_id를 추가하여 다른 반 학생이 동일 번호/비번으로 로그인하는 것을 방지합니다.
    const { data: authData, error: authError } = await supabase.rpc('check_student_password', {
      p_teacher_id: teacher.id,
      p_grade: grade,
      p_class: classNum,
      p_number: number,
      p_password: password
    });

    if (authError) {
      console.error("RPC (check_student_password) Error:", authError.message);
      // DB 에러 내용을 클라이언트에 전달하여 문제 파악을 돕습니다.
      return new Response(
        JSON.stringify({ success: false, error: `데이터베이스 인증 오류: ${authError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // RPC 결과 확인 (성공 시 배열 형태로 데이터가 반환됨)
    const userProfile = authData && authData.length > 0 ? authData[0] : null;

    if (!userProfile) {
      return new Response(
        JSON.stringify({ success: false, error: "학생 정보를 찾을 수 없습니다. 비밀번호나 학년/반/번호를 확인해주세요." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 성공 응답
    return new Response(
      JSON.stringify({ success: true, user: userProfile }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Auth Student Fatal Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
})
