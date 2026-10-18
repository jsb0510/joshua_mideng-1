import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const DECK_KEY = 'fc_deck_v1';
const PROGRESS_KEY = 'fc_progress_v1';

// 중3 수준 예시 단어 50개
const SAMPLE_TEXT = `achieve | 이루다, 성취하다 | She worked hard to achieve her goal.
advice | 조언, 충고 | My teacher gave me good advice about my future.
allow | 허락하다 | My parents allow me to play games on weekends.
anxious | 불안해하는, 걱정하는 | I felt anxious before the final exam.
appreciate | 감사하다, 진가를 알다 | I really appreciate your help.
avoid | 피하다 | You should avoid eating too much fast food.
behavior | 행동 | His behavior in class has improved a lot.
brave | 용감한 | The brave firefighter saved the child.
citizen | 시민 | Every citizen has the right to vote.
compare | 비교하다 | Don't compare yourself with others.
confident | 자신감 있는 | She looked confident during her speech.
consider | 고려하다, 여기다 | Please consider my suggestion carefully.
curious | 호기심 많은 | Children are curious about everything around them.
decide | 결정하다 | We decided to go camping this weekend.
depend | 의존하다, ~에 달려 있다 | Our plan depends on the weather.
disappear | 사라지다 | The sun disappeared behind the clouds.
effort | 노력 | Learning a language takes a lot of effort.
encourage | 격려하다 | My coach always encourages us to do our best.
environment | 환경 | We must protect the environment for the future.
experience | 경험; 경험하다 | Traveling abroad was a great experience for me.
explain | 설명하다 | Can you explain this math problem to me?
familiar | 익숙한, 친숙한 | This song sounds familiar to me.
fault | 잘못, 책임 | It's not your fault that the game was canceled.
forgive | 용서하다 | Please forgive me for being late.
gather | 모으다, 모이다 | People gathered in the park to watch the fireworks.
honest | 정직한 | An honest person always tells the truth.
imagine | 상상하다 | Can you imagine life without smartphones?
improve | 향상시키다, 개선하다 | Reading every day will improve your English.
include | 포함하다 | The price includes breakfast.
independent | 독립적인 | I want to be independent from my parents someday.
invent | 발명하다 | Who invented the telephone?
jealous | 질투하는 | He was jealous of his brother's new bike.
lack | 부족; 부족하다 | A lack of sleep can make you tired.
manage | 관리하다, 간신히 해내다 | She managed to finish her homework before dinner.
mistake | 실수 | Everyone makes mistakes when they learn something new.
necessary | 필요한 | Water is necessary for all living things.
opinion | 의견 | In my opinion, the movie was too long.
patient | 참을성 있는; 환자 | Be patient. The bus will come soon.
polite | 예의 바른 | It is polite to say thank you when someone helps you.
prepare | 준비하다 | We are preparing for the school festival.
protect | 보호하다 | Wear a helmet to protect your head.
recently | 최근에 | I recently started learning the guitar.
recognize | 알아보다 | I didn't recognize her with her new hairstyle.
recycle | 재활용하다 | We should recycle plastic bottles and cans.
regret | 후회하다; 후회 | I regret not studying harder last year.
responsible | 책임 있는 | You are responsible for cleaning your own room.
solve | 해결하다, 풀다 | Let's work together to solve this problem.
survive | 살아남다 | Camels can survive for days without water.
volunteer | 자원봉사하다; 자원봉사자 | She volunteers at the animal shelter every Saturday.
waste | 낭비하다; 쓰레기 | Don't waste your time on useless things.`;

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
          <button className="link-btn" onClick={() => setText(SAMPLE_TEXT)}>중3 예시 단어 50개 불러오기</button>
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
            initialText={deckText || SAMPLE_TEXT}
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
