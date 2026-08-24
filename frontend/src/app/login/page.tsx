"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoginMutation } from "@/features/auth/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials, persistAuth } from "@/features/auth/authSlice";
import { apiSlice } from "@/store/apiSlice";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials(result));
      dispatch(apiSlice.util.resetApiState());
      persistAuth(result.token, result.user);
      router.push("/dashboard");
    } catch {
      toast.error("Invalid email or password");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Log in to Mini CRM</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <a href="/register" className="underline">
                Register
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
