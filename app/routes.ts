import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("common/pages/home-page.tsx"),
  route("lecture", "features/lecture/pages/lecture-page.tsx"),
  route("lectures", "features/lectures/pages/lectures-page.tsx"),
  route("community", "features/community/pages/community-page.tsx"),
  route("free_trial", "features/free-trial/pages/free-trial-page.tsx"),
  route("demo", "features/demo/pages/demo-page.tsx"),
] satisfies RouteConfig;
