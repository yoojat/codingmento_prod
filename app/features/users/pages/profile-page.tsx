import type { Route } from "./+types/profile-page";

export const meta: Route.MetaFunction = () => {
  return [{ title: "프로필 | 코딩멘토" }];
};

export default function ProfilePage() {
  return (
    <div className="max-w-screen-md flex flex-col space-y-10">
      <div className="space-y-2">
        <h4 className="text-lg font-bold">소개</h4>
        <p className="text-muted-foreground">코딩멘토 프로필 소개</p>
      </div>
    </div>
  );
}
