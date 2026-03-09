
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@^1.34.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Retry logic with exponential backoff
async function generateWithRetry(ai: any, model: string, contents: any, config: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContentStream({
        model,
        contents,
        config
      });
    } catch (e: any) {
      if (e.message?.includes("503") && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`503 error, retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries reached");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    
    const apiKey = (globalThis as any).Deno.env.get("API_KEY") || (globalThis as any).Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("API_KEY or GEMINI_API_KEY is not set.");
    
    const ai = new GoogleGenAI({ apiKey });
    // Use the most stable preview model for text tasks
    const model = 'gemini-3-flash-preview';
    
    let prompt = "";
    let responseSchema: any = null;

    if (action === 'recommend_news') {
      // Truncate raw news list to prevent payload bloat
      const rawNewsList = JSON.stringify(payload.rawNews).substring(0, 5000);
      prompt = `당신은 초등 경제 전문 에디터입니다. 아래 제공된 뉴스 목록을 보고, 초등학생(4-6학년)이 반드시 알아야 할 경제 뉴스 10개를 골라 각색하세요.\n\n[뉴스 목록]\n${rawNewsList}`;
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
      // Truncate content to 2000 chars
      const content = payload.content.substring(0, 2000);
      prompt = `초등학생을 위해 다음 뉴스를 3줄 요약하고, 어려운 단어 3개를 골라 아주 쉽게 설명해주세요.\n뉴스 제목: ${payload.title}\n뉴스 내용: ${content}`;
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
      prompt = `댓글 검수 선생님 페르소나로 다음 댓글을 검수하세요.\n키워드: ${payload.keywords.join(', ')}\n기사: ${payload.articleContent.substring(0, 1000)}\n댓글: ${payload.comment}`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          passed: { type: Type.BOOLEAN },
          reason: { type: Type.STRING }
        },
        required: ["passed", "reason"]
      };
    }

    const stream = await generateWithRetry(ai, model, prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    });

    // Create a ReadableStream to pipe the AI output to the client
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });

    return new Response(readableStream, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    })
  } catch (error: any) {
    console.error("Gemini Handler Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    })
  }
})

