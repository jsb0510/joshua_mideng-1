import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const CIRCLED = ['①', '②', '③', '④', '⑤'];

const EXAMPLE_PASSAGE =
  "In recent years, many consumers have started to think carefully about the environmental impact of their daily purchases. This change has been driven mainly by growing concern about climate change and limited natural resources. In response, companies have begun redesigning their packaging, using recycled materials, and sharing information about how their products are made. Surveys show, however, that people often say they prefer eco-friendly products, yet they still choose cheaper options at checkout. This difference between what consumers believe and what they actually do suggests that green labels alone are not enough to change shopping habits. Real change will happen only when sustainable products become affordable and convenient enough that shoppers no longer face a difficult choice.";

const EXAMPLE_ITEMS = [
  {
    type: 'topic',
    label: '주제',
    question: '다음 글의 주제로 가장 적절한 것은?',
    choices: [
      'reasons why companies redesign their packaging',
      'the shrinking global supply of natural resources',
      "the gap between consumers' environmental values and their actual buying choices",
      'how climate change has raised public awareness worldwide',
      'the history of eco-friendly packaging in the retail industry',
    ],
    answer: 3,
    explanation:
      "이 글은 소비자들이 친환경 제품을 선호한다고 말하면서도 실제 구매 시에는 더 저렴한 제품을 선택하는 '가치와 행동의 차이'를 다루며, 마지막 문장에서 가격과 편의성이 갖춰져야 실질적인 변화가 가능하다고 재진술합니다. 따라서 정답은 ③입니다. 나머지 선택지는 지문의 세부사항이거나 지문과 무관한 내용입니다.",
  },
  {
    type: 'topic',
    label: '제목',
    question: '다음 글의 제목으로 가장 적절한 것은?',
    choices: [
      'Why Companies Redesign Their Packaging',
      'The Shrinking Supply of Natural Resources',
      'Green Values, Cheaper Choices: The Consumer Gap',
      'Climate Change and Public Awareness',
      'A Brief History of Sustainable Packaging',
    ],
    answer: 3,
    explanation:
      "이 글의 핵심은 소비자가 내세우는 친환경 가치와 실제 구매 행동 사이의 차이이므로, 이를 압축적으로 표현한 ③ 'Green Values, Cheaper Choices: The Consumer Gap'이 제목으로 가장 적절합니다. 나머지 선택지는 지문의 일부 내용만 다루거나 지문과 관련이 없습니다.",
  },
  {
    type: 'grammar',
    label: '어법',
    question: '다음 밑줄 친 부분 중, 어법상 틀린 것은?',
    marked_passage:
      'In recent years, many consumers [[1 have started]] to think carefully about the environmental impact of their daily purchases. This change [[2 has been driven]] mainly by growing concern about climate change and limited natural resources. In response, companies have begun redesigning their packaging, using recycled materials, and sharing information about how their products are made. Surveys show, however, that people often say they prefer eco-friendly products, yet they still [[3 choose]] cheaper options at checkout. This difference between what consumers believe and what they actually do [[4 suggest]] that green labels alone are not enough to change shopping habits. Real change will happen only when sustainable products [[5 become]] affordable and convenient enough that shoppers no longer face a difficult choice.',
    answer: 4,
    explanation:
      "밑줄 친 문장의 주어는 'This difference'이며, 'between A and B'는 주어를 꾸며주는 전치사구일 뿐 주어의 수에는 영향을 주지 않습니다. 따라서 단수 주어에 맞춰 동사도 'suggests'가 되어야 하므로 'suggest'는 어법상 틀린 표현입니다. 정답은 ④입니다. 나머지 밑줄은 모두 올바른 어법입니다: ①은 현재완료 'have started', ②는 수동태 'has been driven', ③은 앞의 'say'와 시제가 일치하는 'choose', ⑤는 복수 주어 'sustainable products'에 맞는 복수동사 'become'입니다.",
  },
  {
    type: 'grammar',
    label: '어법',
    question: '다음 밑줄 친 부분 중, 어법상 틀린 것은?',
    marked_passage:
      'In recent years, many consumers have started to think carefully about the environmental impact of their daily purchases. This change has been driven mainly by growing concern about climate change and limited natural resources. In response, companies have begun [[1 redesigning]] their packaging, [[2 using]] recycled materials, and [[3 share]] information about how their products are made. Surveys show, however, that people often say they prefer eco-friendly products, yet they still choose cheaper options at checkout. This difference between what consumers believe and what they actually do [[4 suggests]] that green labels alone are not enough to change shopping habits. Real change will happen only when sustainable products become affordable and convenient enough that shoppers no longer [[5 face]] a difficult choice.',
    answer: 3,
    explanation:
      "밑줄 친 부분은 'redesigning, using, share'로 이어지는 병렬구조인데, 앞의 두 동명사 'redesigning', 'using'에 맞춰 세 번째 요소도 동명사 'sharing'이 되어야 합니다. 'share'는 병렬구조를 깨뜨리므로 어법상 틀린 표현이며 정답은 ③입니다. 나머지 밑줄은 모두 올바른 어법입니다: ①,②는 병렬구조를 이루는 동명사이고, ④는 단수 주어 'This difference'에 맞는 단수동사 'suggests', ⑤는 복수 주어 'shoppers'에 맞는 복수동사 'face'입니다.",
  },
];

