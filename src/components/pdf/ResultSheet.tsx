import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

Font.register({ family: "Helvetica", fonts: [] });

const COLORS = {
  primary: "#1a3c5e",
  secondary: "#2e86c1",
  accent: "#eaf4fb",
  gold: "#d4a017",
  success: "#1e8449",
  danger: "#c0392b",
  warning: "#d68910",
  white: "#ffffff",
  light: "#f8f9fa",
  border: "#d5d8dc",
  text: "#1a1a2e",
  subtext: "#5d6d7e",
};

function gradeColor(grade: string) {
  switch (grade) {
    case "A":
      return COLORS.success;
    case "B":
      return COLORS.secondary;
    case "C":
      return COLORS.warning;
    case "P":
      return "#7d6608";
    case "F":
      return COLORS.danger;
    default:
      return COLORS.text;
  }
}

function gradeBg(grade: string) {
  switch (grade) {
    case "A":
      return COLORS.success;
    case "B":
      return COLORS.secondary;
    case "C":
      return COLORS.warning;
    case "P":
      return "#7d6608";
    case "F":
      return COLORS.danger;
    default:
      return COLORS.subtext;
  }
}

function ratingLabel(r: string | null) {
  switch (r) {
    case "EXCELLENT":
      return "5 - Excellent";
    case "GOOD":
      return "4 - Good";
    case "FAIR":
      return "3 - Fair";
    case "POOR":
      return "2 - Poor";
    case "VERY_POOR":
      return "1 - Very Poor";
    default:
      return "—";
  }
}

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 18,
    paddingRight: 18,
  },

  // HEADER
  headerWrapper: {
    borderBottomWidth: 2.5,
    borderBottomColor: COLORS.primary,
    paddingBottom: 6,
    marginBottom: 5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  leftMeta: {
    width: 85,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  metaLabel: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    width: 36,
    fontSize: 6.5,
  },
  metaValue: {
    fontSize: 6.5,
    color: COLORS.text,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  schoolName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  schoolSub: {
    fontSize: 6.2,
    color: COLORS.subtext,
    marginTop: 1.5,
    textAlign: "center",
  },
  titleBadge: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 2.5,
    paddingHorizontal: 10,
    borderRadius: 3,
  },
  titleBadgeText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    textAlign: "center",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  logoBox: {
    width: 85,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.light,
  },
  logoText: {
    fontSize: 5.8,
    color: COLORS.subtext,
    textAlign: "center",
  },

  // INFO GRID
  infoGrid: {
    flexDirection: "row",
    backgroundColor: COLORS.accent,
    borderRadius: 3,
    padding: 5,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoCol: { flex: 1 },
  infoRow: { flexDirection: "row", marginBottom: 2 },
  infoLabel: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    width: 70,
    fontSize: 6.8,
  },
  infoValue: { flex: 1, fontSize: 6.8 },

  // SUMMARY BAND
  summaryBand: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    marginBottom: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.15)",
  },
  summaryLabel: {
    fontSize: 5.5,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 1.5,
    textAlign: "center",
  },
  summaryValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    textAlign: "center",
  },
  summaryGold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gold,
    textAlign: "center",
  },

  // ATTENDANCE
  attendanceBar: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
    paddingVertical: 4,
    marginBottom: 4,
  },
  attItem: { flex: 1, alignItems: "center" },
  attLabel: {
    fontSize: 5.5,
    color: COLORS.subtext,
    textTransform: "uppercase",
    marginBottom: 1,
    textAlign: "center",
  },
  attValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: COLORS.primary,
  },

  // TABLE
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: COLORS.primary,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    paddingBottom: 1.5,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 4,
    overflow: "hidden",
  },
  tHead: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 3,
    paddingHorizontal: 3,
  },
  tRow: {
    flexDirection: "row",
    paddingVertical: 2.5,
    paddingHorizontal: 3,
    alignItems: "center",
  },
  tRowEven: { backgroundColor: COLORS.accent },
  tRowOdd: { backgroundColor: COLORS.white },
  th: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    fontSize: 6,
    textAlign: "center",
  },
  td: { fontSize: 6.5, textAlign: "center", color: COLORS.text },
  tdLeft: { fontSize: 6.5, textAlign: "left", color: COLORS.text },
  cSn: { width: 16 },
  cSubject: { flex: 1 },
  cScore: { width: 26 },
  cTotal: { width: 26 },
  cGrade: { width: 20 },
  cDesc: { width: 52 },
  cRemark: { width: 42 },
  cPos: { width: 22 },
  cAvg: { width: 28 },

  // BOTTOM ROW
  bottomRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 4,
  },
  panel: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  panelHead: {
    backgroundColor: COLORS.primary,
    paddingVertical: 2.5,
    paddingHorizontal: 5,
  },
  panelHeadText: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    fontSize: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  skillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  skillRowAlt: { backgroundColor: COLORS.accent },
  skillName: { fontSize: 6.2, color: COLORS.text },
  skillVal: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.secondary,
  },

  // GRADE KEY — inline horizontal layout
  gradeKeyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 4,
    gap: 2,
  },
  gradeKeyItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginBottom: 2,
  },
  gradeKBadge: {
    width: 14,
    height: 12,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 3,
  },
  gradeKBadgeText: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  gradeKLabel: { fontSize: 6, color: COLORS.text },

  // RATING SCALE — single row
  ratingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 4,
    gap: 3,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ratingItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
  },
  ratingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 2,
    backgroundColor: COLORS.secondary,
  },
  ratingText: { fontSize: 5.8, color: COLORS.text },

  // SUMMARY SENTENCE
  summaryText: {
    fontSize: 6.8,
    color: COLORS.primary,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    backgroundColor: COLORS.accent,
    padding: 4,
    borderRadius: 3,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // COMMENTS
  commentsRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 4,
  },
  commentBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  commentHead: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 2.5,
    paddingHorizontal: 5,
  },
  commentHeadText: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    fontSize: 6,
    textTransform: "uppercase",
  },
  commentBody: {
    padding: 5,
    minHeight: 30,
  },
  commentText: {
    fontSize: 6.5,
    color: COLORS.text,
    fontStyle: "italic",
  },
  commentName: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: COLORS.subtext,
    marginTop: 2,
  },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderStyle: "dashed",
    marginTop: 6,
    paddingTop: 2,
  },
  sigText: { fontSize: 5.8, color: COLORS.subtext },

  stampBox: {
    width: 75,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },

  // FOOTER
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 5.8, color: COLORS.subtext },
  footerBadge: {
    backgroundColor: COLORS.primary,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  footerBadgeText: {
    fontSize: 5.8,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
  },
});

