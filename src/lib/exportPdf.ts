import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SessionRow } from "./types";

export const exportResultsPdf = (session: SessionRow) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Interview Results Report", pageWidth / 2, 20, { align: "center" });

  // Topic & Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Topic: ${session.topic_title}`, pageWidth / 2, 28, { align: "center" });
  doc.text(`Date: ${new Date(session.created_at).toLocaleString()}`, pageWidth / 2, 34, { align: "center" });

  // Bluff Score
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Final Bluff Score", 14, 48);
  doc.setFontSize(36);
  const score = Math.round(session.final_bluff_score);
  doc.text(`${score}%`, 14, 64);

  const getGrade = (s: number) => {
    if (s < 20) return "Expert";
    if (s < 40) return "Solid";
    if (s < 60) return "Surface";
    if (s < 80) return "Bluffer";
    return "Exposed";
  };
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Grade: ${getGrade(score)}`, 60, 58);

  // Concept Coverage Table
  const concepts = session.concept_coverage || [];
  const clearCount = concepts.filter((c) => c.status === "clear").length;
  const shallowCount = concepts.filter((c) => c.status === "shallow").length;
  const missingCount = concepts.filter((c) => c.status === "missing").length;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Concept Coverage", 14, 80);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Clear: ${clearCount}  |  Shallow: ${shallowCount}  |  Missing: ${missingCount}  |  Total: ${concepts.length}`, 14, 88);

  autoTable(doc, {
    startY: 92,
    head: [["Concept", "Status"]],
    body: concepts.map((c) => [c.name, c.status.charAt(0).toUpperCase() + c.status.slice(1)]),
    theme: "striped",
    headStyles: { fillColor: [30, 30, 35], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 245, 248] },
    margin: { left: 14, right: 14 },
  });

  // Bluff History Table
  const bluffHistory = session.bluff_history || [];
  if (bluffHistory.length > 0) {
    const currentY = (doc as any).lastAutoTable?.finalY || 120;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Bluff Score Progression", 14, currentY + 12);

    autoTable(doc, {
      startY: currentY + 16,
      head: [["Question", "Score"]],
      body: bluffHistory.map((p, i) => [`Q${i + 1}`, `${Math.round(p.score)}%`]),
      theme: "striped",
      headStyles: { fillColor: [30, 30, 35], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  // Transcript
  const transcript = session.transcript || [];
  if (transcript.length > 0) {
    const currentY = (doc as any).lastAutoTable?.finalY || 160;
    if (currentY > 240) doc.addPage();
    const startY = currentY > 240 ? 20 : currentY + 12;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Interview Transcript", 14, startY);

    autoTable(doc, {
      startY: startY + 4,
      head: [["Role", "Message"]],
      body: transcript.map((t) => [
        t.role === "agent" ? "Interviewer" : "Candidate",
        t.text,
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 30, 35], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: "auto" } },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`DeepFake Interviewer — Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  }

  doc.save(`interview-results-${session.topic_title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
};
