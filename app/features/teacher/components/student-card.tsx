import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/common/components/ui/card";
import { DateTime } from "luxon";

interface StudentCardProps {
  id: string;
  description: string;
  className?: string;
  username: string;
  phone: string;
  birth: string;
  gender: string;
  location: string;
  comment: string;
  parrent_id: string;
  lesson_day: string;
  lesson_time: string;
  avatar: string;
  name: string;
  level: string;
}

export function StudentCard({
  id,
  username,
  phone,
  birth,
  gender,
  location,
  comment,
  parrent_id,
  lesson_day,
  lesson_time,
  avatar,
  name,
  level,
  className,
}: StudentCardProps) {
  return (
    <>
      <Card
        className={`w-full flex flex-row justify-between items-center p-4 bg-transparent hover:bg-blue-500/10 transition-colors duration-300 ${className}`}
      >
        <CardHeader className="w-full">
          <CardTitle className="text-2xl font-semibold leading-none tracking-tight">
            {username}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {phone}
          </CardDescription>
        </CardHeader>
        <CardFooter className="py-10"></CardFooter>
      </Card>
    </>
  );
}