// ── Types ──────────────────────────────────────────
interface ResultSheetProps {
  data: {
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
    subjects: Array<{
      sn: number;
      name: string;
      caScore: number | null;
      examScore: number | null;
      totalScore: number | null;
      grade: string | null;
      description: string | null;
      remark: string | null;
      positionInClass: string | null;
      classAverage: number | null;
    }>;
    psychomotorSkills: Array<{ name: string; rating: string | null }>;
    socialBehaviour: Array<{ name: string; rating: string | null }>;
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

export function ResultSheet({ data }: ResultSheetProps) {
  const {
    school,
    student,
    summary,
    attendance,
    subjects,
    psychomotorSkills,
    socialBehaviour,
    comments,
    gradeKey,
  } = data;

  const gradeCounts = subjects.reduce(
    (acc, s) => {
      if (s.grade) acc[s.grade] = (acc[s.grade] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const summarySentence = Object.entries(gradeCounts)
    .map(([g, c]) => `${c} ${g}(s)`)
    .join(", ");

  const termLabel =
    data.term === "FIRST"
      ? "1st Term"
      : data.term === "SECOND"
        ? "2nd Term"
        : "3rd Term";

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* ── HEADER ─────────────────────────── */}
        <View style={S.headerWrapper}>
          <View style={S.headerRow}>
            <View style={S.leftMeta}>
              {[
                { label: "Reg No:", value: student.regNumber },
                { label: "Gender:", value: student.gender },
              ].map((r, i) => (
                <View key={i} style={S.metaRow}>
                  <Text style={S.metaLabel}>{r.label}</Text>
                  <Text style={S.metaValue}>{r.value}</Text>
                </View>
              ))}
            </View>

            <View style={S.headerCenter}>
              <Text style={S.schoolName}>{school.name}</Text>
              {school.motto && (
                <Text style={[S.schoolSub, { fontStyle: "italic" }]}>
                  &quot;{school.motto}&quot;
                </Text>
              )}
              {school.address && (
                <Text style={S.schoolSub}>{school.address}</Text>
              )}
              <Text style={S.schoolSub}>
                {[school.phone, school.email].filter(Boolean).join("  •  ")}
              </Text>
              <View style={S.titleBadge}>
                <Text style={S.titleBadgeText}>
                  Student&apos;s Termly Academic Assessment Report
                </Text>
              </View>
            </View>

            <View style={S.logoBox}>
              <Text style={S.logoText}>SCHOOL{"\n"}LOGO</Text>
            </View>
          </View>
        </View>

        {/* ── STUDENT INFO ────────────────────── */}
        <View style={S.infoGrid}>
          <View style={S.infoCol}>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Student Name:</Text>
              <Text style={[S.infoValue, { fontFamily: "Helvetica-Bold" }]}>
                {student.fullName}
              </Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Class:</Text>
              <Text style={S.infoValue}>{data.class}</Text>
            </View>
          </View>
          <View style={[S.infoCol, { paddingLeft: 10 }]}>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Academic Session:</Text>
              <Text style={S.infoValue}>{data.session}</Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Current Term:</Text>
              <Text style={[S.infoValue, { fontFamily: "Helvetica-Bold" }]}>
                {termLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* ── SUMMARY BAND ────────────────────── */}
        <View style={S.summaryBand}>
          {[
            {
              label: "Subjects Offered",
              value: summary.subjectsOffered.toString(),
            },
            {
              label: "Subjects Evaluated",
              value: summary.subjectsEvaluated.toString(),
            },
            { label: "Total Score", value: summary.totalScore.toString() },
            { label: "Average", value: `${summary.average}%` },
            {
              label: "Position",
              value: summary.position
                ? `${summary.position} / ${summary.outOf}`
                : "—",
              gold: true,
            },
            {
              label: "Performance",
              value: summary.performance ?? "—",
              gold: true,
            },
          ].map((item, i) => (
            <View key={i} style={S.summaryItem}>
              <Text style={S.summaryLabel}>{item.label}</Text>
              <Text style={item.gold ? S.summaryGold : S.summaryValue}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* ── ATTENDANCE ──────────────────────── */}
        <View style={S.attendanceBar}>
          {[
            {
              label: "Days Open",
              value: attendance.daysOpen?.toString() ?? "—",
            },
            {
              label: "Days Present",
              value: attendance.daysPresent?.toString() ?? "—",
            },
            {
              label: "Days Absent",
              value: attendance.daysAbsent?.toString() ?? "—",
            },
            { label: "Date of Vacation", value: fmt(attendance.vacationDate) },
            { label: "Resumption Date", value: fmt(attendance.resumptionDate) },
          ].map((item, i) => (
            <View key={i} style={S.attItem}>
              <Text style={S.attLabel}>{item.label}</Text>
              <Text style={S.attValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* ── RESULT TABLE ─────────────────────── */}
        <Text style={S.sectionTitle}>
          Student&apos;s Termly Result Detail and Analysis
        </Text>
        <View style={S.table}>
          <View style={S.tHead}>
            <Text style={[S.th, S.cSn]}>S/N</Text>
            <Text style={[S.th, S.cSubject, { textAlign: "left" }]}>
              Subject
            </Text>
            <Text style={[S.th, S.cScore]}>CA (40)</Text>
            <Text style={[S.th, S.cScore]}>Exam (60)</Text>
            <Text style={[S.th, S.cTotal]}>Total</Text>
            <Text style={[S.th, S.cGrade]}>Grade</Text>
            <Text style={[S.th, S.cDesc]}>Description</Text>
            <Text style={[S.th, S.cRemark]}>Remark</Text>
            <Text style={[S.th, S.cPos]}>Pos.</Text>
            <Text style={[S.th, S.cAvg]}>Class Avg</Text>
          </View>
          {subjects.map((s, i) => (
            <View
              key={i}
              style={[S.tRow, i % 2 === 0 ? S.tRowOdd : S.tRowEven]}
            >
              <Text style={[S.td, S.cSn]}>{s.sn}</Text>
              <Text style={[S.tdLeft, S.cSubject]}>{s.name}</Text>
              <Text style={[S.td, S.cScore]}>{s.caScore ?? "—"}</Text>
              <Text style={[S.td, S.cScore]}>{s.examScore ?? "—"}</Text>
              <Text style={[S.td, S.cTotal, { fontFamily: "Helvetica-Bold" }]}>
                {s.totalScore ?? "—"}
              </Text>
              <Text
                style={[
                  S.td,
                  S.cGrade,
                  {
                    fontFamily: "Helvetica-Bold",
                    color: gradeColor(s.grade ?? ""),
                  },
                ]}
              >
                {s.grade ?? "—"}
              </Text>
              <Text style={[S.td, S.cDesc]}>{s.description ?? "—"}</Text>
              <Text
                style={[
                  S.td,
                  S.cRemark,
                  {
                    color:
                      s.remark === "Excellent" || s.remark === "Very Good"
                        ? COLORS.success
                        : s.remark === "Poor"
                          ? COLORS.danger
                          : COLORS.text,
                  },
                ]}
              >
                {s.remark ?? "—"}
              </Text>
              <Text style={[S.td, S.cPos]}>{s.positionInClass ?? "—"}</Text>
              <Text style={[S.td, S.cAvg]}>{s.classAverage ?? "—"}</Text>
            </View>
          ))}
        </View>

        {/* ── BOTTOM: Skills + Grade Key ────────── */}
        <View style={S.bottomRow}>
          {/* Psychomotor */}
          <View style={S.panel}>
            <View style={S.panelHead}>
              <Text style={S.panelHeadText}>Psychomotor Skills</Text>
            </View>
            {psychomotorSkills.length > 0 ? (
              psychomotorSkills.map((s, i) => (
                <View
                  key={i}
                  style={[S.skillRow, i % 2 !== 0 ? S.skillRowAlt : {}]}
                >
                  <Text style={S.skillName}>{s.name}</Text>
                  <Text style={S.skillVal}>{ratingLabel(s.rating)}</Text>
                </View>
              ))
            ) : (
              <Text style={{ padding: 5, fontSize: 6, color: COLORS.subtext }}>
                Not recorded
              </Text>
            )}
          </View>

          {/* Social */}
          <View style={S.panel}>
            <View style={S.panelHead}>
              <Text style={S.panelHeadText}>Social Behaviour</Text>
            </View>
            {socialBehaviour.length > 0 ? (
              socialBehaviour.map((s, i) => (
                <View
                  key={i}
                  style={[S.skillRow, i % 2 !== 0 ? S.skillRowAlt : {}]}
                >
                  <Text style={S.skillName}>{s.name}</Text>
                  <Text style={S.skillVal}>{ratingLabel(s.rating)}</Text>
                </View>
              ))
            ) : (
              <Text style={{ padding: 5, fontSize: 6, color: COLORS.subtext }}>
                Not recorded
              </Text>
            )}
          </View>

          {/* Grade Key + Rating scale compact */}
          <View style={S.panel}>
            <View style={S.panelHead}>
              <Text style={S.panelHeadText}>Grade Key</Text>
            </View>
            <View style={S.gradeKeyRow}>
              {gradeKey.map((g, i) => (
                <View key={i} style={S.gradeKeyItem}>
                  <View
                    style={[
                      S.gradeKBadge,
                      { backgroundColor: gradeBg(g.grade) },
                    ]}
                  >
                    <Text style={S.gradeKBadgeText}>{g.grade}</Text>
                  </View>
                  <View>
                    <Text
                      style={[S.gradeKLabel, { fontFamily: "Helvetica-Bold" }]}
                    >
                      {g.description}
                    </Text>
                    <Text
                      style={[
                        S.gradeKLabel,
                        { color: COLORS.subtext, fontSize: 5.5 },
                      ]}
                    >
                      {g.range} — {g.remark}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            {/* Rating scale inline */}
            <View style={S.ratingRow}>
              {["5=Excellent", "4=Good", "3=Fair", "2=Poor", "1=V.Poor"].map(
                (r, i) => (
                  <View key={i} style={S.ratingItem}>
                    <View style={S.ratingDot} />
                    <Text style={S.ratingText}>{r}</Text>
                  </View>
                ),
              )}
            </View>
          </View>
        </View>

        {/* ── SUMMARY SENTENCE ────────────────── */}
        <Text style={S.summaryText}>
          Dear {student.fullName}, you made {summarySentence} in your{" "}
          {termLabel} of {data.session} Academic Session.
        </Text>

        {/* ── COMMENTS ─────────────────────────── */}
        <View style={S.commentsRow}>
          <View style={S.commentBox}>
            <View style={S.commentHead}>
              <Text style={S.commentHeadText}>
                Class Teacher&apos;s Comment
              </Text>
            </View>
            <View style={S.commentBody}>
              <Text style={S.commentText}>
                {comments.teacher ?? "No comment provided."}
              </Text>
              {comments.teacherName && (
                <Text style={S.commentName}>{comments.teacherName}</Text>
              )}
              <View style={S.sigLine}>
                <Text style={S.sigText}>
                  Signature & Date: ___________________
                </Text>
              </View>
            </View>
          </View>

          <View style={S.commentBox}>
            <View style={S.commentHead}>
              <Text style={S.commentHeadText}>Principal&apos;s Comment</Text>
            </View>
            <View style={S.commentBody}>
              <Text style={S.commentText}>
                {comments.principal ?? "No comment provided."}
              </Text>
              {comments.principalName && (
                <Text style={S.commentName}>{comments.principalName}</Text>
              )}
              <View style={S.sigLine}>
                <Text style={S.sigText}>
                  Signature & Date: ___________________
                </Text>
              </View>
            </View>
          </View>

          {/* Stamp */}
          <View style={S.stampBox}>
            <View style={S.commentHead}>
              <Text style={S.commentHeadText}>School Stamp</Text>
            </View>
            <View
              style={[
                S.commentBody,
                {
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 45,
                },
              ]}
            >
              <View
                style={{
                  width: 55,
                  height: 55,
                  borderRadius: 28,
                  borderWidth: 1.5,
                  borderColor: COLORS.border,
                  borderStyle: "dashed",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 5.5,
                    color: COLORS.subtext,
                    textAlign: "center",
                  }}
                >
                  OFFICIAL{"\n"}STAMP
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── FOOTER ───────────────────────────── */}
        <View style={S.footer}>
          <Text style={S.footerText}>
            Generated:{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Text style={S.footerText}>
            {school.name} — {data.session} Academic Session
          </Text>
          <View style={S.footerBadge}>
            <Text style={S.footerBadgeText}>OFFICIAL RESULT</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
