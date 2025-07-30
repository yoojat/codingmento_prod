import { NotificationCard } from "../components/notification-card";
import type { Route } from "./+types/notifications-page";

export const meta: Route.MetaFunction = () => {
  return [{ title: "알림 | 코딩멘토" }];
};

export default function NotificationsPage() {
  return (
    <div className="space-y-20">
      <h1 className="text-4xl font-bold">알림</h1>
      <div className="flex flex-col items-start gap-5">
        <NotificationCard
          avatarUrl="https://github.com/serranoarevalo.png"
          avatarFallback="S"
          userName="김태영 선생님"
          message="님이 회원님을 팔로우 했습니다."
          timestamp="2일 전"
          seen={false}
        />
      </div>
    </div>
  );
}
