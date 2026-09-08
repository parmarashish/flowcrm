"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useRegisterMutation } from "@/features/auth/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials, persistAuth } from "@/features/auth/authSlice";
import { apiSlice } from "@/store/apiSlice";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, { isLoading }] = useRegisterMutation();
  const dispatch = useAppDispatch();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const result = await register({ name, email, password }).unwrap();
      dispatch(setCredentials(result));
      dispatch(apiSlice.util.resetApiState());
      persistAuth(result.token, result.user);
      router.push("/dashboard");
    } catch (err) {
      const message =
        (err as { data?: { error?: { message?: string } } })?.data?.error?.message ??
        "Registration failed";
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f1f3f4] text-[#0f1923]">
      {/* Top AWS Console Dark Header */}
      <header className="flex h-12 items-center border-b border-[#232f3e] bg-[#0f1923] px-6 [--logo-wordmark:#ffffff]">
        <div className="flex items-center gap-2">
          <Logo size="sm" variant="full" />
          <span className="text-[10px] uppercase tracking-wider text-[#879596]">Account Registration</span>
        </div>
      </header>

      {/* Main Registration Box */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
        <Logo size="lg" variant="full" />
        <div className="w-full max-w-[420px] rounded-[2px] border border-[#d5d9d9] bg-white shadow-none">
          {/* Card Header */}
          <div className="border-b border-[#d5d9d9] bg-[#f8f9fa] p-4">
            <h1 className="text-base font-semibold text-[#0f1923]">Create CRM Account</h1>
            <p className="text-xs text-[#545b64] mt-0.5">
              Set up your profile to start tracking sales leads
            </p>
          </div>

          {/* Card Body */}
          <div className="p-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-[#545b64]">
                  Full Name <span className="text-[#d13212]">*</span>
                </Label>
                <Input
                  id="name"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-[#545b64]">
                  Email Address <span className="text-[#d13212]">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-[#545b64]">
                  Password <span className="text-[#d13212]">*</span>
                </Label>
                <PasswordInput
                  id="password"
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-[11px] text-[#879596]">Must be at least 8 characters.</span>
              </div>

              <Button type="submit" disabled={isLoading} className="mt-1 h-8 w-full gap-1.5">
                {isLoading ? "Creating account..." : "Register"}
                {!isLoading && <ArrowRight className="size-3.5" />}
              </Button>

              <div className="mt-2 flex items-center justify-between border-t border-[#d5d9d9] pt-3 text-xs text-[#545b64]">
                <span>Already registered?</span>
                <Link href="/login" className="font-medium text-[#0066cc] hover:underline">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#d5d9d9] bg-white py-3 text-center text-[11px] text-[#879596]">
        FlowCRM &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
}
