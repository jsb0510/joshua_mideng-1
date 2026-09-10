import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROBLEMS_TOOL = {
  name: 'return_problems',
  description: 'Return the 4 generated CSAT-style English reading comprehension problems.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['topic', 'grammar'] },
            label: { type: 'string' },
            question: { type: 'string' },
            choices: {
              type: 'array',
              items: { type: 'string' },
              minItems: 5,
              maxItems: 5,
              description: 'Only for type "topic": 5 English answer choices.',
            },
            marked_passage: {
              type: 'string',
              description:
                'Only for type "grammar": the full passage text with exactly five spans marked as [[1 word]] .. [[5 word]], one of which is grammatically wrong.',
            },
            answer: { type: 'integer', minimum: 1, maximum: 5 },
            explanation: { type: 'string', description: 'Explanation written in Korean.' },
          },
          required: ['type', 'label', 'question', 'answer', 'explanation'],
        },
      },
    },
    required: ['items'],
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const { passage } = req.body || {};
  if (typeof passage !== 'string' || !passage.trim()) {
    return res.status(400).json({ error: 'passage_required' });
  }

  const prompt = [
    '당신은 한국 고등학교 1학년 대상 영어 모의고사 출제위원입니다.',
    '아래 지문을 바탕으로 문항 4개를 출제하세요 (주제 계열 2문항 + 어법 2문항).',
    '',
    '[지문]',
    passage.trim(),
    '',
    '[문항 1: 주제] question은 "다음 글의 주제로 가장 적절한 것은?". 선택지 5개는 모두 영어 문장/구.',
    '오답 구성: 지문과 반대되는 진술 1개, 지문의 지엽적 세부사항 1개, 지나치게 포괄적인 진술 1개, 지문과 무관한 진술 1개, 정답 1개(주제문을 재구성).',
    '',
    '[문항 2: 제목] question은 "다음 글의 제목으로 가장 적절한 것은?". 선택지 5개는 영어 제목 형태(간결한 구/명사구)이며, 오답 구성 원리는 문항 1과 동일하게 적용.',
    '',
    '[문항 3, 4: 어법] 각 문항마다 지문에서 서로 다른 5개 구간을 골라 [[번호 내용]] 형식으로 표시 (예: The results [[1 was]] surprising). 두 문항이 고르는 5개 구간은 가능하면 서로 다르게 하되 일부 겹쳐도 무방함.',
    '- 5개 구간 중 정확히 하나만 문법적으로 틀리게 변형하고 나머지 4개는 원문 그대로 올바른 어법을 유지.',
    '- 어법 포인트 후보: 주어-동사 수일치, 능동태/수동태, 관계대명사(that/which/who), to부정사 대 동명사, 분사구문, 병렬구조. 두 문항은 서로 다른 어법 포인트를 사용.',
    '- 오류는 명백하고 규칙적으로 판별 가능해야 하며 절대 애매해서는 안 됨.',
    '- marked_passage 필드에는 지문 전체(오류가 포함된 버전)를 마커 포함하여 그대로 출력.',
    '',
    '[공통] 난이도는 고1 전국연합학력평가 수준으로, 오답의 매력도를 지나치게 높이지 말 것. 정답 번호(1~5)와 한국어 해설을 각 문항에 포함하여 return_problems 도구를 호출하세요.',
  ].join('\n');

  try {
    const msg = await anthropic.messages.create({
      model: process.env.MODEL_PROBLEMS || 'claude-sonnet-5',
      max_tokens: 3000,
      tools: [PROBLEMS_TOOL],
      tool_choice: { type: 'tool', name: 'return_problems' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolUse = msg.content.find((b) => b.type === 'tool_use' && b.name === 'return_problems');
    const data = toolUse && toolUse.input;
    if (!data || !Array.isArray(data.items) || data.items.length !== 4) {
      return res.status(502).json({ error: 'invalid_response' });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('problem generation failed', err);
    return res.status(502).json({ error: 'upstream_error' });
  }
}
