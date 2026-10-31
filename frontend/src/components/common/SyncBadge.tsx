import { Check, Cloud, CloudUpload } from "lucide-react";
import type { SyncStatus } from "@/types";
export function SyncBadge({ status }: { status: SyncStatus }) {
  const label =
    status === "synced"
      ? "Synced"
      : status === "pending"
        ? "Sync pending"
        : "Local only";
  const Icon =
    status === "synced" ? Check : status === "pending" ? CloudUpload : Cloud;
  return (
    <span className={`sync-badge ${status}`}>
      <Icon size={13} />
      {label}
    </span>
  );
}
