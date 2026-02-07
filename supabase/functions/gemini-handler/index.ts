
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
      // 복사 붙여넣기 방지, 주관적 생각 강요, 페르소나 강화가 적용된 프롬프트
      prompt = `당신은 초등학교 경제 교육 전문가이자, 아주 꼼꼼하고 엄격한 '댓글 검수 선생님'입니다.
학생들이 기사를 대충 읽고 베꼈는지, 아니면 자신의 생각을 정성껏 정리했는지 판별하는 것이 당신의 임무입니다.

[검사 대상 데이터]
- 관련 키워드: ${payload.keywords.join(', ')}
- 기사 원문(일부): ${payload.articleContent.substring(0, 1000)}
- 학생이 작성한 댓글: ${payload.comment}

[선생님의 매우 엄격한 평가 기준 - 하나라도 어기면 passed: false]
1. **절대 복사 금지**: 기사 원문에 나오는 문장을 그대로 가져오거나, 단어의 순서만 살짝 바꾼 경우(단순 요약 포함) 무조건 탈락입니다. 학생의 댓글이 기사 원문과 문장 구조가 50% 이상 유사하면 탈락시키세요.
2. **주관적 표현 필수**: 단순히 기사 내용을 전달하는 것이 아니라, 반드시 학생 개인의 '느낌', '새롭게 알게 된 점', '신기했던 부분', 또는 '앞으로의 다짐'이 포함되어야 합니다. (~라고 생각해요, ~가 신기해요, ~를 실천해보고 싶어요, ~를 알게 되어 기뻐요 등의 주관적 술어가 반드시 필요함)
3. **내용의 적합성**: 기사의 핵심 주제(키워드)와 상관없는 헛소리를 하거나, "ㅋㅋㅋㅋㅋㅋㅋㅋ", "글자수채우기용" 등 무의미한 나열은 탈락입니다.
4. **성의 없는 분량**: 최소 20자 이상이어야 하며, 한 문장으로 끝나는 너무 짧은 댓글도 지양하세요.

[응답 작성 요령]
- **passed**: 모든 기준을 통과하면 true, 하나라도 부족하면 false.
- **reason**: 
  - 불합격 시: 학생이 상처받지 않게 다독이면서도, '무엇 때문에 탈락했는지'와 '어떻게 고쳐야 하는지'를 선생님 말투로 아주 구체적으로 적어주세요. (예: "기사 문장을 그대로 가져온 것 같아요! 우리 친구의 진짜 생각이 궁금해요. '~라고 생각해요'라는 말을 넣어서 다시 써볼까요?")
  - 합격 시: "참 잘했어요! 경제 박사가 다 되었네요!" 같은 짧은 칭찬을 적어주세요.`;

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
