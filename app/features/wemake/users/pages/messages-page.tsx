import type { Route } from "./+types/messages-page";

export const meta: Route.MetaFunction = () => {
  return [{ title: "Messages | wemake" }];
};

export default function MessagesPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-semibold mb-6">Messages</h1>
      <div className="grid gap-6">{/* Messages list will go here */}</div>
    </div>
  );
}
