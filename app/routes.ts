import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  index("common/pages/home.tsx"),
  ...prefix("/lessons", [
    route("/playground", "features/lesson/pages/playground.tsx"),
    route("/lesson", "features/lesson/pages/lesson.tsx"),
  ]),
  ...prefix("/lessonmanagements", [
    index("features/lessonmanagement/pages/lesson-logs.tsx"),
    layout("features/lessonmanagement/layouts/log-overview-layout.tsx", [
      route("/:logId", "features/lessonmanagement/pages/lesson-log.tsx"),
    ]),
    route("/payment", "features/lessonmanagement/pages/payment.tsx"),
  ]),
  ...prefix("/teacher", [
    route("/submit-lesson-log", "features/teacher/pages/submit-lesson-log.tsx"),
  ]),
  ...prefix("/my", [
    layout("features/users/layouts/dashboard-layout.tsx", [
      ...prefix("/dashboard", [
        index("features/users/pages/dashboard-page.tsx"),
      ]),
    ]),
    layout("features/users/layouts/messages-layout.tsx", [
      ...prefix("/messages", [
        index("features/users/pages/messages-page.tsx"),
        route("/:messageId", "features/users/pages/message-page.tsx"),
      ]),
    ]),
    route("/profile", "features/users/pages/my-profile-page.tsx"),
    route("/settings", "features/users/pages/settings-page.tsx"),
    route("/notifications", "features/users/pages/notifications-page.tsx"),
  ]),
  layout("features/users/layouts/profile-layout.tsx", [
    ...prefix("/users/:username", [
      index("features/users/pages/profile-page.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
