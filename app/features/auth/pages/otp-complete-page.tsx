import type { Route } from "./+types/otp-complete-page";
import { Form, redirect, useNavigation, useSearchParams } from "react-router";
import InputPair from "~/common/components/wemake/input-pair";
import { Button } from "~/common/components/ui/button";
import { z } from "zod";
import { makeSSRClient } from "~/supa-client";
import { LoaderCircle } from "lucide-react";

export const meta: Route.MetaFunction = () => {
  return [{ title: "OTP 인증 | codingmentor" }];
};

const formSchema = z.object({
  // email: z.string().email(),
  phone: z.string(),
  otp: z.string().min(6).max(6),
});

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const { success, data, error } = formSchema.safeParse(
    Object.fromEntries(formData)
  );
  if (!success) {
    return { formErrors: error.flatten((i) => i.message).fieldErrors };
  }
  // const { email, otp } = data;
  const { phone, otp } = data;
  const { client, headers } = makeSSRClient(request);
  const { error: verifyError } = await client.auth.verifyOtp({
    // email,
    phone,
    token: otp,
    type: "sms",
  });
  if (verifyError) {
    return { verifyError: verifyError.message };
  }
  return redirect("/", { headers });
};

export default function OtpPage({ actionData }: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  // const email = searchParams.get("email");
  const phone = searchParams.get("phone");
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" || navigation.state === "loading";
  return (
    <div className="flex flex-col relative items-center justify-center h-full">
      <div className="flex items-center flex-col justify-center w-full max-w-md gap-10">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Confirm OTP</h1>
          <p className="text-sm text-muted-foreground">
            Enter the OTP code sent to your email address.
          </p>
        </div>
        <Form className="w-full space-y-4" method="post">
          {/* <InputPair
            label="이메일"
            description="이메일 주소를 입력해주세요."
            name="email"
            defaultValue={email || ""}
            id="email"
            required
            type="email"
            placeholder="ex) wemake@example.com"
            readOnly
          /> */}

          <InputPair
            label="핸드폰 번호"
            description="핸드폰 번호를 입력해주세요."
            name="phone"
            defaultValue={phone || ""}
            id="phone"
            required
            type="tel"
            placeholder="ex) 01012345678"
            readOnly
          />

          {actionData && "formErrors" in actionData && (
            <p className="text-red-500 text-sm">
              {/* {actionData.formErrors?.email?.join(", ")} */}
              {actionData.formErrors?.phone?.join(", ")}
            </p>
          )}
          <InputPair
            label="OTP"
            description="Enter the OTP code sent to your email address"
            name="otp"
            id="otp"
            required
            type="number"
            placeholder="i.e 1234"
          />
          {actionData && "formErrors" in actionData && (
            <p className="text-red-500 text-sm">
              {actionData.formErrors?.otp?.join(", ")}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              "OTP 인증"
            )}
          </Button>
        </Form>
      </div>
    </div>
  );
}
