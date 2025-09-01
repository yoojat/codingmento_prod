import { redirect } from "react-router";
import type { Route } from "./+types/my-profile-page";
import { getUserById } from "../queries";
import { makeSSRClient } from "~/supa-client";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { client } = makeSSRClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();

  if (user) {
    const profile = await getUserById(client, { id: user.id });
    return redirect(`/users/${profile.username}`);
  }
  return redirect("/auth/login");
};
