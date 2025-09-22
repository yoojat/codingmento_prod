import { Form, useNavigation } from "react-router";
import { Hero } from "~/common/components/hero";
import { Button } from "~/common/components/ui/button";
import { Textarea } from "~/common/components/ui/textarea";
import { Input } from "~/common/components/ui/input";
import { Label } from "~/common/components/ui/label";
import { useEffect, useMemo, useState } from "react";
import { Calendar } from "~/common/components/ui/calendar";
import SelectPair from "~/common/components/wemake/select-pair";
import { DAY_TABLE, TIME_TABLE } from "../constants";
import { makeSSRClient } from "~/supa-client";
import type { Route } from "./+types/submit-lesson-log";
import {
  getLoggedInTeacherId,
  getLoggedInUserId,
  getUserById,
} from "~/features/users/queries";
import { z } from "zod";
import { createLessonLogs } from "../mutations";
import { getStudentsBySearch } from "../queries";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/common/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/common/components/ui/card";

interface StudentSearchItem {
  profile_id: string;
  username: string;
  name: string;
  phone: string | null;
  avatar: string | null;
}

function combineDateAndTime(date: Date, timeHHmm: string): Date {
  const [hoursStr, minutesStr] = timeHHmm.split(":");
  const result = new Date(date);
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return result;
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function formatHHmm(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function floorTo30Minutes(date: Date): Date {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const floored = minutes < 30 ? 0 : 30;
  d.setMinutes(floored, 0, 0);
  return d;
}

function addTwoHoursToHHmm(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const endHour = h + 2;
  if (endHour >= 24) return "23:59";
  return `${String(endHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { client } = makeSSRClient(request);
  await getLoggedInTeacherId(client);
  return {};
};

const formSchema = z.object({
  start_at: z.string(),
  end_at: z.string(),
  subject: z.string(),
  content: z.string(),
  class_vibe: z.string(),
  student_reaction: z.string(),
  photo: z.string(),
  next_week_plan: z.string(),
});

const searchParamsSchema = z.object({
  search: z.string(),
});

export const action = async ({ request }: Route.ActionArgs) => {
  const { client } = makeSSRClient(request);
  const userId = await getLoggedInUserId(client);
  const teacher = await getUserById(client, { id: userId });
  if (!teacher) {
    throw new Error("교사 정보를 찾을 수 없습니다");
  }
  if (!teacher.is_teacher) {
    throw new Error("권한이 없습니다");
  }
  const formData = await request.formData();
  const intent = formData.get("_action");
  if (intent === "search") {
    const { success: successSearchParams, data: parsedSearchParams } =
      searchParamsSchema.safeParse(Object.fromEntries(formData));
    if (!successSearchParams) {
      return { fieldErrors: null, searchError: "Invalid search params" };
    }
    const { search } = parsedSearchParams;
    const students = await getStudentsBySearch(client, { search });
    return { students };
  } else if (intent === "submit") {
    const { success, data, error } = formSchema.safeParse(
      Object.fromEntries(formData)
    );

    if (!success) {
      return { fieldErrors: error.flatten((i) => i.message).fieldErrors };
    }

    const profileIds = formData
      .getAll("profile_ids")
      .filter(Boolean) as string[];
    if (profileIds.length === 0) {
      return {
        fieldErrors: { profile_ids: ["학생을 한 명 이상 선택해주세요."] },
      };
    }

    const {
      start_at,
      end_at,
      subject,
      content,
      class_vibe,
      student_reaction,
      photo,
      next_week_plan,
    } = data;

    const results = await createLessonLogs(client, profileIds, {
      start_at,
      end_at,
      subject,
      content,
      class_vibe,
      student_reaction,
      img_url: photo,
      next_week_plan,
    });

    console.log("results", results);
    return { ids: results.map((r) => r.id) };
  }
};

export default function SubmitLessonLog({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  function getFieldErrors(key: string): string[] | undefined {
    if (
      actionData &&
      typeof actionData === "object" &&
      "fieldErrors" in actionData &&
      (actionData as any).fieldErrors
    ) {
      const fe = (actionData as any).fieldErrors as Record<string, string[]>;
      return fe[key];
    }
    return undefined;
  }
  const [photo, setPhoto] = useState<string | null>(null);
  const [day, setDay] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<Date | null>(null);
  const now = useMemo(() => new Date(), []);
  const defaultStart = formatHHmm(
    floorTo30Minutes(new Date(now.getTime() - 2 * 60 * 60 * 1000))
  );
  const [startTime, setStartTime] = useState<string>(defaultStart);
  const [endTime, setEndTime] = useState<string>(
    addTwoHoursToHHmm(defaultStart)
  );
  const [students, setStudents] = useState<StudentSearchItem[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentSearchItem[]>(
    []
  );
  const isSearching =
    (navigation.state === "submitting" || navigation.state === "loading") &&
    navigation.formData?.get("_action") === "search";

  useEffect(() => {
    if (actionData && "students" in actionData) {
      setStudents(
        (actionData as unknown as { students: StudentSearchItem[] }).students ??
          []
      );
    }
  }, [actionData]);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhoto(URL.createObjectURL(file));
    }
  };

  const start_at: Date | undefined = useMemo(() => {
    if (!day || !startTime) return undefined;
    return combineDateAndTime(day, startTime);
  }, [day, startTime]);

  const end_at: Date | undefined = useMemo(() => {
    if (!day || !endTime) return undefined;
    return combineDateAndTime(day, endTime);
  }, [day, endTime]);

  const isDaySelected = Boolean(day);
  const isValidRange =
    Boolean(start_at && end_at) &&
    (!!start_at && !!end_at ? end_at.getTime() > start_at.getTime() : false);
  return (
    <div>
      <Hero title="수업기록" subtitle="수업기록을 작성해주세요." />
      <Card className="w-full max-w-screen-2xl mx-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">학생 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="flex items-end gap-2">
            <div className="flex-1 grid gap-1.5">
              <Label htmlFor="search">검색어</Label>
              <Input id="search" name="search" placeholder="이름, 연락처 등" />
            </div>
            <Button
              type="submit"
              name="_action"
              value="search"
              disabled={isSearching}
            >
              {isSearching ? "검색 중..." : "검색"}
            </Button>
          </Form>
          {isSearching && (
            <div className="mt-2 text-sm text-muted-foreground">검색 중...</div>
          )}
          {students.length > 0 && (
            <div className="mt-4 grid gap-2">
              <Label>검색 결과</Label>
              <ul className="divide-y rounded-md border">
                {students.map((s) => (
                  <li
                    key={s.profile_id}
                    className="flex items-center gap-3 p-3"
                  >
                    <Avatar>
                      <AvatarImage src={s.avatar ?? undefined} />
                      <AvatarFallback>{s.name?.[0] ?? "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        @{s.username} {s.phone ? `· ${s.phone}` : ""}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSelectedStudents((prev) =>
                          prev.some((p) => p.profile_id === s.profile_id)
                            ? prev
                            : [...prev, s]
                        )
                      }
                    >
                      선택
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Form
        className="max-w-screen-2xl flex flex-col items-center gap-10 mx-auto mt-20"
        method="post"
      >
        {selectedStudents.length > 0 && (
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                선택된 학생 ({selectedStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-md border">
                {selectedStudents.map((s) => (
                  <li
                    key={s.profile_id}
                    className="flex items-center gap-3 p-3"
                  >
                    <Avatar className="size-10">
                      <AvatarImage src={s.avatar ?? undefined} />
                      <AvatarFallback>{s.name?.[0] ?? "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        @{s.username} {s.phone ? `· ${s.phone}` : ""}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setSelectedStudents((prev) =>
                          prev.filter((p) => p.profile_id !== s.profile_id)
                        )
                      }
                    >
                      제거
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        <div className="w-full grid gap-3">
          <Label>수업 일자 선택</Label>
          <Calendar
            mode="single"
            selected={day}
            onSelect={setDay}
            disabled={{ before: new Date() }}
            className="w-full max-w-sm mx-auto"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="startTime">시작 시간</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => {
                  const v = e.target.value;
                  setStartTime(v);
                  setEndTime(addTwoHoursToHHmm(v));
                }}
                disabled={!isDaySelected}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="endTime">종료 시간</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!isDaySelected}
                required
              />
            </div>
          </div>
          <input
            type="hidden"
            name="start_at"
            value={start_at ? start_at.toISOString() : ""}
            readOnly
          />
          <input
            type="hidden"
            name="end_at"
            value={end_at ? end_at.toISOString() : ""}
            readOnly
          />
          {getFieldErrors("start_at") && (
            <p className="text-red-500 text-sm">
              {getFieldErrors("start_at")?.join(", ")}
            </p>
          )}
          {getFieldErrors("end_at") && (
            <p className="text-red-500 text-sm">
              {getFieldErrors("end_at")?.join(", ")}
            </p>
          )}
          {!isValidRange ? (
            <small className="text-destructive">
              유효한 시간 범위를 선택해주세요. (종료가 시작보다 이후)
            </small>
          ) : null}
        </div>
        <Textarea
          name="subject"
          rows={1}
          placeholder="학습 주제를 입력해주세요."
        />
        {getFieldErrors("subject") && (
          <p className="text-red-500 text-sm">
            {getFieldErrors("subject")?.join(", ")}
          </p>
        )}
        <Textarea
          name="content"
          rows={10}
          placeholder="학습 내용을 입력해주세요."
        />
        {getFieldErrors("content") && (
          <p className="text-red-500 text-sm">
            {getFieldErrors("content")?.join(", ")}
          </p>
        )}
        <Textarea
          name="class_vibe"
          rows={10}
          placeholder="수업분위기를 입력해주세요."
        />
        {getFieldErrors("class_vibe") && (
          <p className="text-red-500 text-sm">
            {getFieldErrors("class_vibe")?.join(", ")}
          </p>
        )}
        <Textarea
          name="student_reaction"
          rows={10}
          placeholder="학생반응을 입력해주세요."
        />
        {getFieldErrors("student_reaction") && (
          <p className="text-red-500 text-sm">
            {getFieldErrors("student_reaction")?.join(", ")}
          </p>
        )}
        <aside className="w-full p-6 border rounded-lg shadow-md">
          <Label className="flex flex-col gap-1">
            사진
            <small className="text-muted-foreground mb-2">
              수업 사진을 첨부해주세요.
            </small>
          </Label>
          <div className="space-y-5">
            <div className="w-full h-40 rounded-lg shadow-xl overflow-hidden bg-muted mx-auto">
              {photo ? (
                <img src={photo} className="object-cover w-full h-full" />
              ) : null}
            </div>
            <Input
              type="file"
              className="w-full"
              onChange={onChange}
              required
              name="photo"
            />
            {getFieldErrors("photo") && (
              <p className="text-red-500 text-sm">
                {getFieldErrors("photo")?.join(", ")}
              </p>
            )}
            <div className="flex flex-col text-xs">
              <span className=" text-muted-foreground">
                Recommended size: 1024x1024px
              </span>
              <span className=" text-muted-foreground">
                Allowed formats: PNG, JPEG, JPG
              </span>
              <span className=" text-muted-foreground">Max file size: 2MB</span>
            </div>
            <Button className="w-full">Upload photo</Button>
          </div>
        </aside>
        <Textarea
          name="next_week_plan"
          rows={10}
          placeholder="다음주 예고를 입력해주세요."
        />
        {getFieldErrors("next_week_plan") && (
          <p className="text-red-500 text-sm">
            {getFieldErrors("next_week_plan")?.join(", ")}
          </p>
        )}
        {selectedStudents.map((s) => (
          <input
            key={s.profile_id}
            type="hidden"
            name="profile_ids"
            value={s.profile_id}
            readOnly
          />
        ))}
        <Button
          type="submit"
          name="_action"
          value="submit"
          className="w-full max-w-sm"
          size="lg"
        >
          제출
        </Button>
      </Form>
    </div>
  );
}
