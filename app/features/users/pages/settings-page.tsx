import { Form } from "react-router";
import type { Route } from "./+types/settings-page";
import InputPair from "~/common/components/wemake/input-pair";
import { useState } from "react";
import { Label } from "~/common/components/ui/label";
import { Input } from "~/common/components/ui/input";
import { Button } from "~/common/components/ui/button";

export const meta: Route.MetaFunction = () => {
  return [{ title: "설정 | 코딩멘토" }];
};

export default function SettingsPage() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const file = event.target.files[0];
      setAvatar(URL.createObjectURL(file));
    }
  };
  return (
    <div className="space-y-20 ">
      <div className="grid grid-cols-6 gap-40">
        <div className="col-span-4 flex flex-col gap-10">
          <h2 className="text-2xl font-semibold">프로필 수정</h2>
          <Form className="flex flex-col w-1/2 gap-5">
            <InputPair
              label="이름"
              description="공개 이름"
              required
              id="name"
              name="name"
              placeholder="이름을 입력해주세요"
            />

            <InputPair
              label="소개"
              description="프로필 소개"
              required
              id="headline"
              name="headline"
              placeholder="자신에 대해서 소개해주세요"
              textArea
            />

            <Button className="w-full">프로필 수정</Button>
          </Form>
        </div>
        <aside className="col-span-2 p-6 rounded-lg border shadow-md">
          <Label className="flex flex-col gap-1">
            프로필 이미지
            <small className="text-muted-foreground">공개 프로필 이미지</small>
          </Label>
          <div className="space-y-5">
            <div className="size-40 rounded-full shadow-xl overflow-hidden ">
              {avatar ? (
                <img src={avatar} className="object-cover w-full h-full" />
              ) : null}
            </div>
            <Input
              type="file"
              className="w-1/2"
              onChange={onChange}
              required
              name="icon"
            />
            <div className="flex flex-col text-xs">
              <span className=" text-muted-foreground">
                권장 크기: 128x128px
              </span>
              <span className=" text-muted-foreground">
                허용 포맷: PNG, JPEG
              </span>
              <span className=" text-muted-foreground">
                최대 파일 크기: 1MB
              </span>
            </div>
            <Button className="w-full">프로필 이미지 수정</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
