import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import type * as React from "react";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function Layout({ children, className }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">
                LXMF Ledger
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Mesh Network Payment Layer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px] font-mono font-medium text-muted-foreground">
              v4
            </span>
            <span className="inline-flex h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">
              Online
            </span>
          </div>
        </div>
      </header>

      <main className={cn("flex-1", className)}>{children}</main>

      <footer className="border-t bg-muted/40 py-4">
        <div className="container px-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            caffeine.ai
          </a>{" "}
          &middot; Demo / Learning Project
        </div>
      </footer>
    </div>
  );
}
