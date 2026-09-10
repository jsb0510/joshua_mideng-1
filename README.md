# 출제노트

주제 한 줄을 입력하면 고1 수준 영어 지문과 수능형 문항 4개(주제·제목·어법 2문항)를
Claude로 생성하는 도구입니다. **API 비용은 이 앱을 배포한 사람의 Anthropic 키로
서버에서 결제되며**, 링크를 받는 사람은 Claude 계정이 없어도 공유 비밀번호만으로
사용할 수 있습니다.

## 로컬에서 실행하기

```
npm install
copy .env.local.example .env.local   # PowerShell: cp가 아니라 copy
```

`.env.local`을 열어 두 값을 채웁니다.

- `ANTHROPIC_API_KEY` — console.anthropic.com 에서 발급받은 키
- `ACCESS_PIN` — 배포받을 사람들에게 나눠줄 비밀번호 (원하는 문자열)

```
npm run dev
```

http://localhost:3000 접속 → `ACCESS_PIN`으로 로그인 → 사용.

## Vercel에 배포하기

1. **GitHub에 올리기** (Vercel이 저장소를 보고 자동 배포하는 방식이 가장 간편합니다)
   ```
   git init
   git add .
   git commit -m "출제노트 초기 배포"
   ```
   GitHub에서 새 저장소를 만들고 `git remote add origin ...` 후 `git push -u origin main`.

2. **Vercel에서 Import**
   - vercel.com 로그인 → "Add New… → Project" → 방금 만든 저장소 선택 → Import
   - Framework Preset은 Next.js로 자동 인식됩니다.

3. **환경변수 등록** (Project Settings → Environment Variables)
   - `ANTHROPIC_API_KEY` = 본인 API 키
   - `ACCESS_PIN` = 배포용 비밀번호
   - (선택) `MODEL_PASSAGE`, `MODEL_PROBLEMS` — 모델을 바꾸고 싶을 때만

4. **Deploy** 클릭 → 완료되면 `https://프로젝트이름.vercel.app` 링크가 생성됩니다.
   이 링크와 `ACCESS_PIN`을 배포하고 싶은 인원에게 전달하면 됩니다.

CLI로 바로 배포하고 싶다면 GitHub 없이도 가능합니다:
```
npm install -g vercel
vercel login
vercel          # 첫 배포 (질문에 기본값으로 답하면 됩니다)
vercel env add ANTHROPIC_API_KEY production
vercel env add ACCESS_PIN production
vercel --prod
```

## 비밀번호(PIN) 바꾸기

Vercel 프로젝트 설정에서 `ACCESS_PIN` 값을 바꾸고 재배포하면, 기존에 로그인해
쿠키를 받은 사람들도 다음 요청부터 다시 로그인해야 합니다. 인원 교체 시 이렇게
갱신하세요.

## PDF로 저장하기

지문·문항 화면에서 "PDF로 저장 / 인쇄" 버튼을 누르면 브라우저 인쇄 대화상자가
뜹니다. "PDF로 저장"을 대상 프린터로 선택하면 파일로 저장됩니다.
"정답·해설 포함하여 인쇄" 체크박스로 학생용(정답 없음)과 교사용(정답 포함) 출력을
구분할 수 있습니다.

## 비용 관련 주의

- 생성 1회(지문 1회 + 문항 1회)당 Anthropic API 사용량이 과금됩니다. 사용량은
  console.anthropic.com 대시보드에서 확인·한도 설정이 가능합니다.
- 이 최소 구성에는 별도의 사용량 제한(rate limit) 로직이 없습니다. 배포 인원이
  많아지거나 남용이 우려되면 사용량 상한 알림을 Anthropic 콘솔에 설정해 두는 것을
  권장합니다.

## 구조

```
middleware.js       모든 페이지/HTTP API 요청 전에 PIN 로그인 쿠키를 검사
pages/login.js       PIN 입력 화면
pages/index.js        메인 도구 화면 (지문 생성 → 문제 생성 → 채점 → 인쇄)
pages/api/login.js    PIN 확인 후 로그인 쿠키 발급
pages/api/logout.js   로그인 쿠키 삭제
pages/api/passage.js  Claude에 지문 생성 요청 (서버에서 API 키 사용)
pages/api/problems.js Claude에 문항 4개 생성 요청 (구조화 출력 강제)
styles/globals.css    디자인 토큰 및 전체 스타일 (인쇄 스타일 포함)
```
