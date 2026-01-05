import { Heading } from "@/ui-kit/heading";

type AdminShellProps = {
  title: string;
  toolbar?: React.ReactNode;
  alert?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminShell({
  title,
  toolbar,
  alert,
  children,
}: AdminShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1} className="text-lg font-semibold text-white">
          {title}
        </Heading>
        {toolbar ? <div className="flex flex-wrap items-center gap-3">{toolbar}</div> : null}
      </div>

      {alert ? (
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          {alert}
        </div>
      ) : null}

      <main className="space-y-6">{children}</main>
    </div>
  );
}
