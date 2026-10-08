import { ExcelTutor } from "@/components/excel/ExcelTutor";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "JEFF — Excel Tutor",
  description:
    "Learn Excel with guided practice, saved progress and local AI explanations. No OpenAI connection required.",
};
export default function ExcelPage() {
  return <ExcelTutor />;
}
