import { useLoaderData } from "react-router";
import type { Route } from "./+types/student-info";
import { makeSSRClient } from "~/supa-client";
import { getStudentById } from "../queries";
import { Hero } from "~/common/components/hero";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { client } = makeSSRClient(request);
  const student = await getStudentById(client, params.profile_id);

  if (!student) {
    throw new Error("Student not found");
  }

  return {
    student,
  };
};

export default function StudentInfo() {
  const { student } = useLoaderData<typeof loader>();
  const lessonLogs = student.lesson_logs as unknown as {
    subject: string;
    startAt: string;
    endAt: string;
    payment_created_at: number;
    product_name: string;
    product_amount: number;
  }[];

  return (
    <div className="space-y-6">
      <Hero title={student.username} />

      <div className="flex gap-6">
        <div className="w-2/3 space-y-4">
          <blockquote className="border-l-4 pl-4">
            <strong>{student.birth}</strong>
            <br />
            <br />
            {student.location ?? "-"}
          </blockquote>
          <hr />
          <div>
            <em className="font-semibold">Contact</em>
            <br />
            <br />
            <em className="font-semibold">Tel : {student.phone}</em>
          </div>
          <div className="space-y-1">
            <p>부모님 정보</p>
            <p>성함</p>
            <p>{student.parent_names.join(", ")}</p>
            <p>전화번호</p>
            <p>Tel: {student.parent_phones.join(", ")}</p>
          </div>
        </div>
        <div className="w-1/3">
          <div className="image text-left">
            <img
              style={{ width: 220 }}
              src={student.avatar ?? "https://placehold.co/220x220?text=Avatar"}
              alt={student.username}
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
                결제 일자
              </th>
            </tr>
          </thead>
          <tbody>
            {lessonLogs.map((log, index) => {
              return (
                <tr key={index} className="border-b">
                  <td className="px-3 py-2">
                    {log.payment_created_at
                      ? log.subject
                        ? log.subject
                        : "교육예정"
                      : log.subject
                      ? log.subject
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {log.payment_created_at
                      ? log.startAt
                        ? new Date(log.startAt).toLocaleDateString()
                        : "교육예정"
                      : log.startAt
                      ? new Date(log.startAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {log.payment_created_at
                      ? new Date(log.payment_created_at).toLocaleDateString()
                      : "결제 내역 없음"}
                  </td>
                </tr>
              );
            })}
            {lessonLogs.length === 0 && (
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
