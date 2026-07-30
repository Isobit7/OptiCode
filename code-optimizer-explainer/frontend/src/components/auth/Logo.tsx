interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export function Logo({ size = "md" }: LogoProps) {
  const text = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl";

  return (
    <div className="flex items-center gap-2">
      <span className={`font-heading font-black tracking-[-0.04em] text-white ${text}`}>
        Opti<span className="text-(--auth-accent)">Code</span>
      </span>
    </div>
  );
}
