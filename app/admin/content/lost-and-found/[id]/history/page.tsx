import HistoryPage from "@/app/admin/content/[type]/[id]/history/page";
import { adminTitle } from "@/lib/admin/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("clcHistoryTitle");
}

export default function LostFoundHistoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string; with?: string; restore?: string }> }) {
  return HistoryPage({ params: params.then((p) => ({ ...p, type: "lost-and-found" })), searchParams });
}
