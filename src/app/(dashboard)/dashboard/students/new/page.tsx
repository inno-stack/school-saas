"use client";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  firstName:   z.string().min(2, "Required"),
  lastName:    z.string().min(2, "Required"),
  middleName:  z.string().optional(),
  gender:      z.enum(["MALE", "FEMALE"]),
  dateOfBirth: z.string().optional(),
  address:     z.string().optional(),
  parentId:    z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AddStudentPage() {
  const router = useRouter();

  const { data: parentsData } = useQuery({
    queryKey: ["parents-list"],
    queryFn:  async () => {
      const { data } = await api.get("/users/parents?limit=100");
      return data.data.parents;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      api.post("/students", values),
    onSuccess: (res) => {
      toast.success(
        `Student enrolled! Reg: ${res.data.data.regNumber}`
      );
      router.push("/dashboard/students");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Failed to add student");
    },
  });

  return (
    <div>
      <Header title="Add New Student" subtitle="Enroll a student" />

      <div className="p-6 max-w-2xl">
        <Link href="/dashboard/students">
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Students
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input
                    placeholder="Chidi"
                    className={errors.firstName ? "border-red-500" : ""}
                    {...register("firstName")}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-500">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Last Name *</Label>
                  <Input
                    placeholder="Okafor"
                    className={errors.lastName ? "border-red-500" : ""}
                    {...register("lastName")}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-500">{errors.lastName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Middle Name</Label>
                  <Input
                    placeholder="Optional"
                    {...register("middleName")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Gender *</Label>
                  <Select onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE")}>
                    <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-xs text-red-500">{errors.gender.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Date of Birth</Label>
                  <Input type="date" {...register("dateOfBirth")} />
                </div>

                <div className="space-y-1.5">
                  <Label>Parent/Guardian</Label>
                  <Select onValueChange={(v) => setValue("parentId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentsData?.map((parent: any) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.firstName} {parent.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>Address</Label>
                  <Input
                    placeholder="Student's home address"
                    {...register("address")}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {mutation.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enrolling...</>
                    : "Enroll Student"
                  }
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}