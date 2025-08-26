import ProductPagination from "~/common/components/wemake/product-pagination";
import { LogCard } from "../components/log-card";
import { Hero } from "~/common/components/hero";
import { Await, Link } from "react-router";
import { getLessonLogsByDateRange } from "../queries";
// import { Suspense } from "react";
import type { Route } from "./+types/lesson-logs";
import { makeSSRClient } from "~/supa-client";
import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";

export const meta: Route.MetaFunction = () => [
  { title: `학습기록 | 코딩멘토` },
];
export const loader = async ({ request }: Route.LoaderArgs) => {
  console.log("loader");
  const { client, headers } = makeSSRClient(request);
  console.log(headers);
  const logs = await getLessonLogsByDateRange(client as SupabaseClient, {
    startDate: DateTime.now().startOf("day").minus({ days: 7 }),
    endDate: DateTime.now().endOf("day").plus({ days: 1 }),
    limit: 7,
  });
  console.log(logs);
  // const [logs] = await Promise.all([getLessonLogs()]);
  return { logs };
};

// export const clientLoader = async ({
//   serverLoader,
// }: Route.ClientLoaderArgs) => {
//   //track analytics
// };

export default function LessonLogPage({ loaderData }: Route.ComponentProps) {
  console.log("hello");
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
