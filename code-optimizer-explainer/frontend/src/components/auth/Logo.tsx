import logoWebp from "@/assets/logo.webp";
import logoPng from "@/assets/logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export function Logo({ size = "md" }: LogoProps) {
  const dims = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12" : "h-9 w-9";
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <div className="flex items-center gap-2.5">
      <picture>
        <source srcSet={logoWebp} type="image/webp" />
        <img
          src={logoPng}
          alt="OptiCode"
          width={size === "sm" ? 28 : size === "lg" ? 48 : 36}
          height={size === "sm" ? 28 : size === "lg" ? 48 : 36}
          decoding="async"
          className={`${dims} rounded-xl border border-white/10 object-cover shadow-md`}
        />
      </picture>
      <span className={`font-heading font-black tracking-[-0.04em] text-white ${text}`}>
        Opti<span className="text-(--auth-accent)">Code</span>
      </span>
    </div>
  );
}
