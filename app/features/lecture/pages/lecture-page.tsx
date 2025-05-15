import type { MetaFunction } from "react-router";
import type { Route } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "강의 | 코딩멘토" },
    {
      name: "description",
      content: "코딩멘토의 강의 상세 페이지입니다.",
    },
  ];
};

interface Lecture {
  id: string;
  title: string;
  description: string;
  instructor: string;
}

interface LoaderData {
  lecture: Lecture;
}

export function loader({ params }: Route.LoaderArgs): LoaderData {
  // Fetch lecture data based on params.id
  return {
    lecture: {
      id: params.id || "",
      title: "샘플 강의",
      description: "강의 설명 내용입니다.",
      instructor: "코딩멘토 강사",
    },
  };
}

export default function LecturePage({
  loaderData,
}: Route.ComponentProps<LoaderData>) {
  const { lecture } = loaderData;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">{lecture.title}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-gray-100 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">강의 설명</h2>
            <p className="text-gray-700">{lecture.description}</p>
          </div>
        </div>
        <div>
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">강사 정보</h2>
            <p className="text-gray-700">{lecture.instructor}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
