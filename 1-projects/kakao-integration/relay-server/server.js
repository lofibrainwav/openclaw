import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-001';
const PROJECT = process.env.GCP_PROJECT || 'afo-kingdom';
const LOCATION = process.env.GCP_LOCATION || 'us-central1';
const VERTEX_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models`;

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── GCE Access Token (via metadata server) ─────────────
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 30000) return cachedToken;

  const res = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  if (!res.ok) throw new Error(`Metadata token failed: ${res.status}`);

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  console.log('[Auth] GCE token refreshed');
  return cachedToken;
}

// ── Vertex AI Gemini ───────────────────────────────────
const SYSTEM_INSTRUCTION = `당신은 BB-AI, 친근하고 도움이 되는 한국어 AI 어시스턴트입니다.
- 짧고 명확하게 답변하세요 (카카오톡 메시지에 적합하도록)
- 최대 1000자 이내로 응답하세요
- 이모지를 적절히 사용하세요
- 불확실한 정보는 솔직하게 모른다고 말하세요`;

async function generateResponse(userMessage) {
  try {
    const token = await getAccessToken();

    const res = await fetch(
      `${VERTEX_BASE}/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 1000 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Vertex AI ${res.status}: ${err}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 생성할 수 없습니다.';
    return text.length > 1000 ? text.slice(0, 997) + '...' : text;
  } catch (err) {
    console.error('[Gemini Error]', err.message);
    if (err.message.includes('401') || err.message.includes('403')) {
      cachedToken = null; tokenExpiry = 0;
    }
    return '죄송합니다, 잠시 후 다시 시도해주세요. 🙏';
  }
}

function kakaoResponse(text) {
  return { version: '2.0', template: { outputs: [{ simpleText: { text } }] } };
}

// ── Routes ──────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  let auth = 'unknown';
  try { await getAccessToken(); auth = 'ok'; } catch { auth = 'error'; }
  res.json({ status: 'ok', service: 'kakao-relay', auth, model: MODEL, project: PROJECT, timestamp: new Date().toISOString() });
});

app.post('/kakao/skill', async (req, res) => {
  const t0 = Date.now();
  try {
    const utterance = req.body?.userRequest?.utterance?.trim();
    const userId = req.body?.userRequest?.user?.id || '?';
    console.log(`[Skill] user=${userId} msg="${utterance}"`);

    if (!utterance) return res.json(kakaoResponse('메시지를 입력해주세요! 😊'));

    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4500));
    const text = await Promise.race([generateResponse(utterance), timeout]);
    console.log(`[Skill] ${Date.now() - t0}ms`);
    return res.json(kakaoResponse(text));
  } catch (err) {
    console.error(`[Skill Error] ${err.message} (${Date.now() - t0}ms)`);
    return res.json(kakaoResponse(
      err.message === 'timeout'
        ? '응답 생성에 시간이 좀 걸리고 있어요. 다시 물어봐주세요! ⏳'
        : '죄송합니다, 오류가 발생했습니다. 🙏'
    ));
  }
});

app.get('/kakao/skill', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 BB-AI on :${PORT} | Model: ${MODEL} | Vertex AI (${PROJECT}/${LOCATION})`);
});
