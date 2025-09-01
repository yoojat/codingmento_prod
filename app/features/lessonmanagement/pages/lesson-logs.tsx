import ProductPagination from "~/common/components/wemake/product-pagination";
import { LogCard } from "../components/log-card";
import { Hero } from "~/common/components/hero";
import {
  // Await,
  data,
  isRouteErrorResponse,
  Link,
  useLoaderData,
} from "react-router";
import {
  getLessonLogsByDateRange,
  getLessonLogsPagesByDateRange,
} from "../queries";
// import { Suspense } from "react";
import type { Route } from "./+types/lesson-logs";
import { makeSSRClient } from "~/supa-client";
import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";
import z from "zod";
import { Button } from "~/common/components/ui/button";

const searchParamsSchema = z.object({
  year: z.coerce.number().optional().default(DateTime.now().year),
  month: z.coerce.number().optional().default(DateTime.now().month),
  page: z.coerce.number().min(1).optional().default(1),
});
// const paramsSchema = z.object({
//   year: z.coerce.number().optional().default(DateTime.now().year),
//   month: z.coerce.number().optional().default(DateTime.now().month),
//   page: z.coerce.number().min(1).optional().default(1),
// });

export const meta: Route.MetaFunction = ({ data }) => {
  const date = DateTime.fromObject({
    year: data.year,
    month: data.month,
  })
    .setZone("Asia/Seoul")
    .setLocale("ko");

  return [
    {
      title: ` ${date.toLocaleString({
        month: "long",
        year: "2-digit",
      })} | 학습기록 | 코딩멘토`,
    },
  ];
};
export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  // check search params
  const { success: successSearchParams, data: parsedSearchParams } =
    searchParamsSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!successSearchParams) {
    throw data(
      {
        error_code: "invalid_page",
        message: "Invalid page",
      },
      { status: 400 }
    );
  }

  const selectedMonthStartKST = DateTime.fromObject(
    {
      year: parsedSearchParams.year,
      month: parsedSearchParams.month,
      day: 1,
    },
    { zone: "Asia/Seoul" }
  ).startOf("month");
  // day는 1일로 고정

  if (!selectedMonthStartKST.isValid) {
    throw data(
      {
        error_code: "invalid_date",
        message: "Invalid date",
      },
      { status: 400 }
    );
  }

  const currentMonthStartKST = DateTime.now()
    .setZone("Asia/Seoul")
    .startOf("month");
  if (selectedMonthStartKST > currentMonthStartKST) {
    throw data(
      {
        error_code: "future_date",
        message: "Future date",
      },
      { status: 400 }
    );
  }

  const { year, month, page } = parsedSearchParams;

  const { client, headers } = makeSSRClient(request);
  const zone = "Asia/Seoul";
  const monthStartKST = DateTime.fromObject(
    { year, month, day: 1 },
    { zone }
  ).startOf("month");
  const nextMonthStartKST = monthStartKST.plus({ months: 1 }).startOf("month");

  const logs = await getLessonLogsByDateRange(client as SupabaseClient, {
    startDate: monthStartKST.toUTC(),
    endDate: nextMonthStartKST.toUTC(),
    page: page ?? 1,
  });

  const totalPages = await getLessonLogsPagesByDateRange(
    client as SupabaseClient,
    {
      startDate: monthStartKST.toUTC(),
      endDate: nextMonthStartKST.toUTC(),
    }
  );
  return { logs, totalPages, ...parsedSearchParams };
};

// export const clientLoader = async ({
//   serverLoader,
// }: Route.ClientLoaderArgs) => {
//   //track analytics
// };

export default function LessonLogPage() {
  const { logs, totalPages, year, month, page } =
    useLoaderData<typeof loader>();

  const date = DateTime.fromObject({
    year: year,
    month: month,
  })
    .setZone("Asia/Seoul")
    .setLocale("ko");

  const prevMonth = date.minus({ month: 1 });
  const nextMonth = date.plus({ month: 1 });
  const isToday = date.equals(DateTime.now().startOf("month"));

  return (
    <div className="space-y-4">
      <Hero title={`${date.year}년 ${date.month}월 학습기록`} />
      <div className="flex items-center justify-center gap-2">
        <Button variant="secondary" asChild>
          <Link
            to={`/lessonmanagements/logs/?year=${prevMonth.year}&month=${prevMonth.month}`}
          >
            &larr;{" "}
            {prevMonth.toLocaleString({
              month: "long",
              year: "2-digit",
            })}
          </Link>
        </Button>
        {!isToday ? (
          <Button variant="secondary" asChild>
            <Link
              to={`/lessonmanagements/logs/?year=${nextMonth.year}&month=${nextMonth.month}`}
            >
              {nextMonth.toLocaleString({
                month: "long",
                year: "2-digit",
              })}
              &rarr;
            </Link>
          </Button>
        ) : null}
      </div>

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
      {totalPages > 1 ? <ProductPagination totalPages={totalPages} /> : null}
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    return (
      <div>
        {error.data.message} / {error.data.error_code}
      </div>
    );
  }
  if (error instanceof Error) {
    return <div>{error.message}</div>;
  }
  return <div>Unknown error</div>;
}
