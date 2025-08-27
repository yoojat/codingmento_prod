import { Form, Link, useLoaderData, type MetaFunction } from "react-router";
import z from "zod";
import { Hero } from "~/common/components/hero";
import { Button } from "~/common/components/ui/button";
import { Input } from "~/common/components/ui/input";
import ProductPagination from "~/common/components/wemake/product-pagination";
import type { Route } from "./+types/search-page";
import { getStudentsByQuery, getStudentsPagesByQuery } from "../queries";
import { makeSSRClient } from "~/supa-client";
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
  if (parsedData.query === "") {
    return { students: [], totalPages: 1, query: parsedData.query };
  }

  const { client } = makeSSRClient(request);
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
      <div className="w-full max-w-screen-xl mx-auto overflow-x-auto">
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
                학부모 연락처
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                수업시간대
              </th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">
                레벨
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
                      {student.username || student.name || "-"}
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
                      {student.comment || student.description || "-"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={profileLink} className="underline">
                      {student.parrent_id || "-"}
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
