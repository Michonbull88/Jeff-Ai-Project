import type { Metadata } from "next";
import { TransferProgress } from "@/components/TransferProgress";
export const metadata: Metadata = { title: "JEFF — Backup & Transfer" };
export default function TransferPage() {
  return <TransferProgress />;
}
