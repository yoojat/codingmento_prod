import ProductPagination from "~/common/components/wemake/product-pagination";
import { LogCard } from "../components/log-card";
import { Hero } from "~/common/components/hero";
import { Await, Link } from "react-router";
import type { Route } from "./+types/lesson-logs";
import { getLessonLogs } from "../queries";
import { Suspense } from "react";

export const meta: Route.MetaFunction = () => [
  { title: `학습기록 | 코딩멘토` },
];
export const loader = async () => {
  const [logs] = await Promise.all([getLessonLogs()]);
  return { logs };
};

export const clientLoader = async ({
  serverLoader,
}: Route.ClientLoaderArgs) => {
  //track analytics
};

export default function LessonLogPage({ loaderData }: Route.ComponentProps) {
  const { logs } = loaderData;

  return (
    <div>
      <Hero title="학습기록" />

      {logs.map((log) => (
        <Link to={`/lessonmanagements/${log.id}`} key={`logId-${log.id}`}>
          <LogCard
            id={`logId-${log.id}`}
            timestamp={log.start_at ?? ""}
            description={log.subject ?? ""}
            className="mb-5"
          />
        </Link>
      ))}
      <ProductPagination totalPages={10} />
    </div>
  );
}
