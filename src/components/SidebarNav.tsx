"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, BarChart2, Settings, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SKILLS } from "@/lib/domain";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/planner", label: "Study Checklist", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 px-5 py-2.5 text-[0.84rem] tracking-[0.01em] transition-[color,background-color] duration-200 ease-out focus-visible:bg-sidebar-accent",
        isActive
          ? "bg-sidebar-accent/55 font-semibold text-sidebar-primary"
          : "font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent/45 hover:text-sidebar-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-2 left-0 w-px bg-sidebar-primary transition-[opacity,transform] duration-200 ease-out",
          isActive
            ? "scale-y-100 opacity-100"
            : "scale-y-75 opacity-0 group-hover:scale-y-100 group-hover:opacity-40",
        )}
      />
      <Icon
        aria-hidden="true"
        strokeWidth={isActive ? 1.9 : 1.5}
        className={cn(
          "h-4 w-4 shrink-0 transition-[color,transform] duration-200 ease-out",
          isActive
            ? "text-sidebar-primary"
            : "text-sidebar-foreground/45 group-hover:translate-x-0.5 group-hover:text-sidebar-foreground/70",
        )}
      />
      <span>{label}</span>
    </Link>
  );
}

const brandMarkClassName =
  "grid h-9 w-9 shrink-0 place-items-center border border-sidebar-primary/40 font-serif text-sm font-semibold tracking-[-0.03em] text-sidebar-primary transition-[border-color,transform,background-color] duration-200 ease-out";

function BrandWordmark() {
  return (
    <span className="min-w-0 leading-none">
      <span className="block truncate font-serif text-[1.15rem] font-semibold tracking-[-0.025em]">
        IELTS tracker
      </span>
      <span className="mt-1.5 block truncate text-[0.68rem] font-medium tracking-[0.04em] text-sidebar-foreground/55">
        Cambridge practice ledger
      </span>
    </span>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className="group flex min-w-0 items-center gap-3 text-sidebar-foreground"
      aria-label="IELTS tracker dashboard"
    >
      <span
        className={cn(
          brandMarkClassName,
          "group-hover:scale-[1.03] group-hover:border-sidebar-primary group-hover:bg-sidebar-accent/40",
        )}
      >
        IT
      </span>
      <BrandWordmark />
    </Link>
  );
}

function skillAnalyticsHref(skill: (typeof SKILLS)[number]) {
  return `/analytics/${skill.toLowerCase()}`;
}

function SkillAnalyticsLinks({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Skill analytics"
      className={cn(
        "border-t border-sidebar-border pt-5 font-serif text-sm italic leading-relaxed text-sidebar-foreground/55",
        className,
      )}
    >
      {SKILLS.map((skill, index) => {
        const href = skillAnalyticsHref(skill);
        const isActive = pathname === href;

        return (
          <span key={skill}>
            {index > 0 ? <span aria-hidden="true"> · </span> : null}
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-sm transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/50",
                isActive
                  ? "text-sidebar-primary"
                  : "hover:text-sidebar-foreground",
              )}
            >
              {skill}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}

function isNavActive(pathname: string, href: string) {
  if (href === "/analytics") {
    return pathname === "/analytics" || pathname.startsWith("/analytics/");
  }
  return pathname === href;
}

export default function SidebarNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const firstLink =
      mobileNavRef.current?.querySelector<HTMLAnchorElement>("a");
    const menuButton = menuButtonRef.current;
    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    document.body.style.overflow = "hidden";
    firstLink?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    desktopQuery.addEventListener("change", handleBreakpointChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", handleBreakpointChange);
      menuButton?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-5 lg:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            brandMarkClassName,
            "hover:scale-[1.03] hover:border-sidebar-primary hover:bg-sidebar-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/50",
          )}
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
        >
          {isOpen ? (
            <X aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
          ) : (
            <Menu aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
          )}
        </button>
        <Link
          href="/"
          className="min-w-0 text-sidebar-foreground"
          aria-label="IELTS tracker dashboard"
        >
          <BrandWordmark />
        </Link>
      </header>

      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 top-16 z-30 cursor-default bg-foreground/25 lg:hidden"
          onClick={closeMenu}
        />
      )}

      <aside
        id="mobile-navigation"
        ref={mobileNavRef}
        role="dialog"
        aria-label="Primary navigation"
        aria-modal={isOpen ? true : undefined}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={cn(
          "fixed bottom-0 left-0 top-16 z-40 flex w-[min(19rem,88vw)] transform flex-col border-r border-sidebar-border bg-sidebar px-6 pb-7 pt-6 transition-transform duration-200 ease-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <nav aria-label="Mobile" className="-mx-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              isActive={isNavActive(pathname, item.href)}
              onClick={closeMenu}
            />
          ))}
        </nav>

        <SkillAnalyticsLinks className="mt-auto" onNavigate={closeMenu} />
      </aside>

      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar lg:px-6 lg:pb-7 lg:pt-8 xl:w-72 xl:px-8 xl:pt-10">
        <div className="mb-8 border-b border-sidebar-border pb-7">
          <Brand />
        </div>

        <nav aria-label="Primary" className="-mx-1 flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              isActive={isNavActive(pathname, item.href)}
            />
          ))}
        </nav>

        <SkillAnalyticsLinks />
      </aside>
    </>
  );
}
