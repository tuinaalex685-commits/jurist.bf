import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { UserRole } from "@/server/modules/auth/session";

export function AppLayout({ role, children }: { role: UserRole; children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
