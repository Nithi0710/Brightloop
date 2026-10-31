"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: data.email.toLowerCase(),
        password: data.password,
      });

      if (res?.error) {
        toast.error(res.error);
        setIsLoading(false);
        return;
      }

      toast.success("Signed in successfully. Redirecting...");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const quickFill = (email: string) => {
    setValue("email", email);
    setValue("password", "Password123!");
    toast.info(`Filled credentials for ${email}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 items-center justify-center shadow-lg shadow-indigo-500/25 mb-2">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sign in to Brightloop
          </h1>
          <p className="text-xs text-muted-foreground">
            Enterprise subscription lifecycle and billing management platform
          </p>
        </div>

        {/* Login Card */}
        <div className="p-8 rounded-2xl bg-card border border-border shadow-sm space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Work Email
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Fill Demo Credentials */}
          <div className="pt-4 border-t border-border space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              Quick-Fill Demo Credentials
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickFill("admin@brightloop.io")}
                className="px-2 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-accent text-[11px] font-medium text-foreground transition-colors text-center"
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => quickFill("sarah.staff@brightloop.io")}
                className="px-2 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-accent text-[11px] font-medium text-foreground transition-colors text-center"
              >
                💼 Staff
              </button>
              <button
                type="button"
                onClick={() => quickFill("customer@techflow.io")}
                className="px-2 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-accent text-[11px] font-medium text-foreground transition-colors text-center"
              >
                🏢 Customer
              </button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground">
              Default password: <code className="font-mono bg-muted px-1 rounded">Password123!</code>
            </p>
          </div>
        </div>

        {/* Footer link */}
        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Register as Customer
          </Link>
        </p>
      </div>
    </div>
  );
}

