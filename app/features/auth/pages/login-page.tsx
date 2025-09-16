import { Button } from "~/common/components/ui/button";
import type { Route } from "./+types/login-page";
import { Form, Link, redirect, useNavigation } from "react-router";
import AuthButtons from "../components/auth-buttons";
import InputPair from "~/common/components/wemake/input-pair";
import { LoaderCircle } from "lucide-react";
import { z } from "zod";
import { makeSSRClient } from "~/supa-client";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const meta: Route.MetaFunction = () => {
  return [{ title: "Login | wemake" }];
};

function translateAuthError(error: unknown): string {
  const err = error as { status?: number; message?: string } | undefined;
  const status = err?.status;
  const message = (err?.message || "").toLowerCase();
  if (status === 400 || message.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (message.includes("email not confirmed")) {
    return "이메일 인증이 필요합니다. 메일함을 확인해주세요.";
  }
  if (status === 422 || message.includes("invalid email")) {
    return "이메일 형식이 올바르지 않습니다.";
  }
  if (status === 429 || message.includes("too many")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  }
  if (status === 401) {
    return "인증이 필요합니다.";
  }
  return "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

const formSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "이메일을 입력해주세요." })
    .refine((v) => EMAIL_RE.test(v), {
      message: "이메일 주소가 유효하지 않습니다.",
    }),
  password: z
    .string()
    .trim()
    .min(1, { message: "패스워드를 입력해주세요." })
    .min(8, { message: "패스워드는 8자 이상이어야 합니다." }),
});
export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const { success, data, error } = formSchema.safeParse(
    Object.fromEntries(formData)
  );
  if (!success) {
    return {
      loginError: null,
      formErrors: error.flatten((i) => i.message).fieldErrors,
    };
  }

  const { email, password } = data;
  const { client, headers } = makeSSRClient(request);
  const { error: loginError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (loginError) {
    return { formErrors: null, loginError: translateAuthError(loginError) };
  }
  return redirect("/", { headers });
};

export default function LoginPage({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" || navigation.state === "loading";
  return (
    <div className="flex flex-col relative items-center justify-center h-full">
      <Button variant={"ghost"} asChild className="absolute right-8 top-8 ">
        <Link to="/auth/join">회원가입</Link>
      </Button>
      <div className="flex items-center flex-col justify-center w-full max-w-md gap-10">
        <h1 className="text-2xl font-semibold">로그인</h1>
        <Form className="w-full space-y-4" method="post">
          <InputPair
            label="이메일"
            description="이메일 주소를 입력해주세요."
            name="email"
            id="email"
            required
            type="email"
            placeholder="ex) wemake@example.com"
            autoComplete="email"
          />
          {actionData && "formErrors" in actionData && (
            <p className="text-red-500 text-sm">
              {actionData.formErrors?.email?.join(", ")}
            </p>
          )}
          <InputPair
            id="패스워드"
            label="패스워드"
            description="패스워드를 입력해주세요."
            name="password"
            required
            type="password"
            placeholder="ex) 123456"
            autoComplete="current-password"
          />
          {actionData && "formErrors" in actionData && (
            <p className="text-red-500 text-sm">
              {actionData.formErrors?.password?.join(", ")}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              "로그인"
            )}
          </Button>
          {actionData && "loginError" in actionData && (
            <p className="text-red-500 text-center">{actionData.loginError}</p>
          )}
        </Form>
        <AuthButtons />
      </div>
    </div>
  );
}
