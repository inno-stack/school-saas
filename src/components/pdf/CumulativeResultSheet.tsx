/**
 * @file src/components/pdf/CumulativeResultSheet.tsx
 * @description PDF component for end-of-session cumulative results.
 *
 * Layout matches the standard ResultSheet but adds:
 * - "CUMULATIVE SESSION REPORT" title
 * - Subject table with 1st Term | 2nd Term | 3rd Term | Cumulative Avg
 * - Session Summary panel with term totals
 * - Same signature/seal row
 * - Same grade key
 */

import type { CumulativeResult } from "@/lib/cumulative-engine";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

// ── Color palette (matches standard ResultSheet) ──
const C = {
  primary: "#1a3c5e",
  accent: "#2e86c1",
  success: "#1a7a4a",
  warning: "#b45309",
  danger: "#b91c1c",
  white: "#ffffff",
  offWhite: "#f8f9fa",
  lightBlue: "#eaf4fb",
  border: "#dde3ea",
  text: "#111827",
  subtext: "#6b7280",
  tableAlt: "#f0f7ff",
  gold: "#c9a227",
};

// ── Grade color ────────────────────────────────────
function gc(g: string): string {
  switch (g) {
    case "A":
      return C.success;
    case "B":
      return C.accent;
    case "C":
      return C.warning;
    case "P":
      return "#92400e";
    case "F":
      return C.danger;
    default:
      return C.subtext;
  }
}

// ── Formatters ─────────────────────────────────────
function fmtNum(n: number | null): string {
  return n !== null ? n.toFixed(1) : "—";
}

function reportDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Styles ─────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: C.text,
    backgroundColor: C.white,
    paddingTop: 26,
    paddingBottom: 22,
    paddingLeft: 30,
    paddingRight: 30,
  },

  // ── Header ────────────────────────────────────
  header: {
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  logoText: {
    color: C.white,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  schoolName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  schoolSub: {
    fontSize: 7,
    color: C.subtext,
    textAlign: "center",
    marginTop: 2,
  },
  motto: {
    fontSize: 7,
    color: C.subtext,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 2,
  },

  // ── Title Bar ─────────────────────────────────
  titleBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 6,
  },
  reportTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.gold, // gold for cumulative — distinguishes from regular
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reportSub: {
    fontSize: 7,
    color: C.subtext,
    marginTop: 2,
  },
  dateLabel: {
    fontSize: 6.5,
    color: C.subtext,
    textAlign: "right",
    textTransform: "uppercase",
  },
  dateValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    textAlign: "right",
    marginTop: 1,
  },

  // ── Student Info ──────────────────────────────
  studentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: C.offWhite,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  studentCell: { flex: 1 },
  studentCellRight: { flex: 1, alignItems: "flex-end" },
  infoLabel: {
    fontSize: 6,
    color: C.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.text,
  },

  // ── Table ─────────────────────────────────────
  table: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  thead: {
    flexDirection: "row",
    backgroundColor: C.primary,
    paddingVertical: 5,
    paddingHorizontal: 5,
    alignItems: "center",
  },
  trow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: "center",
    minHeight: 20,
  },
  trowAlt: { backgroundColor: C.tableAlt },
  th: {
    fontFamily: "Helvetica-Bold",
    color: C.white,
    fontSize: 6.5,
    textTransform: "uppercase",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  td: {
    fontSize: 7.5,
    color: C.text,
    textAlign: "center",
  },
  tdBold: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.text,
    textAlign: "left",
  },

  // ── Column widths for cumulative table ────────
  cNo: { width: 18, textAlign: "center" as const },
  cSubject: { flex: 1 },
  cTerm: { width: 38, textAlign: "center" as const },
  cAvg: { width: 44, textAlign: "center" as const }, // wider — highlighted
  cGrade: { width: 28, textAlign: "center" as const },
  cRemark: { width: 56, textAlign: "left" as const },

  // Grade badge ────────────────────────────────
  badge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  badgeTxt: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },

  // ── Bottom section: Session Summary + Remarks ─
  bottomRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },

  // Session summary panel
  summaryPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  summaryHead: {
    backgroundColor: C.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  summaryHeadTxt: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  summaryRowAlt: { backgroundColor: C.offWhite },
  summaryLbl: { fontSize: 7, color: C.subtext },
  summaryVal: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.text },
  summaryValBlue: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
  },
  summaryValGold: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.gold,
  },

  // Term totals sub-panel inside summary
  termTotalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  termTotalCell: { alignItems: "center", flex: 1 },
  termTotalLbl: { fontSize: 6, color: C.subtext },
  termTotalVal: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.text },

  // Teacher remark panel
  remarkPanel: {
    flex: 1.1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  remarkHead: {
    backgroundColor: C.accent,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  remarkHeadTxt: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  remarkBody: { padding: 8, flex: 1 },
  remarkTxt: {
    fontSize: 7.5,
    color: C.text,
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  remarkName: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.subtext,
    marginTop: 4,
  },

  // ── Signature Row ─────────────────────────────
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  sigCell: { flex: 1, alignItems: "center" },
  sigLineBox: {
    width: 90,
    height: 32,
    borderBottomWidth: 1,
    borderBottomColor: C.text,
    marginBottom: 3,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  sigImg: { width: 88, height: 30, objectFit: "contain" as const },
  sigLbl: {
    fontSize: 6.5,
    color: C.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  sealOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
    overflow: "hidden",
  },
  sealImg: { width: 50, height: 50, objectFit: "contain" as const },
  sealDash: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  sealDashTxt: { fontSize: 5.5, color: C.subtext, textAlign: "center" },

  // ── Grade Key ─────────────────────────────────
  gradeKeyRow: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    marginBottom: 6,
  },
  gkItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  gkBadge: {
    width: 13,
    height: 13,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  gkTxt: { fontSize: 6.5, color: C.subtext },

  // ── Footer ────────────────────────────────────
  footer: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 4,
    alignItems: "center",
  },
  footerTxt: {
    fontSize: 6,
    color: C.subtext,
    textAlign: "center",
    lineHeight: 1.5,
  },
});

