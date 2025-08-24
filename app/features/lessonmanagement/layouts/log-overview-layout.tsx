import { StarIcon } from "lucide-react";
import { ChevronUpIcon } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { Button, buttonVariants } from "~/common/components/ui/button";
import { cn } from "~/lib/utils";

export default function LogOverviewLayout() {
  return (
    <div className="space-y-10 mt-20">
      <div className="flex justify-between">
        <div className="flex gap-10 items-end">
          <div className="size-40 rounded-xl shadow-xl bg-primary/50">
            <img
              src="/images/boy.png"
              alt="studylog"
              className="size-full object-cover"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold">순차구조, 반복문, 변수</h1>
            <p className=" text-2xl font-light">2025.07.29</p>
          </div>
        </div>
      </div>

      <div>
        <Outlet />
      </div>
    </div>
  );
}
