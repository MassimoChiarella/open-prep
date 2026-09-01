"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";

import { useI18n } from "@/features/i18n/I18nProvider";

const mobilePrimaryHrefs = new Set(["/", "/drills", "/progress"]);
const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/drills", label: "Drills" },
  { href: "/benchmark", label: "Benchmark" },
  { href: "/market-sizing", label: "Market Sizing" },
  { href: "/exhibits", label: "Exhibits" },
  { href: "/case-practice", label: "Case Practice" },
  { href: "/content-packs", label: "Content Packs" },
  { href: "/progress", label: "Progress" },
  { href: "/formulas", label: "Formulas" },
  { href: "/settings", label: "Settings" }
];
const focusedTaskRoutes = [
  { exitHref: "/drills", exitLabel: "Exit to Drills", path: "/drills/session", taskLabel: "Active drill" },
  { exitHref: "/benchmark", exitLabel: "Exit to Benchmarks", path: "/benchmark/session", taskLabel: "Active benchmark" },
  { exitHref: "/exhibits", exitLabel: "Exit to Exhibits", path: "/exhibits/sprint", taskLabel: "Exhibit sprint" },
  {
    exitHref: "/case-practice",
    exitLabel: "Exit to Case Practice",
    path: "/case-practice/simulation",
    taskLabel: "Full case simulation"
  }
];

export function AppNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const activeItem = navItems.find((item) => isActive(pathname, item.href));
  const focusedTask = focusedTaskRoutes.find(
    (route) => pathname === route.path || pathname.startsWith(`${route.path}/`)
  );

  if (focusedTask !== undefined) {
    return (
      <nav
        aria-label={t("Primary navigation")}
        className="flex min-h-12 items-center justify-between gap-3 border-t border-ink/10 py-1"
        data-testid="primary-navigation"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t(focusedTask.taskLabel)}</p>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink/50 bg-white px-4 text-sm font-semibold text-ink transition hover:bg-mint motion-reduce:transform-none active:scale-[0.98]"
          data-testid="focused-task-exit"
          href={focusedTask.exitHref}
          onClick={(event) => confirmFocusedTaskExit(event, t("Leave this active session? Submitted progress is saved on this device."))}
        >
          {t(focusedTask.exitLabel)}
        </Link>
      </nav>
    );
  }

  const mobilePrimaryItems = navItems.filter((item) => mobilePrimaryHrefs.has(item.href));
  const mobileMoreItems = navItems.filter((item) => !mobilePrimaryHrefs.has(item.href));
  const activeMobileMoreItem = activeItem !== undefined && !mobilePrimaryHrefs.has(activeItem.href)
    ? activeItem
    : undefined;
  const mobileMoreAriaLabel = activeMobileMoreItem === undefined
    ? t("More destinations")
    : `${t("More destinations")}: ${t(activeMobileMoreItem.label)}`;

  return (
    <nav aria-label={t("Primary navigation")} data-testid="primary-navigation">
      <div className="grid grid-cols-4 gap-1 border-t border-ink/10 py-1 xl:hidden">
        {mobilePrimaryItems.map((item) => (
          <NavLink href={item.href} key={item.href} pathname={pathname} compact>
            {t(item.label)}
          </NavLink>
        ))}
        <details className="group relative" key={pathname}>
          <summary
            aria-label={mobileMoreAriaLabel}
            className={[
              "flex min-h-11 cursor-pointer list-none items-center justify-center border-b-2 px-1 text-center text-xs font-semibold leading-tight transition marker:content-none sm:min-h-12 sm:px-2 sm:text-sm",
              activeMobileMoreItem !== undefined
                ? "border-coral bg-mint/45 text-ink"
                : "border-transparent bg-transparent text-ink/70 hover:bg-mint/45 hover:text-ink"
            ].join(" ")}
          >
            <span>{t("More")}</span>
          </summary>
          <div className="absolute end-0 z-50 mt-2 grid w-[min(20rem,calc(100vw-2rem))] grid-cols-2 gap-1 border border-ink/15 bg-white p-2">
            {mobileMoreItems.map((item) => (
              <NavLink href={item.href} key={item.href} pathname={pathname} compact>
                {t(item.label)}
              </NavLink>
            ))}
          </div>
        </details>
      </div>

      <div className="hidden gap-1 border-t border-ink/10 py-2 xl:grid xl:grid-cols-10">
        {navItems.map((item) => (
          <NavLink href={item.href} key={item.href} pathname={pathname}>
            {t(item.label)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  children,
  compact = false,
  href,
  pathname
}: {
  children: React.ReactNode;
  compact?: boolean;
  href: string;
  pathname: string;
}) {
  const active = isActive(pathname, href);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex min-h-11 min-w-0 items-center justify-center border-b-2 text-center font-semibold transition duration-200",
        compact ? "min-h-11 px-1 text-xs leading-tight sm:min-h-12 sm:px-2 sm:text-sm" : "px-3 text-sm",
        active ? "border-coral bg-mint/45 text-ink" : "",
        !active ? "border-transparent bg-transparent text-ink/65 hover:bg-mint/45 hover:text-ink" : ""
      ].join(" ")}
      href={href}
    >
      <span className="leading-tight">{children}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function confirmFocusedTaskExit(event: MouseEvent<HTMLAnchorElement>, message: string): void {
  if (!window.confirm(message)) {
    event.preventDefault();
  }
}
