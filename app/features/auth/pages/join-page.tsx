import { Button } from "~/common/components/ui/button";
import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/join-page";
import InputPair from "~/common/components/wemake/input-pair";
import AuthButtons from "../components/auth-buttons";
import z from "zod";
import { checkUsernameExists } from "../queries";
import { makeSSRClient } from "~/supa-client";
import { LoaderCircle } from "lucide-react";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const meta: Route.MetaFunction = () => {
  return [{ title: "회원가입 | 코딩멘토" }];
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
  if (message.includes("user already registered")) {
    return "이미 존재하는 아이디입니다.";
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
  return "회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: "이름을 입력해주세요." })
    .min(3, { message: "이름은 3자 이상이어야 합니다." }),
  username: z
    .string()
    .trim()
    .min(1, { message: "아이디를 입력해주세요." })
    .refine((v) => v.length >= 3 && v.length <= 15, {
      message: "아이디는 3자 이상 15자 이하이어야 합니다.",
    }),
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
      signUpError: null,
      formErrors: error.flatten((i) => i.message).fieldErrors,
    };
  }
  const usernameExists = await checkUsernameExists(request, {
    username: data.username,
  });
  if (usernameExists) {
    return { formErrors: null, signUpError: "이미 존재하는 아이디입니다." };
  }

  const { client, headers } = makeSSRClient(request);
  const { error: signUpError } = await client.auth.signUp({
    email: data.email,
    options: {
      data: {
        name: data.name,
        username: data.username,
      },
    },
    password: data.password,
  });
  if (signUpError) {
    return {
      formErrors: null,
      signUpError: translateAuthError(signUpError),
    };
  }
  return redirect("/", { headers });
};

export default function JoinPage({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" || navigation.state === "loading";
  return (
    <div className="flex flex-col relative items-center justify-center h-full">
      <Button variant={"ghost"} asChild className="absolute right-8 top-8 ">
        <Link to="/auth/login">로그인</Link>
      </Button>
      <div className="flex items-center flex-col justify-center w-full max-w-md gap-10">
        <h1 className="text-2xl font-semibold">회원가입</h1>
        <Form className="w-full space-y-4" method="post">
          <InputPair
            label="이름"
            description="이름을 입력해주세요."
            name="name"
            id="name"
            required
            type="text"
            placeholder="ex) 홍길동"
          />
          {actionData && "formErrors" in actionData && (
            <p className="text-red-500 text-sm">
              {actionData.formErrors?.name?.join(", ")}
            </p>
          )}
          <InputPair
            id="username"
            label="아이디"
            description="아이디를 입력해주세요."
            name="username"
            required
            type="text"
            placeholder="ex) wemake"
          />
          {actionData && "formErrors" in actionData && (
            <p className="text-red-500 text-sm">
              {actionData.formErrors?.username?.join(", ")}
            </p>
          )}
          <InputPair
            id="email"
            label="이메일"
            description="이메일을 입력해주세요."
            name="email"
            required
            type="email"
            placeholder="ex) wemake@example.com"
          />
          {actionData && "formErrors" in actionData && (
            <p className="text-red-500 text-sm">
              {actionData.formErrors?.email?.join(", ")}
            </p>
          )}
          <InputPair
            id="password"
            label="패스워드"
            description="패스워드를 입력해주세요."
            name="password"
            required
            type="password"
            placeholder="ex) 123456"
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
              "회원가입"
            )}
          </Button>
          {actionData && "signUpError" in actionData && (
            <p className="text-red-500 text-center">{actionData.signUpError}</p>
          )}
        </Form>
        <AuthButtons />
      </div>
    </div>
  );
}
