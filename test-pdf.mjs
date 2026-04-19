// test-pdf.mjs
// Run with: node test-pdf.mjs

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbW12dnNqb2UwMDAzY292N2FpZmFzbXUxIiwiZW1haWwiOiJqb2huLmRvZV8yQGdyZWVuZmllbGQuY29tIiwicm9sZSI6IlNDSE9PTF9BRE1JTiIsInNjaG9vbElkIjoiY21tdnZzam9hMDAwMmNvdjc4OTZyMnV3OCIsImlhdCI6MTc3NDMwODM2NCwiZXhwIjoxNzc0MzA5MjY0fQ.mOsX5I9o-DliWDx0jZl41u2iSUN8GIvhwiXR0e_FWTw";
const STUDENT_ID = "cmn1rclqu0002u0v7lat16qql";
const TERM_ID = "cmmxw5gch00031gv7ki0x1dko";

const response = await fetch(
  `http://localhost:3000/api/results/pdf?studentId=${STUDENT_ID}&termId=${TERM_ID}`,
  {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  },
);

if (!response.ok) {
  const error = await response.json();
  console.error("❌ Error:", error);
  process.exit(1);
}

// Save to file
import { writeFileSync } from "fs";

const buffer = await response.arrayBuffer();
writeFileSync("result_output.pdf", Buffer.from(buffer));

console.log("✅ PDF saved as result_output.pdf");
console.log("📄 Open it from your project root folder");
