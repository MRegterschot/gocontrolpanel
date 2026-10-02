"use client";
import { LoginForm } from "@/forms/login-form";
import { routes } from "@/routes";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const LoginPage = () => {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push(routes.dashboard);
    }
  }, [status, router]);

  const handleLogin = () => {
    signIn("nadeo");
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm handleLogin={handleLogin} />
      </div>
    </div>
  );
};

export default LoginPage;
