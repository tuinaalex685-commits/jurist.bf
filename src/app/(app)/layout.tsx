import { AppLayout } from "@/components/layout/app-layout";

/** Groupe applicatif : les écrans « Halls » (sidebar + header). */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
