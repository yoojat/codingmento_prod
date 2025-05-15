import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import type { Route } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "커뮤니티 | 코딩멘토" },
    {
      name: "description",
      content:
        "코딩멘토 커뮤니티에서 다양한 코딩 관련 질문과 답변을 나눠보세요.",
    },
  ];
};

interface Post {
  id: string;
  title: string;
  author: string;
  date: string;
  comments: number;
  likes: number;
  category: string;
}

interface LoaderData {
  posts: Post[];
  categories: string[];
}

export function loader(): LoaderData {
  return {
    categories: ["전체", "질문", "공유", "정보", "자유"],
    posts: [
      {
        id: "1",
        title: "파이썬에서 리스트와 튜플의 차이점이 뭔가요?",
        author: "코딩초보",
        date: "2023-06-15",
        comments: 8,
        likes: 12,
        category: "질문",
      },
      {
        id: "2",
        title: "리액트 상태관리 라이브러리 추천해주세요",
        author: "웹개발자",
        date: "2023-06-14",
        comments: 15,
        likes: 21,
        category: "질문",
      },
      {
        id: "3",
        title: "유용한 VSCode 확장 프로그램 모음",
        author: "개발도우미",
        date: "2023-06-13",
        comments: 6,
        likes: 32,
        category: "공유",
      },
      {
        id: "4",
        title: "7월 코딩 부트캠프 시작합니다",
        author: "관리자",
        date: "2023-06-12",
        comments: 2,
        likes: 5,
        category: "정보",
      },
      {
        id: "5",
        title: "코딩 공부 의욕이 떨어질 때 어떻게 하시나요?",
        author: "열정충전",
        date: "2023-06-11",
        comments: 25,
        likes: 18,
        category: "자유",
      },
    ],
  };
}

export default function CommunityPage({
  loaderData,
}: Route.ComponentProps<LoaderData>) {
  const { posts, categories } = loaderData;

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">커뮤니티</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          글쓰기
        </button>
      </div>

      <div className="flex mb-6 space-x-2">
        {categories.map((category) => (
          <button
            key={category}
            className="px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-100"
          >
            {category}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="hidden sm:flex border-b border-gray-200 font-medium text-gray-700 bg-gray-50 px-6 py-3">
          <div className="w-12 text-center">번호</div>
          <div className="w-24 text-center">카테고리</div>
          <div className="flex-1">제목</div>
          <div className="w-32 text-center">작성자</div>
          <div className="w-32 text-center">작성일</div>
          <div className="w-20 text-center">댓글</div>
          <div className="w-20 text-center">추천</div>
        </div>

        {posts.map((post, index) => (
          <div
            key={post.id}
            className="flex flex-col sm:flex-row items-start sm:items-center px-6 py-4 border-b border-gray-200 hover:bg-gray-50"
          >
            <div className="w-12 text-center hidden sm:block text-gray-500">
              {posts.length - index}
            </div>
            <div className="w-24 text-center hidden sm:block">
              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                {post.category}
              </span>
            </div>
            <div className="flex-1 font-medium">
              <div className="sm:hidden mb-1">
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 mr-2">
                  {post.category}
                </span>
              </div>
              <Link
                to={`/community/post/${post.id}`}
                className="hover:text-blue-600"
              >
                {post.title}
              </Link>
            </div>
            <div className="w-32 text-center text-gray-600 hidden sm:block">
              {post.author}
            </div>
            <div className="w-32 text-center text-gray-500 hidden sm:block">
              {post.date}
            </div>
            <div className="w-20 text-center text-gray-500 hidden sm:block">
              {post.comments}
            </div>
            <div className="w-20 text-center text-gray-500 hidden sm:block">
              {post.likes}
            </div>
            <div className="flex justify-between w-full mt-2 text-sm text-gray-500 sm:hidden">
              <span>{post.author}</span>
              <span>{post.date}</span>
              <span>댓글 {post.comments}</span>
              <span>추천 {post.likes}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <nav className="inline-flex rounded-md shadow">
          <button className="px-3 py-2 border border-gray-300 bg-white text-gray-500 hover:bg-gray-50">
            이전
          </button>
          <button className="px-3 py-2 border-t border-b border-gray-300 bg-blue-600 text-white">
            1
          </button>
          <button className="px-3 py-2 border border-gray-300 bg-white text-gray-500 hover:bg-gray-50">
            2
          </button>
          <button className="px-3 py-2 border border-gray-300 bg-white text-gray-500 hover:bg-gray-50">
            3
          </button>
          <button className="px-3 py-2 border border-gray-300 bg-white text-gray-500 hover:bg-gray-50">
            다음
          </button>
        </nav>
      </div>
    </div>
  );
}
