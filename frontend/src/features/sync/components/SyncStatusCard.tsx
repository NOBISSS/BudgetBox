import { CloudUpload } from "lucide-react";
import type { SyncStatus } from "@/types";
import { SyncBadge } from "@/components/common/SyncBadge";
export function SyncStatusCard({
  status,
  title,
  detail,
}: {
  status: SyncStatus;
  title: string;
  detail: string;
}) {
  return (
    <section className="card">
      <div className="section-title">
        <h2>{title}</h2>
        <SyncBadge status={status} />
      </div>
      <p>{detail}</p>
      <CloudUpload size={19} />
    </section>
  );
}
