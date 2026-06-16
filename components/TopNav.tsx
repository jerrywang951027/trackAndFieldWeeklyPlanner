import Link from "next/link";
import {
  Home,
  CalendarRange,
  TrendingUp,
  HeartPulse,
  BookOpen,
  UserRound,
  Flame,
} from "lucide-react";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/plan", label: "Plan", icon: CalendarRange },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/recovery", label: "Recovery", icon: HeartPulse },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/home" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Flame className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            Sprint Coach
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <nav className="flex items-center justify-around border-t border-border/60 px-2 py-2 md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
