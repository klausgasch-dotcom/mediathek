// Kleine, wiederverwendbare Oberflächen-Bausteine.
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Music } from "lucide-react";
import { cn } from "@/lib/utils";

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Cover-Bild mit hübschem Farbverlauf als Ersatz, falls kein (funktionierendes) Bild da ist. */
export function Artwork({
  src,
  seed,
  icon,
  label,
  className,
  rounded = "rounded-2xl",
  contain,
}: {
  src?: string;
  seed: string;
  icon?: ReactNode;
  label?: string;
  className?: string;
  rounded?: string;
  /** Logos (z. B. Radiosender) nicht beschneiden */
  contain?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const h = hash(seed);
  const hue1 = h % 360;
  const hue2 = (hue1 + 50 + (h % 70)) % 360;
  const showImg = src && !failed;
  const initials = (label ?? seed)
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn("@container relative overflow-hidden shrink-0", rounded, className)}
      style={{
        backgroundImage: `linear-gradient(135deg, oklch(0.55 0.15 ${hue1}), oklch(0.32 0.12 ${hue2}))`,
      }}
    >
      {showImg ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full",
            contain ? "object-contain p-[14%] bg-white/95" : "object-cover",
          )}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/90">
          {icon ??
            (initials ? (
              <span className="font-display font-extrabold text-[min(2.2rem,38cqw)] tracking-tight">
                {initials}
              </span>
            ) : (
              <Music className="h-1/3 w-1/3" />
            ))}
        </div>
      )}
    </div>
  );
}

export function Equalizer({ paused, className }: { paused?: boolean; className?: string }) {
  return (
    <span className={cn("eq", paused && "paused", className)} aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="aurora pt-6 pb-8 sm:pt-10">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      )}
      <h1 className="mt-2 text-4xl sm:text-5xl font-display font-extrabold leading-[1.02]">
        {title}
      </h1>
      {children && <div className="mt-3 max-w-2xl text-muted-foreground">{children}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  to,
  linkLabel = "Alle anzeigen",
}: {
  title: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-display font-bold">{title}</h2>
      {to && (
        <Link
          to={to}
          className="inline-flex items-center gap-0.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {linkLabel} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition",
        active
          ? "bg-foreground text-background"
          : "bg-secondary text-secondary-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
        {icon}
      </div>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function SkeletonGrid({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}
