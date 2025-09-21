import { Form, Link, Outlet, useLoaderData } from "react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/common/components/ui/avatar";
import { Badge } from "~/common/components/ui/badge";
import { Button } from "~/common/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "~/common/components/ui/dialog";
import { Textarea } from "~/common/components/ui/textarea";
import type { Route } from "./+types/profile-layout";
import { makeSSRClient } from "~/supa-client";
import { getUserProfile } from "../queries";

export const loader = async ({
  request,
  params,
}: Route.LoaderArgs & { params: { username: string } }) => {
  const { client } = makeSSRClient(request);
  const profile = await getUserProfile(client, params.username);
  return { profile };
};

export default function ProfileLayout() {
  const { profile } = useLoaderData<typeof loader>();
  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <Avatar className="size-40">
          {profile?.avatar ? (
            <AvatarImage src={profile.avatar} />
          ) : (
            <AvatarFallback>{profile?.name[0]}</AvatarFallback>
          )}
        </Avatar>
        <div className="space-y-5">
          <div className="flex gap-2">
            <h1 className="text-2xl font-semibold">{profile?.name}</h1>
            <Button variant="outline" asChild>
              <Link to="/my/settings">프로필 변경</Link>
            </Button>
            {/* <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">메시지 보내기</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>메시지 보내기</DialogTitle>
                </DialogHeader>
                <DialogDescription className="space-y-4">
                  <span className="text-sm text-muted-foreground">
                    {profile?.name}님에게 메시지를 보내세요.
                  </span>
                  <Form className="space-y-4">
                    <Textarea
                      placeholder="Message"
                      className="resize-none"
                      rows={4}
                    />
                    <Button type="submit">보내기</Button>
                  </Form>
                </DialogDescription>
              </DialogContent>
            </Dialog> */}
          </div>
          <div className="flex gap-2 items-center">
            {profile?.username && (
              <span className="text-sm text-muted-foreground">
                @{profile?.username}
              </span>
            )}
            <Badge variant={"secondary"}>{profile?.level}</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-screen-md">
        <Outlet />
      </div>
    </div>
  );
}
