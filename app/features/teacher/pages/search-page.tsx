import { Form, Link, useLoaderData, type MetaFunction } from "react-router";
import z from "zod";
import { Hero } from "~/common/components/hero";
import { Button } from "~/common/components/ui/button";
import { Input } from "~/common/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/common/components/ui/card";
import ProductPagination from "~/common/components/wemake/product-pagination";
import type { Route } from "./+types/search-page";
import { getStudentsByQuery, getStudentsPagesByQuery } from "../queries";
import { makeSSRClient } from "~/supa-client";
import { getLoggedInTeacherId } from "~/features/users/queries";
// ... existing code ...

export const meta: MetaFunction = () => {
  return [{ title: "학생 검색" }];
};

const searchParams = z.object({
  query: z.string().optional().default(""),
  page: z.coerce.number().optional().default(1),
});

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const { success, data: parsedData } = searchParams.safeParse(
    Object.fromEntries(url.searchParams)
  );
  if (!success) {
    throw new Error("Invalid search params");
  }

  const { client } = makeSSRClient(request);
  await getLoggedInTeacherId(client);

  if (parsedData.query === "") {
    return { students: [], totalPages: 1, query: parsedData.query };
  }

  const students = await getStudentsByQuery(
    client,
    parsedData.query,
    parsedData.page
  );

  const totalPages = await getStudentsPagesByQuery(client, parsedData.query);
  return { students, totalPages, query: parsedData.query };
};

export default function SearchPage() {
  const { students, totalPages, query } = useLoaderData<typeof loader>();
  return (
    <div className="space-y-4">
      <Hero title="학생 검색" />
      <Form className="flex justify-center h-14 max-w-screen-sm items-center gap-2 mx-auto">
        <Input
          name="query"
          placeholder="학생 이름, 연락처 등으로 검색"
          className="text-lg"
          defaultValue={query}
        />
        <Button type="submit">Search</Button>
      </Form>
      {/* Mobile: Card list */}
      <div className="block md:hidden w-full max-w-screen-md mx-auto space-y-3 px-3">
        {students.map((student) => {
          const profileLink = `/teacher/student/${student.profile_id}`;
          const parentNames = student.parent_names?.join(", ") || "-";
          const parentPhones = student.parent_phones?.join(", ") || "-";
          const teacherNames = student.teacher_names?.join(", ") || "-";
          const teacherPhones = student.teacher_phones?.join(", ") || "-";
          const lesson =
            student.lesson_day && student.lesson_time
              ? `${student.lesson_day} ${student.lesson_time}`
              : student.lesson_time || student.lesson_day || "-";
          return (
            <Card key={student.profile_id} className="">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  <Link to={profileLink} className="underline">
                    {student.username || "-"}
                  </Link>
                </CardTitle>
                <CardDescription>{student.phone || "-"}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">생년월일:</span>
                  <span>{student.birth || "-"}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">성별:</span>
                  <span>{student.gender || "-"}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">주소:</span>
                  <span>{student.location || "-"}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">특이사항:</span>
                  <span>{student.comment || "-"}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">학부모 성함:</span>
                  <span>{parentNames}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">학부모 연락처:</span>
                  <span>{parentPhones}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">수업시간대:</span>
                  <span>{lesson}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">레벨:</span>
                  <span>{student.level || "-"}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">담당 선생님:</span>
                  <span>{teacherNames}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">선생님 연락처:</span>
                  <span>{teacherPhones}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block w-full max-w-screen-xl mx-auto overflow-x-auto">
        <table className="w-full text-sm border-t border-b border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                이름
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                연락처
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                생년월일
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                성별
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                주소
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                특이사항
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                학부모 성함
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                학부모 연락처
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                수업시간대
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                레벨
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                담당 선생님
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                담당 선생님 전화 번호
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const profileLink = `/teacher/student/${student.profile_id}`;
              return (
                <tr
                  key={student.profile_id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.username || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.phone || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.birth || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.gender || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.location || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.comment || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.parent_names?.join(", ") || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.parent_phones?.join(", ") || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.lesson_day && student.lesson_time
                        ? `${student.lesson_day} ${student.lesson_time}`
                        : student.lesson_time || student.lesson_day || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.level || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.teacher_names?.join(", ") || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.teacher_phones?.join(", ") || "-"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ProductPagination totalPages={totalPages} />
    </div>
  );
}
