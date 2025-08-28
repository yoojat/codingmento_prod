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
