import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignupPage() {
  return <AuthCard mode="signup" />;
}
