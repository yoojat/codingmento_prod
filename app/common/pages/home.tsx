import type { MetaFunction } from "react-router";
import { Hero } from "../components/wemake/cm-hero";

export const meta: MetaFunction = () => {
  return [
    { title: "홈 | 코딩멘토" },
    {
      name: "description",
      content: "코딩멘토는 실시간 코딩교유을 제공하는 플랫폼입니다.",
    },
  ];
};

export default function HomePage() {
  // 1) 스케줄 데이터를 미리 정의합니다.
  const scheduleData = [
    {
      day: "월요일",
      time: "16:00-17:50",
      classType: "블록코딩",
      teacher: "김태영",
    },
    {
      day: "월요일",
      time: "18:00~19:50",
      classType: "파이썬 코딩",
      teacher: "김태영",
    },
    {
      day: "월요일",
      time: "20:00~21:50",
      classType: "파이썬 코딩 프로젝트",
      teacher: "김태영",
    },
    {
      day: "화요일",
      time: "16:00-17:50",
      classType: "블록코딩 자격증",
      teacher: "김태영",
    },
    {
      day: "화요일",
      time: "18:00~19:50",
      classType: "파이썬 코딩 자격증",
      teacher: "김태영",
    },
    {
      day: "화요일",
      time: "20:00~21:50",
      classType: "데이터분석 및 인공지능",
      teacher: "김태영",
    },
    {
      day: "수요일",
      time: "16:00-17:50",
      classType: "블록코딩",
      teacher: "김태영",
    },
    {
      day: "수요일",
      time: "18:00~19:50",
      classType: "파이썬 코딩",
      teacher: "김태영",
    },
    {
      day: "수요일",
      time: "20:00~21:50",
      classType: "파이썬 데이터분석 및 인공지능",
      teacher: "김태영",
    },
    {
      day: "목요일",
      time: "16:00-17:50",
      classType: "블록코딩 인공지능 자격증",
      teacher: "김태영",
    },
    {
      day: "목요일",
      time: "18:00~19:50",
      classType: "파이썬 코딩 프로젝트",
      teacher: "김태영",
    },
    {
      day: "목요일",
      time: "20:00~21:50",
      classType: "파이썬 코딩 프로젝트",
      teacher: "김태영",
    },
    {
      day: "금요일",
      time: "16:00-17:50",
      classType: "블록코딩",
      teacher: "김태영",
    },
    {
      day: "금요일",
      time: "18:00~19:50",
      classType: "파이썬 코딩",
      teacher: "김태영",
    },
    {
      day: "금요일",
      time: "20:00~21:50",
      classType: "파이썬 데이터분석 및 인공지능",
      teacher: "김태영",
    },
  ];

  return (
    <div className="container mx-auto px-4">
      <Hero img_src="/images/main.png" img_alt="코딩멘토" />
      {/* Cover Image */}
      <img
        className="w-full max-h-80 object-cover rounded-2xl py-10"
        src="/images/coding3.png"
        alt="코딩 멘토 소개"
      />
      {/* Title */}
      <h1 id="about" className="text-4xl font-bold mt-8 mb-4 scroll-mt-32">
        코딩 멘토 소개
      </h1>
      {/* Description Block */}
      <blockquote className="bg-gray-100 p-4 rounded mb-6">
        코딩멘토는 초등 고학년부터 고등학생, 성인까지 모두를 위한{" "}
        <strong>원격 맞춤형 코딩 수업</strong>을 제공합니다.
        <br />
        4년간 100개 이상의 학교와 기관에서 실력을 인정받은 전문 강사가{" "}
        <strong>아이의 눈높이에 맞춰 친절하게 코딩을 지도</strong>합니다.
      </blockquote>
      {/* Contact */}
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-2xl">📞</span>
        <span className="font-semibold">010-2315-2572</span>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        *강의 중에는 연락이 어려울 수 있어 문자로 연락주시면 차후 연락을 드릴 수
        있습니다.
      </p>
      {/* 강사 소개 */}
      <section id="mentor" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-2">강사 소개</h2>
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <img
            className="w-full max-w-lg rounded shadow"
            src="images/0tae.jpg"
            alt="강사 사진"
          />
          <div>
            <blockquote className="font-semibold text-lg mb-2">
              김태영 - 누가 가르치냐에 따라 다릅니다.
            </blockquote>
            <p className="mb-2">
              안녕하세요, 코딩멘토의 대표 강사 김태영입니다.
              <br />
              저는 지난 4년간 초등학생부터 고등학생, 성인까지 다양한 연령층을
              대상으로 학교 100여 곳에서 코딩 교육과 진로 특강을 진행해
              왔습니다.
              <br />
              파이썬부터 블록코딩, 인공지능, 데이터 분석까지, 기초부터 자격증
              취득, 실전 프로젝트까지 모두 책임지고 가르칩니다.
            </p>
            <p className="mb-2">
              ✔️ <b>주요 강의 경력</b>
              <br />• 2025 인재개발원 – 블록코딩으로 로봇 만들기
              <br />• 주택금융공사 – 신입사원 파이썬 교육
              <br />• 부산자동차고등학교 – AI Certificate for Everyone 교육 및
              컴퓨터 활용 수업
              <br />• 부산대학교 환경공학과 – 온신갈스 거동 예측을 위한 파이썬
              대회 및 코딩 교육
              <br />• 삼성중공업 거제조선소 – 파이썬 특강
              <br />• 연일초등학교, 전국 초중고 100여 곳 – AI 및 진로 연계 코딩
              교육 다수
            </p>
            <p className="mb-2">
              📚 <b>보유 자격 및 인증</b>
              <br />• SW 코딩 자격 1급 (한국생산성본부)
              <br />• 코딩활용능력 1급 (정보통신기술자격검정)
              <br />• AI Certificate for Everyone – Junior, Basic, Associate,
              <br />• AI FUTURE 시리즈 1급, 2급, 3급 (KT/한국경제신문)
            </p>
            <p className="mb-2">
              🧡 <b>학부모님께 드리는 약속</b>
              <br />
              “코딩은 아이의 가능성을 여는 열쇠입니다.
              <br />
              아이의 눈높이에 맞춘 친절한 설명과,
              <br />
              성장을 도와주는 커리큘럼으로
              <br />
              처음부터 끝까지 함께하겠습니다.”
            </p>
          </div>
        </div>
      </section>
      {/* 커리큘럼 안내 */}
      <section id="curriculum" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-2">커리큘럼 안내</h2>
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded">
            <h3 className="font-bold">
              🔰 1단계 – 기초 다지기 (블록코딩 & 파이썬 기초)
            </h3>
            <ul className="list-disc ml-6">
              <li>대상: 초등 고학년 ~ 중학생</li>
              <li>
                내용: 알고리즘 사고 훈련, 조건/반복문 이해, 기본 프로그램 만들기
              </li>
              <li>방식: 엔트리·스크래치와 함께 파이썬 기초 병행</li>
              <li>목표: 코딩에 대한 흥미와 자신감 형성</li>
            </ul>
          </div>
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-bold">
              🛠 2단계 – 실전 코딩 프로젝트 & 문제 해결력 강화
            </h3>
            <ul className="list-disc ml-6">
              <li>대상: 중학생 ~ 고등학생</li>
              <li>
                내용: 파이썬으로 간단한 앱 만들기, 게임 제작, 자동화 프로젝트
              </li>
              <li>
                방식: 직접 만들고, 실행해보고, 디버깅하면서 배우는 실습 중심
                수업
              </li>
              <li>목표: 논리적 사고력 향상, 코딩 실력 확장</li>
            </ul>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-bold">
              🤖 3단계 – 인공지능 & 데이터 분석 입문
            </h3>
            <ul className="list-disc ml-6">
              <li>대상: 고등학생 이상 또는 기본 코딩 가능자</li>
              <li>내용: AI 기초 개념, 머신러닝 체험, 데이터 시각화 실습</li>
              <li>
                활용: pandas, matplotlib, Teachable Machine, ChatGPT API 등
              </li>
              <li>목표: 4차 산업혁명 시대의 실전 기술 이해</li>
            </ul>
          </div>
        </div>
      </section>
      {/* 2) Kanban 스타일 시간표 섹션 */}
      <section id="timetable" className="mb-12 scroll-mt-32">
        <h2 className="text-2xl font-bold mb-4">시간표</h2>
        <div className="overflow-x-auto">
          <div className="inline-flex space-x-4 min-w-max">
            {["월요일", "화요일", "수요일", "목요일", "금요일"].map((day) => (
              <div
                key={day}
                className="flex-shrink-0 w-64 bg-gray-50 rounded-lg shadow p-4"
              >
                <h3 className="font-semibold text-lg mb-2">{day}</h3>
                <div className="space-y-2">
                  {scheduleData
                    .filter((item) => item.day === day)
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-md p-3 shadow-sm"
                      >
                        <p className="text-sm font-medium">{item.time}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {item.classType}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.teacher}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* 멤버십 안내 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-2">멤버십 안내 💰</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-orange-50 p-4 rounded">
            <h3 className="font-bold">1개월</h3>
            <p>
              <span className="font-semibold">주 1회 4주</span> 200,000원
            </p>
          </div>
          <div className="bg-orange-100 p-4 rounded">
            <h3 className="font-bold">3개월 (-15%)</h3>
            <p>
              <span className="font-semibold">주 1회 12주</span> 510,000원
            </p>
          </div>
          <div className="bg-orange-200 p-4 rounded">
            <h3 className="font-bold">6개월 (-30%)</h3>
            <p>
              <span className="font-semibold">주 1회 24주</span> 840,000원
            </p>
          </div>
        </div>
      </section>
      {/* FAQ */}
      <section id="faq" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-2">FAQ</h2>
        <div className="space-y-4">
          <details className="bg-gray-50 p-4 rounded" open>
            <summary className="font-semibold">
              Q1. 코딩을 한 번도 해본 적이 없는데, 수업을 따라갈 수 있을까요?
            </summary>
            <p>
              물론입니다!
              <br />
              코딩멘토는 기초부터 단계적으로 수업을 구성하며, 아이의 눈높이에
              맞춘 친절한 설명으로 진행됩니다.
              <br />
              처음 배우는 학생들을 위해 블록코딩부터 천천히 시작하고, 자연스럽게
              파이썬 등 텍스트 기반 언어로 확장합니다.
            </p>
          </details>
          <details className="bg-gray-50 p-4 rounded" open>
            <summary className="font-semibold">
              Q2. 원격 수업인데, 기술적으로 문제가 생기진 않을까요?
            </summary>
            <p>
              걱정하지 않으셔도 됩니다.
              <br />첫 수업은 직접 방문하여 세팅과 사용법까지 안내해드립니다.
              <br />
              이후에는 Discord 등 안정적인 플랫폼을 활용하여 수업을 진행하며,
              <br />
              문제가 생기면 <strong>전화 및 원격 지원</strong>을 통해 즉시
              도와드립니다.
            </p>
          </details>
          <details className="bg-gray-50 p-4 rounded" open>
            <summary className="font-semibold">
              Q3. 수업은 몇 명이 함께 듣나요?
            </summary>
            <p>
              코딩멘토는 소수 정예 또는 1:1 맞춤형 수업을 원칙으로 운영합니다.
              <br />
              학생의 성향과 수준에 따라 개별 맞춤이 가능하며, 학부모님과 협의 후
              최적의 수업 형태를 제안드립니다.
            </p>
          </details>
          <details className="bg-gray-50 p-4 rounded" open>
            <summary className="font-semibold">
              Q4. 수업 시간과 요일은 어떻게 정하나요?
            </summary>
            <p>
              학생과 학부모님의 일정을 고려하여 개별 조율합니다.
              <br />주 1회 2시간씩, 주중 저녁 또는 주말 중 원하시는 시간을
              협의하여 정합니다.
            </p>
          </details>
          <details className="bg-gray-50 p-4 rounded" open>
            <summary className="font-semibold">
              Q5. 어떤 자격증을 딸 수 있나요?
            </summary>
            <p>코딩멘토에서는 다음과 같은 자격증 취득을 지원합니다.</p>
            <ul className="list-disc ml-6">
              <li>SW코딩자격 1급 (한국생산성본부)</li>
              <li>코딩활용능력 1급</li>
              <li>AI Certificate for Everyone (KT/한국경제신문) 시리즈</li>
              <li>COS PRO</li>
            </ul>
            <p>
              시험 대비 커리큘럼을 따로 구성하여{" "}
              <strong>실전 준비까지 철저히 도와드립니다.</strong>
            </p>
          </details>
          <details className="bg-gray-50 p-4 rounded" open>
            <summary className="font-semibold">
              Q6. 수업료는 얼마인가요?
            </summary>
            <p>
              수업은 주 1회 2시간씩, 4주 기준 20만 원입니다.
              <br />첫 4주는 무료 체험 수업으로, 수업 스타일을 충분히 확인하신
              후 결제하실 수 있습니다.
            </p>
          </details>
          <details className="bg-gray-50 p-4 rounded" open>
            <summary className="font-semibold">
              Q7. 어떤 장비가 필요한가요?
            </summary>
            <p>
              수업에는 노트북 또는 데스크탑 컴퓨터, 안정적인 인터넷,{" "}
              <b>마이크와 스피커(또는 이어폰)</b>가 필요합니다.
              <br />
              처음에는 방문하여 세팅과 설치를 도와드리니 걱정하지 않으셔도
              됩니다.
            </p>
          </details>
        </div>
      </section>
      {/* Footer */}
      <footer className="text-center text-gray-400 text-xs mt-12">
        0Tae © 2025 All Rights Reserved
      </footer>
    </div>
  );
}
