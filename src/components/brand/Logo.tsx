import { cn } from "@/lib/utils";

/** Logo Vik Studios (public/brand). Version blanche automatique en mode sombre. */
export function Logo({ className, variant = "full" }: { className?: string; variant?: "full" | "icon" }) {
  if (variant === "icon") return <img src="/brand/vik-studios-icon.svg" alt="Vik Studios" className={cn("h-7 w-7", className)} />;
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img src="/brand/vik-studios-logo.svg" alt="Vik Studios" className="h-full w-auto dark:hidden" />
      <img src="/brand/vik-studios-logo-white.svg" alt="Vik Studios" className="hidden h-full w-auto dark:block" />
    </span>
  );
}
