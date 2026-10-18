import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const DECK_KEY = 'fc_deck_v1';
const PROGRESS_KEY = 'fc_progress_v1';

const SAMPLE_TEXT = `abandon | 버리다, 포기하다 | They had to abandon the car in the snow.
reluctant | 꺼리는, 마지못한 | She was reluctant to admit her mistake.
consequence | 결과, 영향 | Every choice has a consequence.
inevitable | 피할 수 없는, 필연적인 | Change is inevitable in any organization.
sustain | 유지하다, 지속하다 | It is hard to sustain motivation for a long time.
diligent | 성실한, 부지런한 | He is a diligent student who never misses class.
obscure | 모호한, 잘 알려지지 않은 | The meaning of the poem is obscure.
contribute | 기여하다, 공헌하다 | Everyone contributed ideas to the project.
anxiety | 불안, 걱정 | Exercise can reduce anxiety and stress.
humble | 겸손한 | Despite his success, he remained humble.`;

function readJSON(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode); progress just won't persist.
  }
}

// One card per line: "word | 뜻 | example". Tabs (pasted from Excel/Sheets) also work.
function parseDeck(text) {
  const cards = [];
  const errors = [];
  const seen = new Set();
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const cols = (line.includes('\t') ? line.split('\t') : line.split('|')).map((c) => c.trim());
    const [word, meaning, ...rest] = cols;
    const example = rest.join(' | ').trim();
    if (!word || !meaning || !example) {
      errors.push(i + 1);
      return;
    }
    const id = word.toLowerCase();
    if (seen.has(id)) return;
    seen.add(id);
    cards.push({ id, word, meaning, example });
  });
  return { cards, errors };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Finds the word (or an inflected form like abandoned / contributed / studies)