function charLen(text) {
  return text.trim().length;
}

function parseMarkedPassage(str) {
  const parts = [];
  const re = /\[\[\s*(\d)\s+([\s\S]*?)\]\]/g;
  let last = 0;
  let m;
  while ((m = re.exec(str))) {
    if (m.index > last) parts.push({ type: 'text', value: str.slice(last, m.index) });
    parts.push({ type: 'u', num: Number(m[1]), value: m[2] });
    last = re.lastIndex;
  }
  if (last < str.length) parts.push({ type: 'text', value: str.slice(last) });
  return parts;
}

function GrammarPassage({ marked }) {
  const parts = useMemo(() => parseMarkedPassage(marked), [marked]);
  return (
    <p className="passage-text grammar-passage">
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <span key={i}>{part.value}</span>
        ) : (
          <span className="ugroup" key={i}>
            <sup>{CIRCLED[part.num - 1] || `(${part.num})`}</sup>
            <u>{part.value}</u>
          </span>
        )
      )}
    </p>
  );
}

function ProblemCard({ item, idx, isExample, selected, submitted, revealed, onSelect, onToggleReveal }) {
  const optionCount = item.type === 'grammar' ? 5 : (item.choices || []).length;

  return (
    <div className={'problem' + (revealed ? ' is-revealed' : '')}>
      <div className="problem-head">
        <span className="problem-num">{idx + 1}</span>
        <span className="problem-type">{item.label}</span>
        <span className="problem-score">[25점]</span>
        {isExample && <span className="badge-example">예시</span>}
      </div>
      <p className="problem-q">{item.question}</p>

      {item.type === 'grammar' ? (
        <>
          <div className="passage-sheet">
            <GrammarPassage marked={item.marked_passage} />
          </div>
          <p className="bubble-row-label">어법상 틀린 곳의 번호를 선택하세요.</p>
          <div className="bubble-row">
            {Array.from({ length: optionCount }, (_, i) => i + 1).map((n) => {
              const isCorrect = submitted && n === item.answer;
              const isWrong = submitted && n === selected && n !== item.answer;
              return (
                <label
                  key={n}
                  className={'choice-row' + (isCorrect ? ' is-correct' : '') + (isWrong ? ' is-wrong' : '')}
                >
                  <input
                    type="radio"
                    className="bubble-input"
                    name={'q' + idx}
                    value={n}
                    checked={selected === n}
                    disabled={submitted}
                    onChange={() => onSelect(idx, n)}
                  />
                  <span className="bubble">{CIRCLED[n - 1]}</span>
                </label>
              );
            })}
          </div>
        </>
      ) : (
        <div className="choices-list">
          {(item.choices || []).slice(0, 5).map((text, i) => {
            const n = i + 1;
            const isCorrect = submitted && n === item.answer;
            const isWrong = submitted && n === selected && n !== item.answer;
            return (
              <label
                key={n}
                className={'choice-row' + (isCorrect ? ' is-correct' : '') + (isWrong ? ' is-wrong' : '')}
              >
                <input
                  type="radio"
                  className="bubble-input"
                  name={'q' + idx}
                  value={n}
                  checked={selected === n}
                  disabled={submitted}
                  onChange={() => onSelect(idx, n)}
                />
                <span className="bubble">{CIRCLED[n - 1]}</span>
                <span className="choice-text">{text}</span>
              </label>
            );
          })}
        </div>
      )}

      <details className="reveal" open={revealed} onToggle={(e) => onToggleReveal(idx, e.target.open)}>
        <summary>해설보기</summary>
        <div className="answer-box">
          <p className="ans">정답: {CIRCLED[item.answer - 1]}</p>
          <p className="expl">{item.explanation}</p>
        </div>
      </details>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [topic, setTopic] = useState('친환경 소비와 소비자 행동');
  const [topicError, setTopicError] = useState(false);

  const [passage, setPassage] = useState(EXAMPLE_PASSAGE);
  const [isExamplePassage, setIsExamplePassage] = useState(true);
  const [passageLoading, setPassageLoading] = useState(false);
  const [passageError, setPassageError] = useState('');

  const [items, setItems] = useState(EXAMPLE_ITEMS);
  const [isExampleItems, setIsExampleItems] = useState(true);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [problemsError, setProblemsError] = useState('');

  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [warnUnanswered, setWarnUnanswered] = useState(false);
  const [printAnswers, setPrintAnswers] = useState(false);

  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      router.push('/login');
      throw new Error('unauthorized');
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'request_failed');
    }
    return data;
  }

  async function generatePassage() {
    if (!topic.trim()) {
      setTopicError(true);
      return;
    }
    setTopicError(false);
    setPassageLoading(true);
    setPassageError('');
    try {
      const data = await postJSON('/api/passage', { topic: topic.trim() });
      setPassage(data.passage);
      setIsExamplePassage(false);
    } catch (err) {
      if (err.message !== 'unauthorized') {
        setPassageError('지문 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setPassageLoading(false);
    }
  }

  async function generateProblems() {
    if (!passage) return;
    setProblemsLoading(true);
    setProblemsError('');
    try {
      const data = await postJSON('/api/problems', { passage });
      setItems(data.items);
      setIsExampleItems(false);
      setAnswers({});
      setRevealed({});
      setSubmitted(false);
      setWarnUnanswered(false);
    } catch (err) {
      if (err.message !== 'unauthorized') {
        setProblemsError('문항 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setProblemsLoading(false);
    }
  }

  function handleSelect(idx, value) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [idx]: value }));
  }

  function handleToggleReveal(idx, open) {
    setRevealed((r) => ({ ...r, [idx]: open }));
  }

  function handleSubmit() {
    const unanswered = items.some((_, idx) => !answers[idx]);
    if (unanswered) {
      setWarnUnanswered(true);
      return;
    }
    setWarnUnanswered(false);
    setSubmitted(true);
  }

  function handleReset() {
    setAnswers({});
    setSubmitted(false);
    setWarnUnanswered(false);
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  }

  const scored = useMemo(() => {
    if (!submitted) return null;
    let correct = 0;
    const breakdown = items.map((item, idx) => {
      const ok = answers[idx] === item.answer;
      if (ok) correct++;
      return `${idx + 1}번 ${ok ? '정답' : '오답'}`;
    });
    return {
      score: Math.round((correct / items.length) * 100),
      correct,
      total: items.length,
      breakdown: breakdown.join(' · '),
    };
  }, [submitted, answers, items]);

  const charCount = charLen(passage);

  return (
    <>
      <Head>
        <title>출제노트</title>
      </Head>
      <div className={'wrap' + (printAnswers ? ' print-answers' : '')}>
        <header className="top">
          <span className="brand">출제노트</span>
          <span className="tagline">주제 한 줄로 고1 수준 영어 지문과 문항 4개를 만드는 도구</span>
          <button className="link-btn no-print logout-btn" onClick={handleLogout}>
            로그아웃
          </button>
        </header>

        <section className="card no-print">
          <label className="field-label" htmlFor="topicInput">주제</label>
          <div className="topic-row">
            <input
              id="topicInput"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generatePassage()}
            />
            <button className="btn btn-primary" onClick={generatePassage} disabled={passageLoading}>
              지문 생성
            </button>
          </div>
          <p className="hint">목표 분량: 영어 지문 600~800자 이내(공백 포함) · 난이도: 고1 전국연합학력평가 수준</p>
          {topicError && <p className="field-error">주제를 입력해 주세요.</p>}
          {passageLoading && (
            <div className="status-line">
              <span>Claude가 지문을 구상하고 있습니다</span>
              <span className="dots" />
            </div>
          )}
          {passageError && <div className="error-box">{passageError}</div>}
        </section>

        <section className="card">
          <div className="passage-head">
            <p className="passage-instruction">다음 글을 읽고, 물음에 답하시오.</p>
            {isExamplePassage && <span className="badge-example no-print">예시</span>}
          </div>
          <div className="passage-sheet">
            <p className="passage-text">{passage}</p>
          </div>
          <div className="meta-row no-print">
            <div className="meta-left">
              <span className={'char-count' + (charCount > 800 ? ' over' : '')}>{charCount}자</span>
              <button className="link-btn" onClick={generatePassage} disabled={isExamplePassage || passageLoading}>
                다시 생성
              </button>
            </div>
            <button className="btn btn-primary" onClick={generateProblems} disabled={isExamplePassage || problemsLoading}>
              문제 생성
            </button>
          </div>
          {problemsLoading && (
            <div className="status-line no-print">
              <span>Claude가 문항을 설계하고 있습니다</span>
              <span className="dots" />
            </div>
          )}
          {problemsError && <div className="error-box no-print">{problemsError}</div>}
        </section>

        <section className="card">
          <div id="problemsList">
            {items.map((item, idx) => (
              <ProblemCard
                key={idx}
                item={item}
                idx={idx}
                isExample={isExampleItems}
                selected={answers[idx]}
                submitted={submitted}
                revealed={!!revealed[idx]}
                onSelect={handleSelect}
                onToggleReveal={handleToggleReveal}
              />
            ))}
          </div>

          <div className="submit-row no-print">
            {!submitted ? (
              <button className="btn btn-primary" onClick={handleSubmit}>
                답안 제출
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={handleReset}>
                다시 풀기
              </button>
            )}
            <label className="print-toggle">
              <input
                type="checkbox"
                checked={printAnswers}
                onChange={(e) => setPrintAnswers(e.target.checked)}
              />
              정답·해설 포함하여 인쇄
            </label>
            <button className="btn btn-ghost" onClick={() => window.print()}>
              PDF로 저장 / 인쇄
            </button>
          </div>

          {warnUnanswered && <p className="warn-line no-print">모든 문항에 답을 선택해 주세요.</p>}

          {scored && (
            <div className="score-result no-print">
              <div>
                <span className="score-num">{scored.score}점</span>{' '}
                <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>/ 100점</span>
              </div>
              <div className="score-breakdown">
                {scored.correct}/{scored.total}문항 정답 · {scored.breakdown}
              </div>
            </div>
          )}
        </section>

        <p className="footnote no-print">
          Claude가 생성한 지문·문항에는 오류가 있을 수 있습니다. 수업에 사용하기 전에 반드시 검토해 주세요.
        </p>
      </div>
    </>
  );
}
