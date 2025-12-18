import { useFirebase } from "@/providers/FirebaseProvider";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AdminNavItem = {
  href: string;
  label: string;
};

type AdminShellProps = {
  title: string;
  description?: string;
  navItems?: readonly AdminNavItem[];
  activeHref?: string;
  toolbar?: React.ReactNode;
  alert?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminShell({
  title,
  description,
  navItems = [],
  activeHref,
  toolbar,
  alert,
  children,
}: AdminShellProps) {
  const firebase = useFirebase();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await firebase.doSignOut();
      router.replace("/");
    } catch (error) {
      console.error("[AdminShell] sign out failed", error);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="space-y-6 rounded-3xl border border-white/10   bg-zinc-950 px-6 py-6 shadow-2xl shadow-black/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-primary/80">
              Admin
            </p>
            <h1 className="text-3xl font-black uppercase tracking-[0.3em]">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            {toolbar}
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Sign Out
            </button>
          </div>
        </div>

        {navItems.length > 1 ? (
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide transition",
                  activeHref === item.href
                    ? "bg-primary text-white"
                    : "bg-white/5 text-white/70 hover:bg-primary/20 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {alert ? <div>{alert}</div> : null}
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
