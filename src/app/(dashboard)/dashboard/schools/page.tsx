"use client";
import { Header } from "@/components/layout/Header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ResponsiveTable } from "@/components/ui/responsive-table";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CreditCard,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Search,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// This page is only accessible to SUPER_ADMIN users, but we still check permissions on the server for all actions as an extra layer of security.

// The UI allows super admins to view a paginated list of all schools, see summary stats, search and filter schools, view detailed info about each school, and enable/disable schools as needed.
export default function AllSchoolsPage() {
  useRequireAuth(["SUPER_ADMIN"]);
  const qc = useQueryClient();

  // Local state for filters, pagination and dialogs
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [toggleTarget, setToggleTarget] = useState<any>(null);
  const [viewSchool, setViewSchool] = useState<any>(null);

  // Build query params for schools list API
  const params = new URLSearchParams({
    page: page.toString(),
    limit: "20",
    ...(search && { search }),
    ...(status !== "all" && { status }),
  });

  // Fetch paginated schools list
  const { data, isLoading } = useQuery({
    queryKey: ["admin-schools", page, search, status],
    queryFn: async () => {
      const { data } = await api.get(`/admin/schools?${params}`);
      return data.data;
    },
  });

  // Fetch dashboard summary stats
  const { data: dashData } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/admin/dashboard");
      return data.data;
    },
  });

  // Fetch single school detail for view dialog
  const { data: schoolDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["admin-school-detail", viewSchool?.id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/schools/${viewSchool.id}`);
      return data.data;
    },
    enabled: !!viewSchool?.id,
  });

  // toggleschool
  const toggleSchool = useMutation({
    mutationFn: (id: string) => api.post(`/admin/schools/${id}/toggle`),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ["admin-schools"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setToggleTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  // Handlers for enabling/disabling schools and viewing details are defined here, using react-query mutations and queries to interact with the API and manage server state. The UI is built using a combination of custom components and Radix UI primitives, styled with Tailwind CSS for a clean and responsive design.
  return (
    <div>
      <Header
        title="All Schools"
        subtitle="Manage every school on the platform"
      />

      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Schools"
            value={dashData?.overview?.totalSchools ?? 0}
            icon={Building2}
            color="blue"
          />
          <StatCard
            title="Active Schools"
            value={dashData?.overview?.activeSchools ?? 0}
            icon={ToggleRight}
            color="green"
          />
          <StatCard
            title="Disabled Schools"
            value={dashData?.overview?.disabledSchools ?? 0}
            icon={ToggleLeft}
            color="red"
          />
          <StatCard
            title="Total Students"
            value={dashData?.overview?.totalStudents ?? 0}
            icon={GraduationCap}
            color="purple"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, email or slug..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data && (
          <p className="text-sm text-slate-500">
            Showing <strong>{data.schools.length}</strong> of{" "}
            <strong>{data.pagination.total}</strong> schools
          </p>
        )}

        {/* Schools Table */}
        <ResponsiveTable>
          <div className="bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>School</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Cards</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array(6)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        {Array(9)
                          .fill(0)
                          .map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}

                {!isLoading && data?.schools?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 font-medium">
                        No schools found
                      </p>
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  data?.schools?.map((school: any) => (
                    <TableRow key={school.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {school.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {school.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-600">
                        {school.slug}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm">{school.stats.users}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm">
                            {school.stats.students}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm">
                            {school.stats.results}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm">
                            {school.stats.scratchCards}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            school.isActive
                              ? "bg-green-100 text-green-700 border-0"
                              : "bg-red-100 text-red-700 border-0"
                          }
                        >
                          {school.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {new Date(school.createdAt).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setViewSchool(school)}
                            >
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={
                                school.isActive
                                  ? "text-red-600"
                                  : "text-green-600"
                              }
                              onClick={() => setToggleTarget(school)}
                            >
                              {school.isActive ? (
                                <>
                                  <ToggleLeft className="w-4 h-4 mr-2" />
                                  Disable School
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="w-4 h-4 mr-2" />
                                  Enable School
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </ResponsiveTable>

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

      {/* Toggle School Dialog */}
      <AlertDialog
        open={!!toggleTarget}
        onOpenChange={() => setToggleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.isActive ? "Disable" : "Enable"}{" "}
              {toggleTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive
                ? "This will immediately log out ALL users of this school and block access until re-enabled."
                : "This will restore access for all users of this school."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                toggleTarget?.isActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
              onClick={() =>
                toggleTarget && toggleSchool.mutate(toggleTarget.id)
              }
              disabled={toggleSchool.isPending}
            >
              {toggleSchool.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : toggleTarget?.isActive ? (
                "Disable School"
              ) : (
                "Enable School"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View School Dialog */}
      <Dialog open={!!viewSchool} onOpenChange={() => setViewSchool(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewSchool?.name}</DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="space-y-3 py-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
            </div>
          ) : (
            schoolDetail && (
              <div className="space-y-4 py-2">
                {/* School Info */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Slug", value: schoolDetail.slug },
                    { label: "Email", value: schoolDetail.email },
                    { label: "Phone", value: schoolDetail.phone ?? "—" },
                    { label: "Address", value: schoolDetail.address ?? "—" },
                    { label: "Website", value: schoolDetail.website ?? "—" },
                    { label: "Motto", value: schoolDetail.motto ?? "—" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-slate-50 rounded-lg p-3"
                    >
                      <p className="text-xs text-slate-400 mb-0.5">
                        {item.label}
                      </p>
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Users", value: schoolDetail.stats?.users },
                    { label: "Students", value: schoolDetail.stats?.students },
                    { label: "Classes", value: schoolDetail.stats?.classes },
                    { label: "Subjects", value: schoolDetail.stats?.subjects },
                    { label: "Results", value: schoolDetail.stats?.results },
                    { label: "Cards", value: schoolDetail.stats?.scratchCards },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-blue-50 rounded-lg p-3 text-center"
                    >
                      <p className="text-lg font-bold text-blue-700">
                        {stat.value ?? 0}
                      </p>
                      <p className="text-xs text-blue-500">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Admin Users */}
                {schoolDetail.users?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">
                      School Admins
                    </p>
                    {schoolDetail.users.map((admin: any) => (
                      <div
                        key={admin.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg mb-1"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {admin.firstName} {admin.lastName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {admin.email}
                          </p>
                        </div>
                        <Badge
                          className={
                            admin.isActive
                              ? "bg-green-100 text-green-700 border-0"
                              : "bg-red-100 text-red-700 border-0"
                          }
                        >
                          {admin.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent Sessions */}
                {schoolDetail.sessions?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">
                      Recent Sessions
                    </p>
                    {schoolDetail.sessions.map((session: any) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg mb-1"
                      >
                        <p className="text-sm font-medium">{session.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {session._count?.terms ?? 0} terms
                          </span>
                          {session.isActive && (
                            <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
