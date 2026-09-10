import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const { topic } = req.body || {};
  if (typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'topic_required' });
  }

  const prompt = [
    '당신은 한국 고등학교 1학년 대상 영어 모의고사 출제위원입니다.',
    '아래 주제로 고1 수준의 영어 독해 지문을 새로 작성하세요.',
    '',
    '주제: ' + topic.trim(),
    '',
    '조건:',
    '- 길이: 영어 단어 100~130개 (전체 글자 수 약 600~800자에 해당). 이 범위를 반드시 지키고 절대 초과하지 말 것',
    '- 난이도: 고등학교 1학년 전국연합학력평가 수준 (수능보다 다소 쉬운 어휘와 문장 구조)',
    '- 설명문 또는 논설문 형식',
    '- 도입(일반적 진술) → 전개(구체적 근거나 예시) → 마무리(주제 재진술)의 구조를 갖출 것',
    '- 명확한 주제문이 한 문장 이상 포함될 것',
    '- 실존 인물, 브랜드명, 시사 논쟁 소재는 사용하지 말 것',
    '- 결과는 영어 지문 본문만 출력할 것. 제목, 설명, 따옴표, 마크다운 기호 없이 순수 텍스트만 출력.',
  ].join('\n');

  try {
    const msg = await anthropic.messages.create({
      model: process.env.MODEL_PASSAGE || 'claude-sonnet-5',
      max_tokens: 550,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (!text) {
      return res.status(502).json({ error: 'empty_completion' });
    }
    return res.status(200).json({ passage: text });
  } catch (err) {
    console.error('passage generation failed', err);
    return res.status(502).json({ error: 'upstream_error' });
  }
}
