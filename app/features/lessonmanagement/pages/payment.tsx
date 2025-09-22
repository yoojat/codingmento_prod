import type { Route } from "./+types/payment";
import { Form } from "react-router";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/common/components/ui/card";
import { Badge } from "~/common/components/ui/badge";
import { Button } from "~/common/components/ui/button";
import { Separator } from "~/common/components/ui/separator";

import {
  loadTossPayments,
  type TossPaymentsWidgets,
} from "@tosspayments/tosspayments-sdk";
import { makeSSRClient } from "~/supa-client";
import { getLoggedInUserId } from "~/features/users/queries";
import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import {
  getLessonLogsCountPaidByProfileId,
  getLessonLogsWithPaymentAndContent,
  getLessonsCountCompletedByProfileId,
} from "../queries";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/common/components/ui/table";

interface PaymentReceipt {
  id: string;
  date: string; // ISO
  periodLabel: string; // e.g., "2025-08-01 ~ 2025-08-31"
  amount: number;
  lessonsCovered: number;
  method: string; // e.g., "카드", "계좌이체"
  status: "paid" | "refunded";
}

export const meta: Route.MetaFunction = () => {
  return [
    { title: "결제 내역 및 정산 | 코딩멘토" },
    {
      name: "description",
      content: "수업 진행 현황과 결제 내역을 확인하고 결제할 수 있습니다.",
    },
  ];
};

