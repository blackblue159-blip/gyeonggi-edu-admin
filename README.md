# gyeonggi-edu-admin
경기도 교육행정직 공무원을 위한 업무 도구 모음

## 다른 PC(집·사무실)에서 이어서 개발하기

1. 저장소 클론: `git clone https://github.com/blackblue159-blip/gyeonggi-edu-admin.git`
2. 폴더 이동 후 의존성 설치: `cd gyeonggi-edu-admin` → `npm install`
3. 환경 변수: `.env.example`을 복사해 `.env`로 저장하고 `VITE_NEIS_API_KEY` 등 필요한 값 입력
4. 개발 서버: `npm run dev`

이미 클론한 PC에서는 `git pull origin main` 후 `npm install`(의존성 변경 시)만 하면 됩니다.
