import { Button } from "~/common/components/ui/button";
import type { Route } from "./+types/otp-start-page";
import { data, Form, redirect, useNavigation } from "react-router";
import InputPair from "~/common/components/wemake/input-pair";
import { z } from "zod";
import { makeSSRClient } from "~/supa-client";
import { LoaderCircle } from "lucide-react";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const meta: Route.MetaFunction = () => {
  return [{ title: "Start OTP | wemake" }];
};

const formSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "이메일을 입력해주세요." })
    .refine((v) => EMAIL_RE.test(v), {
      message: "이메일 주소가 유효하지 않습니다.",
    }),
});

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const {
    success,
    data,
    error: formError,
  } = formSchema.safeParse(Object.fromEntries(formData));
  if (!success) {
    return {
      formErrors: formError.flatten((i) => i.message).fieldErrors,
    };
  }

  const { email } = data;

  const { client } = makeSSRClient(request);
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    return {
      error: "Failed to send OTP",
    };
  }
  return redirect(`/auth/otp/complete?email=${email}`);
};

export default function OtpStartPage({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" || navigation.state === "loading";
  return (
    <div className="flex flex-col relative items-center justify-center h-full">
      <div className="flex items-center flex-col justify-center w-full max-w-md gap-10">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">OTP로 로그인</h1>
          {/* <p className="text-sm text-muted-foreground">
            4자리 코드를 이메일로 전송합니다.
          </p> */}
          <p className="text-sm text-muted-foreground">
            4자리 코드를 핸드폰으로 전송합니다.
          </p>
        </div>
        <Form className="w-full space-y-4" method="post">
          <InputPair
            label="이메일"
            description="이메일 주소를 입력해주세요."
            name="email"
            id="email"
            required
            type="email"
            placeholder="ex) wemake@example.com"
          />

          {actionData && "formErrors" in actionData && (
            <p className="text-red-500 text-sm">
              {actionData.formErrors?.email?.join(", ")}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              "OTP 전송"
            )}
          </Button>
        </Form>
      </div>
    </div>
  );
}
