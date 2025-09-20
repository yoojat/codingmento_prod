import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/supa-client";

export interface FileActionResult {
  ok: boolean;
  error?: string;
  id?: string;
  name?: string;
  parentId?: string | null;
}

export async function handleFileAction(
  client: SupabaseClient<Database>,
  userId: string | number,
  formData: FormData
): Promise<FileActionResult | { ok: true } | { ok: false; error: string }> {
  const intent = String(formData.get("intent") ?? "");

  if (intent === "delete-folder") {
    const idRaw = formData.get("id");
    if (!idRaw) return { ok: false, error: "Missing id" };
    const rootId = Number(idRaw);

    const { data: all, error: se } = await client
      .from("files")
      .select("id,parent_id,type,profile_id")
      .eq("profile_id", String(userId));
    if (se) return { ok: false, error: se.message };

    const idToNode = new Map<
      number,
      { id: number; parent_id: number | null; type: string }
    >();
    for (const row of all ?? []) {
      idToNode.set(Number(row.id), {
        id: Number(row.id),
        parent_id: row.parent_id == null ? null : Number(row.parent_id),
        type: String(row.type),
      });
    }

    const toDelete: number[] = [];
    function collect(id: number) {
      toDelete.push(id);
      for (const n of idToNode.values()) {
        if (n.parent_id === id) collect(n.id);
      }
    }
    collect(rootId);

    const fileIds = toDelete.filter((id) => idToNode.get(id)?.type === "file");

    if (fileIds.length) {
      const { error: ce } = await client
        .from("file_contents")
        .delete()
        .in("id", fileIds);
      if (ce) return { ok: false, error: ce.message };
    }

    const { error: fe } = await client
      .from("files")
      .delete()
      .in("id", toDelete)
      .eq("profile_id", userId as string);
    if (fe) return { ok: false, error: fe.message };

    return { ok: true, id: String(rootId) };
  }

  if (intent === "delete") {
    const idRaw = formData.get("id");
    if (!idRaw) return { ok: false, error: "Missing id" };
    const idNum = Number(idRaw);

    const { error: ce } = await client
      .from("file_contents")
      .delete()
      .eq("id", idNum);
    if (ce) {
      // Ignored: proceed even if content row didn't exist
    }

    const { error: fe } = await client
      .from("files")
      .delete()
      .eq("id", idNum)
      .eq("profile_id", String(userId))
      .eq("type", "file");
    if (fe) return { ok: false, error: fe.message };
    return { ok: true, id: String(idNum) };
  }

  if (intent === "rename") {
    const idRaw = formData.get("id");
    const nameRaw = formData.get("name");
    if (!idRaw || !nameRaw) return { ok: false, error: "Missing fields" };
    const idNum = Number(idRaw);
    const newName = String(nameRaw).trim();
    if (!newName) return { ok: false, error: "Empty name" };

    const { data, error } = await client
      .from("files")
      .update({ name: newName })
      .eq("id", idNum)
      .eq("profile_id", String(userId))
      .select("id,name")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: String(data.id), name: data.name };
  }

  if (intent === "create-file") {
    const nameRaw = formData.get("name");
    const parentIdRaw = formData.get("parentId");
    if (!nameRaw) return { ok: false, error: "Missing name" };
    const newName = String(nameRaw).trim();
    if (!newName) return { ok: false, error: "Empty name" };
    const parentId = parentIdRaw ? Number(parentIdRaw) : null;
    const { data, error } = await client
      .from("files")
      .insert({
        name: newName,
        type: "file",
        parent_id: parentId,
        profile_id: String(userId),
      })
      .select("id,name,parent_id")
      .single();

    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      id: String(data.id),
      name: data.name,
      parentId: data.parent_id == null ? null : String(data.parent_id),
    };
  }

  if (intent === "create-folder") {
    const nameRaw = formData.get("name");
    const parentIdRaw = formData.get("parentId");
    if (!nameRaw) return { ok: false, error: "Missing name" };
    const newName = String(nameRaw).trim();
    if (!newName) return { ok: false, error: "Empty name" };
    const parentId = parentIdRaw ? Number(parentIdRaw) : null;

    const { data, error } = await client
      .from("files")
      .insert({
        name: newName,
        type: "folder",
        parent_id: parentId,
        profile_id: String(userId),
      })
      .select("id,name,parent_id")
      .single();

    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      id: String(data.id),
      name: data.name,
      parentId: data.parent_id == null ? null : String(data.parent_id),
    };
  }

  if (intent === "save-content") {
    const idRaw = formData.get("id");
    const contentRaw = formData.get("content");
    if (!idRaw) return { ok: false, error: "Missing id" };
    const idNum = Number(idRaw);
    const contentStr = typeof contentRaw === "string" ? contentRaw : "";

    const { error } = await client
      .from("file_contents")
      .upsert({ id: idNum, content: contentStr }, { onConflict: "id" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  return { ok: false, error: "Unsupported intent" };
}
