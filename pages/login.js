import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Login() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError('비밀번호가 올바르지 않습니다.');
        setLoading(false);
        return;
      }
      const next = typeof router.query.next === 'string' ? router.query.next : '/';
      router.push(next);
    } catch (err) {
      setError('로그인 중 문제가 발생했습니다. 다시 시도해 주세요.');
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>출제노트 — 로그인</title>
      </Head>
      <div className="login-wrap">
        <form className="login-card card" onSubmit={handleSubmit}>
          <p className="brand">출제노트</p>
          <p className="tagline">전달받은 비밀번호를 입력해 주세요.</p>
          <label className="field-label" htmlFor="pin">비밀번호</label>
          <input
            id="pin"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
            className="pin-input"
          />
          {error && <p className="field-error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '확인 중…' : '입장하기'}
          </button>
        </form>
      </div>
    </>
  );
}
