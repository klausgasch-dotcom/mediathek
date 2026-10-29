import { Link } from "@tanstack/react-router";
import { Headphones } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm group-hover:rotate-6 transition-transform">
            <Headphones className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Mediathek</span>
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-16 py-8 text-center text-sm text-muted-foreground">
      <p>
        Freie Medien aus Internet Archive, LibriVox, Wikimedia Commons und Wikipedia · Mediathek
      </p>
    </footer>
  );
}
