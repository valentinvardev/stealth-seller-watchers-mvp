import { AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Alert {
  id: string;
  triggeredAt: string;
  whatChanged: string;
  deliveryStatus: "pending" | "sent" | "failed";
  target?: {
    targetType: "asin" | "url";
    title?: string;
    image?: string | null;
    currentPriceCents?: number | null;
  } | null;
}

interface AlertHistoryProps {
  alerts: Alert[];
}

export function AlertHistory({ alerts }: AlertHistoryProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
        <p className="mt-4 text-muted-foreground">No alerts yet. Keep monitoring!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-foreground mb-4">Alert History</h3>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-start gap-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-550/10">
            {alert.deliveryStatus === "sent" ? (
              <Check className="h-5 w-5 text-orange-550" />
            ) : alert.deliveryStatus === "failed" ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-orange-550 animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {alert.target?.image && (
              <img
                src={alert.target.image}
                alt={alert.target.title}
                className="mb-2 h-10 w-10 rounded object-cover"
              />
            )}
            <p className="font-medium text-foreground break-words">{alert.target?.title || "Unknown product"}</p>
            <p className="mt-1 text-sm text-foreground break-words">{alert.whatChanged}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {alert.deliveryStatus === "sent" && <Badge variant="success">Sent</Badge>}
            {alert.deliveryStatus === "pending" && <Badge variant="warning">Pending</Badge>}
            {alert.deliveryStatus === "failed" && <Badge variant="destructive">Failed</Badge>}
          </div>
        </div>
      ))}
    </div>
  );
}
