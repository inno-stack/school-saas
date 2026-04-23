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
  BookOpen,
  Download,
  FileText,
  Loader2,
  Plus,
  Send,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PERF_COLORS: Record<string, string> = {
  Distinction: "bg-green-100 text-green-700",
  "Upper Credit": "bg-blue-100 text-blue-700",
  Credit: "bg-orange-100 text-orange-700",
  Pass: "bg-yellow-100 text-yellow-700",
  Fail: "bg-red-100 text-red-700",
};

export default function ResultsPage() {
  useRequireAuth(["SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN"]);
  const qc = useQueryClient();

  const [selectedClass, setSelectedClass] = useState("");
  const [scoreDialog, setScoreDialog] = useState(false);
  const [selStudent, setSelStudent] = useState("");
  const [scores, setScores] = useState<
    Record<string, { ca: string; exam: string }>
  >({});

  // Fetch classes
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

      // // Store the termId alongside
      // data.data should contain { results: [...], termId: "..." }
      // depending on how your backend API is structured.
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

  // Submit scores
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

  // Download PDF
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
      const contentType = response.headers["content-type"] ?? "";
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

      // Create download link
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
        {selectedClass && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}

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
    </div>
  );
}
