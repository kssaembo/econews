
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@^1.34.0"

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
    const { action, payload } = await req.json()
    
    // 1. Supabase Secrets에서 키 가져오기
    const apiKey = (globalThis as any).Deno.env.get("GEMINI_API_KEY") || (globalThis as any).Deno.env.get("API_KEY");
    
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. Supabase Dashboard -> Project Settings -> Secrets에서 설정해주세요.");
    }

    // 2. @google/genai 지침에 따라 process.env.API_KEY를 강제로 설정
    // Deno 환경에서 라이브러리가 브라우저로 오해하더라도 키가 있으면 오류가 발생하지 않습니다.
    (globalThis as any).process = {
      env: { API_KEY: apiKey }
    };

    // 3. 지침대로 process.env.API_KEY를 사용하여 인스턴스 생성
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    
    let prompt = "";
    let responseSchema: any = null;

    if (action === 'recommend_news') {
      const rawNewsList = JSON.stringify(payload.rawNews);
      prompt = `당신은 초등 경제 전문 에디터입니다. 아래 제공된 네이버 뉴스 검색 결과 목록을 보고, 초등학생(4-6학년)이 반드시 알아야 하거나 흥미로워할 경제/금융 관련 뉴스 10개를 골라 각색하세요.

[제공된 뉴스 목록]
${rawNewsList}

[각색 지시사항]
1. 제공된 뉴스 목록 중 유익한 것을 최대 10개 엄선하세요.
2. 각 뉴스의 제목은 아이들의 호기심을 자극하도록 친근하게 바꾸세요.
3. 본문은 아이들이 이해하기 쉽게 600자 이상의 스토리텔링 방식으로 다시 쓰세요.
4. 말투는 상냥한 '해요체'를 사용하세요.
5. 일상적인 비유(장난감, 용돈 등)를 섞어주세요.`;

      responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            url: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "content", "url", "keywords"]
        }
      };
    } else if (action === 'summarize') {
      prompt = `초등학생을 위해 다음 뉴스를 3줄 요약하고, 어려운 단어 3개를 골라 아주 쉽게 설명해주세요.
      뉴스 내용: ${payload.title} - ${payload.content}`;

      responseSchema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          easy_words: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                meaning: { type: Type.STRING }
              },
              required: ["word", "meaning"]
            }
          }
        },
        required: ["summary", "easy_words"]
      };
    } else if (action === 'verify') {
      prompt = `학생이 쓴 뉴스 댓글이 기사 내용과 관련이 있는지 검사해주세요.
      기사 요약: ${payload.articleContent.substring(0, 100)}...
      학생 댓글: ${payload.comment}`;

      responseSchema = {
        type: Type.OBJECT,
        properties: {
          passed: { type: Type.BOOLEAN },
          reason: { type: Type.STRING }
        },
        required: ["passed", "reason"]
      };
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("AI 응답이 비어있습니다.");

    return new Response(responseText.trim(), {
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    })
  } catch (error: any) {
    console.error("Gemini Handler Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    })
  }
})
