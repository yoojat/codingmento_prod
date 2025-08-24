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

export function loader({ request }: Route.LoaderArgs) {
  // Mock: 수업 진행/결제 상태
  const pricePerLesson = 30000; // KRW
  const lessonsDoneThisCycle = 7;
  const lessonsAlreadyPaid = 4;
  const dueLessons = Math.max(0, lessonsDoneThisCycle - lessonsAlreadyPaid);
  const dueAmount = dueLessons * pricePerLesson;

  // 선납 정책: 다음 4회 분 선납
  const prepayBlockSize = 4;
  const nextBlockStart =
    Math.floor(lessonsAlreadyPaid / prepayBlockSize) * prepayBlockSize + 1;
  const nextBlockEnd = nextBlockStart + prepayBlockSize - 1;
  const futurePrepayLessons = prepayBlockSize;
  const futurePrepayAmount = futurePrepayLessons * pricePerLesson;

  const receipts: PaymentReceipt[] = [
    {
      id: "rcp_202507",
      date: "2025-07-31T12:10:00.000Z",
      periodLabel: "2025-07-01 ~ 2025-07-31",
      amount: 120000,
      lessonsCovered: 4,
      method: "카드",
      status: "paid",
    },
    {
      id: "rcp_202506",
      date: "2025-06-30T11:00:00.000Z",
      periodLabel: "2025-06-01 ~ 2025-06-30",
      amount: 150000,
      lessonsCovered: 5,
      method: "계좌이체",
      status: "paid",
    },
  ];

  return {
    pricePerLesson,
    lessonsDoneThisCycle,
    lessonsAlreadyPaid,
    dueLessons,
    dueAmount,
    prepayBlockSize,
    nextBlockStart,
    nextBlockEnd,
    futurePrepayLessons,
    futurePrepayAmount,
    receipts,
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
    pricePerLesson,
    lessonsDoneThisCycle,
    lessonsAlreadyPaid,
    dueLessons,
    dueAmount,
    nextBlockStart,
    nextBlockEnd,
    futurePrepayLessons,
    futurePrepayAmount,
    receipts,
  } = loaderData as ReturnType<typeof loader>;

  const isPaymentNeeded = dueLessons > 0;

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded-md bg-muted">
              <div className="text-muted-foreground">이번 사이클 수업</div>
              <div className="text-lg font-semibold">
                {lessonsDoneThisCycle}회
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <div className="text-muted-foreground">이미 납부</div>
              <div className="text-lg font-semibold">
                {lessonsAlreadyPaid}회
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <div className="text-muted-foreground">미납 수업</div>
              <div className="text-lg font-semibold">{dueLessons}회</div>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <div className="text-muted-foreground">수업료(회당)</div>
              <div className="text-lg font-semibold">
                {formatKRW(pricePerLesson)}
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">미납 금액</div>
            <div className="text-xl font-bold">{formatKRW(dueAmount)}</div>
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground">
                다음 선납 (#{nextBlockStart} ~ #{nextBlockEnd})
              </div>
              <div className="text-lg font-semibold">
                {formatKRW(futurePrepayAmount)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              다음 {futurePrepayLessons}회 차 선납 금액 안내
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-3 flex-col sm:flex-row">
          <Form
            method="post"
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <input type="hidden" name="kind" value="due" readOnly />
            <input type="hidden" name="amount" value={dueAmount} readOnly />
            <input type="hidden" name="lessons" value={dueLessons} readOnly />
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={!isPaymentNeeded}
            >
              {isPaymentNeeded ? "미납 결제하기" : "미납 없음"}
            </Button>
          </Form>
          <Form
            method="post"
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <input type="hidden" name="kind" value="prepay" readOnly />
            <input
              type="hidden"
              name="amount"
              value={futurePrepayAmount}
              readOnly
            />
            <input
              type="hidden"
              name="lessons"
              value={futurePrepayLessons}
              readOnly
            />
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              다음 {futurePrepayLessons}회 선납 결제
            </Button>
          </Form>
        </CardFooter>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle>영수증 내역</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {receipts.map((r) => (
            <div key={r.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium">{r.periodLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    결제일: {new Date(r.date).toLocaleString("ko-KR")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={r.status === "paid" ? "secondary" : "destructive"}
                  >
                    {r.status === "paid" ? "결제완료" : "환불"}
                  </Badge>
                  <div className="text-right">
                    <div className="text-sm">수업 {r.lessonsCovered}회</div>
                    <div className="text-lg font-semibold">
                      {formatKRW(r.amount)}
                    </div>
                  </div>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>결제수단</div>
                <div>{r.method}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
