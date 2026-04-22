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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import api from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ClassesPage() {
  useRequireAuth(["SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN"]);
  const qc = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [classDialog, setClassDialog] = useState(false);
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [activeClass, setActiveClass] = useState<any>(null);
  const [className, setClassName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await api.get("/classes");
      return data.data as any[];
    },
  });

  const { data: classDetail } = useQuery({
    queryKey: ["class", expandedId],
    queryFn: async () => {
      const { data } = await api.get(`/classes/${expandedId}`);
      return data.data;
    },
    enabled: !!expandedId,
  });

  const createClass = useMutation({
    mutationFn: () => api.post("/classes", { name: className }),
    onSuccess: () => {
      toast.success("Class created!");
      qc.invalidateQueries({ queryKey: ["classes"] });
      setClassDialog(false);
      setClassName("");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  const deleteClass = useMutation({
    mutationFn: (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => {
      toast.success("Class deleted");
      qc.invalidateQueries({ queryKey: ["classes"] });
      setDeleteTarget(null);
      if (expandedId === deleteTarget?.id) setExpandedId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  const createSubject = useMutation({
    mutationFn: () =>
      api.post(`/classes/${activeClass?.id}/subjects`, {
        name: subjectName,
        code: subjectCode || undefined,
      }),
    onSuccess: () => {
      toast.success("Subject added!");
      qc.invalidateQueries({ queryKey: ["class", activeClass?.id] });
      setSubjectDialog(false);
      setSubjectName("");
      setSubjectCode("");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  const deleteSubject = useMutation({
    mutationFn: ({
      classId,
      subjectId,
    }: {
      classId: string;
      subjectId: string;
    }) => api.delete(`/classes/${classId}/subjects/${subjectId}`),
    onSuccess: () => {
      toast.success("Subject removed");
      qc.invalidateQueries({ queryKey: ["class", expandedId] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  return (
    <div>
      <Header
        title="Classes & Subjects"
        subtitle="Manage class arms and their subjects"
      />

      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-500">
            {classes?.length ?? 0} class(es)
          </p>
          <Button
            onClick={() => setClassDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" /> New Class
          </Button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-slate-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && classes?.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-600">No classes yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Create classes like JSS 1, SS 2A etc.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-3">
          {classes?.map((cls: any) => (
            <div
              key={cls.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-200 transition-colors"
            >
              {/* Class Row */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() =>
                    setExpandedId(expandedId === cls.id ? null : cls.id)
                  }
                  className="text-slate-400 hover:text-slate-600"
                >
                  {expandedId === cls.id ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>

                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{cls.name}</p>
                  <p className="text-xs text-slate-400">
                    {cls.totalSubjects} subject(s)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      setActiveClass(cls);
                      setSubjectDialog(true);
                    }}
                  >
                    <Plus className="w-3 h-3" /> Subject
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-red-500 w-8 h-8 p-0"
                    onClick={() =>
                      setDeleteTarget({
                        type: "class",
                        id: cls.id,
                        name: cls.name,
                      })
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Subjects (expanded) */}
              {expandedId === cls.id && (
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  {!classDetail?.subjects?.length ? (
                    <p className="text-sm text-slate-400 text-center py-2">
                      No subjects yet.
                      <button
                        className="text-blue-600 ml-1 hover:underline"
                        onClick={() => {
                          setActiveClass(cls);
                          setSubjectDialog(true);
                        }}
                      >
                        Add one →
                      </button>
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {classDetail.subjects.map((subj: any) => (
                        <div
                          key={subj.id}
                          className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 group"
                        >
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span className="text-sm text-slate-700 font-medium">
                            {subj.name}
                          </span>
                          {subj.code && (
                            <Badge className="bg-blue-100 text-blue-600 border-0 text-xs py-0">
                              {subj.code}
                            </Badge>
                          )}
                          <button
                            className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() =>
                              setDeleteTarget({
                                type: "subject",
                                id: subj.id,
                                classId: cls.id,
                                name: subj.name,
                              })
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Class Dialog */}
      <Dialog open={classDialog} onOpenChange={setClassDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Class Name</Label>
            <Input
              placeholder="e.g. JSS 1, SS 2A, Primary 3"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createClass.mutate()}
              disabled={!className || createClass.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createClass.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Class"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subject Dialog */}
      <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject to {activeClass?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Subject Name *</Label>
              <Input
                placeholder="e.g. Mathematics"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subject Code (optional)</Label>
              <Input
                placeholder="e.g. MTH"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                maxLength={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createSubject.mutate()}
              disabled={!subjectName || createSubject.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createSubject.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Subject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === "class" ? "Class" : "Subject"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently deleted.
              {deleteTarget?.type === "class" &&
                " All subjects in this class will also be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget?.type === "class") {
                  deleteClass.mutate(deleteTarget.id);
                } else {
                  deleteSubject.mutate({
                    classId: deleteTarget.classId,
                    subjectId: deleteTarget.id,
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
