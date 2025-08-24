import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/common/components/ui/card";
import { DateTime } from "luxon";

interface LogCardProps {
  id: string;
  timestamp: string;
  description: string;
  className?: string;
}

export function LogCard({
  id,
  timestamp,
  description,
  className,
}: LogCardProps) {
  const dt = DateTime.fromISO(timestamp, { zone: "utc" }); // PostgreSQL은 보통 UTC임
  const datetime = dt
    .setZone("Asia/Seoul")
    .toFormat("yyyy년 MM월 dd일 HH:mm:ss");

  return (
    <>
      <Card
        className={`w-full flex flex-row justify-between items-center p-4 bg-transparent hover:bg-blue-500/10 transition-colors duration-300 ${className}`}
      >
        <CardHeader className="w-full">
          <CardTitle className="text-2xl font-semibold leading-none tracking-tight">
            {datetime}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardFooter className="py-10"></CardFooter>
      </Card>
    </>
  );
}
