"use client";
/**
 * @file src/app/check-result/page.tsx
 * @description Student Result Access Portal.
 *
 * Features:
 * - Navbar with Home, About Results, FAQs, Help & Support
 * - Student ID + Session + Term dropdowns + PIN input
 * - Session/Term selection (student chooses which term to view)
 * - Card still locked to its session (backend enforced)
 * - 4-use limit maintained per card
 * - "Forgot PIN / Lost Card? Contact Support" link
 * - "How to Use" step-by-step guide
 * - Full result display after validation
 * - Download PDF + Print buttons
 * - Login link back to dashboard
 * - Footer with Privacy Policy + Terms of Service
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Download,
  GraduationCap,
  HelpCircle,
  Home,
  Info,
  Loader2,
  Lock,
  LogIn,
  Phone,
  Printer,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ── Validation schema ──────────────────────────────
const schema = z.object({
  regNumber: z.string().min(1, "Registration number is required"),
  sessionId: z.string().min(1, "Please select an academic session"),
  termId: z.string().min(1, "Please select a term"),
  pin: z
    .string()
    .length(12, "PIN must be exactly 12 digits")
    .regex(/^\d+$/, "PIN must contain only numbers"),
});

type FormData = z.infer<typeof schema>;

// ── Grade color ────────────────────────────────────
function gradeColor(grade: string | null) {
  switch (grade) {
    case "A":
      return "bg-green-500";
    case "B":
      return "bg-blue-500";
    case "C":
      return "bg-orange-500";
    case "P":
      return "bg-yellow-500";
    case "F":
      return "bg-red-500";
    default:
      return "bg-slate-400";
  }
}

function termLabel(t: string) {
  return t === "FIRST" ? "1st Term" : t === "SECOND" ? "2nd Term" : "3rd Term";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Main Component ─────────────────────────────────
export default function CheckResultPage() {
  const [result, setResult] = useState<any>(null);
  const [lastPin, setLastPin] = useState("");
  const [lastReg, setLastReg] = useState("");
  const [lastTermId, setLastTermId] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  // ── Fetch sessions for dropdowns ───────────────
  const { data: sessions = [] } = useQuery({
    queryKey: ["public-sessions"],
    queryFn: async () => {
      const { data } = await axios.get("/api/public/sessions");
      return data.data as Array<{
        id: string;
        name: string;
        isActive: boolean;
        terms: Array<{
          id: string;
          name: string;
          label: string;
          isActive: boolean;
        }>;
      }>;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const watchedSession = watch("sessionId");

  // ── Terms for selected session ─────────────────
  const termsForSession =
    sessions.find((s) => s.id === watchedSession)?.terms ?? [];

  // ── Submit: validate card ───────────────────────
  async function onSubmit(values: FormData) {
    try {
      const { data } = await axios.post("/api/scratch-cards/validate", {
        regNumber: values.regNumber,
        pin: values.pin,
        sessionId: values.sessionId,
        termId: values.termId,
      });

      setResult(data.data);
      setLastPin(values.pin);
      setLastReg(values.regNumber);
      setLastTermId(values.termId);

      if (data.data.cardInfo) {
        toast.info(data.data.cardInfo.message, { duration: 7000 });
      }

      // ── Handle cumulative — download PDF directly ──
      if (data.data.isCumulative) {
        toast.loading("Generating cumulative result PDF...", {
          id: "cum-pdf",
        });

        try {
          const pdfRes = await axios.post(
            "/api/scratch-cards/validate-cumulative-pdf",
            {
              regNumber: values.regNumber,
              pin: values.pin,
              sessionId: values.sessionId,
            },
            { responseType: "blob" },
          );

          const blob = new Blob([pdfRes.data], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `Cumulative_Result.pdf`;
          link.click();
          URL.revokeObjectURL(url);

          toast.success("Cumulative result PDF downloaded!", { id: "cum-pdf" });
        } catch (pdfErr: any) {
          toast.error(
            pdfErr.response?.data?.message ??
              "Failed to generate cumulative PDF.",
            { id: "cum-pdf" },
          );
        }
        return;
      }

      // ── Regular term result ────────────────────────
      setResult(data.data);
      setLastPin(values.pin);
      setLastReg(values.regNumber);
      setLastTermId(values.termId);

      // ── Scroll to result ──────────────────────
      setTimeout(() => {
        document.getElementById("result-section")?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ??
          "Something went wrong. Please try again.",
        { duration: 6000 },
      );
    }
  }

  // ── Fetch PDF blob ─────────────────────────────
  async function fetchPdfBlob(): Promise<Blob> {
    const response = await axios.post(
      "/api/scratch-cards/validate-pdf",
      { regNumber: lastReg, pin: lastPin, termId: lastTermId },
      { responseType: "blob" },
    );
    return new Blob([response.data], { type: "application/pdf" });
  }

  // ── Download PDF ───────────────────────────────
  async function downloadPdf() {
    if (!result) return;
    setDownloading(true);
    const toastId = toast.loading("Generating PDF...");

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

  // ── Print (cross-browser PDF print) ───────────
  async function handlePrint() {
    if (!result) return;
    setPrinting(true);
    const toastId = toast.loading("Preparing print...");

    try {
      const blob = await fetchPdfBlob();
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");

      iframe.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;border:none;";
      iframe.src = blobUrl;

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          toast.success("Print dialog opened!", { id: toastId });
        } catch {
          window.open(blobUrl, "_blank");
          toast.success("PDF opened — use Ctrl+P to print", { id: toastId });
        }
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 60_000);
      };

      document.body.appendChild(iframe);
    } catch {
      toast.error("Failed to prepare print.", { id: toastId });
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#EEF2F7] flex flex-col">
      {/* ════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════ */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo + Brand */}
          <Link
            href="/login"
            className="flex items-center gap-2.5 font-bold text-slate-800"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4.5 h-4.5 text-white w-5 h-5" />
            </div>
            <span className="text-sm sm:text-base">InnoCore Portal</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden sm:flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </Link>
            <Link
              href="#how-to-use"
              className="text-sm text-slate-600 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              About Results
            </Link>
            <Link
              href="#faq"
              className="text-sm text-slate-600 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              FAQs
            </Link>
            <Link
              href="mailto:support@innocore.ng"
              className="flex items-center gap-2 h-8 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Help & Support
            </Link>
          </div>

          {/* Mobile: Help button only */}
          <Link
            href="mailto:support@innocore.ng"
            className="sm:hidden flex items-center gap-1.5 h-8 px-3 bg-blue-600 text-white text-xs font-medium rounded-lg"
          >
            <Phone className="w-3.5 h-3.5" />
            Support
          </Link>
        </div>
      </nav>

      {/* ════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════ */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 lg:py-12">
        {/* ── Page Title ─────────────────────── */}
        {!result && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-md mb-4">
              <GraduationCap className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
              Student Result Access Portal
            </h1>
            <p className="text-slate-500 text-sm sm:text-base">
              Enter your academic details and PIN to view your performance
            </p>
          </div>
        )}

        {/* ── Check Form ────────────────────── */}
        {!result && (
          <Card className="border-0 shadow-md mb-6">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Student ID */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">
                    Student ID / Admission Number
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="e.g. GRE/2026/001"
                      className={cn(
                        "pl-9 h-11 bg-slate-50",
                        errors.regNumber && "border-red-400",
                      )}
                      {...register("regNumber")}
                    />
                  </div>
                  {errors.regNumber && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.regNumber.message}
                    </p>
                  )}
                </div>

                {/* Session + Term Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Academic Session */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700">
                      Academic Session
                    </Label>
                    <Select
                      onValueChange={(v) => {
                        setValue("sessionId", v, { shouldValidate: true });
                        setValue("termId", "", { shouldValidate: false });
                        setSelectedSession(v);
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-11 bg-slate-50",
                          errors.sessionId && "border-red-400",
                        )}
                      >
                        <SelectValue placeholder="Select Session" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.length === 0 && (
                          <SelectItem value="none" disabled>
                            No sessions available
                          </SelectItem>
                        )}
                        {sessions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {s.isActive && (
                              <span className="ml-2 text-xs text-green-600">
                                (Current)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.sessionId && (
                      <p className="text-xs text-red-500">
                        {errors.sessionId.message}
                      </p>
                    )}
                  </div>

                  {/* Academic Term */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700">
                      Academic Term
                    </Label>
                    <Select
                      onValueChange={(v) =>
                        setValue("termId", v, { shouldValidate: true })
                      }
                      disabled={!watchedSession || termsForSession.length === 0}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-11 bg-slate-50",
                          errors.termId && "border-red-400",
                        )}
                      >
                        <SelectValue placeholder="Select Term" />
                      </SelectTrigger>
                      <SelectContent>
                        {termsForSession.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                            {t.isActive && (
                              <span className="ml-2 text-xs text-green-600">
                                (Current)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.termId && (
                      <p className="text-xs text-red-500">
                        {errors.termId.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Scratch Card PIN */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">
                    Scratch Card PIN
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="• • • •  • • • •  • • • •"
                      maxLength={12}
                      className={cn(
                        "pl-9 h-11 bg-slate-50 tracking-widest font-mono",
                        errors.pin && "border-red-400",
                      )}
                      {...register("pin")}
                    />
                  </div>
                  {errors.pin && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.pin.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-semibold gap-2 rounded-xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <BarChart2 className="w-5 h-5" />
                      Check Result
                    </>
                  )}
                </Button>

                {/* Forgot PIN */}
                <div className="text-center pt-1">
                  <a
                    href="mailto:support@innocore.ng"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Forgot PIN or lost card? Contact support
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Card Usage Info Banner ─────────── */}
        {result?.cardInfo && (
          <div
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border mb-4",
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

        {/* ── Result Sheet ───────────────────── */}
        {result && (
          <div id="result-section" className="space-y-4">
            {/* School Header */}
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-blue-900 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide">
                      {result.school.name}
                    </h2>
                    {result.school.motto && (
                      <p className="text-blue-200 text-xs italic mt-1">
                        "{result.school.motto}"
                      </p>
                    )}
                    {result.school.address && (
                      <p className="text-slate-300 text-xs mt-1">
                        {result.school.address}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 bg-white/10 rounded-xl px-3 py-2 text-right">
                    <p className="text-xs text-blue-200">Academic Report</p>
                    <p className="font-bold text-sm">
                      {termLabel(result.term)}
                    </p>
                    <p className="text-blue-200 text-xs">{result.session}</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                {/* Student Info */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Student Name", value: result.student.fullName },
                    { label: "Class", value: result.class },
                    { label: "Reg Number", value: result.student.regNumber },
                    { label: "Gender", value: result.student.gender },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-slate-50 rounded-xl p-3 border border-slate-100"
                    >
                      <p className="text-xs text-slate-400 mb-0.5">
                        {item.label}
                      </p>
                      <p className="font-bold text-slate-800 text-sm truncate">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Performance Summary */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
                    {
                      label: "Average",
                      value: `${result.summary.average}%`,
                      hi: true,
                    },
                    {
                      label: "Position",
                      value: result.summary.position
                        ? `${result.summary.position} / ${result.summary.outOf}`
                        : "—",
                      hi: true,
                    },
                    {
                      label: "Performance",
                      value: result.summary.performance ?? "—",
                      hi: true,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "rounded-xl p-2.5 text-center",
                        item.hi ? "bg-blue-600 text-white" : "bg-slate-100",
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs mb-1",
                          item.hi ? "text-blue-200" : "text-slate-500",
                        )}
                      >
                        {item.label}
                      </p>
                      <p
                        className={cn(
                          "font-bold text-xs sm:text-sm",
                          item.hi && item.label === "Performance"
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
                {(result.attendance?.vacationDate ||
                  result.attendance?.resumptionDate) && (
                  <div className="flex flex-wrap gap-3">
                    {result.attendance.vacationDate && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-400">Vacation</p>
                        <p className="font-semibold text-slate-700 text-sm">
                          {fmtDate(result.attendance.vacationDate)}
                        </p>
                      </div>
                    )}
                    {result.attendance.resumptionDate && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-400">Resumption</p>
                        <p className="font-semibold text-slate-700 text-sm">
                          {fmtDate(result.attendance.resumptionDate)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Subject Table — Desktop */}
                <div>
                  <p className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-3">
                    Subject Results
                  </p>

                  <div className="hidden sm:block rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#1a2e4a] text-white">
                          {[
                            "#",
                            "Subject",
                            "CA",
                            "Exam",
                            "Total",
                            "Grade",
                            "Remark",
                            "Pos.",
                            "Avg",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-2 py-2.5 text-xs font-semibold text-center first:text-left first:pl-3"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.subjects.map((s: any, i: number) => (
                          <tr
                            key={i}
                            className={cn(
                              "border-t border-slate-100",
                              i % 2 !== 0 ? "bg-[#eff6ff]" : "bg-white",
                            )}
                          >
                            <td className="pl-3 py-2.5 text-slate-400 text-xs">
                              {s.sn}
                            </td>
                            <td className="px-2 py-2.5 font-semibold text-slate-800 text-xs">
                              {s.name}
                            </td>
                            <td className="px-2 py-2.5 text-center text-xs">
                              {s.caScore ?? "—"}
                            </td>
                            <td className="px-2 py-2.5 text-center text-xs">
                              {s.examScore ?? "—"}
                            </td>
                            <td className="px-2 py-2.5 text-center font-bold text-xs">
                              {s.totalScore ?? "—"}
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white",
                                  gradeColor(s.grade),
                                )}
                              >
                                {s.grade ?? "—"}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center text-xs text-slate-600">
                              {s.remark ?? "—"}
                            </td>
                            <td className="px-2 py-2.5 text-center text-xs">
                              {s.positionInClass ?? "—"}
                            </td>
                            <td className="px-2 py-2.5 text-center text-xs text-slate-500">
                              {s.classAverage ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile subject cards */}
                  <div className="sm:hidden space-y-2">
                    {result.subjects.map((s: any, i: number) => (
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
                              "w-7 h-7 rounded-full text-xs font-bold text-white flex items-center justify-center",
                              gradeColor(s.grade),
                            )}
                          >
                            {s.grade ?? "—"}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-xs text-center">
                          {[
                            { l: "CA", v: s.caScore },
                            { l: "Exam", v: s.examScore },
                            { l: "Total", v: s.totalScore },
                            { l: "Pos.", v: s.positionInClass },
                          ].map((c) => (
                            <div key={c.l}>
                              <p className="text-slate-400">{c.l}</p>
                              <p className="font-semibold">{c.v ?? "—"}</p>
                            </div>
                          ))}
                        </div>
                        {s.remark && (
                          <p className="text-xs text-center mt-1.5 text-slate-500 italic">
                            {s.remark}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comments */}
                {(result.comments?.teacher || result.comments?.principal) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.comments.teacher && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-blue-600 px-4 py-2">
                          <p className="text-xs font-bold text-white uppercase">
                            Class Teacher&apos;s Comment
                          </p>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-slate-700 italic">
                            &quot;{result.comments.teacher}&quot;
                          </p>
                          {result.comments.teacherName && (
                            <p className="text-xs font-semibold text-slate-500 mt-1.5">
                              — {result.comments.teacherName}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {result.comments.principal && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-blue-600 px-4 py-2">
                          <p className="text-xs font-bold text-white uppercase">
                            Principal&apos;s Comment
                          </p>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-slate-700 italic">
                            &quot;{result.comments.principal}&quot;
                          </p>
                          {result.comments.principalName && (
                            <p className="text-xs font-semibold text-slate-500 mt-1.5">
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
                    className="sm:w-auto gap-2 h-11"
                  >
                    {printing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        Print
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setResult(null)}
                    className="sm:w-auto gap-2 h-11 text-slate-500"
                  >
                    Check Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════
            HOW TO USE — Step-by-step guide
        ════════════════════════════════════════ */}
        {!result && (
          <Card id="how-to-use" className="border-0 shadow-md mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Info className="w-3 h-3 text-white" />
                </div>
                <h3 className="font-bold text-slate-800">How to use</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    step: 1,
                    title: "Enter Student ID",
                    desc: "Enter your unique Student ID or Admission Number exactly as it appears on your ID card.",
                  },
                  {
                    step: 2,
                    title: "Select Session & Term",
                    desc: "Select the appropriate Academic Session and Term you wish to view results for.",
                  },
                  {
                    step: 3,
                    title: "Enter PIN",
                    desc: "Gently scratch your result card and input the PIN. Click 'Check Result' to proceed.",
                  },
                ].map((s) => (
                  <div key={s.step} className="flex flex-col items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">
                        {s.step}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-sm mb-1">
                        {s.title}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════════════════════
            FAQ SECTION
        ════════════════════════════════════════ */}
        {!result && (
          <Card id="faq" className="border-0 shadow-md mb-6">
            <CardContent className="p-5">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Frequently Asked Questions
              </h3>

              <div className="space-y-4">
                {[
                  {
                    q: "How many times can I use my scratch card?",
                    a: "Each scratch card can be used 4 times across all terms within one academic session.",
                  },
                  {
                    q: "Can I use my card to check results from a different session?",
                    a: "No. Each card is locked to the session it was issued for. You will need a new card for a different session.",
                  },
                  {
                    q: "My result is not showing — what should I do?",
                    a: "Results are only visible after your school publishes them. Contact your school if you believe results should be available.",
                  },
                  {
                    q: "I lost my scratch card. How do I get a new one?",
                    a: "Contact your school administration to purchase a new scratch card. Each card has a unique PIN.",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <p className="font-semibold text-slate-700 text-sm mb-1">
                      {item.q}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Login link */}
        {!result && (
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              School Admin / Staff Login
            </Link>
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-4">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs text-slate-400 mb-2">
            © {new Date().getFullYear()} InnoCore School Management System. All
            rights reserved.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="#"
              className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-slate-300">·</span>
            <a
              href="#"
              className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
