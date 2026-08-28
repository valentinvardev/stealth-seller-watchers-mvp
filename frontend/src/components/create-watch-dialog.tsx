import { useState } from "react";
import { trpc } from "@/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface CreateWatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateWatchDialog({ open, onOpenChange, onSuccess }: CreateWatchDialogProps) {
  const [targetType, setTargetType] = useState<"asin" | "url">("asin");
  const [asin, setAsin] = useState("");
  const [url, setUrl] = useState("");
  const [condition, setCondition] = useState("price_drop");
  const [threshold, setThreshold] = useState("");
  const [interval, setInterval] = useState("360");
  const [days, setDays] = useState("30");

  const createWatch = trpc.createWatch.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const expiresAt = new Date(Date.now() + parseInt(days) * 24 * 3600000).toISOString();
    const thresholdCents = threshold ? parseInt(threshold) * 100 : undefined;

    const input = {
      targetType,
      asin: targetType === "asin" ? asin : undefined,
      url: targetType === "url" ? url : undefined,
      marketplace: 1,
      condition: condition as any,
      thresholdCents,
      pollIntervalMinutes: parseInt(interval) as any,
      expiresAt,
    };

    createWatch.mutate(input as any, {
      onSuccess: () => {
        onOpenChange(false);
        setAsin("");
        setUrl("");
        setCondition("price_drop");
        setThreshold("");
        setInterval("360");
        setDays("30");
        onSuccess?.();
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Create a Watch</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Watch Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetType("asin")}
                className={`flex-1 rounded-md border-2 py-2 text-sm font-medium transition-colors ${
                  targetType === "asin"
                    ? "border-orange-550 bg-orange-550/10 text-orange-550"
                    : "border-border bg-background text-foreground hover:border-orange-550/50"
                }`}
              >
                Amazon ASIN
              </button>
              <button
                type="button"
                onClick={() => setTargetType("url")}
                className={`flex-1 rounded-md border-2 py-2 text-sm font-medium transition-colors ${
                  targetType === "url"
                    ? "border-orange-550 bg-orange-550/10 text-orange-550"
                    : "border-border bg-background text-foreground hover:border-orange-550/50"
                }`}
              >
                Custom URL
              </button>
            </div>
          </div>

          {/* Target Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {targetType === "asin" ? "ASIN" : "URL"}
            </label>
            <input
              type={targetType === "url" ? "url" : "text"}
              value={targetType === "asin" ? asin : url}
              onChange={(e) => (targetType === "asin" ? setAsin(e.target.value) : setUrl(e.target.value))}
              placeholder={targetType === "asin" ? "B08N5Z7GRT" : "https://example.com/product"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Watch Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            >
              {targetType === "asin" ? (
                <>
                  <option value="price_drop">Price drops</option>
                  <option value="back_in_stock">Back in stock</option>
                </>
              ) : (
                <>
                  <option value="price_change">Price changes</option>
                  <option value="back_in_stock">Back in stock</option>
                </>
              )}
            </select>
          </div>

          {/* Price Threshold (if price_drop selected) */}
          {condition === "price_drop" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Target Price (optional)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="99.99"
                  step="0.01"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-foreground"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Alert when price drops to this amount</p>
            </div>
          )}

          {/* Check Interval */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Check Every</label>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            >
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
              <option value="360">6 hours</option>
              <option value="1440">24 hours</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">More frequent checks cost more credits</p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Watch Duration</label>
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            >
              <option value="7">1 week</option>
              <option value="30">1 month</option>
              <option value="90">3 months</option>
            </select>
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createWatch.isPending}
              className="flex-1 accent-orange"
            >
              {createWatch.isPending ? "Creating..." : "Create Watch"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
