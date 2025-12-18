"use client";

import clsx from "clsx";

export const formCardClasses =
  "rounded-3xl border border-white/10 bg-black/40 p-6 text-white shadow-lg shadow-black/30 md:p-8";

export const formLabelClasses =
  "text-xs font-semibold uppercase tracking-wide text-white/70";

export const formControlClasses =
  "w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40";

export const formSelectClasses = clsx(formControlClasses, "appearance-none");

export const formHelpTextClasses = "text-xs text-white/50";

export const formErrorBoxClasses =
  "rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200";

export function FormCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={clsx(formCardClasses, className)}>{children}</div>;
}

export function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={clsx("space-y-2", className)}>
      <span className={formLabelClasses}>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(formControlClasses, className)}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={clsx(formSelectClasses, className)}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(formControlClasses, className)}
    />
  );
}

export function FileInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="file"
      className={clsx(
        "block w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-white hover:file:bg-primary/20",
        className,
      )}
    />
  );
}

export function InlineHelp({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={clsx(formHelpTextClasses, className)}>{children}</p>;
}

export function ErrorBox({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={clsx(formErrorBoxClasses, className)}>{children}</p>;
}

