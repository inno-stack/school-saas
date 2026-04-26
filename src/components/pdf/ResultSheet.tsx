/**
 * @file src/components/pdf/ResultSheet.tsx
 * @description Professional A4 academic result sheet — matches the
 * current working PDF design exactly, with signature image support.
 *
 * Key changes from old version:
 * - Renders teacherSignature, schoolSeal, principalSignature as images
 * - Falls back to placeholder lines/circles when images not uploaded
 * - Keeps the exact layout/colors from the current working PDF
 */

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

// ── Color palette ──────────────────────────────────
const C = {
  primary: "#1a3c5e",
  accent: "#2e86c1",
  gold: "#c9a227",
  success: "#1a7a4a",
  warning: "#b45309",
  danger: "#b91c1c",
  white: "#ffffff",
  offWhite: "#f8f9fa",
  lightBlue: "#eaf4fb",
  border: "#dde3ea",
  text: "#111827",
  subtext: "#6b7280",
  tableHeader: "#1a3c5e",
  tableAlt: "#f0f7ff",
};

// ── Grade color resolver ───────────────────────────
function gradeColor(grade: string | null): string {
  switch (grade) {
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

// ── Term label ─────────────────────────────────────
function termLabel(term: string): string {
  return term === "FIRST"
    ? "First (1st) Term"
    : term === "SECOND"
      ? "Second (2nd) Term"
      : "Third (3rd) Term";
}

// ── Date formatter ─────────────────────────────────
function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
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
    paddingTop: 28,
    paddingBottom: 24,
    paddingLeft: 32,
    paddingRight: 32,
  },

  // ── School header ──────────────────────────────
  headerSection: {
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  logoText: {
    color: C.white,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  schoolName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  schoolAddress: {
    fontSize: 7,
    color: C.subtext,
    textAlign: "center",
    marginTop: 2,
  },
  schoolMotto: {
    fontSize: 7,
    color: C.subtext,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // ── Transcript title bar ───────────────────────
  transcriptBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    marginTop: 6,
  },
  transcriptTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  transcriptSub: {
    fontSize: 7,
    color: C.subtext,
    marginTop: 2,
  },
  reportDateLabel: {
    fontSize: 6.5,
    color: C.subtext,
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  reportDateValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    textAlign: "right",
    marginTop: 1,
  },

  // ── Student info row ───────────────────────────
  studentInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: C.offWhite,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  studentInfoItem: { flex: 1 },
  studentInfoItemRight: { flex: 1, alignItems: "flex-end" },
  studentInfoLabel: {
    fontSize: 6,
    color: C.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  studentInfoValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.text,
  },

  // ── Subject table ──────────────────────────────
  table: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 3,
    marginBottom: 10,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: C.tableHeader,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: "center",
    minHeight: 22,
  },
  tableRowAlt: { backgroundColor: C.tableAlt },
  th: {
    fontFamily: "Helvetica-Bold",
    color: C.white,
    fontSize: 6.5,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  td: {
    fontSize: 7.5,
    color: C.text,
    textAlign: "center",
  },
  tdSubject: {
    fontSize: 7.5,
    color: C.text,
    textAlign: "left",
    fontFamily: "Helvetica-Bold",
  },
  colSubject: { flex: 1 },
  colCA: { width: 40, textAlign: "center" as const },
  colExam: { width: 44, textAlign: "center" as const },
  colTotal: { width: 36, textAlign: "center" as const },
  colGrade: { width: 36, textAlign: "center" as const },
  colAvg: { width: 40, textAlign: "center" as const },
  colRemark: { width: 80, textAlign: "left" as const },
  gradeBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  gradeBadgeText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },

  // ── Bottom row: summary + remark ──────────────
  bottomRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  summaryHeader: {
    backgroundColor: C.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  summaryHeaderText: {
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
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  summaryRowAlt: { backgroundColor: C.offWhite },
  summaryLabel: { fontSize: 7, color: C.subtext },
  summaryValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.text },
  summaryValueHighlight: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.accent,
  },
  remarkBox: {
    flex: 1.2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  remarkHeader: {
    backgroundColor: C.accent,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  remarkHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  remarkBody: { padding: 8, flex: 1 },
  remarkText: {
    fontSize: 7.5,
    color: C.text,
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  remarkName: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.subtext,
    marginTop: 6,
  },

  // ── Signature row — KEY FIX ─────────────────────
  // Three columns: Teacher | Seal | Principal
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  sigCell: {
    flex: 1,
    alignItems: "center",
  },

  // ── Signature image + line below ───────────────
  // When image is uploaded → show image above the line
  // When no image → show empty space above the line
  sigLineBox: {
    width: 90,
    height: 36,
    alignItems: "center",
    justifyContent: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: C.text,
    marginBottom: 4,
    paddingBottom: 2,
  },
  // Image fills the line box when available
  sigImg: {
    width: 88,
    height: 34,
    objectFit: "contain" as const,
  },
  sigLabel: {
    fontSize: 6.5,
    color: C.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  // ── School seal ────────────────────────────────
  // Circle with image inside, or dashed placeholder
  sealOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    overflow: "hidden",
  },
  sealImg: {
    width: 54,
    height: 54,
    objectFit: "contain" as const,
  },
  sealPlaceholderOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  sealPlaceholderText: {
    fontSize: 5.5,
    color: C.subtext,
    textAlign: "center",
  },

  // ── Dates row ──────────────────────────────────
  datesRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  dateItem: { alignItems: "center" },
  dateLabel: {
    fontSize: 6,
    color: C.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
  },

  // ── Footer ─────────────────────────────────────
  docFooter: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 5,
    alignItems: "center",
  },
  docFooterText: {
    fontSize: 6,
    color: C.subtext,
    textAlign: "center",
    lineHeight: 1.6,
  },
});

// ── Props type ─────────────────────────────────────
export interface ResultSheetProps {
  data: {
    school: {
      name: string;
      address: string | null;
      phone: string | null;
      email: string | null;
      motto: string | null;
      logo: string | null;
      teacherSignature: string | null;
      schoolSeal: string | null;
      principalSignature: string | null;
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
      vacationDate: string | null;
      resumptionDate: string | null;
    };
    subjects: Array<{
      sn: number;
      name: string;
      code: string | null;
      caScore: number | null;
      examScore: number | null;
      totalScore: number | null;
      grade: string | null;
      description: string | null;
      remark: string | null;
      classAverage: number | null;
    }>;
    comments: {
      teacher: string | null;
      teacherName: string | null;
      principal: string | null;
      principalName: string | null;
    };
    gradeKey: Array<{
      range: string;
      grade: string;
      description: string;
      remark: string;
    }>;
  };
}

// ── Main PDF Component ─────────────────────────────
export function ResultSheet({ data }: ResultSheetProps) {
  const { school, student, summary, attendance, subjects, comments } = data;

  return (
    <Document
      title={`Result — ${student.fullName} — ${termLabel(data.term)}`}
      author={school.name}
    >
      <Page size="A4" style={S.page}>
        {/* ════════════════════════════════════════
            SCHOOL HEADER
        ════════════════════════════════════════ */}
        <View style={S.headerSection}>
          {/* School logo — image if available, circle fallback */}
          {school.logo ? (
            <Image
              src={school.logo}
              style={{ width: 52, height: 52, marginBottom: 6 }}
            />
          ) : (
            <View style={S.logoCircle}>
              <Text style={S.logoText}>{"SCHOOL\nLOGO"}</Text>
            </View>
          )}

          <Text style={S.schoolName}>{school.name}</Text>

          {school.address && (
            <Text style={S.schoolAddress}>{school.address}</Text>
          )}

          <Text style={S.schoolAddress}>
            {[school.phone, school.email].filter(Boolean).join("  ·  ")}
          </Text>

          {school.motto && (
            <Text style={S.schoolMotto}>
              &quot;{school.motto.toUpperCase()}&quot;
            </Text>
          )}
        </View>

        {/* ════════════════════════════════════════
            TRANSCRIPT TITLE BAR
        ════════════════════════════════════════ */}
        <View style={S.transcriptBar}>
          <View>
            <Text style={S.transcriptTitle}>Official Academic Transcript</Text>
            <Text style={S.transcriptSub}>
              Session: {data.session} • Term: {termLabel(data.term)}
            </Text>
          </View>
          <View>
            <Text style={S.reportDateLabel}>Report Date</Text>
            <Text style={S.reportDateValue}>
              {new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* ════════════════════════════════════════
            STUDENT INFO ROW
        ════════════════════════════════════════ */}
        <View style={S.studentInfoRow}>
          <View style={S.studentInfoItem}>
            <Text style={S.studentInfoLabel}>Student Full Name</Text>
            <Text style={S.studentInfoValue}>{student.fullName}</Text>
          </View>
          <View style={S.studentInfoItem}>
            <Text style={S.studentInfoLabel}>Student ID / Reg No.</Text>
            <Text style={S.studentInfoValue}>{student.regNumber}</Text>
          </View>
          <View style={S.studentInfoItemRight}>
            <Text style={S.studentInfoLabel}>Class / Grade</Text>
            <Text style={S.studentInfoValue}>{data.class}</Text>
          </View>
        </View>

        {/* ════════════════════════════════════════
            SUBJECT TABLE
        ════════════════════════════════════════ */}
        <View style={S.table}>
          <View style={S.tableHead}>
            <Text style={[S.th, S.colSubject]}>Subject</Text>
            <Text style={[S.th, S.colCA, { textAlign: "center" }]}>
              CA Score{"\n"}(40)
            </Text>
            <Text style={[S.th, S.colExam, { textAlign: "center" }]}>
              Exam Score{"\n"}(60)
            </Text>
            <Text style={[S.th, S.colTotal, { textAlign: "center" }]}>
              Total{"\n"}(100)
            </Text>
            <Text style={[S.th, S.colGrade, { textAlign: "center" }]}>
              Grade
            </Text>
            <Text style={[S.th, S.colAvg, { textAlign: "center" }]}>
              Average
            </Text>
            <Text style={[S.th, S.colRemark]}>Remark</Text>
          </View>

          {subjects.map((subj, i) => (
            <View
              key={i}
              style={[S.tableRow, i % 2 !== 0 ? S.tableRowAlt : {}]}
            >
              <Text style={[S.tdSubject, S.colSubject]}>{subj.name}</Text>
              <Text style={[S.td, S.colCA]}>{subj.caScore ?? "—"}</Text>
              <Text style={[S.td, S.colExam]}>{subj.examScore ?? "—"}</Text>
              <Text
                style={[S.td, S.colTotal, { fontFamily: "Helvetica-Bold" }]}
              >
                {subj.totalScore ?? "—"}
              </Text>
              <View style={[S.colGrade, { alignItems: "center" }]}>
                <View
                  style={[
                    S.gradeBadge,
                    { backgroundColor: gradeColor(subj.grade) },
                  ]}
                >
                  <Text style={S.gradeBadgeText}>{subj.grade ?? "—"}</Text>
                </View>
              </View>
              <Text style={[S.td, S.colAvg]}>{subj.classAverage ?? "—"}</Text>
              <Text
                style={[S.td, S.colRemark, { textAlign: "left", fontSize: 7 }]}
              >
                {subj.remark ?? "—"}
              </Text>
            </View>
          ))}
        </View>

        {/* ════════════════════════════════════════
            ACADEMIC SUMMARY + TEACHER REMARK
        ════════════════════════════════════════ */}
        <View style={S.bottomRow}>
          {/* Academic Summary */}
          <View style={S.summaryBox}>
            <View style={S.summaryHeader}>
              <Text style={S.summaryHeaderText}>Academic Summary</Text>
            </View>

            {[
              {
                label: `Total Score (Out of ${subjects.length * 100}):`,
                value: summary.totalScore.toString(),
                highlight: false,
              },
              {
                label: "Aggregate Average:",
                value: `${summary.average}%`,
                highlight: false,
              },
              {
                label: "Class Rank / Position:",
                value: summary.position
                  ? `${summary.position} out of ${summary.outOf}`
                  : "—",
                highlight: true,
              },
              {
                label: "Overall Performance:",
                value: summary.performance ?? "—",
                highlight: false,
              },
              {
                label: "Subjects Offered:",
                value: summary.subjectsOffered.toString(),
                highlight: false,
              },
            ].map((row, i) => (
              <View
                key={i}
                style={[S.summaryRow, i % 2 !== 0 ? S.summaryRowAlt : {}]}
              >
                <Text style={S.summaryLabel}>{row.label}</Text>
                <Text
                  style={
                    row.highlight ? S.summaryValueHighlight : S.summaryValue
                  }
                >
                  {row.value}
                </Text>
              </View>
            ))}

            {/* Grade key */}
            <View style={[S.summaryRow, { flexDirection: "column", gap: 2 }]}>
              <Text style={[S.summaryLabel, { marginBottom: 3 }]}>
                Grade Key:
              </Text>
              {data.gradeKey.map((g) => (
                <View
                  key={g.grade}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 1.5,
                  }}
                >
                  <View
                    style={[
                      S.gradeBadge,
                      {
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: gradeColor(g.grade),
                      },
                    ]}
                  >
                    <Text style={[S.gradeBadgeText, { fontSize: 6 }]}>
                      {g.grade}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 6.5, color: C.subtext }}>
                    {g.range} — {g.description} ({g.remark})
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Teacher + Principal Remark */}
          <View style={S.remarkBox}>
            <View style={S.remarkHeader}>
              <Text style={S.remarkHeaderText}>
                Class Teacher&apos;s Remark
              </Text>
            </View>
            <View style={S.remarkBody}>
              <Text style={S.remarkText}>
                {comments.teacher
                  ? `"${comments.teacher}"`
                  : `"${student.fullName} has shown ${
                      summary.performance === "Distinction"
                        ? "exceptional"
                        : summary.performance === "Upper Credit"
                          ? "commendable"
                          : summary.performance === "Credit"
                            ? "satisfactory"
                            : "some"
                    } academic performance this term with an average of ${
                      summary.average
                    }%. ${
                      summary.position
                        ? `Ranked ${summary.position} out of ${summary.outOf} students.`
                        : ""
                    } Keep up the good work!"`}
              </Text>
              {comments.teacherName && (
                <Text style={S.remarkName}>— {comments.teacherName}</Text>
              )}

              {/* Principal comment divider */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: C.border,
                  marginTop: 8,
                  paddingTop: 8,
                }}
              >
                <Text
                  style={[
                    S.remarkHeaderText,
                    {
                      color: C.primary,
                      marginBottom: 4,
                    },
                  ]}
                >
                  Principal&apos;s Comment
                </Text>
                <Text style={S.remarkText}>
                  {comments.principal
                    ? `"${comments.principal}"`
                    : `"${student.fullName} is encouraged to maintain this level of performance. We are proud of your achievement this term."`}
                </Text>
                {comments.principalName && (
                  <Text style={S.remarkName}>— {comments.principalName}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════
            VACATION / RESUMPTION DATES
        ════════════════════════════════════════ */}
        {(attendance.vacationDate || attendance.resumptionDate) && (
          <View style={S.datesRow}>
            {attendance.vacationDate && (
              <View style={S.dateItem}>
                <Text style={S.dateLabel}>Date of Vacation</Text>
                <Text style={S.dateValue}>
                  {fmtDate(attendance.vacationDate)}
                </Text>
              </View>
            )}
            {attendance.resumptionDate && (
              <View style={S.dateItem}>
                <Text style={S.dateLabel}>Resumption Date</Text>
                <Text style={S.dateValue}>
                  {fmtDate(attendance.resumptionDate)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ════════════════════════════════════════
            SIGNATURE ROW
            ─────────────────────────────────────
            3 columns:
            [Class Teacher] [School Seal] [Principal]

            KEY FIX: Images are rendered when available.
            Placeholder lines/circles shown as fallback.
        ════════════════════════════════════════ */}
        <View style={S.sigRow}>
          {/* ── Column 1: Class Teacher ──────────── */}
          <View style={S.sigCell}>
            <View style={S.sigLineBox}>
              {/* Render uploaded signature image if available */}
              {school.teacherSignature && (
                <Image src={school.teacherSignature} style={S.sigImg} />
              )}
              {/* Empty space shown when no signature uploaded */}
            </View>
            <Text style={S.sigLabel}>Class Teacher</Text>
          </View>

          {/* ── Column 2: School Seal ────────────── */}
          <View style={S.sigCell}>
            {school.schoolSeal ? (
              // ── Uploaded seal — show as circle image ─
              <View style={S.sealOuter}>
                <Image src={school.schoolSeal} style={S.sealImg} />
              </View>
            ) : (
              // ── No seal — show dashed circle placeholder ─
              <View style={S.sealPlaceholderOuter}>
                <Text style={S.sealPlaceholderText}>{"OFFICIAL\nSEAL"}</Text>
              </View>
            )}
            <Text style={S.sigLabel}>School Seal</Text>
          </View>

          {/* ── Column 3: Principal ──────────────── */}
          <View style={S.sigCell}>
            <View style={S.sigLineBox}>
              {/* Render uploaded signature image if available */}
              {school.principalSignature && (
                <Image src={school.principalSignature} style={S.sigImg} />
              )}
              {/* Empty space shown when no signature uploaded */}
            </View>
            <Text style={S.sigLabel}>Principal&apos;s Signature</Text>
          </View>
        </View>

        {/* ════════════════════════════════════════
            DOCUMENT FOOTER
        ════════════════════════════════════════ */}
        <View style={S.docFooter}>
          <Text style={S.docFooterText}>
            This is a system-generated academic report. Verification of
            authenticity can be done via the InnoCore Student Portal using the
            Student ID / Registration Number.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
