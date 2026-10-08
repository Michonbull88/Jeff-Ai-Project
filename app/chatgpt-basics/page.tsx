import type { Metadata } from "next";
import { ChatGPTCourse } from "@/components/chatgpt/ChatGPTCourse";
import { chatgptLessons } from "@/lib/chatgpt/course";

export const metadata: Metadata = {
  title: "JEFF — AI Made Simple",
  description:
    "Beginner-friendly practical training for ChatGPT, Microsoft Copilot and Canva, with privacy and fact-checking guidance.",
};

export default async function ChatGPTBasicsPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lesson } = await searchParams;
  return (
    <ChatGPTCourse
      initialLesson={
        chatgptLessons.some((item) => item.id === lesson) ? lesson : undefined
      }
    />
  );
}
