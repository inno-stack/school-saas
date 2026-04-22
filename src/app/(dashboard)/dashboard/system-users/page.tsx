"use client";
import { Header } from "@/components/layout/Header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import api from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useState } from "react";

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  SCHOOL_ADMIN: "bg-blue-100 text-blue-700",
  TEACHER: "bg-green-100 text-green-700",
  PARENT: "bg-orange-100 text-orange-700",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  SCHOOL_ADMIN: "School Admin",
  TEACHER: "Teacher",
  PARENT: "Parent",
};

const AVATAR_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-600",
  SCHOOL_ADMIN: "bg-blue-600",
  TEACHER: "bg-green-600",
  PARENT: "bg-orange-500",
};

export default function SystemUsersPage() {
  useRequireAuth(["SUPER_ADMIN"]);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: page.toString(),
    limit: "20",
    ...(search && { search }),
    ...(role !== "all" && { role }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search, role],
    queryFn: async () => {
      const { data } = await api.get(`/admin/users?${params}`);
      return data.data;
    },
  });

  // Dashboard data for role breakdown stats
  const { data: dashData } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/admin/dashboard");
      return data.data;
    },
  });

  return (
    <div>
      <Header
        title="System Users"
        subtitle="All users across every school on the platform"
      />

      <div className="p-6 space-y-6">
        {/* Role Breakdown Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={dashData?.overview?.totalUsers ?? 0}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="School Admins"
            value={dashData?.userBreakdown?.admins ?? 0}
            icon={ShieldCheck}
            color="purple"
          />
          <StatCard
            title="Teachers"
            value={dashData?.userBreakdown?.teachers ?? 0}
            icon={UserCheck}
            color="green"
          />
          <StatCard
            title="Parents"
            value={dashData?.userBreakdown?.parents ?? 0}
            icon={Users}
            color="orange"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            value={role}
            onValueChange={(v) => {
              setRole(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              <SelectItem value="SCHOOL_ADMIN">School Admin</SelectItem>
              <SelectItem value="TEACHER">Teacher</SelectItem>
              <SelectItem value="PARENT">Parent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data && (
          <p className="text-sm text-slate-500">
            Showing <strong>{data.users.length}</strong> of{" "}
            <strong>{data.pagination.total}</strong> users
          </p>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>School</TableHead>
                <TableHead>School Status</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      {Array(7)
                        .fill(0)
                        .map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}

              {!isLoading && data?.users?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium">No users found</p>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                data?.users?.map((user: any) => (
                  <TableRow key={user.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback
                            className={`text-white text-xs font-bold ${
                              AVATAR_COLORS[user.role] ?? "bg-slate-500"
                            }`}
                          >
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-800">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          ROLE_STYLES[user.role]
                        }`}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {user.school?.name ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.school && (
                        <Badge
                          className={
                            user.school.isActive
                              ? "bg-green-100 text-green-700 border-0"
                              : "bg-red-100 text-red-700 border-0"
                          }
                        >
                          {user.school.isActive ? "Active" : "Disabled"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.isActive
                            ? "bg-green-100 text-green-700 border-0"
                            : "bg-slate-100 text-slate-500 border-0"
                        }
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString("en-GB")}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data?.pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