export async function loader({ request }: Route.LoaderArgs) {
  const { client } = makeSSRClient(request);
  const userId = await getLoggedInUserId(client);
  // 이번 수업 횟수
  const lessonsCompletedCount = await getLessonsCountCompletedByProfileId(
    client,
    {
      profileId: userId,
    }
  );
  // 납부한 수업 횟수 (결제 완료)
  const lessonsAlreadyPaid = await getLessonLogsCountPaidByProfileId(client, {
    profileId: userId,
  });

  // 필요 결제 수업 횟수(이번 수업 횟수 - 납부한 수업 횟수 + 선납 수업 횟수)
  // 선납 수업 횟수는 선납 정책에 따라 계산
  // 선납 정책은 다음 4회 분 선납(4단위)
  // ex. 이번 수업 횟수가 4회이고 납부한 수업 횟수가 4회인 경우, 필요 결제 수업 횟수는 4회v
  // ex. 이번 수업 횟수가 7회이고 납부한 수업 횟수가 8회인 경우, 필요 결제 수업 횟수는 0회v
  // ex. 이번 수업 횟수가 8회이고 납부한 수업 횟수가 8회인 경우, 필요 결제 수업 횟수는 4회v
  // ex. 이번 수업 횟수가 4회이고 납부한 수업 횟수가 8회인 경우, 필요 결제 수업 횟수는 0회
  // ex. 이번 수업 횟수가 10회이고 납부한 수업 횟수가 8회인 경우, 필요 결제 수업 횟수는 4회
  // ex. 이번 수업 횟수가 20회이고 납부한 수업 횟수가 0회인 경우, 필요 결제 수업 횟수는 24회
  // ex. 이번 수업 횟수가 21회이고 납부한 수업 횟수가 0회인 경우, 필요 결제 수업 횟수는 24회
  // ex. 이번 수업 횟수가 22회이고 납부한 수업 횟수가 0회인 경우, 필요 결제 수업 횟수는 24회
  // ex. 이번 수업 횟수가 23회이고 납부한 수업 횟수가 0회인 경우, 필요 결제 수업 횟수는 24회
  // ex. 이번 수업 횟수가 24회이고 납부한 수업 횟수가 0회인 경우, 필요 결제 수업 횟수는 25회

  // 이번 수업횟수가 4로 나누어 떨어진다면
  // 필요 결제횟수는 이 수업횟수 + 4 - 납부한 수업 횟수
  // 아니라면
  // 필요 결제횟수는 이번 수업횟수를 4로 나눈 몫 * 4 + 4 - 납부한 수업 횟수

  let needToPayLessonsCount = 0;

  if (lessonsCompletedCount && lessonsCompletedCount % 4 === 0) {
    needToPayLessonsCount =
      lessonsCompletedCount + 4 - (lessonsAlreadyPaid ?? 0);
  } else {
    needToPayLessonsCount =
      Math.floor((lessonsCompletedCount ?? 0) / 4) * 4 +
      4 -
      (lessonsAlreadyPaid ?? 0);
  }

  // Mock: 수업 진행/결제 상태

  // 미납 수업 횟수
  const notPaidLessons = Math.max(
    0,
    (lessonsCompletedCount ?? 0) - (lessonsAlreadyPaid ?? 0)
  );

  // 선납 정책: 다음 4회 분 선납
  // 납부한 수업 횟수가 이번 수업횟수보다 작거나 같고,
  // 납부한 수업 횟수에서 이번 수업횟수를 빼고
  // 그 값이 0보다 크고 4로 나눈 나머지가 0이면 선납 필요

  const { lesson_logs } = await getLessonLogsWithPaymentAndContent(client, {
    profileId: userId,
  });

  console.log(lesson_logs);

  return {
    userId,
    lessonsAlreadyPaid,
    notPaidLessons,
    lessonsCompletedCount,
    needToPayLessonsCount,
    lesson_logs,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const amount = Number(formData.get("amount"));
  const lessons = Number(formData.get("lessons"));
  const kind = String(formData.get("kind") || "due");

  // TODO: 결제 게이트웨이 연동. 현재는 성공 가정
  return {
    ok: true,
    message:
      kind === "prepay"
        ? "선납 결제가 완료되었습니다."
        : "결제가 완료되었습니다.",
    amount,
    lessons,
    kind,
  };
}

function formatKRW(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function LessonPayment({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const {
    userId,
    notPaidLessons,
    lessonsAlreadyPaid,
    lessonsCompletedCount,
    needToPayLessonsCount,
    lesson_logs,
  } = loaderData;

  const isPaymentNeeded = needToPayLessonsCount > 0;

  const widgets = useRef<TossPaymentsWidgets | null>(null);

  useEffect(() => {
    const initToss = async () => {
      const clientKey = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

      const toss = await loadTossPayments(clientKey);
      widgets.current = (await toss).widgets({
        customerKey: userId,
      });
      await widgets.current.setAmount({
        value: 1000,
        currency: "KRW",
      });
      await widgets.current.renderPaymentMethods({
        selector: "#toss-payment-methods",
      });
      await widgets.current.renderAgreement({
        selector: "#toss-payment-agreement",
      });
    };
    initToss();
  }, [userId]);

  useEffect(() => {
    if (widgets.current) {
      widgets.current.setAmount({
        value: 1000,
        currency: "KRW",
      });
    }
  }, []);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader className="flex items-center justify-between gap-4 sm:flex-row">
          <CardTitle>결제 상태</CardTitle>
          <Badge variant={isPaymentNeeded ? "destructive" : "secondary"}>
            {isPaymentNeeded ? "결제 필요" : "정상"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-md bg-muted">
              <div className="text-muted-foreground">수업 완료</div>
              <div className="text-lg font-semibold">
                {lessonsCompletedCount}회
              </div>
            </div>

            <div className="p-3 rounded-md bg-muted">
              <div className="text-muted-foreground">미납 수업</div>
              <div className={cn(notPaidLessons > 0 && "text-red-600")}>
                <div className="text-lg font-semibold">{notPaidLessons}회</div>
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <div className="text-muted-foreground">결제된 수업</div>
              <div
                className={cn(
                  lessonsAlreadyPaid &&
                    lessonsAlreadyPaid > 0 &&
                    "text-green-600"
                )}
              >
                <div className="text-lg font-semibold">
                  {lessonsAlreadyPaid}회
                </div>
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">결제 필요 수업 횟수</div>
            <div className="text-xl font-bold">{needToPayLessonsCount}회</div>
          </div>
          {/* 결제 정책 안내 */}
          <div className="rounded-md bg-muted/70 p-4 text-sm space-y-2">
            <div className="font-medium">선납 정책 안내</div>
            <p className="text-muted-foreground">
              선결제 후 수업 진행(4회분씩)
              <br />
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-center gap-3 flex-col sm:flex-row">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              disabled={!isPaymentNeeded}
            >
              결제하기
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className={cn("hidden", isPaymentModalOpen && "block")}>
        <div id="toss-payment-methods" />
        <div id="toss-payment-agreement" />
        <Button className="w-full">1000원 결제하기</Button>
      </div>

      {actionData?.ok ? (
        <Card className="border-green-600/30">
          <CardHeader>
            <CardTitle className="text-green-600">결제 성공</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {actionData.message} — {formatKRW(actionData.amount)} (수업{" "}
            {actionData.lessons}회)
          </CardContent>
        </Card>
      ) : null}

      <Table>
        <TableCaption>수업 내역</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">수업 회차</TableHead>
            <TableHead>수업 일자</TableHead>
            <TableHead>수업 주제</TableHead>
            <TableHead className="text-right">결제 일자</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lesson_logs.map((lessonLog: any, index: number) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{index + 1}회</TableCell>
              <TableCell>
                {lessonLog.startAt
                  ? new Date(lessonLog.startAt).toLocaleDateString()
                  : "수업예정"}
              </TableCell>
              <TableCell>{lessonLog.subject || "수업예정"}</TableCell>
              <TableCell className="text-right">
                <div
                  className={cn(lessonLog.payment_created_at || "text-red-600")}
                >
                  {lessonLog.payment_created_at
                    ? new Date(
                        lessonLog.payment_created_at
                      ).toLocaleDateString()
                    : "미결제"}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
