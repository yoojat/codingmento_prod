BEGIN;

TRUNCATE TABLE public.lesson_logs RESTART IDENTITY;

WITH src AS (
  SELECT g FROM generate_series(1, 100) g
),
subjects AS (
  SELECT ARRAY[
    '파이썬 변수와 연산자',
    '반복문과 조건문',
    '함수와 모듈 기초',
    '리스트/딕셔너리 자료구조',
    '문자열 처리와 포맷팅',
    '파일 입출력',
    '예외 처리와 디버깅',
    '클래스 없이 객체 사고 훈련',
    '알고리즘 기초: 정렬/탐색',
    '재귀적 사고 연습',
    '라이브러리 사용법 익히기',
    '간단한 게임 로직 설계',
    'API 호출과 데이터 파싱',
    '시각화 기본: 텍스트 기반 그래프',
    '문제 분해와 테스트 작성'
  ]::text[] AS v
),
content_items AS (
  SELECT ARRAY[
    '순차·반복 구조 이해',
    '반복문(for, while) 활용',
    '조건문 분기 설계 연습',
    '사용자 입력 처리',
    '함수와 변수 개념 실습',
    '리스트/딕셔너리 조작',
    '문자열 슬라이싱/포맷팅',
    '간단한 계산기 만들기',
    '파일 읽기/쓰기',
    '예외 처리 try/except',
    '디버깅 흐름 이해',
    '작은 프로젝트 구조화',
    '반복문으로 캐릭터 움직이기',
    '조건에 따른 메시지 분기',
    '퀴즈/게임 로직 완성'
  ]::text[] AS v
),
vibe_items AS (
  SELECT ARRAY[
    '활기찬 분위기속에서 수업 진행',
    '이해와 소통이 유기적으로 이어짐',
    '재미있는 예제로 어려운 내용 쉽게 풀이',
    '스스로 시도하고 피드백을 주고받음',
    '집중력이 점차 향상됨',
    '질문이 활발히 오가며 토론 진행'
  ]::text[] AS v
),
reaction_items AS (
  SELECT ARRAY[
    '수업 전에는 기대와 긴장 공존',
    '"코딩이 어렵진 않을까 걱정돼요."',
    '"반복문 덕분에 캐릭터가 마음대로 움직여요!"',
    '"예외 처리로 오류를 스스로 해결했어요."',
    '"함수로 나누니까 코드가 훨씬 깔끔해요."',
    '"입력에 따라 반응이 달라지는 게 재밌어요!"'
  ]::text[] AS v
),
plan_items AS (
  SELECT ARRAY[
    '미로 탈출 게임 만들기',
    '스프라이트 충돌 감지 기초',
    '나만의 음악 연주 프로그램 제작',
    '텍스트 기반 RPG 로직 확장',
    '간단한 웹 API 데이터 불러오기',
    '입출력/예외 응용 과제 마무리'
  ]::text[] AS v
),
image_urls AS (
  SELECT ARRAY[
    'http://localhost:5173/images/junseo.png',
    'http://localhost:5173/images/boy.png',
    'http://localhost:5173/images/girl.png',
    'http://localhost:5173/images/coding1.jpg',
    'http://localhost:5173/images/coding2.jpg',
    'http://localhost:5173/images/coding3.png'
  ]::text[] AS v
),
profiles_pool AS (
  SELECT profile_id, row_number() OVER (ORDER BY profile_id) AS rn
  FROM public.profiles
),
pool_size AS (
  SELECT COALESCE(max(rn), 0) AS cnt FROM profiles_pool
)
INSERT INTO public.lesson_logs (
  start_at,
  end_at,
  user_id,
  subject,
  content,
  class_vibe,
  student_reaction,
  img_url,
  next_week_plan,
  created_at,
  updated_at
)
SELECT
  (date_trunc('day', now()) - (src.g || ' days')::interval) + time '18:00' AS start_at,
  (date_trunc('day', now()) - (src.g || ' days')::interval) + time '20:00' AS end_at,
  -- g에 따라 프로필 순환 매핑 (프로필이 0개면 NULL)
  u.profile_id AS user_id,
  -- 과목: 배열을 g 기준으로 회전하여 선택
  s.v[((src.g - 1) % array_length(s.v, 1)) + 1] AS subject,
  -- 콘텐츠: g 기준으로 6개 항목 회전 선택 후 줄바꿈으로 합치기
  (
    SELECT string_agg('• ' || ci.v[((src.g + i) % array_length(ci.v, 1)) + 1], E'\n')
    FROM generate_series(0, 5) AS i
  ) AS content,
  -- 수업 분위기: 3개 회전 선택
  (
    SELECT string_agg('- ' || vi.v[((src.g + i) % array_length(vi.v, 1)) + 1], E'\n')
    FROM generate_series(0, 2) AS i
  ) AS class_vibe,
  -- 학생 반응: 3개 회전 선택
  (
    SELECT string_agg(ri.v[((src.g + i) % array_length(ri.v, 1)) + 1], E'\n')
    FROM generate_series(0, 2) AS i
  ) AS student_reaction,
  -- 이미지 URL: g 기반 회전 선택
  iu.v[((src.g - 1) % array_length(iu.v, 1)) + 1] AS img_url,
  -- 다음 주 계획: 3개 회전 선택
  (
    SELECT string_agg('• ' || pi.v[((src.g + i) % array_length(pi.v, 1)) + 1], E'\n')
    FROM generate_series(0, 2) AS i
  ) AS next_week_plan,
  (date_trunc('day', now()) - (src.g || ' days')::interval) + time '20:00' AS created_at,
  (date_trunc('day', now()) - (src.g || ' days')::interval) + time '20:00' AS updated_at
FROM src
CROSS JOIN subjects s
CROSS JOIN content_items ci
CROSS JOIN vibe_items vi
CROSS JOIN reaction_items ri
CROSS JOIN plan_items pi
CROSS JOIN image_urls iu
CROSS JOIN pool_size ps
LEFT JOIN LATERAL (
  SELECT profile_id
  FROM profiles_pool p
  WHERE ps.cnt > 0 AND p.rn = ((src.g - 1) % ps.cnt) + 1
) AS u ON TRUE;

COMMIT;