// ── Component Props ────────────────────────────────
export interface CumulativeResultSheetProps {
  data: CumulativeResult;
}

// ── PDF Component ──────────────────────────────────
export function CumulativeResultSheet({ data }: CumulativeResultSheetProps) {
  const { school, student, subjects, summary, termTotals, gradeKey } = data;

  return (
    <Document
      title={`Cumulative Result — ${student.fullName} — ${data.sessionName}`}
      author={school.name}
    >
      <Page size="A4" style={S.page}>
        {/* ════════════════════════════════════════
            SCHOOL HEADER
        ════════════════════════════════════════ */}
        <View style={S.header}>
          {school.logo ? (
            <Image
              src={school.logo}
              style={{ width: 48, height: 48, marginBottom: 5 }}
            />
          ) : (
            <View style={S.logoCircle}>
              <Text style={S.logoText}>{"SCHOOL\nLOGO"}</Text>
            </View>
          )}
          <Text style={S.schoolName}>{school.name}</Text>
          {school.address && <Text style={S.schoolSub}>{school.address}</Text>}
          <Text style={S.schoolSub}>
            {[school.phone, school.email].filter(Boolean).join("  ·  ")}
          </Text>
          {school.motto && (
            <Text style={S.motto}>
              &quot;{school.motto.toUpperCase()}&quot;
            </Text>
          )}
        </View>

        {/* ════════════════════════════════════════
            TITLE BAR — Gold color distinguishes
            cumulative from regular term reports
        ════════════════════════════════════════ */}
        <View style={S.titleBar}>
          <View>
            <Text style={S.reportTitle}>Cumulative Session Report</Text>
            <Text style={S.reportSub}>
              Session: {data.sessionName} • End of Session Academic Summary
            </Text>
          </View>
          <View>
            <Text style={S.dateLabel}>Report Date</Text>
            <Text style={S.dateValue}>{reportDate()}</Text>
          </View>
        </View>

        {/* ════════════════════════════════════════
            STUDENT INFO ROW
        ════════════════════════════════════════ */}
        <View style={S.studentRow}>
          <View style={S.studentCell}>
            <Text style={S.infoLabel}>Student Full Name</Text>
            <Text style={S.infoValue}>{student.fullName}</Text>
          </View>
          <View style={S.studentCell}>
            <Text style={S.infoLabel}>Student ID / Reg No.</Text>
            <Text style={S.infoValue}>{student.regNumber}</Text>
          </View>
          <View style={S.studentCellRight}>
            <Text style={S.infoLabel}>Class / Grade</Text>
            <Text style={S.infoValue}>{data.className}</Text>
          </View>
        </View>

        {/* ════════════════════════════════════════
            CUMULATIVE SUBJECT TABLE
            Columns: # | Subject | 1st | 2nd | 3rd | Cumulative Avg | Grade | Remark
        ════════════════════════════════════════ */}
        <View style={S.table}>
          {/* Table header */}
          <View style={S.thead}>
            <Text style={[S.th, S.cNo]}>#</Text>
            <Text style={[S.th, S.cSubject, { textAlign: "left" }]}>
              Subject
            </Text>
            <Text style={[S.th, S.cTerm]}>1st Term</Text>
            <Text style={[S.th, S.cTerm]}>2nd Term</Text>
            <Text style={[S.th, S.cTerm]}>3rd Term</Text>
            <Text
              style={[
                S.th,
                S.cAvg,
                {
                  color: C.gold, // gold header — highlight cumulative
                  backgroundColor: "rgba(0,0,0,0.15)",
                  borderRadius: 2,
                  padding: 2,
                },
              ]}
            >
              Cumulative{"\n"}Average
            </Text>
            <Text style={[S.th, S.cGrade]}>Grade</Text>
            <Text style={[S.th, S.cRemark]}>Remark</Text>
          </View>

          {/* Subject rows */}
          {subjects.map((subj, i) => (
            <View
              key={subj.subjectId}
              style={[S.trow, i % 2 !== 0 ? S.trowAlt : {}]}
            >
              {/* Row number */}
              <Text style={[S.td, S.cNo, { color: C.subtext }]}>{i + 1}</Text>

              {/* Subject name */}
              <Text style={[S.tdBold, S.cSubject]}>{subj.subjectName}</Text>

              {/* 1st Term score */}
              <Text style={[S.td, S.cTerm]}>{fmtNum(subj.firstTerm)}</Text>

              {/* 2nd Term score */}
              <Text style={[S.td, S.cTerm]}>{fmtNum(subj.secondTerm)}</Text>

              {/* 3rd Term score */}
              <Text style={[S.td, S.cTerm]}>{fmtNum(subj.thirdTerm)}</Text>

              {/* Cumulative Average — highlighted gold background */}
              <View
                style={[
                  S.cAvg,
                  {
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 8,
                    fontFamily: "Helvetica-Bold",
                    color: gc(subj.grade),
                  }}
                >
                  {subj.cumulativeAvg.toFixed(1)}
                </Text>
              </View>

              {/* Grade badge */}
              <View style={[S.cGrade, { alignItems: "center" }]}>
                <View style={[S.badge, { backgroundColor: gc(subj.grade) }]}>
                  <Text style={S.badgeTxt}>{subj.grade}</Text>
                </View>
              </View>

              {/* Remark */}
              <Text
                style={[S.td, S.cRemark, { textAlign: "left", fontSize: 7 }]}
              >
                {subj.remark}
              </Text>
            </View>
          ))}

          {/* ── TOTALS ROW ──────────────────────── */}
          <View
            style={[
              S.trow,
              {
                backgroundColor: C.primary,
                borderTopWidth: 1.5,
                borderTopColor: C.primary,
              },
            ]}
          >
            <Text style={[S.th, S.cNo]} />
            <Text style={[S.th, S.cSubject, { textAlign: "left" }]}>TOTAL</Text>
            <Text style={[S.th, S.cTerm]}>
              {termTotals.firstTerm !== null
                ? termTotals.firstTerm.toFixed(0)
                : "—"}
            </Text>
            <Text style={[S.th, S.cTerm]}>
              {termTotals.secondTerm !== null
                ? termTotals.secondTerm.toFixed(0)
                : "—"}
            </Text>
            <Text style={[S.th, S.cTerm]}>
              {termTotals.thirdTerm !== null
                ? termTotals.thirdTerm.toFixed(0)
                : "—"}
            </Text>
            <Text style={[S.th, S.cAvg, { color: C.gold }]}>
              {summary.sessionTotalScore.toFixed(1)}
            </Text>
            <Text style={[S.th, S.cGrade]} />
            <Text style={[S.th, S.cRemark]} />
          </View>
        </View>

        {/* ════════════════════════════════════════
            SESSION SUMMARY + TEACHER REMARK
        ════════════════════════════════════════ */}
        <View style={S.bottomRow}>
          {/* Left: Session Summary */}
          <View style={S.summaryPanel}>
            <View style={S.summaryHead}>
              <Text style={S.summaryHeadTxt}>Session Summary</Text>
            </View>

            {[
              {
                label: "Subjects Offered:",
                value: summary.subjectsOffered.toString(),
                style: "normal" as const,
              },
              {
                label: "Terms Completed:",
                value: `${summary.termsCompleted} of 3`,
                style: "normal" as const,
              },
              {
                label: "Session Total Score:",
                value: summary.sessionTotalScore.toFixed(1),
                style: "normal" as const,
              },
              {
                label: "Session Average:",
                value: `${summary.sessionAverage.toFixed(2)}%`,
                style: "blue" as const,
              },
              {
                label: "Class Position:",
                value: summary.position
                  ? `${summary.position} out of ${summary.outOf}`
                  : "—",
                style: "blue" as const,
              },
              {
                label: "Overall Performance:",
                value: summary.performance,
                style: "gold" as const,
              },
            ].map((row, i) => (
              <View
                key={i}
                style={[S.summaryRow, i % 2 !== 0 ? S.summaryRowAlt : {}]}
              >
                <Text style={S.summaryLbl}>{row.label}</Text>
                <Text
                  style={
                    row.style === "gold"
                      ? S.summaryValGold
                      : row.style === "blue"
                        ? S.summaryValBlue
                        : S.summaryVal
                  }
                >
                  {row.value}
                </Text>
              </View>
            ))}

            {/* ── Per-term totals band ─────────── */}
            <View style={[S.termTotalsRow, { backgroundColor: C.lightBlue }]}>
              {[
                { lbl: "1st Term Total", val: termTotals.firstTerm },
                { lbl: "2nd Term Total", val: termTotals.secondTerm },
                { lbl: "3rd Term Total", val: termTotals.thirdTerm },
              ].map((t) => (
                <View key={t.lbl} style={S.termTotalCell}>
                  <Text style={S.termTotalLbl}>{t.lbl}</Text>
                  <Text style={S.termTotalVal}>
                    {t.val !== null ? t.val.toFixed(0) : "—"}
                  </Text>
                </View>
              ))}
            </View>

            {/* ── Grade key ───────────────────── */}
            <View style={[S.summaryRow, { flexDirection: "column", gap: 2 }]}>
              <Text style={[S.summaryLbl, { marginBottom: 3 }]}>
                Grade Key:
              </Text>
              <View style={S.gradeKeyRow}>
                {gradeKey.map((g) => (
                  <View key={g.grade} style={S.gkItem}>
                    <View style={[S.gkBadge, { backgroundColor: gc(g.grade) }]}>
                      <Text style={[S.badgeTxt, { fontSize: 5.5 }]}>
                        {g.grade}
                      </Text>
                    </View>
                    <Text style={S.gkTxt}>{g.range}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Right: Teacher Remark */}
          <View style={S.remarkPanel}>
            <View style={S.remarkHead}>
              <Text style={S.remarkHeadTxt}>Class Teacher&apos;s Remark</Text>
            </View>
            <View style={S.remarkBody}>
              <Text style={S.remarkTxt}>
                {`"${student.fullName} has completed ${summary.termsCompleted} term(s) of the ${data.sessionName} session with a cumulative average of ${summary.sessionAverage.toFixed(2)}%, placing them in the ${summary.performance} category. ${
                  summary.position
                    ? `Ranked ${summary.position} out of ${summary.outOf} students overall.`
                    : ""
                } ${
                  summary.sessionAverage >= 70
                    ? "Outstanding performance this session — keep excelling!"
                    : summary.sessionAverage >= 60
                      ? "Commendable effort this session. Continue working hard!"
                      : summary.sessionAverage >= 50
                        ? "Satisfactory performance. There is room for improvement."
                        : "We encourage greater dedication and commitment to studies."
                }"`}
              </Text>
            </View>

            {/* Principal Comment divider */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: C.border,
                margin: 8,
                paddingTop: 6,
              }}
            >
              <Text
                style={[
                  S.remarkHeadTxt,
                  {
                    color: C.primary,
                    marginBottom: 4,
                  },
                ]}
              >
                Principal&apos;s Comment
              </Text>
              <Text style={S.remarkTxt}>
                {`"${student.fullName} is commended for their dedication throughout the ${data.sessionName} session. We look forward to continued excellence in the sessions ahead."`}
              </Text>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════
            SIGNATURE ROW
        ════════════════════════════════════════ */}
        <View style={S.sigRow}>
          {/* Class Teacher */}
          <View style={S.sigCell}>
            <View style={S.sigLineBox}>
              {school.teacherSignature && (
                <Image src={school.teacherSignature} style={S.sigImg} />
              )}
            </View>
            <Text style={S.sigLbl}>Class Teacher</Text>
          </View>

          {/* School Seal */}
          <View style={S.sigCell}>
            {school.schoolSeal ? (
              <View style={S.sealOuter}>
                <Image src={school.schoolSeal} style={S.sealImg} />
              </View>
            ) : (
              <View style={S.sealDash}>
                <Text style={S.sealDashTxt}>{"OFFICIAL\nSEAL"}</Text>
              </View>
            )}
            <Text style={S.sigLbl}>School Seal</Text>
          </View>

          {/* Principal */}
          <View style={S.sigCell}>
            <View style={S.sigLineBox}>
              {school.principalSignature && (
                <Image src={school.principalSignature} style={S.sigImg} />
              )}
            </View>
            <Text style={S.sigLbl}>Principal&apos;s Signature</Text>
          </View>
        </View>

        {/* ════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════ */}
        <View style={S.footer}>
          <Text style={S.footerTxt}>
            This is a system-generated cumulative academic report for the{" "}
            {data.sessionName} session. Verification can be done via the
            InnoCore Student Portal using the Student ID / Registration Number.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
