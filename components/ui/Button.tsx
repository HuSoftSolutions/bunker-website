"use client";

import Link from "next/link";
import clsx from "clsx";

type ButtonProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

const baseClasses =
  "inline-flex items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 px-5 py-2";

const variantClasses: Record<
  NonNullable<ButtonProps["variant"]>,
  string
> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark focus-visible:outline-primary-dark",
  secondary:
    "bg-secondary text-white hover:bg-primary focus-visible:outline-secondary",
  ghost:
    "bg-transparent text-white border border-white hover:bg-white/10 focus-visible:outline-white",
};

export function Button({
  children,
  className,
  variant = "primary",
  href,
  target,
  rel,
  onClick,
  type = "button",
  disabled = false,
}: ButtonProps) {
  const classes = clsx(baseClasses, variantClasses[variant], className);

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        target={target}
        rel={rel}
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled || undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
