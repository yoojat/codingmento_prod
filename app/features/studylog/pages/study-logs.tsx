import ProductPagination from "~/common/components/wemake/product-pagination";
import { LogCard } from "../components/log-card";
import { Hero } from "~/common/components/hero";
import { Link } from "react-router";

export const meta: Route.MetaFunction = () => [
  { title: `학습기록 | 코딩멘토` },
];

export default function StudyLogPage() {
  return (
    <div>
      <Hero title="학습기록" />
      {Array.from({ length: 11 }).map((_, index) => (
        <Link to={`/studylogs/${index}`} key={`logId-${index}`}>
          <LogCard
            id={`logId-${index}`}
            timestamp="2024-07-30T10:31:00.000Z"
            description="파이썬 기초, 변수 학습"
            className="mb-5"
          />
        </Link>
      ))}
      <ProductPagination totalPages={10} />
    </div>
  );
}
