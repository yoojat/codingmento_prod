import {
  createBrowserClient,
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
  type CookieMethodsServer,
} from "@supabase/ssr";
import type { Database as SupabaseDatabase } from "database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MergeDeep, SetNonNullable } from "type-fest";

export type Database = MergeDeep<
  SupabaseDatabase,
  {
    public: {
      Tables: {
        lesson_groups: {
          Row: {
            id: number;
            teacher_id: string;
            name: string | null;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: number;
            teacher_id: string;
            name?: string | null;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: number;
            teacher_id?: string;
            name?: string | null;
            created_at?: string;
            updated_at?: string;
          };
          Relationships: [
            {
              foreignKeyName: "lesson_groups_teacher_id_fkey";
              columns: ["teacher_id"];
              isOneToOne?: boolean;
              referencedRelation: "profiles";
              referencedColumns: ["profile_id"];
            }
          ];
        };
        lesson_group_students: {
          Row: {
            lesson_group_id: number;
            student_id: string;
            created_at: string;
          };
          Insert: {
            lesson_group_id: number;
            student_id: string;
            created_at?: string;
          };
          Update: {
            lesson_group_id?: number;
            student_id?: string;
            created_at?: string;
          };
          Relationships: [
            {
              foreignKeyName: "lesson_group_students_lesson_group_id_fkey";
              columns: ["lesson_group_id"];
              isOneToOne?: boolean;
              referencedRelation: "lesson_groups";
              referencedColumns: ["id"];
            },
            {
              foreignKeyName: "lesson_group_students_student_id_fkey";
              columns: ["student_id"];
              isOneToOne?: boolean;
              referencedRelation: "profiles";
              referencedColumns: ["profile_id"];
            }
          ];
        };
      };
      Views: {
        students_view: {
          Row: SetNonNullable<
            SupabaseDatabase["public"]["Views"]["students_view"]["Row"]
          >;
        };
      };
    };
  }
>;

export const browserClient: SupabaseClient<Database> = createBrowserClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const makeSSRClient = (request: Request) => {
  const headers = new Headers();
  const cookies: CookieMethodsServer = {
    getAll() {
      const cookies = parseCookieHeader(request.headers.get("Cookie") ?? "");
      return cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value ?? "",
      }));
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        headers.append(
          "Set-Cookie",
          serializeCookieHeader(name, value, options)
        );
      });
    },
  };

  const serverSideClient: SupabaseClient<Database> = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies,
    }
  );

  return {
    client: serverSideClient,
    headers,
  };
};
