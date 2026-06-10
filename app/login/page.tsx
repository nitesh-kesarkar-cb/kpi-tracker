import { Suspense } from "react";
import Logo from "@/components/layout/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in — Codeblaze KPI Tracker" };

export default function LoginPage() {
  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo />
          <h1 className="text-xl font-semibold">Codeblaze KPI Tracker</h1>
          <p className="text-muted-foreground text-sm">Sign in to view your KPIs and reviews</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Use your Codeblaze work email to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
        <p className="text-muted-foreground text-center text-xs">
          Trouble signing in? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
