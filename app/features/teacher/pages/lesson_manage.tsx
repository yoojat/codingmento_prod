import { useEffect, useMemo, useState } from "react";
import type { Route } from "./+types/lesson_manage";
import { makeSSRClient } from "~/supa-client";
import { getLoggedInTeacherId } from "~/features/users/queries";
import { Input } from "~/common/components/ui/input";
import { Button } from "~/common/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/common/components/ui/card";
import { Separator } from "~/common/components/ui/separator";
import { useFetcher } from "react-router";

interface LessonGroup {
  id: string;
  name: string | null;
  created_at: string;
}

interface ProfileBrief {
  profile_id: string;
  name: string;
  phone: string | null;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "레슨 그룹 관리" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { client } = makeSSRClient(request);
  const teacherId = await getLoggedInTeacherId(client);

  const { data: groups, error } = await (client as any)
    .from("lesson_groups")
    .select("id,name,created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return {
    groups: (groups ?? []).map((g: any) => ({
      id: String(g.id),
      name: g.name as string | null,
      created_at: g.created_at as string,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { client } = makeSSRClient(request);
  const teacherId = await getLoggedInTeacherId(client);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create-group") {
    const nameRaw = formData.get("name");
    const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
    if (!name) return { ok: false, error: "그룹명을 입력하세요." };
    const { data, error } = await (client as any)
      .from("lesson_groups")
      .insert({ teacher_id: teacherId, name })
      .select("id,name,created_at")
      .single();
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      group: {
        id: String(data.id),
        name: data.name,
        created_at: data.created_at,
      },
    };
  }

  if (intent === "search-students") {
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    let query = client
      .from("profiles")
      .select("profile_id,name,phone")
      .eq("is_teacher", false)
      .limit(20);
    if (name) query = query.ilike("name", `%${name}%`);
    if (phone) query = query.ilike("phone", `%${phone}%`);
    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      results: (data ?? []).map((p) => ({
        profile_id: p.profile_id,
        name: p.name,
        phone: p.phone ?? null,
      })),
    };
  }

  if (intent === "add-student") {
    const groupId = String(formData.get("groupId") ?? "");
    const studentId = String(formData.get("studentId") ?? "");
    if (!groupId || !studentId) return { ok: false, error: "필수 값 누락" };

    // 소유 검증
    const { data: group, error: ge } = await (client as any)
      .from("lesson_groups")
      .select("teacher_id")
      .eq("id", Number(groupId))
      .single();
    if (ge) return { ok: false, error: ge.message };
    if (!group || String(group.teacher_id) !== String(teacherId))
      return { ok: false, error: "권한 없음" };

    const { error } = await (client as any)
      .from("lesson_group_students")
      .insert({ lesson_group_id: Number(groupId), student_id: studentId });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if (intent === "remove-student") {
    const groupId = String(formData.get("groupId") ?? "");
    const studentId = String(formData.get("studentId") ?? "");
    if (!groupId || !studentId) return { ok: false, error: "필수 값 누락" };

    // 소유 검증
    const { data: group, error: ge } = await (client as any)
      .from("lesson_groups")
      .select("teacher_id")
      .eq("id", Number(groupId))
      .single();
    if (ge) return { ok: false, error: ge.message };
    if (!group || String(group.teacher_id) !== String(teacherId))
      return { ok: false, error: "권한 없음" };

    const { error } = await (client as any)
      .from("lesson_group_students")
      .delete()
      .eq("lesson_group_id", Number(groupId))
      .eq("student_id", studentId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if (intent === "group-members") {
    const groupId = String(formData.get("groupId") ?? "");
    if (!groupId) return { ok: false, error: "필수 값 누락" };
    // 소유 검증
    const { data: group, error: ge } = await (client as any)
      .from("lesson_groups")
      .select("teacher_id")
      .eq("id", Number(groupId))
      .single();
    if (ge) return { ok: false, error: ge.message };
    if (!group || String(group.teacher_id) !== String(teacherId))
      return { ok: false, error: "권한 없음" };

    const { data, error } = await (client as any)
      .from("lesson_group_students")
      .select("student_id, profiles(name, phone)")
      .eq("lesson_group_id", Number(groupId));
    if (error) return { ok: false, error: error.message };
    const members: ProfileBrief[] = (data ?? []).map((row: any) => ({
      profile_id: row.student_id,
      name: row.profiles?.name ?? "",
      phone: row.profiles?.phone ?? null,
    }));
    return { ok: true, members };
  }

  return { ok: false, error: "Unsupported intent" };
}

export default function LessonManage({ loaderData }: Route.ComponentProps) {
  const { groups } = loaderData as unknown as { groups: LessonGroup[] };
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    groups[0]?.id ?? null
  );
  const [groupName, setGroupName] = useState<string>("");
  const [nameQuery, setNameQuery] = useState<string>("");
  const [phoneQuery, setPhoneQuery] = useState<string>("");

  const createFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    group?: LessonGroup;
  }>();
  const searchFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    results?: ProfileBrief[];
  }>();
  const membersFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    members?: ProfileBrief[];
  }>();
  const addFetcher = useFetcher<{ ok: boolean; error?: string }>();
  const removeFetcher = useFetcher<{ ok: boolean; error?: string }>();

