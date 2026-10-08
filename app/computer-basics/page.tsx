import type { Metadata } from "next";
import { ComputerCourse } from "@/components/computer/ComputerCourse";
import { computerLessons } from "@/lib/computer/course";

export const metadata: Metadata = {
  title: "JEFF — PC & Windows Basics",
  description:
    "Learn to use a PC or laptop, organise files and build everyday Windows skills with a patient local tutor.",
};

export default async function ComputerBasicsPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lesson } = await searchParams;
  return (
    <ComputerCourse
      initialLesson={
        computerLessons.some((item) => item.id === lesson) ? lesson : undefined
      }
    />
  );
}
