import { makeSSRClient } from "~/supa-client";
import { getUserByUsername } from "../queries";
import type { Route } from "./+types/profile-page";
import { useLoaderData, Link } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/common/components/ui/card";
import { Badge } from "~/common/components/ui/badge";
// removed search input; using month/year filters instead
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/common/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/common/components/ui/pagination";
import * as React from "react";
import { Button } from "~/common/components/ui/button";

export const meta: Route.MetaFunction = () => {
  return [{ title: "프로필 | 코딩멘토" }];
};

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { client } = makeSSRClient(request);
  const user = await getUserByUsername(client, params.username);
  if (!user) {
    throw new Error("User not found");
  }

  return { user };
};

export default function ProfilePage() {
  const { user } = useLoaderData<typeof loader>();
  const lessonLogs =
    (user?.lesson_logs as unknown as {
      subject: string | null;
      startAt: string | null;
      endAt: string | null;
      payment_created_at: string | number | null;
      product_name: string | null;
      product_amount: number | null;
    }[]) ?? [];

  function formatDate(value: string | number | null) {
    if (!value) return "-";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "-";
      return date.toLocaleDateString();
    } catch {
      return "-";
    }
  }

  function formatAmount(value: number | null) {
    if (!value) return "-";
    return `${value.toLocaleString()}원`;
  }

  const [status, setStatus] = React.useState<"all" | "paid" | "unpaid">("all");
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    for (const l of lessonLogs) {
      if (l?.startAt) {
        const d = new Date(l.startAt);
        if (!Number.isNaN(d.getTime())) years.add(d.getFullYear());
      }
    }
    const arr = Array.from(years).sort((a, b) => b - a);
    return arr.length ? arr : [new Date().getFullYear()];
  }, [lessonLogs]);
  const [selectedYear, setSelectedYear] = React.useState<number>(
    availableYears[0]
  );
  const [selectedMonth, setSelectedMonth] = React.useState<number>(
    new Date().getMonth() + 1
  ); // 1-12

  React.useEffect(() => {
    // keep year valid when dataset changes
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const filtered = React.useMemo(() => {
    return lessonLogs.filter((log) => {
      const matchesStatus =
        status === "all"
          ? true
          : status === "paid"
          ? Boolean(log?.payment_created_at)
          : !Boolean(log?.payment_created_at);

      const d = log?.startAt ? new Date(log.startAt) : null;
      const inMonth =
        d && !Number.isNaN(d.getTime())
          ? d.getFullYear() === selectedYear &&
            d.getMonth() + 1 === selectedMonth
          : false;

      return matchesStatus && inMonth;
    });
  }, [lessonLogs, status, selectedYear, selectedMonth]);

  const totalCount = filtered.length;
  const paidCount = React.useMemo(
    () => filtered.filter((l) => Boolean(l?.payment_created_at)).length,
    [filtered]
  );
  const unpaidCount = totalCount - paidCount;
  const unpaidGroups = Math.ceil(unpaidCount / 4);
  const nextUpcoming = React.useMemo(() => {
    const now = Date.now();
    const future = filtered
      .map((l) => (l?.startAt ? new Date(l.startAt).getTime() : NaN))
      .filter((t) => Number.isFinite(t) && t > now)
      .sort((a, b) => a - b);
    if (future.length === 0) return "-";
    return new Date(future[0]).toLocaleDateString();
  }, [filtered]);

  const allPaidWithSubjectAndDate = React.useMemo(() => {
    if (filtered.length === 0) return false;
    return filtered.every((l) => {
      const hasPaid = Boolean(l?.payment_created_at);
      const hasSubject = Boolean(
        l?.subject && String(l.subject).trim().length > 0
      );
      const hasDate = Boolean(
        l?.startAt && !Number.isNaN(new Date(l.startAt).getTime())
      );
      return hasPaid && hasSubject && hasDate;
    });
  }, [filtered]);

  const pageSize = 10;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  React.useEffect(() => {
    // Reset to first page when filters change
    setPage(1);
  }, [status, selectedYear, selectedMonth]);
  const pageItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, page]);
  return (
    <div className="max-w-screen-md mx-auto flex flex-col space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              총 수업
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              미결제
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-rose-600">
              {unpaidCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              다음 수업
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{nextUpcoming}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-none">
        <CardHeader className="px-0">
          <CardTitle className="text-xl">수업 내역</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {allPaidWithSubjectAndDate && (
            <div className="mb-4 flex items-center justify-between rounded-lg border bg-amber-50 p-4 text-amber-900">
              <div className="text-sm">
                선택한 기간의 모든 수업이 결제 완료되었습니다. 다음 수업을 위해
                결제가 필요합니다.
              </div>
              <Button asChild size="sm" variant="secondary">
                <Link to="/lessonmanagements/payment">지금 결제하기</Link>
              </Button>
            </div>
          )}
          {/* Controls */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as typeof status)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="paid">결제완료</SelectItem>
                  <SelectItem value="unpaid">미결제</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="연도" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(Number(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="월" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              <div className="text-2xl mb-2">🗒️</div>
              아직 수업 내역이 없습니다.
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">
                      교육 주제
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      교육 일자
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      결제 상태
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      결제 일자
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      결제 내역
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      결제 금액
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((log, index) => {
                    const isPaid = Boolean(log?.payment_created_at);
                    return (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-3">
                          {log?.subject
                            ? log.subject
                            : isPaid
                            ? "교육예정"
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {isPaid
                            ? log?.startAt
                              ? formatDate(log.startAt)
                              : "교육예정"
                            : formatDate(log?.startAt)}
                        </td>
                        <td className="px-4 py-3">
                          {isPaid ? (
                            <Badge variant="secondary">결제완료</Badge>
                          ) : (
                            <Badge variant="outline">미결제</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isPaid ? formatDate(log?.payment_created_at) : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {isPaid ? log?.product_name ?? "-" : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {isPaid
                            ? formatAmount(log?.product_amount ?? null)
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > pageSize && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      to="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(1, p - 1));
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        to="#"
                        isActive={page === i + 1}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(i + 1);
                        }}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      to="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.min(totalPages, p + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
