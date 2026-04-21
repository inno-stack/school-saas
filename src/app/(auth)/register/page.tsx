"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const registerSchema = z.object({
  schoolName: z.string().min(2, "School name required"),
  schoolEmail: z.string().email("Invalid school email"),
  schoolPhone: z.string().optional(),
  adminFirstName: z.string().min(2, "First name required"),
  adminLastName: z.string().min(2, "Last name required"),
  adminEmail: z.string().email("Invalid admin email"),
  password: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "One uppercase letter required")
    .regex(/[0-9]/, "One number required"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [success, setSuccess] = useState(false);
  const [schoolSlug, setSchoolSlug] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterForm) {
    try {
      const { data } = await api.post("/auth/register", values);
      setSchoolSlug(data.data.school.slug);
      setSuccess(true);
      toast.success("School registered successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Registration failed.");
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 text-center">
          <CardContent className="pt-10 pb-8 px-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Registration Successful!
            </h2>
            <p className="text-slate-500 mb-2">
              Your school has been registered on InnoCore.
            </p>
            <p className="text-sm bg-slate-100 rounded-lg px-4 py-2 font-mono text-slate-700 mb-6">
              Slug: <strong>{schoolSlug}</strong>
            </p>
            <Button
              onClick={() => router.push("/login")}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg relative">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-2xl mb-3">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Register Your School
          </h1>
          <p className="text-blue-300 text-sm mt-1">
            Get started with InnoCore in minutes
          </p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-800">
              School Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* School Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>School Name</Label>
                  <Input
                    placeholder="Greenfield Academy"
                    className={errors.schoolName ? "border-red-500" : ""}
                    {...register("schoolName")}
                  />
                  {errors.schoolName && (
                    <p className="text-xs text-red-500">
                      {errors.schoolName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>School Email</Label>
                  <Input
                    type="email"
                    placeholder="info@school.edu.ng"
                    className={errors.schoolEmail ? "border-red-500" : ""}
                    {...register("schoolEmail")}
                  />
                  {errors.schoolEmail && (
                    <p className="text-xs text-red-500">
                      {errors.schoolEmail.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Phone (optional)</Label>
                  <Input
                    placeholder="08012345678"
                    {...register("schoolPhone")}
                  />
                </div>
              </div>

              <Separator />
              <p className="text-sm font-semibold text-slate-700">
                Admin Account
              </p>

              {/* Admin Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input
                    placeholder="John"
                    className={errors.adminFirstName ? "border-red-500" : ""}
                    {...register("adminFirstName")}
                  />
                  {errors.adminFirstName && (
                    <p className="text-xs text-red-500">
                      {errors.adminFirstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input
                    placeholder="Doe"
                    className={errors.adminLastName ? "border-red-500" : ""}
                    {...register("adminLastName")}
                  />
                  {errors.adminLastName && (
                    <p className="text-xs text-red-500">
                      {errors.adminLastName.message}
                    </p>
                  )}
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>Admin Email</Label>
                  <Input
                    type="email"
                    placeholder="admin@school.edu.ng"
                    className={errors.adminEmail ? "border-red-500" : ""}
                    {...register("adminEmail")}
                  />
                  {errors.adminEmail && (
                    <p className="text-xs text-red-500">
                      {errors.adminEmail.message}
                    </p>
                  )}
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
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
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 h-11"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register School"
                )}
              </Button>

              <p className="text-center text-sm text-slate-500">
                Already registered?{" "}
                <Link
                  href="/login"
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
