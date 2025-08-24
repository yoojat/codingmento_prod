import type { Route } from "./+types/lesson-log";

export function meta() {
  return [
    { title: "학습기록 | 코딩멘토" },
    { name: "description", content: "View product details and information" },
  ];
}
export default function StudyLogPage({
  params: { productId },
}: Route.ComponentProps) {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h3 className="text-lg font-bold">1. 학습내용</h3>
        <p className="text-muted-foreground">
          • 순차·반복 구조 이해
          <br />
          • 반복문(for, while)을 활용해 나만의 애니메이션 캐릭터 움직이기
          <br />
          • 조건문 응용 <br />
          • 사용자 입력에 따라 다른 메시지를 보여주는 인터랙티브 퀴즈 제작
          <br />
          • 함수와 변수 개념 실습 <br />• 간단한 계산기 함수 만들기 프로젝트
          완성
        </p>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold">2.수업 분위기</h3>
        <p className="text-muted-foreground">
          • 참여형 실습 중심
          <br />
          • 1:1 코칭 · 팀별 짝 활동 병행
          <br />
          • 질문과 피드백이 활발한 소통 교실
          <br />
          • 성과 공유 시간
          <br />• 매주 마지막 10분은 ‘나만의 프로젝트’ 발표 시간!
        </p>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold">3. 학생 반응</h3>
        <p className="text-muted-foreground">
          이름 수업 전 기대감
          <br />
          수업 후 소감
          <br />
          김민준 (초4)
          <br />
          “코딩이 어렵진 않을까 걱정돼요.”
          <br />
          “반복문 덕분에 캐릭터가 마음대로 움직여요!”
        </p>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold">4. 사진</h3>
        <div className="w-full bg-muted rounded-lg">
          <img src="/images/junseo.png" alt="studylog" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold">5. 다음주 예고</h3>
        <p className="text-muted-foreground">
          • 미로 탈출 게임 만들기
          <br />
          • 스프라이트 충돌 감지 기초
          <br />• 나만의 음악 연주 프로그램 제작
        </p>
      </div>
    </div>
  );
}
