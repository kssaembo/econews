
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
      // 복사 붙여넣기 방지 및 주관적 생각 강요를 위한 매우 엄격한 프롬프트 (요청 반영)
      prompt = `당신은 초등 경제 뉴스 댓글 검수관입니다. 다음 기준에 따라 학생의 댓글을 매우 엄격하게 평가하세요.

[검사 대상 데이터]
- 기사 키워드: ${payload.keywords.join(', ')}
- 기사 내용: ${payload.articleContent.substring(0, 500)}...
- 학생 댓글: ${payload.comment}

[엄격한 평가 기준 - 하나라도 어기면 passed: false]
1. 표절 및 복사 금지: 기사 본문의 문장을 그대로 복사하거나, 단순히 단어 순서만 바꾼 경우 무조건 탈락입니다.
2. 주관적 생각 필수: "~라고 생각해요", "~가 신기해요", "~를 해보고 싶어요", "~를 알게 되어 기뻐요"와 같이 자신의 느낌, 다짐, 의견이 반드시 포함되어야 합니다. 단순히 기사 내용을 요약만 한 것은 탈락입니다.
3. 관련성: 기사 내용 및 키워드와 전혀 상관없는 이야기를 하면 탈락입니다.
4. 무의미한 나열 금지: "ㅋㅋㅋㅋㅋㅋㅋㅋ"나 "글자수채우기글자수채우기"와 같은 무의미한 반복은 탈락입니다.

학생이 자신의 생각으로 정성껏 썼다면 passed를 true로, 기사 내용을 복사했거나 생각이 없다면 false로 하고 구체적인 탈락 이유를 reason에 적어주세요.`;

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
