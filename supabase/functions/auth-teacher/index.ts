
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { password } = await req.json()
    
    // Supabase Secrets에서 비밀번호 가져오기
    const correctPassword = (globalThis as any).Deno.env.get("TEACHER_PASSWORD");

    if (!correctPassword) {
      throw new Error("서버에 TEACHER_PASSWORD가 설정되지 않았습니다.");
    }

    const isMatch = password === correctPassword;

    return new Response(
      JSON.stringify({ success: isMatch }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    )
  }
})
