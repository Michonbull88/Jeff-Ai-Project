import type { Metadata } from "next";
import { loadWebLibrary } from "@/lib/tutoring/library";
import { WebTutor } from "@/components/web/WebTutor";
export const metadata: Metadata = {
  title: "JEFF — Web Development & Design Tutor",
  description:
    "A local web-development course with guided practice, a code playground and answers grounded in your course library.",
};
export const dynamic = "force-dynamic";
export default async function WebDevelopmentPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lessons } = await loadWebLibrary();
  const query = await searchParams;
  return (
    <WebTutor
      lessons={lessons}
      initialLesson={
        lessons.some((lesson) => lesson.id === query.lesson)
          ? query.lesson
          : undefined
      }
    />
  );
}
