"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  GraduationCap,
  Loader2,
  Printer,
  Search,
  User,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ── Validation ─────────────────────────────────────
const schema = z.object({
  regNumber: z.string().min(1, "Registration number is required"),
  pin: z
    .string()
    .length(12, "PIN must be exactly 12 digits")
    .regex(/^\d+$/, "PIN must contain numbers only"),
});

type FormData = z.infer<typeof schema>;

// ── Types ───────────────────────────────────────────
interface SubjectResult {
  sn: number;
  name: string;
  code: string | null;
  caScore: number | null;
  examScore: number | null;
  totalScore: number | null;
  grade: string | null;
  description: string | null;
  remark: string | null;
  positionInClass: string | null;
  classAverage: number | null;
}

interface ResultData {
  school: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    motto: string | null;
  };
  student: {
    fullName: string;
    regNumber: string;
    gender: string;
  };
  class: string;
  session: string;
  term: string;
  summary: {
    subjectsOffered: number;
    subjectsEvaluated: number;
    totalScore: number;
    average: number;
    position: string | null;
    outOf: number;
    performance: string | null;
  };
  attendance: {
    daysOpen: number | null;
    daysPresent: number | null;
    daysAbsent: number | null;
    vacationDate: string | null;
    resumptionDate: string | null;
  };
  subjects: SubjectResult[];
  psychomotorSkills: { name: string; rating: string | null }[];
  socialBehaviour: { name: string; rating: string | null }[];
  comments: {
    teacher: string | null;
    teacherName: string | null;
    principal: string | null;
    principalName: string | null;
  };
  gradeKey: {
    range: string;
    grade: string;
    description: string;
    remark: string;
  }[];
  cardInfo?: {
    usesRemaining: number;
    message: string;
  };
}

// ── Grade colors ────────────────────────────────────
function gradeColor(grade: string | null) {
  switch (grade) {
    case "A":
      return "text-green-600 font-bold";
    case "B":
      return "text-blue-600 font-bold";
    case "C":
      return "text-orange-500 font-bold";
    case "P":
      return "text-yellow-600 font-bold";
    case "F":
      return "text-red-600 font-bold";
    default:
      return "text-slate-500";
  }
}

