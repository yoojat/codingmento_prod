import { useLoaderData } from "react-router";
import type { Route } from "./+types/student-info";
import { makeSSRClient } from "~/supa-client";
import { getStudentById } from "../queries";
import { Hero } from "~/common/components/hero";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { client } = makeSSRClient(request);
  const student = await getStudentById(client, params.profile_id);

  const { data: rel, error: relError } = await client
    .from("relationship")
    .select("parent_id")
    .eq("child_id", params.profile_id)
    .limit(1);
  if (relError) throw new Error(relError.message);

  let parent: { username: string | null; phone: string | null } | null = null;
  const parentId = rel && rel[0] ? rel[0].parent_id : null;
  if (parentId) {
    const { data: pData, error: pErr } = await client
      .from("profiles")
      .select("username, phone")
      .eq("profile_id", parentId)
      .limit(1);
    if (pErr) throw new Error(pErr.message);
    parent = pData && pData[0] ? pData[0] : null;
  }

  const [lessonsRes, paymentsRes] = await Promise.all([
    client
      .from("lesson_logs")
      .select("id, subject, start_at, created_at")
      .eq("profile_id", params.profile_id)
      .order("start_at", { ascending: false })
      .limit(20),
    client
      .from("payments")
      .select("id, amount, created_at")
      .eq("user_id", params.profile_id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (lessonsRes.error) throw new Error(lessonsRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  return {
    student,
    parent,
    lessons: lessonsRes.data ?? [],
    payments: paymentsRes.data ?? [],
  };
};

export default function StudentInfo() {
  const { student, parent, lessons, payments } = useLoaderData<typeof loader>();
  const s = student && student[0];

  const formatDate = (d?: string | null, fallback: string = "-") => {
    if (!d) return fallback;
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return fallback;
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const dd = `${date.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const latestPaymentAt =
    payments && payments[0] ? payments[0].created_at : null;

  return (
    <div className="space-y-6">
      <Hero title={s?.username ?? "학생정보"} />

      <div className="flex gap-6">
        <div className="w-2/3 space-y-4">
          <blockquote className="border-l-4 pl-4">
            <strong>{formatDate(s?.birth)}</strong>
            <br />
            <br />
            {s?.location ?? "-"}
          </blockquote>
          <hr />
          <div>
            <em className="font-semibold">Contact</em>
            <br />
            <br />
            <em className="font-semibold">Tel : {s?.phone ?? "-"}</em>
          </div>
          <div className="space-y-1">
            <p>부모님 정보</p>
            <p>성함</p>
            <p>{parent?.username ?? "-"}</p>
            <p>전화번호</p>
            <p>Tel: {parent?.phone ?? "-"}</p>
          </div>
        </div>
        <div className="w-1/3">
          <div className="image text-left">
            <img
              style={{ width: 220 }}
              src={s?.avatar || "https://placehold.co/220x220?text=Avatar"}
              alt={s?.username || "avatar"}
            />
          </div>
        </div>
      </div>

      <hr />

      <h2 className="bg-blue-50 px-2 py-1 inline-block">
        수업내역 및 결제내역
      </h2>
      <hr />

      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm border-t border-b border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                교육 주제
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                교육 일자
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                결제 내역
              </th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l: any) => (
              <tr key={l.id} className="border-b">
                <td className="px-3 py-2">{l.subject ?? "-"}</td>
                <td className="px-3 py-2">
                  {formatDate(l.start_at || l.created_at, "-")}
                </td>
                <td className="px-3 py-2">
                  {formatDate(latestPaymentAt, "-")}
                </td>
              </tr>
            ))}
            {lessons.length === 0 && (
              <tr>
                <td className="px-3 py-4" colSpan={3}>
                  수업 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
