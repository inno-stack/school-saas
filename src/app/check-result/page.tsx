/**
 * @file src/app/check-result/page.tsx
 * @description Public result checker with browser-compatible PDF printing.
 *
 * Print strategy:
 * - Fetch the PDF blob from the server
 * - Create a hidden iframe
 * - Load the PDF into the iframe
 * - Trigger iframe print — renders exact PDF design in all browsers
 * - Fallback: download the PDF if iframe approach fails
 */

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
  CreditCard,
  Download,
  GraduationCap,
  Loader2,
  Printer,
  Search,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ── Validation schema ──────────────────────────────
const schema = z.object({
  regNumber: z.string().min(1, "Registration number is required"),
  pin: z
    .string()
    .length(12, "PIN must be exactly 12 digits")
    .regex(/^\d+$/, "PIN must contain numbers only"),
});

type FormData = z.infer<typeof schema>;

// ── Types ──────────────────────────────────────────
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

// ── Grade helpers ──────────────────────────────────
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

// ── Main Component ─────────────────────────────────
export default function CheckResultPage() {
  const [result, setResult] = useState<ResultData | null>(null);
  const [lastPin, setLastPin] = useState("");
  const [lastReg, setLastReg] = useState("");
  const [showSkills, setShowSkills] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  // ── Hidden iframe ref for cross-browser PDF printing ─
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // ── Validate scratch card and fetch result ─────
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
      toast.error(err.response?.data?.message ?? "Something went wrong", {
        duration: 5000,
      });
    }
  }

  // ── Fetch PDF blob from server ──────────────────
  async function fetchPdfBlob(): Promise<Blob> {
    const response = await axios.post(
      "/api/scratch-cards/validate-pdf",
      { regNumber: lastReg, pin: lastPin },
      { responseType: "blob" },
    );
    return new Blob([response.data], { type: "application/pdf" });
  }

  // ── Download PDF ────────────────────────────────
  async function downloadPdf() {
    if (!result || !lastPin || !lastReg) return;
    setDownloading(true);
    const toastId = toast.loading("Generating your result PDF...");

    try {
      const blob = await fetchPdfBlob();
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
      toast.error("Failed to download PDF.", { id: toastId });
    } finally {
      setDownloading(false);
    }
  }

  /**
   * Cross-browser PDF print using a hidden iframe.
   *
   * How it works:
   * 1. Fetch the PDF blob from the server
   * 2. Create a blob URL and load it into a hidden <iframe>
   * 3. Wait for the iframe to load the PDF
   * 4. Call iframe.contentWindow.print()
   * 5. Browser shows its native print dialog with the exact PDF
   *
   * This approach works in:
   * ✅ Chrome — uses Chrome's built-in PDF viewer in iframe
   * ✅ Firefox — uses PDF.js viewer in iframe
   * ✅ Edge — uses Edge's PDF viewer
   * ✅ Safari — falls back to download if PDF iframe not supported
   */
  async function handlePrint() {
    if (!result || !lastPin || !lastReg) return;
    setPrinting(true);
    const toastId = toast.loading("Preparing PDF for print...");

    try {
      const blob = await fetchPdfBlob();
      const blobUrl = URL.createObjectURL(blob);

      // ── Method 1: Hidden iframe (Chrome, Firefox, Edge) ─
      const iframe = document.createElement("iframe");
      iframe.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 1px;
        height: 1px;
        opacity: 0;
        border: none;
      `;
      iframe.src = blobUrl;

      iframe.onload = () => {
        try {
          // ── Trigger print from within the iframe ──────
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          toast.success("Print dialog opened!", { id: toastId });
        } catch {
          // ── Fallback: open PDF in new tab ─────────────
          window.open(blobUrl, "_blank");
          toast.success("PDF opened in new tab — use Ctrl+P to print", {
            id: toastId,
          });
        }

        // ── Clean up after print dialog closes ─────────
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 60_000); // 60s delay — enough time for print dialog
      };

      iframe.onerror = () => {
        // ── Fallback: download PDF ─────────────────────
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `Result_${result.student.fullName}.pdf`;
        link.click();
        toast.success("PDF downloaded — open it to print", { id: toastId });
        URL.revokeObjectURL(blobUrl);
      };

      document.body.appendChild(iframe);
    } catch (err) {
      console.error("[PRINT]", err);
      toast.error("Failed to prepare print. Try the Download button instead.", {
        id: toastId,
      });
    } finally {
      setPrinting(false);
    }
  }

  // ── Render ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Background dots pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-6 lg:py-10">
        {/* ── Page Header ─────────────────────── */}
        <div className="text-center mb-8 lg:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-blue-600 shadow-2xl mb-4 lg:mb-5">
            <GraduationCap className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
            InnoCore Result Portal
          </h1>
          <p className="text-blue-300 text-sm max-w-md mx-auto">
            Enter your registration number and scratch card PIN to access your
            academic result
          </p>
        </div>

        {/* ── Search Form ─────────────────────── */}
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur mb-6 lg:mb-8">
          <CardContent className="pt-5 pb-5 px-4 lg:px-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reg Number */}
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 gap-2"
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
                all 3 terms of one academic session.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Result Display ───────────────────── */}
        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Card usage info */}
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

            {/* Main result card */}
            <Card className="border-0 shadow-2xl bg-white overflow-hidden">
              {/* School header */}
              <div className="bg-gradient-to-r from-slate-800 to-blue-900 p-5 lg:p-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg lg:text-xl font-bold uppercase tracking-wide">
                      {result.school.name}
                    </h2>
                    {result.school.motto && (
                      <p className="text-blue-200 text-xs italic mt-1">
                        &quot;{result.school.motto}&quot;
                      </p>
                    )}
                    {result.school.address && (
                      <p className="text-slate-300 text-xs mt-1 truncate">
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
                    <div className="bg-white/10 rounded-xl px-3 py-2 inline-block">
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

              <CardContent className="p-4 lg:p-6 space-y-5">
                {/* Student info */}
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

                {/* Performance summary */}
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

                {/* Dates */}
                {(result.attendance.vacationDate ||
                  result.attendance.resumptionDate) && (
                  <div className="flex flex-wrap gap-3">
                    {result.attendance.vacationDate && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center">
                        <p className="text-xs text-slate-400">Vacation</p>
                        <p className="font-bold text-slate-700 text-sm">
                          {formatDate(result.attendance.vacationDate)}
                        </p>
                      </div>
                    )}
                    {result.attendance.resumptionDate && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center">
                        <p className="text-xs text-slate-400">Resumption</p>
                        <p className="font-bold text-slate-700 text-sm">
                          {formatDate(result.attendance.resumptionDate)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Subjects table */}
                <div>
                  <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-3">
                    Subject Results
                  </h3>

                  {/* Desktop table */}
                  <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          {[
                            "#",
                            "Subject",
                            "CA (40)",
                            "Exam (60)",
                            "Total",
                            "Grade",
                            "Remark",
                            "Position",
                            "Class Avg",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2.5 text-xs font-semibold text-left first:text-center"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.subjects.map((s, i) => (
                          <tr
                            key={i}
                            className={cn(
                              "border-t border-slate-100",
                              i % 2 === 0 ? "bg-white" : "bg-slate-50",
                            )}
                          >
                            <td className="px-3 py-2.5 text-center text-slate-400 text-xs">
                              {s.sn}
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-slate-800">
                              {s.name}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {s.caScore ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {s.examScore ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold">
                              {s.totalScore ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white",
                                  s.grade === "A"
                                    ? "bg-green-500"
                                    : s.grade === "B"
                                      ? "bg-blue-500"
                                      : s.grade === "C"
                                        ? "bg-orange-500"
                                        : s.grade === "P"
                                          ? "bg-yellow-500"
                                          : s.grade === "F"
                                            ? "bg-red-500"
                                            : "bg-slate-400",
                                )}
                              >
                                {s.grade ?? "—"}
                              </span>
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2.5 text-xs font-semibold",
                                gradeColor(s.grade),
                              )}
                            >
                              {s.remark ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center text-xs">
                              {s.positionInClass ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center text-xs text-slate-500">
                              {s.classAverage ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-2">
                    {result.subjects.map((s, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-slate-800 text-sm">
                            {s.name}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white",
                              s.grade === "A"
                                ? "bg-green-500"
                                : s.grade === "B"
                                  ? "bg-blue-500"
                                  : s.grade === "C"
                                    ? "bg-orange-500"
                                    : s.grade === "P"
                                      ? "bg-yellow-500"
                                      : s.grade === "F"
                                        ? "bg-red-500"
                                        : "bg-slate-400",
                            )}
                          >
                            {s.grade ?? "—"}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs text-center">
                          <div>
                            <p className="text-slate-400">CA</p>
                            <p className="font-semibold">{s.caScore ?? "—"}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Exam</p>
                            <p className="font-semibold">
                              {s.examScore ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Total</p>
                            <p className="font-bold text-slate-800">
                              {s.totalScore ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Pos.</p>
                            <p className="font-semibold">
                              {s.positionInClass ?? "—"}
                            </p>
                          </div>
                        </div>
                        <p
                          className={cn(
                            "text-xs font-semibold mt-1.5 text-center",
                            gradeColor(s.grade),
                          )}
                        >
                          {s.remark ?? ""}
                        </p>
                      </div>
                    ))}
                  </div>
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
                            "{result.comments.principal}"
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

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={downloadPdf}
                    disabled={downloading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2 h-11"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    disabled={printing}
                    className="gap-2 h-11 sm:w-auto"
                  >
                    {printing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        Print Result
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Check another */}
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
        <div className="text-center mt-8 text-slate-500 text-xs">
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