  const [pendingAddId, setPendingAddId] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGroupId) {
      membersFetcher.submit(
        { intent: "group-members", groupId: selectedGroupId },
        { method: "post" }
      );
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (
      createFetcher.state === "idle" &&
      createFetcher.data?.ok &&
      createFetcher.data.group
    ) {
      setSelectedGroupId(createFetcher.data.group.id);
      setGroupName("");
    }
  }, [createFetcher.state, createFetcher.data]);

  function onCreateGroup() {
    if (!groupName.trim()) return;
    createFetcher.submit(
      { intent: "create-group", name: groupName.trim() },
      { method: "post" }
    );
  }

  function onSearch() {
    searchFetcher.submit(
      { intent: "search-students", name: nameQuery, phone: phoneQuery },
      { method: "post" }
    );
  }

  function onAddStudent(studentId: string) {
    if (!selectedGroupId) return;
    setPendingAddId(studentId);
    addFetcher.submit(
      { intent: "add-student", groupId: selectedGroupId, studentId },
      { method: "post" }
    );
  }

  function onRemoveStudent(studentId: string) {
    if (!selectedGroupId) return;
    setPendingRemoveId(studentId);
    removeFetcher.submit(
      { intent: "remove-student", groupId: selectedGroupId, studentId },
      { method: "post" }
    );
  }

  const isCreating = createFetcher.state !== "idle";
  const isSearching = searchFetcher.state !== "idle";
  const isAdding = addFetcher.state !== "idle";
  const isRemoving = removeFetcher.state !== "idle";

  useEffect(() => {
    if (addFetcher.state === "idle") {
      setPendingAddId(null);
      if (selectedGroupId) {
        membersFetcher.submit(
          { intent: "group-members", groupId: selectedGroupId },
          { method: "post" }
        );
      }
    }
  }, [addFetcher.state, selectedGroupId]);

  useEffect(() => {
    if (removeFetcher.state === "idle") {
      setPendingRemoveId(null);
      if (selectedGroupId) {
        membersFetcher.submit(
          { intent: "group-members", groupId: selectedGroupId },
          { method: "post" }
        );
      }
    }
  }, [removeFetcher.state, selectedGroupId]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>레슨 그룹 만들기</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="그룹명"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <Button
            onClick={onCreateGroup}
            disabled={isCreating || !groupName.trim()}
          >
            {isCreating ? "생성 중…" : "생성"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>내 그룹</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {groups.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                아직 생성된 그룹이 없습니다.
              </span>
            ) : (
              groups.map((g) => (
                <Button
                  key={g.id}
                  variant={selectedGroupId === g.id ? "default" : "secondary"}
                  onClick={() => setSelectedGroupId(g.id)}
                  size="sm"
                >
                  {g.name ?? `그룹 #${g.id}`}
                </Button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>학생 검색 및 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              placeholder="이름"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
            />
            <Input
              placeholder="전화번호"
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
            />
            <Button onClick={onSearch} disabled={isSearching}>
              {isSearching ? "검색 중…" : "검색"}
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="space-y-2">
            {(searchFetcher.data?.results ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">
                검색 결과가 없습니다.
              </div>
            ) : (
              (searchFetcher.data?.results ?? []).map((s) => (
                <div
                  key={s.profile_id}
                  className="flex items-center justify-between border rounded p-2"
                >
                  <div className="text-sm">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-muted-foreground">
                      {s.phone ?? "-"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onAddStudent(s.profile_id)}
                    disabled={!selectedGroupId || isAdding}
                  >
                    {isAdding && pendingAddId === s.profile_id
                      ? "추가 중…"
                      : "추가"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>그룹 학생 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedGroupId ? (
            <div className="text-sm text-muted-foreground">
              먼저 그룹을 선택하세요.
            </div>
          ) : membersFetcher.data?.members?.length ? (
            <div className="space-y-2">
              {membersFetcher.data.members.map((m) => (
                <div
                  key={m.profile_id}
                  className="flex items-center justify-between border rounded p-2"
                >
                  <div className="text-sm">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-muted-foreground">
                      {m.phone ?? "-"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRemoveStudent(m.profile_id)}
                    disabled={isRemoving}
                  >
                    {isRemoving && pendingRemoveId === m.profile_id
                      ? "제거 중…"
                      : "제거"}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              학생이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
