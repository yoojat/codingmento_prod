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
  ...prefix("/studylogs", [
    index("features/studylog/pages/study-logs.tsx"),
    layout("features/studylog/layouts/log-overview-layout.tsx", [
      route("/:logId", "features/studylog/pages/study-log.tsx"),
    ]),
  ]),
  ...prefix("/my", [
    layout("features/users/layouts/dashboard-layout.tsx", [
      ...prefix("/dashboard", [
        index("features/users/pages/dashboard-page.tsx"),
        route("/ideas", "features/users/pages/dashboard-ideas-page.tsx"),
        route(
          "/products/:productId",
          "features/users/pages/dashboard-product-page.tsx"
        ),
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
  ...prefix("wemake", [
    index("common/pages/home-page.tsx"),
    ...prefix("products", [
      index("features/wemake/products/pages/products-page.tsx"),
      ...prefix("leaderboards", [
        index("features/wemake/products/pages/leaderboard-page.tsx"),
        route(
          "/yearly/:year",
          "features/wemake/products/pages/yearly-leaderboard-page.tsx"
        ),
        route(
          "/monthly/:year/:month",
          "features/wemake/products/pages/monthly-leaderboard-page.tsx"
        ),
        route(
          "/daily/:year/:month/:day",
          "features/wemake/products/pages/daily-leaderboard-page.tsx"
        ),
        route(
          "/weekly/:year/:week",
          "features/wemake/products/pages/weekly-leaderboard-page.tsx"
        ),
        route(
          "/:period",
          "features/wemake/products/pages/leaderboards-redirection-page.tsx"
        ),
      ]),
      ...prefix("categories", [
        index("features/wemake/products/pages/categories-page.tsx"),
        route("/:category", "features/wemake/products/pages/category-page.tsx"),
      ]),
      route("/search", "features/wemake/products/pages/search-page.tsx"),
      route(
        "/submit",
        "features/wemake/products/pages/submit-product-page.tsx"
      ),
      route("/promote", "features/wemake/products/pages/promote-page.tsx"),
      ...prefix("/:productId", [
        index("features/wemake/products/pages/product-redirect-page.tsx"),
        layout("features/wemake/products/layouts/product-overview-layout.tsx", [
          route(
            "/overview",
            "features/wemake/products/pages/product-overview-page.tsx"
          ),
          ...prefix("/reviews", [
            index("features/wemake/products/pages/product-reviews-page.tsx"),
          ]),
        ]),
      ]),
    ]),
    ...prefix("/ideas", [
      index("features/wemake/ideas/pages/ideas-page.tsx"),
      route("/:ideaId", "features/wemake/ideas/pages/idea-page.tsx"),
    ]),
    ...prefix("/jobs", [
      index("features/wemake/jobs/pages/jobs-page.tsx"),
      route("/:jobId", "features/wemake/jobs/pages/job-page.tsx"),
      route("/submit", "features/wemake/jobs/pages/submit-job-page.tsx"),
    ]),
    ...prefix("/auth", [
      layout("features/wemake/auth/layouts/auth-layout.tsx", [
        route("/login", "features/wemake/auth/pages/login-page.tsx"),
        route("/join", "features/wemake/auth/pages/join-page.tsx"),
        ...prefix("/otp", [
          route("/start", "features/wemake/auth/pages/otp-start-page.tsx"),
          route(
            "/complete",
            "features/wemake/auth/pages/otp-complete-page.tsx"
          ),
        ]),
        ...prefix("/social/:provider", [
          route("/start", "features/wemake/auth/pages/social-start-page.tsx"),
          route(
            "/complete",
            "features/wemake/auth/pages/social-complete-page.tsx"
          ),
        ]),
      ]),
    ]),
    ...prefix("/community", [
      index("features/wemake/community/pages/community-page.tsx"),
      route("/:postId", "features/wemake/community/pages/post-page.tsx"),
      route("/submit", "features/wemake/community/pages/submit-post-page.tsx"),
    ]),
    ...prefix("/teams", [
      index("features/wemake/teams/pages/teams-page.tsx"),
      route("/:teamId", "features/wemake/teams/pages/team-page.tsx"),
      route("/create", "features/wemake/teams/pages/submit-team-page.tsx"),
    ]),
    ...prefix("/my", [
      layout("features/wemake/users/layouts/dashboard-layout.tsx", [
        ...prefix("/dashboard", [
          index("features/wemake/users/pages/dashboard-page.tsx"),
          route(
            "/ideas",
            "features/wemake/users/pages/dashboard-ideas-page.tsx"
          ),
          route(
            "/products/:productId",
            "features/wemake/users/pages/dashboard-product-page.tsx"
          ),
        ]),
      ]),
      layout("features/wemake/users/layouts/messages-layout.tsx", [
        ...prefix("/messages", [
          index("features/wemake/users/pages/messages-page.tsx"),
          route("/:messageId", "features/wemake/users/pages/message-page.tsx"),
        ]),
      ]),
      route("/profile", "features/wemake/users/pages/my-profile-page.tsx"),
      route("/settings", "features/wemake/users/pages/settings-page.tsx"),
      route(
        "/notifications",
        "features/wemake/users/pages/notifications-page.tsx"
      ),
    ]),
    layout("features/wemake/users/layouts/profile-layout.tsx", [
      ...prefix("/users/:username", [
        index("features/wemake/users/pages/profile-page.tsx"),
        route(
          "/products",
          "features/wemake/users/pages/profile-products-page.tsx"
        ),
        route("/posts", "features/wemake/users/pages/profile-posts-page.tsx"),
      ]),
    ]),
  ]),
] satisfies RouteConfig;
