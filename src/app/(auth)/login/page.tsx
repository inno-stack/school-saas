// This is the login page for the application. It allows users to enter their email and password to authenticate and access their dashboard. The form uses react-hook-form for handling form state and validation, and zod for schema validation. Upon successful login, the user is redirected to the dashboard, and a welcome toast message is displayed. If there is an error during login, an error toast message is shown. The page also includes a link for users to check their results with a scratch card and a link to register a new school if they don't have an account. The design features a modern card layout with a background pattern and a logo at the top. The page is responsive and optimized for different screen sizes.
"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Validation schema for the login form using zod to ensure proper email format and that the password field is not empty. This schema is used by react-hook-form to validate the form inputs before submission.
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  // Handles the form submission for the login page. It sends a POST request to the /auth/login endpoint with the form values. If the login is successful, it updates the authentication state with the user data and access token, displays a welcome toast message, and redirects the user to the dashboard. If there is an error during login, it displays an error toast message with the appropriate error message.
  async function onSubmit(values: LoginForm) {
    try {
      const { data } = await api.post("/auth/login", values);
      setAuth(data.data.user, data.data.accessToken);
      toast.success(`Welcome back, ${data.data.user.firstName}!`);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ?? "Login failed. Please try again.",
      );
    }
  }
  // The main return statement of the LoginPage component. It renders a full-screen login page with a background gradient and a subtle pattern. The page includes a centered card containing the login form, which consists of input fields for email and password, along with validation error messages. There are also links for checking results with a scratch card and registering a new school. The design is responsive and visually appealing, with a modern aesthetic.
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-6 lg:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-blue-600 shadow-2xl mb-3 lg:mb-4">
            <GraduationCap className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            InnoCore
          </h1>
          <p className="text-blue-300 mt-1 text-xs lg:text-sm">
            School Management System
          </p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-800">
              Sign in to your account
            </CardTitle>
            <CardDescription>
              Enter your school credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@school.edu.ng"
                  className={errors.email ? "border-red-500" : ""}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    className={
                      errors.password ? "border-red-500 pr-10" : "pr-10"
                    }
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing
                    in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-200 text-center">
              <Link
                href="/check-result"
                className="text-sm text-slate-500 hover:text-blue-600 flex items-center justify-center gap-1.5 transition-colors"
              >
                <GraduationCap className="w-4 h-4" />
                Check your result with a scratch card
              </Link>
            </div>

            <div className="mt-6 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-blue-600 font-medium hover:underline"
              >
                Register your school
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
