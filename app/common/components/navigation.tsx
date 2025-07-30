import { Link } from "react-router";
import { Separator } from "./ui/separator";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  BarChart3Icon,
  BellIcon,
  LogOutIcon,
  Menu,
  MessageCircleIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { cn } from "~/lib/utils";

const menus = [
  {
    name: "소개",
    to: "/",
    items: [
      {
        name: "코딩멘토는?",
        description: "친절하게 코딩을 알려주는 코딩수업 플랫폼입니다",
        to: "#about",
      },
      {
        name: "강사소개",
        description: "코딩멘토의 대표강사를 소개합니다.",
        to: "#mentor",
      },
      {
        name: "커리큘럼",
        description: "커리큘럼 안내 - 기초부터 실전까지",
        to: "#curriculum",
      },
      {
        name: "시간표",
        description: "수업 시간표를 확인해보세요",
        to: "#timetable",
      },
      {
        name: "FAQ",
        description: "자주하는 질문들",
        to: "#faq",
      },
    ],
  },

  { name: "수업듣기", to: "/lecture" },
  { name: "수업기록", to: "/studylogs" },
];

export default function Navigation({
  isLoggedIn,
  hasNotifications,
  hasMessages,
}: {
  isLoggedIn: boolean;
  hasNotifications: boolean;
  hasMessages: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <nav className="flex px-4 sm:px-6 md:px-10 lg:px-20 h-16 items-center justify-between fixed top-0 left-0 right-0 z-50 bg-[#3B82F6]">
      <div className="flex items-center">
        {/* Mobile Hamburger Menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild className="md:hidden mr-2">
            <Button variant="ghost" size="icon" className="text-white">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-full max-w-[67vw] p-0 bg-[#3B82F6]"
          >
            <div className="h-16 bg-[#3B82F6] flex items-center px-4">
              <Link
                to="/"
                className="font-bold tracking-tighter text-white text-xl"
                onClick={() => setSheetOpen(false)}
              >
                codingmentor
              </Link>
            </div>
            <div className="p-6">
              <div className="flex flex-col space-y-6">
                {menus.map((menu) => (
                  <Link
                    key={menu.name}
                    to={menu.to}
                    className="text-lg font-medium hover:text-blue-900"
                    onClick={() => setSheetOpen(false)}
                  >
                    {menu.name}
                  </Link>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="font-bold tracking-tighter">
          codingmentor
        </Link>
        <Separator
          orientation="vertical"
          className="h-6 mx-4 hidden md:block"
        />

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {menus.map((menu) => (
              <NavigationMenuItem key={menu.name}>
                {menu.items ? (
                  <>
                    <Link to={menu.to}>
                      <NavigationMenuTrigger>{menu.name}</NavigationMenuTrigger>
                    </Link>
                    <NavigationMenuContent>
                      <ul className="grid w-[600px] font-light gap-3 p-4 grid-cols-2">
                        {menu.items?.map((item) => (
                          <NavigationMenuItem
                            key={item.name}
                            className={cn([
                              "select-none rounded-md transition-colors focus:bg-accent  hover:bg-accent",
                              (item.to === "/products/promote" ||
                                item.to === "/jobs/submit") &&
                                "col-span-2 bg-primary/10 hover:bg-primary/20 focus:bg-primary/20",
                            ])}
                          >
                            <NavigationMenuLink asChild>
                              <Link
                                className="p-3 space-y-1 block leading-none no-underline outline-none"
                                to={item.to}
                              >
                                <span className="text-sm font-medium leading-none">
                                  {item.name}
                                </span>
                                <p className="text-sm leading-snug text-muted-foreground">
                                  {item.description}
                                </p>
                              </Link>
                            </NavigationMenuLink>
                          </NavigationMenuItem>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <Link className={navigationMenuTriggerStyle()} to={menu.to}>
                    {menu.name}
                  </Link>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {isLoggedIn ? (
        <div className="flex items-center gap-2 sm:gap-4">
          <Button size="icon" variant="ghost" asChild className="relative">
            <Link to="/wemake/my/notifications">
              <BellIcon className="size-4" />
              {hasNotifications && (
                <div className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
              )}
            </Link>
          </Button>
          <Button size="icon" variant="ghost" asChild className="relative">
            <Link to="/wemake/my/messages">
              <MessageCircleIcon className="size-4" />
              {hasMessages && (
                <div className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
              )}
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                <AvatarImage src="https://github.com/serranoarevalo.png" />
                <AvatarFallback>N</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="flex flex-col">
                <span className="font-medium">John Doe</span>
                <span className="text-xs text-muted-foreground">@username</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/wemake/my/dashboard">
                    <BarChart3Icon className="size-4 mr-2" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/wemake/my/profile">
                    <UserIcon className="size-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/wemake/my/settings">
                    <SettingsIcon className="size-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/wemake/auth/logout">
                  <LogOutIcon className="size-4 mr-2" />
                  Logout
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            asChild
            variant="secondary"
            className="text-xs sm:text-sm px-2 sm:px-4"
          >
            <Link to="/wemake/auth/login">Login</Link>
          </Button>
          <Button
            asChild
            className="bg-[#2563EB] text-xs sm:text-sm px-2 sm:px-4"
          >
            <Link to="/wemake/auth/join">Join</Link>
          </Button>
        </div>
      )}
    </nav>
  );
}