// in the example and splits the sentence around it.
function blankExample(word, example) {
  const w = word.trim();
  const stems = [w];
  if (/[ey]$/i.test(w) && w.length > 3) stems.push(w.slice(0, -1));
  for (const stem of stems) {
    const re = new RegExp(`\\b${escapeRegExp(stem)}[a-z]*`, 'i');
    const m = re.exec(example);
    if (m) {
      return {
        before: example.slice(0, m.index),
        answer: m[0],
        after: example.slice(m.index + m[0].length),
      };
    }
  }
  return null;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newProgress(cards, known, doShuffle) {
  const ids = cards.map((c) => c.id).filter((id) => !known.includes(id));
  return { round: 1, queue: doShuffle ? shuffle(ids) : ids, index: 0, unknown: [], known, shuffle: doShuffle };
}

function normalize(s) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function DeckEditor({ initialText, onSave, onCancel }) {
  const [text, setText] = useState(initialText);
  const { cards, errors } = useMemo(() => parseDeck(text), [text]);

  return (
    <section className="card">
      <label className="field-label" htmlFor="deckInput">단어 목록 입력</label>
      <p className="hint fc-format">
        한 줄에 한 단어씩 <code>영어단어 | 한글 뜻 | 예문</code> 형식으로 입력하세요.
        엑셀·구글시트에서 세 칸을 복사해 붙여넣어도 됩니다.
      </p>
      <textarea
        id="deckInput"
        className="fc-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'abandon | 버리다, 포기하다 | They had to abandon the car in the snow.'}
        spellCheck={false}
      />
      <div className="meta-row">
        <div className="meta-left">
          <span className="char-count">{cards.length}개 인식</span>
          {errors.length > 0 && (
            <span className="field-error fc-inline-error">
              형식 오류 {errors.length}줄 (줄 번호: {errors.slice(0, 8).join(', ')}
              {errors.length > 8 ? ' …' : ''})
            </span>
          )}
          <button className="link-btn" onClick={() => setText(SAMPLE_TEXT)}>예시 10개 불러오기</button>
        </div>
        <div className="meta-left">
          {onCancel && <button className="btn btn-ghost" onClick={onCancel}>취소</button>}
          <button className="btn btn-primary" disabled={cards.length === 0} onClick={() => onSave(text, cards)}>
            저장하고 시작
          </button>
        </div>
      </div>
    </section>
  );
}

function StudyCard({ card, onMark }) {
  const [flipped, setFlipped] = useState(false);
  const [guess, setGuess] = useState('');
  const [checked, setChecked] = useState(false);
  const inputRef = useRef(null);

  const blank = useMemo(() => blankExample(card.word, card.example), [card]);
  const isCorrect =
    checked && (normalize(guess) === normalize(card.word) || (blank && normalize(guess) === normalize(blank.answer)));

  function check() {
    if (!guess.trim()) {
      inputRef.current?.focus();
      return;
    }
    setChecked(true);
    setFlipped(true);
  }

  const hintLen = (blank ? blank.answer : card.word).length;

  return (
    <>
      <button
        type="button"
        className={'fc-card' + (flipped ? ' is-flipped' : '')}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? '앞면(한글 뜻)으로 뒤집기' : '뒷면(영어 예문)으로 뒤집기'}
      >
        <span className="fc-inner">
          <span className="fc-face fc-front">
            <span className="fc-side-label">한글 뜻</span>
            <span className="fc-meaning">{card.meaning}</span>
            <span className="fc-tap">탭하여 뒤집기 · 영어 예문 보기</span>
          </span>
          <span className="fc-face fc-back">
            <span className="fc-side-label">English · 빈칸에 들어갈 단어는?</span>
            <span className="fc-example">
              {blank ? (
                <>
                  {blank.before}
                  <span className={'fc-blank' + (checked ? (isCorrect ? ' ok' : ' no') : '')}>
                    {checked ? blank.answer : ' '.repeat(Math.max(6, hintLen))}
                  </span>
                  {blank.after}
                </>
              ) : (
                card.example
              )}
            </span>
            {!blank && <span className="fc-tap">예문에서 단어를 찾지 못해 빈칸 없이 표시합니다.</span>}
            <span className="fc-tap">({hintLen}글자)</span>
          </span>
        </span>
      </button>

      <div className="card fc-answer">
        <label className="field-label" htmlFor="guessInput">영어 단어 쓰기</label>
        <div className="topic-row">
          <input
            id="guessInput"
            ref={inputRef}
            type="text"
            value={guess}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={checked}
            placeholder="정답을 입력하세요"
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && check()}
          />
          {!checked && (
            <button className="btn btn-primary" onClick={check}>정답 확인</button>
          )}
        </div>
        {checked && (
          <p className={'fc-result ' + (isCorrect ? 'ok' : 'no')}>
            {isCorrect ? '정답입니다! ' : '아쉬워요. '}
            정답: <strong>{card.word}</strong>
          </p>
        )}

        <div className="fc-mark-row">
          <button className="fc-mark fc-mark-known" onClick={() => onMark(true)}>
            <span className="fc-box" aria-hidden="true">✓</span>
            아는 단어
            <span className="fc-mark-sub">다시 안 나와요</span>
          </button>
          <button className="fc-mark fc-mark-unknown" onClick={() => onMark(false)}>
            <span className="fc-box" aria-hidden="true">✕</span>
            모르는 단어
            <span className="fc-mark-sub">이번 회차 끝나고 다시</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function Flashcards() {
  const [loaded, setLoaded] = useState(false);
  const [deckText, setDeckText] = useState('');
  const [cards, setCards] = useState([]);
  const [progress, setProgress] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const deck = readJSON(DECK_KEY);
    if (deck && Array.isArray(deck.cards) && deck.cards.length) {
      setDeckText(deck.text || '');
      setCards(deck.cards);
      const saved = readJSON(PROGRESS_KEY);
      setProgress(saved && Array.isArray(saved.queue) ? saved : newProgress(deck.cards, [], true));
    } else {
      setEditing(true);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded && progress) writeJSON(PROGRESS_KEY, progress);
  }, [loaded, progress]);

  const byId = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);

  function saveDeck(text, newCards) {
    const ids = new Set(newCards.map((c) => c.id));
    // Keep "known" marks for words that are still in the edited list.
    const known = (progress?.known || []).filter((id) => ids.has(id));
    const p = newProgress(newCards, known, progress?.shuffle ?? true);
    writeJSON(DECK_KEY, { text, cards: newCards });
    setDeckText(text);
    setCards(newCards);
    setProgress(p);
    setEditing(false);
  }

  function mark(isKnown) {
    setProgress((p) => {
      const id = p.queue[p.index];
      const known = isKnown ? [...p.known, id] : p.known;
      const unknown = isKnown ? p.unknown : [...p.unknown, id];
      const next = p.index + 1;
      if (next < p.queue.length) return { ...p, known, unknown, index: next };
      // Round finished: words marked "모르는 단어" become the next round.
      return {
        ...p,
        known,
        unknown: [],
        queue: p.shuffle ? shuffle(unknown) : unknown,
        index: 0,
        round: unknown.length ? p.round + 1 : p.round,
      };
    });
  }

  function restartAll() {
    if (!window.confirm('"아는 단어" 기록을 모두 지우고 처음부터 다시 시작할까요?')) return;
    setProgress(newProgress(cards, [], progress?.shuffle ?? true));
  }

  function toggleShuffle(on) {
    setProgress((p) => {
      const rest = p.queue.slice(p.index);
      const reordered = on ? shuffle(rest) : cards.map((c) => c.id).filter((id) => rest.includes(id));
      return { ...p, shuffle: on, queue: [...p.queue.slice(0, p.index), ...reordered] };
    });
  }

  const current = progress && progress.queue[progress.index] ? byId[progress.queue[progress.index]] : null;
  const allDone = progress && progress.queue.length === 0;

  return (
    <>
      <Head>
        <title>단어 플립카드</title>
      </Head>
      <div className="wrap">
        <header className="top">
          <span className="brand">단어 플립카드</span>
          <span className="tagline">한글 뜻 → 영어 예문 빈칸 추론 → 스펠링 쓰기</span>
          <Link href="/" className="link-btn logout-btn">출제노트로</Link>
        </header>

        {!loaded ? null : editing ? (
          <DeckEditor
            initialText={deckText}
            onSave={saveDeck}
            onCancel={cards.length ? () => setEditing(false) : null}
          />
        ) : (
          <>
            <section className="fc-stats">
              <div className="fc-stat">
                <span className="fc-stat-num">{progress.round}</span>
                <span className="fc-stat-label">회차</span>
              </div>
              <div className="fc-stat">
                <span className="fc-stat-num">
                  {allDone ? 0 : progress.index + 1}/{progress.queue.length}
                </span>
                <span className="fc-stat-label">이번 회차</span>
              </div>
              <div className="fc-stat">
                <span className="fc-stat-num">{progress.unknown.length}</span>
                <span className="fc-stat-label">다시 볼 단어</span>
              </div>
              <div className="fc-stat">
                <span className="fc-stat-num">{progress.known.length}/{cards.length}</span>
                <span className="fc-stat-label">외운 단어</span>
              </div>
            </section>
            <div className="fc-progress" aria-hidden="true">
              <span style={{ width: `${(progress.known.length / cards.length) * 100}%` }} />
            </div>

            {progress.index === 0 && progress.round > 1 && !allDone && (
              <p className="fc-round-note">
                {progress.round - 1}회차 완료! 모르는 단어 {progress.queue.length}개로 {progress.round}회차를 시작합니다.
              </p>
            )}

            {allDone ? (
              <section className="card fc-done">
                <p className="brand">🎉 모두 외웠어요!</p>
                <p>{cards.length}개 단어를 {progress.round}회차 만에 모두 &lsquo;아는 단어&rsquo;로 체크했습니다.</p>
                <div className="fc-done-actions">
                  <button className="btn btn-primary" onClick={restartAll}>처음부터 다시</button>
                  <button className="btn btn-ghost" onClick={() => setEditing(true)}>새 단어 입력</button>
                </div>
              </section>
            ) : (
              current && <StudyCard key={`${progress.round}-${progress.index}-${current.id}`} card={current} onMark={mark} />
            )}

            <div className="submit-row">
              <label className="print-toggle fc-shuffle">
                <input type="checkbox" checked={!!progress.shuffle} onChange={(e) => toggleShuffle(e.target.checked)} />
                순서 섞기
              </label>
              <button className="btn btn-ghost" onClick={() => setEditing(true)}>단어 목록 편집</button>
              <button className="btn btn-ghost" onClick={restartAll}>학습 기록 초기화</button>
            </div>
          </>
        )}

        <p className="footnote">학습 기록은 이 브라우저에만 저장됩니다. 다른 기기에서는 처음부터 시작합니다.</p>
      </div>
    </>
  );
}
