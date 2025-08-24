import { Form } from "react-router";
import { Hero } from "~/common/components/hero";
import { Button } from "~/common/components/ui/button";
import { Textarea } from "~/common/components/ui/textarea";
import { Input } from "~/common/components/ui/input";
import { Label } from "~/common/components/ui/label";
import { useMemo, useState } from "react";
import { Calendar } from "~/common/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import SelectPair from "~/common/components/wemake/select-pair";
import { DAY_TABLE, TIME_TABLE } from "../constants";

function combineDateAndTime(date: Date, timeHHmm: string): Date {
  const [hoursStr, minutesStr] = timeHHmm.split(":");
  const result = new Date(date);
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return result;
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export default function SubmitLessonLog() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [day, setDay] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhoto(URL.createObjectURL(file));
    }
  };

  const startAt: Date | undefined = useMemo(() => {
    if (!dateRange?.from || !startTime) return undefined;
    return combineDateAndTime(dateRange.from, startTime);
  }, [dateRange?.from, startTime]);

  const endAt: Date | undefined = useMemo(() => {
    // if to is missing, allow single-day with end time on from
    const base = dateRange?.to ?? dateRange?.from;
    if (!base || !endTime) return undefined;
    return combineDateAndTime(base, endTime);
  }, [dateRange?.from, dateRange?.to, endTime]);

  const isRangeSelected = Boolean(dateRange?.from);
  const isValidRange =
    Boolean(startAt && endAt) &&
    (!!startAt && !!endAt ? endAt.getTime() > startAt.getTime() : false);
  return (
    <div>
      <Hero title="수업기록" subtitle="수업기록을 작성해주세요." />
      <Form className="max-w-screen-2xl flex flex-col items-center gap-10 mx-auto">
        <SelectPair
          label="요일"
          description="요일을 선택해주세요."
          name="day"
          required
          placeholder="요일을 선택해주세요."
          options={DAY_TABLE.map((day) => ({
            label: day.label,
            value: day.value,
          }))}
        />
        <SelectPair
          label="시간대"
          description="시간대를 선택해주세요."
          name="time"
          required
          placeholder="시간대를 선택해주세요."
          options={TIME_TABLE.map((time) => ({
            label: time.label,
            value: time.value,
          }))}
        />
        <div className="w-full grid gap-3">
          <Label>수업 기간 선택</Label>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
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
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!isRangeSelected}
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
                disabled={!isRangeSelected}
                required
              />
            </div>
          </div>
          <input
            type="hidden"
            name="startAt"
            value={startAt ? startAt.toISOString() : ""}
            readOnly
          />
          <input
            type="hidden"
            name="endAt"
            value={endAt ? endAt.toISOString() : ""}
            readOnly
          />
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
        <Textarea
          name="content"
          rows={10}
          placeholder="학습 내용을 입력해주세요."
        />
        <Textarea
          name="atmosphere"
          rows={10}
          placeholder="수업분위기를 입력해주세요."
        />
        <Textarea
          name="studentResponse"
          rows={10}
          placeholder="학생반응을 입력해주세요."
        />
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
          name="nextLesson"
          rows={10}
          placeholder="다음주 예고를 입력해주세요."
        />
        <Button type="submit" className="w-full max-w-sm" size="lg">
          제출
        </Button>
      </Form>
    </div>
  );
}
