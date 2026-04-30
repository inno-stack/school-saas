// This is the main results management page for teachers and admins. It includes a table of results with search and pagination, as well as actions to add, edit, and delete results. The page also allows downloading individual result sheets as PDFs.

"use client";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  Download,
  FileText,
  Loader2,
  Plus,
  Send,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Define performance level colors
const PERF_COLORS: Record<string, string> = {
  Distinction: "bg-green-100 text-green-700",
  "Upper Credit": "bg-blue-100 text-blue-700",
  Credit: "bg-orange-100 text-orange-700",
  Pass: "bg-yellow-100 text-yellow-700",
  Fail: "bg-red-100 text-red-700",
};
// Main Results Page Component
export default function ResultsPage() {
  useRequireAuth(["SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN"]);
  const qc = useQueryClient();

  const [selectedClass, setSelectedClass] = useState("");
  const [scoreDialog, setScoreDialog] = useState(false);
  const [selStudent, setSelStudent] = useState("");
  const [scores, setScores] = useState<
    Record<string, { ca: string; exam: string }>
  >({});

  // Fetch classes for selector
  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await api.get("/classes");
      return data.data as any[];
    },
  });

  // Fetch class results
  const { data: classResults, isLoading: loadingResults } = useQuery({
    queryKey: ["class-results", selectedClass],
    queryFn: async () => {
      const { data } = await api.get(`/results/class?classId=${selectedClass}`);

      // // Store the termId alongside the results for later use in PDF generation
      // if (data.data) {
      //   data.data.termId = data.data.termId; // Assuming termId is returned in the response
      // }
      return data.data;
    },
    enabled: !!selectedClass,
  });

  // Fetch students in class
  const { data: studentsData } = useQuery({
    queryKey: ["students-in-class", selectedClass],
    queryFn: async () => {
      const { data } = await api.get(`/students?limit=100`);
      return data.data.students as any[];
    },
    enabled: !!selectedClass,
  });

  // Fetch subjects in class
  const { data: classDetail } = useQuery({
    queryKey: ["class-detail", selectedClass],
    queryFn: async () => {
      const { data } = await api.get(`/classes/${selectedClass}`);
      return data.data;
    },
    enabled: !!selectedClass,
  });

  // Submit scores for a student
  // This mutation takes the scores entered in the dialog, formats them, and sends them to the backend. On success, it shows a toast with the average and performance, invalidates the class results query to refresh the table, and resets the dialog state.
  const submitScores = useMutation({
    mutationFn: () => {
      const scoreArray = Object.entries(scores)
        .filter(([_, v]) => v.ca !== "" || v.exam !== "")
        .map(([subjectId, v]) => ({
          subjectId,
          caScore: v.ca !== "" ? parseFloat(v.ca) : undefined,
          examScore: v.exam !== "" ? parseFloat(v.exam) : undefined,
        }));

      return api.post("/results/scores", {
        studentId: selStudent,
        classId: selectedClass,
        scores: scoreArray,
      });
    },
    onSuccess: (res) => {
      toast.success(
        `Scores saved! Average: ${res.data.data.average}% — ${res.data.data.performance}`,
      );
      qc.invalidateQueries({ queryKey: ["class-results"] });
      setScoreDialog(false);
      setScores({});
      setSelStudent("");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  /**
   * Comments state and mutation — add near other useState declarations
   */

  // ── Comments dialog state ──────────────────────────
  const [commentDialog, setCommentDialog] = useState(false);
  const [commentStudent, setCommentStudent] = useState<any>(null);
  const [teacherComment, setTeacherComment] = useState("");
  const [principalComment, setPrincipalComment] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [vacationDate, setVacationDate] = useState("");
  const [resumptionDate, setResumptionDate] = useState("");

  // ── Save comments mutation ─────────────────────────
  const saveComments = useMutation({
    mutationFn: () =>
      api.put("/results/comments", {
        studentId: commentStudent?.student?.id,
        teacherComment: teacherComment || null,
        principalComment: principalComment || null,
        teacherName: teacherName || null,
        principalName: principalName || null,
      }),
    onSuccess: () => {
      toast.success("Comments saved successfully!");
      setCommentDialog(false);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Failed to save comments"),
  });

  // ── Auto-generate comments mutation ───────────────
  const autoGenerate = useMutation({
    mutationFn: () =>
      api.put("/results/comments", {
        studentId: commentStudent?.student?.id,
        teacherName: teacherName || null,
        principalName: principalName || null,
        autoGenerate: true,
      }),
    onSuccess: (res) => {
      // ── Populate the text areas with generated comments ─
      setTeacherComment(res.data.data.teacherComment ?? "");
      setPrincipalComment(res.data.data.principalComment ?? "");
      toast.success("Comments auto-generated! Edit if needed.");
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Failed to generate"),
  });

  // ── Save attendance mutation ───────────────────────
  const saveAttendance = useMutation({
    mutationFn: () =>
      api.put("/results/attendance", {
        studentId: commentStudent?.student?.id,
        vacationDate: vacationDate || null,
        resumptionDate: resumptionDate || null,
      }),
    onSuccess: () => toast.success("Dates saved!"),
    onError: () => toast.error("Failed to save dates"),
  });

  // Publish all results for class
  const publishAll = useMutation({
    mutationFn: () =>
      api.post("/results/publish", { classId: selectedClass, publish: true }),
    onSuccess: (res) => {
      toast.success(`${res.data.data.resultsUpdated} result(s) published!`);
      qc.invalidateQueries({ queryKey: ["class-results"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  // Download PDF function
  async function downloadPdf(
    studentId: string,
    termId: string | undefined,
    name: string,
  ) {
    // Guard: ensure we have a valid termId
    if (!termId) {
      toast.error(
        "Could not determine the active term. Please refresh the page.",
      );
      return;
    }

    const toastId = toast.loading("Generating PDF...");

    try {
      const response = await api.get(
        `/results/pdf?studentId=${studentId}&termId=${termId}`,
        { responseType: "blob" },
      );

      // Check the response is actually a PDF (not an error JSON)
      const rawContentType = response.headers["content-type"];
      const contentType =
        typeof rawContentType === "string" ? rawContentType : "";

      if (!contentType.includes("application/pdf")) {
        // The server returned an error as JSON — parse and show it
        const text = await (response.data as Blob).text();
        try {
          const json = JSON.parse(text);
          toast.error(json.message ?? "Failed to generate PDF", {
            id: toastId,
          });
        } catch {
          toast.error("Failed to generate PDF", { id: toastId });
        }
        return;
      }

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Result_${name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error("[PDF_DOWNLOAD]", err);

      // Try to extract the error message from the blob response
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          toast.error(json.message ?? "Failed to download PDF", {
            id: toastId,
          });
          return;
        } catch {}
      }

      toast.error(err.response?.data?.message ?? "Failed to download PDF", {
        id: toastId,
      });
    }
  }

  const selectedClassData = classes?.find((c: any) => c.id === selectedClass);

  return (
    <div>
      <Header
        title="Results"
        subtitle="Enter scores and manage result sheets"
      />

      <div className="p-6 space-y-6">
        {/* Class Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-700">
              Select Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class to view results" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                        <span className="text-slate-400 ml-2 text-xs">
                          ({cls.totalSubjects} subjects)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClass && (
                <>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                    onClick={() => setScoreDialog(true)}
                  >
                    <Plus className="w-4 h-4" /> Enter Scores
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => publishAll.mutate()}
                    disabled={publishAll.isPending}
                  >
                    <Send className="w-4 h-4" />
                    {publishAll.isPending ? "Publishing..." : "Publish All"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <ResponsiveTable>
          {selectedClass && (
            <div className="bg-white ">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {selectedClassData?.name} — Class Results
                  </h3>
                  {classResults && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {classResults.session} ·{" "}
                      {classResults.term === "FIRST"
                        ? "1st"
                        : classResults.term === "SECOND"
                          ? "2nd"
                          : "3rd"}{" "}
                      Term · {classResults.total} student(s)
                    </p>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Pos.</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Reg No.</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingResults &&
                    Array(5)
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

                  {!loadingResults && classResults?.results?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 font-medium">
                          No results entered yet
                        </p>
                        <p className="text-slate-400 text-sm">
                          Click &quot;Enter Scores&quot; to get started
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Results */}
                  {!loadingResults &&
                    classResults?.results?.map((r: any) => (
                      <TableRow key={r.id} className="hover:bg-slate-50">
                        <TableCell className="font-bold text-blue-600">
                          {r.position ?? "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.student.firstName} {r.student.lastName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {r.student.regNumber}
                        </TableCell>
                        <TableCell>{r.subjectsEntered}</TableCell>
                        <TableCell className="font-semibold">
                          {r.totalScore}
                        </TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          {r.average}%
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "text-xs font-semibold px-2 py-1 rounded-full",
                              PERF_COLORS[r.performance ?? ""] ??
                                "bg-slate-100 text-slate-600",
                            )}
                          >
                            {r.performance ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              r.isPublished
                                ? "bg-green-100 text-green-700 border-0"
                                : "bg-slate-100 text-slate-500 border-0"
                            }
                          >
                            {r.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {/* Actions */}
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-8 h-8 text-blue-500 hover:text-blue-700"
                              onClick={() =>
                                downloadPdf(
                                  r.student.id,
                                  classResults.termId,
                                  `${r.student.lastName}_${r.student.firstName}`,
                                )
                              }
                            >
                              <Download className="w-4 h-4" />
                            </Button>

                            {/**
                             * Fix the cumulative download button.
                             * Was passing sessionId="" because classResults?.sessionId was undefined.
                             */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 text-xs"
                              title="Download cumulative result PDF"
                              disabled={!classResults?.sessionId} // ← disable if no sessionId
                              onClick={async () => {
                                // ── Guard: ensure sessionId exists ──────────
                                if (!classResults?.sessionId) {
                                  toast.error(
                                    "Session ID not available. Please reload the page.",
                                  );
                                  return;
                                }

                                if (!r.student?.id) {
                                  toast.error("Student ID not found.");
                                  return;
                                }

                                const toastId = toast.loading(
                                  "Generating cumulative PDF...",
                                );

                                try {
                                  const response = await api.get(
                                    `/results/cumulative/pdf?studentId=${r.student.id}&sessionId=${classResults.sessionId}`,
                                    { responseType: "blob" },
                                  );

                                  // ── Verify response is actually a PDF ────────
                                  const contentType = String(
                                    response.headers["content-type"] ?? "",
                                  );
                                  if (
                                    !contentType.includes("application/pdf")
                                  ) {
                                    const text = await (
                                      response.data as Blob
                                    ).text();
                                    try {
                                      const json = JSON.parse(text);
                                      toast.error(
                                        json.message ??
                                          "Failed to generate PDF",
                                        { id: toastId },
                                      );
                                    } catch {
                                      toast.error(
                                        "Failed to generate cumulative PDF",
                                        { id: toastId },
                                      );
                                    }
                                    return;
                                  }

                                  const blob = new Blob([response.data], {
                                    type: "application/pdf",
                                  });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement("a");
                                  link.href = url;
                                  link.download = `Cumulative_${r.student.lastName}_${r.student.firstName}.pdf`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);

                                  toast.success("Cumulative PDF downloaded!", {
                                    id: toastId,
                                  });
                                } catch (e: any) {
                                  // ── Parse error from blob response ───────────
                                  if (e.response?.data instanceof Blob) {
                                    try {
                                      const text = await e.response.data.text();
                                      const json = JSON.parse(text);
                                      toast.error(json.message ?? "Failed", {
                                        id: toastId,
                                      });
                                      return;
                                    } catch {}
                                  }
                                  toast.error(
                                    e.response?.data?.message ??
                                      "Failed to generate cumulative PDF",
                                    { id: toastId },
                                  );
                                }
                              }}
                            >
                              <Award className="w-3.5 h-3.5" />
                              Cumulative
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-8 h-8 text-purple-500 hover:text-purple-700"
                              title="Add comments & dates"
                              onClick={() => {
                                setCommentStudent(r);
                                setTeacherComment("");
                                setPrincipalComment("");
                                setCommentDialog(true);
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ResponsiveTable>

        {!selectedClass && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-slate-400 font-medium">
              Select a class above to view and manage results
            </p>
          </div>
        )}
      </div>

      {/* Score Entry Dialog */}
      <Dialog open={scoreDialog} onOpenChange={setScoreDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enter Scores — {selectedClassData?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Student Select */}
            <div className="space-y-1.5">
              <Label>Student *</Label>
              <Select value={selStudent} onValueChange={setSelStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {studentsData?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} — {s.regNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scores per subject */}
            {classDetail?.subjects?.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 px-1">
                  <span className="col-span-5">Subject</span>
                  <span className="col-span-3 text-center">CA (40)</span>
                  <span className="col-span-3 text-center">Exam (60)</span>
                </div>

                {classDetail.subjects.map((subj: any) => (
                  <div
                    key={subj.id}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <div className="col-span-5 text-sm font-medium text-slate-700 truncate">
                      {subj.name}
                    </div>
                    <Input
                      className="col-span-3 h-8 text-sm text-center"
                      type="number"
                      min={0}
                      max={40}
                      placeholder="CA"
                      value={scores[subj.id]?.ca ?? ""}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [subj.id]: { ...prev[subj.id], ca: e.target.value },
                        }))
                      }
                    />
                    <Input
                      className="col-span-3 h-8 text-sm text-center"
                      type="number"
                      min={0}
                      max={60}
                      placeholder="Exam"
                      value={scores[subj.id]?.exam ?? ""}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [subj.id]: { ...prev[subj.id], exam: e.target.value },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {classDetail?.subjects?.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                No subjects in this class yet.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScoreDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submitScores.mutate()}
              disabled={
                !selStudent ||
                !Object.keys(scores).length ||
                submitScores.isPending
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitScores.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Scores"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════
    COMMENTS & DATES DIALOG
════════════════════════════════════════════════ */}
      <Dialog open={commentDialog} onOpenChange={setCommentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Comments & Dates — {commentStudent?.student?.firstName}{" "}
              {commentStudent?.student?.lastName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* ── Staff Names ─────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Class Teacher&apos;s Name</Label>
                <Input
                  placeholder="e.g. Mrs. Ada Okonkwo"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Principal&apos;s Name</Label>
                <Input
                  placeholder="e.g. Dr. James Eze"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                />
              </div>
            </div>

            {/* ── Auto-generate button ─────────────────── */}
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  Auto-Generate Comments
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Automatically generates personalized comments based on the
                  student&apos;s performance and average score.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100 flex-shrink-0 ml-4"
                onClick={() => autoGenerate.mutate()}
                disabled={autoGenerate.isPending || !commentStudent}
              >
                {autoGenerate.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "✨ Auto-Generate"
                )}
              </Button>
            </div>

            {/* ── Teacher Comment ──────────────────────── */}
            <div className="space-y-1.5">
              <Label>Class Teacher&apos;s Comment</Label>
              <textarea
                className="w-full min-h-[90px] px-3 py-2 text-sm border border-slate-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter teacher's comment about the student's performance..."
                value={teacherComment}
                onChange={(e) => setTeacherComment(e.target.value)}
              />
              <p className="text-xs text-slate-400">
                {teacherComment.length}/600 characters
              </p>
            </div>

            {/* Principal Comment */}
            <div className="space-y-1.5">
              <Label>Principal&apos;s Comment</Label>
              <textarea
                className="w-full min-h-[90px] px-3 py-2 text-sm border border-slate-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter principal's comment..."
                value={principalComment}
                onChange={(e) => setPrincipalComment(e.target.value)}
              />
              <p className="text-xs text-slate-400">
                {principalComment.length}/600 characters
              </p>
            </div>

            {/* Vacation & Resumption Dates  */}

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">
                Term Dates
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date of Vacation</Label>
                  <Input
                    type="date"
                    value={vacationDate}
                    onChange={(e) => setVacationDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Resumption Date</Label>
                  <Input
                    type="date"
                    value={resumptionDate}
                    onChange={(e) => setResumptionDate(e.target.value)}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => saveAttendance.mutate()}
                disabled={saveAttendance.isPending}
              >
                {saveAttendance.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Dates"
                )}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCommentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveComments.mutate()}
              disabled={saveComments.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveComments.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Comments"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
