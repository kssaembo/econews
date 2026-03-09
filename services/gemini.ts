
import { GoogleGenAI, Type } from "@google/genai";
import { VerificationResult, SummaryResult } from '../types.ts';

// Initialize Gemini AI
// Note: process.env.GEMINI_API_KEY is automatically handled by the platform
const genAI = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY });

export const geminiService = {
  /**
   * 실제 뉴스 목록을 기반으로 AI가 큐레이션 및 각색 요청
   */
  recommendNews: async (rawNews: any[]): Promise<any[]> => {
    const model = "gemini-flash-latest";
    const rawNewsList = JSON.stringify(rawNews).substring(0, 5000);
    const prompt = `당신은 초등 경제 전문 에디터입니다. 아래 제공된 뉴스 목록을 보고, 초등학교 고학년(4-6학년) 학생들이 읽기에 적합한 경제 뉴스 10개를 선별하여 다듬어주세요.

[편집 지침 - 매우 중요]
1. **분량 보존 (70% 이상)**: 원문 기사 내용의 **최소 70% 이상**을 그대로 유지하세요. 중요한 세부 사항이나 배경 설명을 생략하지 말고 풍부하게 서술해야 합니다.
2. **요약 금지, 해설 중심**: 이 작업은 '요약'이 아니라 '이해하기 쉬운 변환'입니다. 기사 내용을 줄이는 대신, 어려운 문장이나 경제 용어를 초등학생이 이해할 수 있도록 **풀어서 설명**하는 데 집중하세요.
3. **전문성 유지**: 고학년 학생들의 지적 수준을 고려하여, 신문 기사 특유의 진지하고 전문적인 톤을 유지하세요. 너무 단순한 단어만 사용하기보다, 어려운 단어를 쓰고 그 옆에 괄호나 쉬운 문장으로 설명을 덧붙이는 방식을 권장합니다.
4. **논리 구조**: 원문의 기승전결과 논리적 흐름을 하나도 빠짐없이 그대로 가져오세요.

[뉴스 목록]
${rawNewsList}`;

    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 응답이 비어있습니다.");
    return JSON.parse(text);
  },

  /**
   * 뉴스 요약 요청
   */
  summarizeNews: async (title: string, content: string): Promise<SummaryResult> => {
    const model = "gemini-flash-latest";
    const truncatedContent = content.substring(0, 2000);
    const prompt = `초등학생을 위해 다음 뉴스를 3줄 요약하고, 어려운 단어 3개를 골라 아주 쉽게 설명해주세요.\n뉴스 제목: ${title}\n뉴스 내용: ${truncatedContent}`;

    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 응답이 비어있습니다.");
    return JSON.parse(text);
  },

  /**
   * 댓글 검수 요청
   */
  verifyComment: async (articleContent: string, comment: string, keywords: string[]): Promise<VerificationResult> => {
    const model = "gemini-flash-latest";
    const prompt = `당신은 초등학교 경제 교육 전문가이자, 아주 꼼꼼하고 엄격한 '댓글 검수 선생님'입니다.
학생들이 기사를 대충 읽고 베꼈는지, 아니면 자신의 생각을 정성껏 정리했는지 판별하는 것이 당신의 임무입니다.

[검사 대상 데이터]
- 관련 키워드: ${keywords.join(', ')}
- 기사 원문(일부): ${articleContent.substring(0, 1000)}
- 학생이 작성한 댓글: ${comment}

[선생님의 매우 엄격한 평가 기준 - 하나라도 어기면 passed: false]
1. **절대 복사 금지**: 기사 원문에 나오는 문장을 그대로 가져오거나, 단어의 순서만 살짝 바꾼 경우(단순 요약 포함) 무조건 탈락입니다. 학생의 댓글이 기사 원문과 문장 구조가 50% 이상 유사하면 탈락시키세요.
2. **주관적 표현 필수**: 단순히 기사 내용을 전달하는 것이 아니라, 반드시 학생 개인의 '느낌', '새롭게 알게 된 점', '신기했던 부분', 또는 '앞으로의 다짐'이 포함되어야 합니다. (~라고 생각해요, ~가 신기해요, ~를 실천해보고 싶어요, ~를 알게 되어 기뻐요 등의 주관적 술어가 반드시 필요함)
3. **내용의 적합성**: 기사의 핵심 주제(키워드)와 상관없는 헛소리를 하거나, "ㅋㅋㅋㅋㅋㅋㅋㅋ", "글자수채우기용" 등 무의미한 나열은 탈락입니다.
4. **성의 없는 분량**: 최소 20자 이상이어야 하며, 한 문장으로 끝나는 너무 짧은 댓글도 지양하세요.

[응답 작성 요령]
- **passed**: 모든 기준을 통과하면 true, 하나라도 부족하면 false.
- **reason**: 
  - 불합격 시: 학생이 상처받지 않게 다독이면서도, '무엇 때문에 탈락했는지'와 '어떻게 고쳐야 하는지'를 선생님 말투로 아주 구체적으로 적어주세요.
  - 합격 시: "참 잘했어요! 경제 박사가 다 되었네요!" 같은 짧은 칭찬을 적어주세요.`;

    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passed: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["passed", "reason"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 응답이 비어있습니다.");
    return JSON.parse(text);
  }
};


