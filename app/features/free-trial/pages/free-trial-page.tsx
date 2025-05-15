import type { MetaFunction } from "react-router";
import type { Route } from "~/types";
import { Button } from "~/common/components/ui/button";

export const meta: MetaFunction = () => {
  return [
    { title: "무료 체험 | 코딩멘토" },
    {
      name: "description",
      content: "코딩멘토의 무료 체험 강의를 신청하세요.",
    },
  ];
};

interface FormData {
  name: string;
  phone: string;
  email: string;
  studentAge: string;
  interests: string[];
  message: string;
}

interface LoaderData {
  interestOptions: string[];
  ageRangeOptions: string[];
}

interface ActionData {
  success: boolean;
  message: string;
}

export function loader(): LoaderData {
  return {
    interestOptions: [
      "파이썬",
      "자바스크립트",
      "웹 개발",
      "앱 개발",
      "인공지능",
      "게임 개발",
    ],
    ageRangeOptions: [
      "초등학생 (7-13세)",
      "중학생 (14-16세)",
      "고등학생 (17-19세)",
      "대학생/성인",
    ],
  };
}

export function action({ request }: Route.ActionArgs): ActionData {
  // Here we would handle the form submission
  // For demo purposes, we'll return a success message
  return {
    success: true,
    message: "무료 체험 신청이 완료되었습니다. 곧 연락드리겠습니다.",
  };
}

export default function FreeTrialPage({
  loaderData,
  actionData,
}: Route.ComponentProps<LoaderData, ActionData>) {
  const { interestOptions, ageRangeOptions } = loaderData;

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          무료 체험 수업 신청
        </h1>

        <div className="bg-blue-50 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-2 text-blue-800">
            무료 체험 수업 안내
          </h2>
          <p className="mb-4">
            코딩멘토의 무료 체험 수업은 학생의 수준과 관심사에 맞춰 20분간
            진행됩니다. 경험 많은 강사와 함께 코딩의 기초를 경험해보세요.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>수업 시간: 20분</li>
            <li>수업 방식: 온라인 화상 수업 (Zoom)</li>
            <li>준비물: 노트북 또는 데스크탑</li>
            <li>대상: 초등학생부터 고등학생까지</li>
          </ul>
          <p className="text-sm text-blue-700">
            * 신청 후 24시간 이내에 담당자가 연락드려 정확한 일정을 조율해
            드립니다.
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-8">
          <form method="post">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  이름 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  연락처 *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                이메일
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="studentAge"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                학생 연령대 *
              </label>
              <select
                id="studentAge"
                name="studentAge"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">선택해주세요</option>
                {ageRangeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <span className="block text-sm font-medium text-gray-700 mb-2">
                관심 분야 (복수 선택 가능)
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {interestOptions.map((interest) => (
                  <div key={interest} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`interest-${interest}`}
                      name="interests"
                      value={interest}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`interest-${interest}`}
                      className="ml-2 text-sm text-gray-700"
                    >
                      {interest}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                문의사항
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="수업에 대한 기대나 궁금한 점을 자유롭게 작성해주세요."
              ></textarea>
            </div>

            <div className="flex justify-center">
              <Button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
              >
                무료 체험 신청하기
              </Button>
            </div>

            {actionData?.success && (
              <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
                {actionData.message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
