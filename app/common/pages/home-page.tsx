import type { MetaFunction } from "react-router";
import { Button } from "~/common/components/ui/button";

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
  return (
    <div>
      <div className="py-40 bg-[url('/images/coding2.jpg')] bg-cover bg-no-repeat mx-auto w-full max-w-7xl 2xl:rounded-2xl relative">
        <div className="absolute inset-0 bg-black/50 xl:bg-black/0 2xl:rounded-2xl"></div>
        <div className="flex flex-col justify-end items-center md:items-end relative">
          <div className="md:px-20 2xl:px-40">
            <h2 className="text-5xl font-bold leading-tight tracking-tight text-white">
              <span className="text-blue-400 xl:text-[#011b52]">
                실시간 코딩 교육!
              </span>
              <br></br>코딩멘토
            </h2>
            <p className="text-xl font-bold text-white py-5">
              누구나 어디서나,<br></br>진짜 실력을 키우는 코딩 수업!
            </p>
            <p className="text-xl text-white">
              코딩멘토는 초등학생부터 고등학생까지!<br></br>눈높이에 맞춘 실시간
              온라인 코딩 수업!<br></br>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 5년 이상 코딩 교육과 프로그래밍 현장에서
//             활동해온 강사(부산코딩스쿨 운영자)가 직접 설계하고 검증한
//             커리큘럼으로,<br></br>전국 100여 개 학교 출강과 다양한 공공기관·기업
//             교육 경험을 바탕으로 만들어졌습니다.