function gradeBg(grade: string | null) {
  switch (grade) {
    case "A":
      return "bg-green-100 text-green-700";
    case "B":
      return "bg-blue-100 text-blue-700";
    case "C":
      return "bg-orange-100 text-orange-700";
    case "P":
      return "bg-yellow-100 text-yellow-700";
    case "F":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

const PERF_COLORS: Record<string, string> = {
  Distinction: "bg-green-500",
  "Upper Credit": "bg-blue-500",
  Credit: "bg-orange-500",
  Pass: "bg-yellow-500",
  Fail: "bg-red-500",
};

function ratingLabel(r: string | null) {
  switch (r) {
    case "EXCELLENT":
      return "5 — Excellent";
    case "GOOD":
      return "4 — Good";
    case "FAIR":
      return "3 — Fair";
    case "POOR":
      return "2 — Poor";
    case "VERY_POOR":
      return "1 — Very Poor";
    default:
      return "—";
  }
}

function termLabel(term: string) {
  return term === "FIRST"
    ? "1st Term"
    : term === "SECOND"
      ? "2nd Term"
      : "3rd Term";
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Main Component ──────────────────────────────────
export default function CheckResultPage() {
  const [result, setResult] = useState<ResultData | null>(null);
  const [lastPin, setLastPin] = useState("");
  const [lastReg, setLastReg] = useState("");
  const [showSkills, setShowSkills] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // ── Submit ──────────────────────────────────────
  async function onSubmit(values: FormData) {
    try {
      const { data } = await axios.post("/api/scratch-cards/validate", values);
      setResult(data.data);
      setLastPin(values.pin);
      setLastReg(values.regNumber);

      if (data.data.cardInfo) {
        toast.info(data.data.cardInfo.message, { duration: 6000 });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message ?? "Something went wrong";
      toast.error(msg, { duration: 5000 });
    }
  }

  // ── Download PDF ────────────────────────────────
  async function downloadPdf() {
    if (!result || !lastPin || !lastReg) return;
    setDownloading(true);
    const toastId = toast.loading("Generating your result PDF...");

    try {
      const response = await axios.post(
        "/api/scratch-cards/validate-pdf",
        { regNumber: lastReg, pin: lastPin },
        { responseType: "blob" },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Result_${result.student.fullName}_${termLabel(result.term)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded!", { id: toastId });
    } catch {
      toast.error("Failed to download PDF. Please try again.", { id: toastId });
    } finally {
      setDownloading(false);
    }
  }

  // ── UI ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Background dots */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-2xl mb-5">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            InnoCore Result Portal
          </h1>
          <p className="text-blue-300 text-sm max-w-md mx-auto">
            Enter your registration number and scratch card PIN to access your
            academic result
          </p>
        </div>

        {/* Search Form */}
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur mb-8">
          <CardContent className="pt-6 pb-6">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col sm:flex-row gap-4 items-end"
            >
              {/* Reg Number */}
              <div className="flex-1 space-y-1.5">
                <Label className="text-slate-700 font-medium">
                  Registration Number
                </Label>
                <Input
                  placeholder="e.g. GRE/2026/001"
                  className={cn(
                    "h-11 uppercase",
                    errors.regNumber && "border-red-400",
                  )}
                  {...register("regNumber")}
                />
                {errors.regNumber && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.regNumber.message}
                  </p>
                )}
              </div>

              {/* PIN */}
              <div className="flex-1 space-y-1.5">
                <Label className="text-slate-700 font-medium">
                  Scratch Card PIN
                </Label>
                <Input
                  placeholder="12-digit PIN"
                  maxLength={12}
                  className={cn(
                    "h-11 tracking-widest font-mono",
                    errors.pin && "border-red-400",
                  )}
                  {...register("pin")}
                />
                {errors.pin && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.pin.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-8 bg-blue-600 hover:bg-blue-700 gap-2 sm:mb-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Check Result
                  </>
                )}
              </Button>
            </form>

            {/* Info note */}
            <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <CreditCard className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Each scratch card can be used <strong>4 times</strong> across
                all 3 terms of one academic session. Cards from a previous
                session cannot be used for a new session.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Result Sheet */}
        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Card Usage Info */}
            {result.cardInfo && (
              <div
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border",
                  result.cardInfo.usesRemaining === 0
                    ? "bg-red-50 border-red-200"
                    : "bg-green-50 border-green-200",
                )}
              >
                <CheckCircle2
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    result.cardInfo.usesRemaining === 0
                      ? "text-red-500"
                      : "text-green-500",
                  )}
                />
                <p
                  className={cn(
                    "text-sm font-medium",
                    result.cardInfo.usesRemaining === 0
                      ? "text-red-700"
                      : "text-green-700",
                  )}
                >
                  {result.cardInfo.message}
                </p>
              </div>
            )}

            {/* Main Result Card */}
            <Card className="border-0 shadow-2xl bg-white overflow-hidden">
              {/* School Header */}
              <div className="bg-gradient-to-r from-slate-800 to-blue-900 p-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-wide">
                      {result.school.name}
                    </h2>
                    {result.school.motto && (
                      <p className="text-blue-200 text-sm italic mt-1">
                        "{result.school.motto}"
                      </p>
                    )}
                    {result.school.address && (
                      <p className="text-slate-300 text-xs mt-1">
                        {result.school.address}
                      </p>
                    )}
                    <p className="text-slate-400 text-xs mt-0.5">
                      {[result.school.phone, result.school.email]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="bg-white/10 rounded-xl px-4 py-2 inline-block">
                      <p className="text-xs text-blue-200 mb-0.5">
                        Academic Report
                      </p>
                      <p className="font-bold text-sm">
                        {termLabel(result.term)}
                      </p>
                      <p className="text-blue-200 text-xs">{result.session}</p>
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Student Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      icon: User,
                      label: "Student Name",
                      value: result.student.fullName,
                    },
                    { icon: BookOpen, label: "Class", value: result.class },
                    {
                      icon: GraduationCap,
                      label: "Reg Number",
                      value: result.student.regNumber,
                    },
                    {
                      icon: Calendar,
                      label: "Gender",
                      value: result.student.gender,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="bg-slate-50 rounded-xl p-3 border border-slate-100"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-400">
                            {item.label}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm truncate">
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Performance Summary Band */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    {
                      label: "Subjects",
                      value: result.summary.subjectsOffered.toString(),
                    },
                    {
                      label: "Evaluated",
                      value: result.summary.subjectsEvaluated.toString(),
                    },
                    {
                      label: "Total",
                      value: result.summary.totalScore.toString(),
                    },
                    { label: "Average", value: `${result.summary.average}%` },
                    {
                      label: "Position",
                      value: result.summary.position
                        ? `${result.summary.position} / ${result.summary.outOf}`
                        : "—",
                      highlight: true,
                    },
                    {
                      label: "Performance",
                      value: result.summary.performance ?? "—",
                      highlight: true,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "rounded-xl p-3 text-center",
                        item.highlight
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-800",
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs mb-1",
                          item.highlight ? "text-blue-200" : "text-slate-500",
                        )}
                      >
                        {item.label}
                      </p>
                      <p
                        className={cn(
                          "font-bold text-sm",
                          item.highlight && item.label === "Performance"
                            ? "text-yellow-300"
                            : "",
                        )}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Attendance */}
                {(result.attendance.daysOpen ||
                  result.attendance.daysPresent) && (
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: "Days Open", value: result.attendance.daysOpen },
                      {
                        label: "Days Present",
                        value: result.attendance.daysPresent,
                      },
                      {
                        label: "Days Absent",
                        value: result.attendance.daysAbsent,
                      },
                      {
                        label: "Vacation",
                        value: formatDate(result.attendance.vacationDate),
                      },
                      {
                        label: "Resumption",
                        value: formatDate(result.attendance.resumptionDate),
                      },
                    ].map(
                      (item) =>
                        item.value !== null &&
                        item.value !== undefined && (
                          <div
                            key={item.label}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center"
                          >
                            <p className="text-xs text-slate-400">
                              {item.label}
                            </p>
                            <p className="font-bold text-slate-700 text-sm">
                              {item.value}
                            </p>
                          </div>
                        ),
                    )}
                  </div>
                )}

                <Separator />

                {/* Results Table */}
                <div>
                  <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-3">
                    Subject Results
                  </h3>

                  {/* Desktop Table */}
                  <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          <th className="text-left px-3 py-2.5 text-xs font-semibold">
                            #
                          </th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold">
                            Subject
                          </th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold">
                            CA (40)
                          </th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold">
                            Exam (60)
                          </th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold">
                            Total
                          </th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold">
                            Grade
                          </th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold">
                            Remark
                          </th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold">
                            Position
                          </th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold">
                            Class Avg
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.subjects.map((subj, i) => (
                          <tr
                            key={i}
                            className={cn(
                              "border-t border-slate-100",
                              i % 2 === 0 ? "bg-white" : "bg-slate-50",
                            )}
                          >
                            <td className="px-3 py-2.5 text-slate-400 text-xs">
                              {subj.sn}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              {subj.name}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-600">
                              {subj.caScore ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-600">
                              {subj.examScore ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-800">
                              {subj.totalScore ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={cn(
                                  "inline-block w-7 h-7 rounded-full text-xs font-bold leading-7 text-center text-white",
                                  subj.grade === "A"
                                    ? "bg-green-500"
                                    : subj.grade === "B"
                                      ? "bg-blue-500"
                                      : subj.grade === "C"
                                        ? "bg-orange-500"
                                        : subj.grade === "P"
                                          ? "bg-yellow-500"
                                          : subj.grade === "F"
                                            ? "bg-red-500"
                                            : "bg-slate-400",
                                )}
                              >
                                {subj.grade ?? "—"}
                              </span>
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2.5 text-center text-xs font-semibold",
                                gradeColor(subj.grade),
                              )}
                            >
                              {subj.remark ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-600 text-xs font-semibold">
                              {subj.positionInClass ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-500 text-xs">
                              {subj.classAverage ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-2">
                    {result.subjects.map((subj, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-slate-800 text-sm">
                            {subj.name}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white",
                              subj.grade === "A"
                                ? "bg-green-500"
                                : subj.grade === "B"
                                  ? "bg-blue-500"
                                  : subj.grade === "C"
                                    ? "bg-orange-500"
                                    : subj.grade === "P"
                                      ? "bg-yellow-500"
                                      : subj.grade === "F"
                                        ? "bg-red-500"
                                        : "bg-slate-400",
                            )}
                          >
                            {subj.grade ?? "—"}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs text-center">
                          <div>
                            <p className="text-slate-400">CA</p>
                            <p className="font-semibold">
                              {subj.caScore ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Exam</p>
                            <p className="font-semibold">
                              {subj.examScore ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Total</p>
                            <p className="font-bold text-slate-800">
                              {subj.totalScore ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Pos.</p>
                            <p className="font-semibold">
                              {subj.positionInClass ?? "—"}
                            </p>
                          </div>
                        </div>
                        <p
                          className={cn(
                            "text-xs font-semibold mt-1.5 text-center",
                            gradeColor(subj.grade),
                          )}
                        >
                          {subj.remark ?? ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills Section */}
                {(result.psychomotorSkills.length > 0 ||
                  result.socialBehaviour.length > 0) && (
                  <div>
                    <button
                      onClick={() => setShowSkills(!showSkills)}
                      className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      {showSkills ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      Psychomotor & Social Behaviour Skills
                    </button>

                    {showSkills && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Psychomotor */}
                        {result.psychomotorSkills.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-800 px-4 py-2.5">
                              <p className="text-xs font-bold text-white uppercase tracking-wide">
                                Psychomotor Skills
                              </p>
                            </div>
                            {result.psychomotorSkills.map((s, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "flex justify-between items-center px-4 py-2.5 text-sm border-t border-slate-100",
                                  i % 2 === 0 ? "bg-white" : "bg-slate-50",
                                )}
                              >
                                <span className="text-slate-700">{s.name}</span>
                                <span className="font-semibold text-blue-600 text-xs">
                                  {ratingLabel(s.rating)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Social Behaviour */}
                        {result.socialBehaviour.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-800 px-4 py-2.5">
                              <p className="text-xs font-bold text-white uppercase tracking-wide">
                                Social Behaviour
                              </p>
                            </div>
                            {result.socialBehaviour.map((s, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "flex justify-between items-center px-4 py-2.5 text-sm border-t border-slate-100",
                                  i % 2 === 0 ? "bg-white" : "bg-slate-50",
                                )}
                              >
                                <span className="text-slate-700">{s.name}</span>
                                <span className="font-semibold text-blue-600 text-xs">
                                  {ratingLabel(s.rating)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Grade Key */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                      Grade Key
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 p-3">
                    {result.gradeKey.map((g) => (
                      <div
                        key={g.grade}
                        className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                      >
                        <span
                          className={cn(
                            "w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white",
                            g.grade === "A"
                              ? "bg-green-500"
                              : g.grade === "B"
                                ? "bg-blue-500"
                                : g.grade === "C"
                                  ? "bg-orange-500"
                                  : g.grade === "P"
                                    ? "bg-yellow-500"
                                    : "bg-red-500",
                          )}
                        >
                          {g.grade}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            {g.description}
                          </p>
                          <p className="text-xs text-slate-400">
                            {g.range} — {g.remark}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Sentence */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-sm font-semibold text-blue-800">
                    Dear {result.student.fullName}, you made{" "}
                    {Object.entries(
                      result.subjects.reduce(
                        (acc, s) => {
                          if (s.grade) acc[s.grade] = (acc[s.grade] || 0) + 1;
                          return acc;
                        },
                        {} as Record<string, number>,
                      ),
                    )
                      .map(([g, c]) => `${c} ${g}(s)`)
                      .join(", ")}{" "}
                    in your {termLabel(result.term)} of {result.session}{" "}
                    Academic Session.
                  </p>
                </div>

                {/* Comments */}
                {(result.comments.teacher || result.comments.principal) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.comments.teacher && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-blue-600 px-4 py-2.5">
                          <p className="text-xs font-bold text-white uppercase tracking-wide">
                            Class Teacher&apos;s Comment
                          </p>
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-slate-700 italic">
                            &quot;{result.comments.teacher}&quot;
                          </p>
                          {result.comments.teacherName && (
                            <p className="text-xs font-semibold text-slate-500 mt-2">
                              — {result.comments.teacherName}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {result.comments.principal && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-blue-600 px-4 py-2.5">
                          <p className="text-xs font-bold text-white uppercase tracking-wide">
                            Principal&apos;s Comment
                          </p>
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-slate-700 italic">
                            &quot;{result.comments.principal}&quot;
                          </p>
                          {result.comments.principalName && (
                            <p className="text-xs font-semibold text-slate-500 mt-2">
                              — {result.comments.principalName}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Download Button */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={downloadPdf}
                    disabled={downloading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2 h-11"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download Result as PDF
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    className="gap-2 h-11"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Check Another Result */}
            <div className="text-center">
              <button
                onClick={() => setResult(null)}
                className="text-blue-300 hover:text-white text-sm underline underline-offset-4 transition-colors"
              >
                Check another result
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-10 text-slate-500 text-xs">
          <p>
            Powered by{" "}
            <span className="text-blue-400 font-semibold">InnoCore</span> —
            School Management Platform
          </p>
        </div>
      </div>
    </div>
  );
}
