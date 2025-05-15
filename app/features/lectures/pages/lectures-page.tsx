import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import type { Route } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "강의 목록 | 코딩멘토" },
    {
      name: "description",
      content: "코딩멘토의 다양한 코딩 강의 목록입니다.",
    },
  ];
};

interface Lecture {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
}

interface LoaderData {
  lectures: Lecture[];
}

export function loader(): LoaderData {
  return {
    lectures: [
      {
        id: "1",
        title: "파이썬 기초",
        description: "초보자를 위한 파이썬 기초 강의",
        thumbnail: "/images/python-basic.jpg",
        instructor: "김코딩",
      },
      {
        id: "2",
        title: "자바스크립트 입문",
        description: "웹 개발을 위한 자바스크립트 입문",
        thumbnail: "/images/javascript-intro.jpg",
        instructor: "이멘토",
      },
      {
        id: "3",
        title: "리액트 실전",
        description: "리액트로 웹 애플리케이션 만들기",
        thumbnail: "/images/react-advanced.jpg",
        instructor: "박개발",
      },
    ],
  };
}

export default function LecturesPage({
  loaderData,
}: Route.ComponentProps<LoaderData>) {
  const { lectures } = loaderData;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">강의 목록</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lectures.map((lecture: Lecture) => (
          <Link
            to={`/lecture/${lecture.id}`}
            key={lecture.id}
            className="group"
          >
            <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200">
                {/* Placeholder for lecture thumbnail */}
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  강의 썸네일
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600">
                  {lecture.title}
                </h3>
                <p className="text-gray-600 mb-3">{lecture.description}</p>
                <p className="text-sm text-gray-500">
                  강사: {lecture.instructor}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
