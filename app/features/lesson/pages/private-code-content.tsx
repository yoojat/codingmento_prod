import type { Route } from "./+types/private-code-content";
import { makeSSRClient } from "~/supa-client";
import { getLoggedInUserId } from "~/features/users/queries";
import { data } from "react-router";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { client } = makeSSRClient(request);
  const userId = await getLoggedInUserId(client);

  const fileId = Number(params.fileId);
  if (!fileId || Number.isNaN(fileId)) {
    throw data({ message: "Invalid file id" }, { status: 400 });
  }

  const { data: file, error: fileError } = await client
    .from("files")
    .select("id,name")
    .eq("id", fileId)
    .eq("profile_id", userId)
    .maybeSingle();
  if (fileError) throw data({ message: fileError.message }, { status: 500 });
  if (!file) throw data({ message: "Not found" }, { status: 404 });

  const { data: contentRow, error: contentError } = await client
    .from("file_contents")
    .select("id,content")
    .eq("id", fileId)
    .maybeSingle();
  if (contentError)
    throw data({ message: contentError.message }, { status: 500 });

  return {
    id: fileId,
    content: contentRow?.content ?? "",
    name: file?.name ?? "",
  };
};

export default function PrivateCodeContentRoute() {
  return null;
}
