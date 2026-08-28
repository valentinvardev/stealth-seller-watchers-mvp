import { useState } from "react";
import { Eye, Plus, Archive, Zap, AlertCircle, MoreHorizontal } from "lucide-react";
import { trpc } from "@/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { CreateWatchDialog } from "@/components/create-watch-dialog";
import { AlertHistory } from "@/components/alert-history";

type Tab = "overview" | "manage" | "alerts";

export default function WatchersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [createOpen, setCreateOpen] = useState(false);

  const watchesQuery = trpc.listWatches.useQuery();
  const creditsQuery = trpc.getCredits.useQuery();
  const alertsQuery = trpc.listAlerts.useQuery({ limit: 50 });
  const archiveWatch = trpc.archiveWatch.useMutation();
  const snoozeWatch = trpc.snoozeWatch.useMutation();
  const unsnoozeWatch = trpc.unsnoozeWatch.useMutation();
  const setCadence = trpc.setWatchCadence.useMutation();
  const simulateAlert = trpc.simulateAlert.useMutation();

  const watches = watchesQuery.data || [];
  const credits = creditsQuery.data;
  const alerts = alertsQuery.data || [];

  const activeWatches = watches.filter((w) => w.status === "active");
  const stoppedWatches = watches.filter((w) => w.status === "triggered" || w.status === "expired");

  const handleArchive = (watchId: string) => {
    archiveWatch.mutate({ watchId }, {
      onSuccess: () => watchesQuery.refetch(),
    });
  };

  const handleSnooze = (watchId: string) => {
    const snoozeUntil = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
    snoozeWatch.mutate({ watchId, snoozeUntil }, {
      onSuccess: () => watchesQuery.refetch(),
    });
  };

  const handleSimulateAlert = (watchId: string) => {
    simulateAlert.mutate({
      watchId,
      message: "Price dropped from $299.99 to $249.99 (16.7% drop)",
    }, {
      onSuccess: () => {
        watchesQuery.refetch();
        alertsQuery.refetch();
      },
    });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-4">
            <Eye className="h-8 w-8 text-orange-550" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Watchers</h1>
              <p className="text-sm text-muted-foreground">
                Monitor products and get alerts when prices change or items back in stock
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="accent-orange gap-2">
            <Plus className="h-4 w-4" />
            New Watch
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            {/* Tabs */}
            <div className="border-b border-border">
              <div className="flex items-center gap-2 px-8 py-4">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "px-4 py-2 font-medium transition-colors",
                    activeTab === "overview"
                      ? "border-b-2 border-orange-550 text-orange-550"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Overview ({activeWatches.length})
                </button>
                <button
                  onClick={() => setActiveTab("manage")}
                  className={cn(
                    "px-4 py-2 font-medium transition-colors",
                    activeTab === "manage"
                      ? "border-b-2 border-orange-550 text-orange-550"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Manage Watches
                </button>
                <button
                  onClick={() => setActiveTab("alerts")}
                  className={cn(
                    "px-4 py-2 font-medium transition-colors",
                    activeTab === "alerts"
                      ? "border-b-2 border-orange-550 text-orange-550"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Alerts ({alerts.length})
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Credits Card */}
                  {credits && (
                    <div className="rounded-lg border border-border bg-card p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground">Watch Credits</h3>
                          <p className="mt-2 text-3xl font-bold text-foreground">{credits.total}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Resets in {new Date(credits.refillsAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Breakdown</div>
                          <div className="mt-2 space-y-1">
                            <div className="flex gap-2">
                              <span className="text-sm text-muted-foreground">Grant:</span>
                              <Badge variant="secondary">{credits.grant}</Badge>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-sm text-muted-foreground">Purchased:</span>
                              <Badge variant="secondary">{credits.purchased}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Watches Summary */}
                  <div className="rounded-lg border border-border bg-card p-6">
                    <h3 className="mb-4 text-lg font-semibold text-foreground">Active Watches</h3>
                    {activeWatches.length === 0 ? (
                      <p className="text-muted-foreground">No active watches. Create one to get started!</p>
                    ) : (
                      <div className="grid gap-4">
                        {activeWatches.map((watch) => (
                          <div
                            key={watch.id}
                            className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
                          >
                            <div className="flex flex-1 items-center gap-4">
                              {watch.target.image && (
                                <img
                                  src={watch.target.image}
                                  alt={watch.target.title}
                                  className="h-12 w-12 rounded object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{watch.target.title}</p>
                                <div className="mt-1 flex gap-2">
                                  <Badge variant="outline">{watch.condition.replace(/_/g, " ")}</Badge>
                                  {watch.snoozeUntil && <Badge variant="warning">Snoozed</Badge>}
                                  {watch.alertCount > 0 && (
                                    <Badge variant="success">{watch.alertCount} alerts</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {watch.target.currentPriceCents
                                  ? `$${(watch.target.currentPriceCents / 100).toFixed(2)}`
                                  : "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {watch.target.lastPolledAt
                                  ? `Checked ${formatDistanceToNow(new Date(watch.target.lastPolledAt), { addSuffix: true })}`
                                  : "Never checked"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "manage" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Manage Your Watches</h3>
                  {activeWatches.length === 0 ? (
                    <div className="rounded-lg border border-border bg-card p-8 text-center">
                      <Eye className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                      <p className="mt-4 text-muted-foreground">No watches yet</p>
                      <Button onClick={() => setCreateOpen(true)} variant="outline" className="mt-4">
                        Create your first watch
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeWatches.map((watch) => (
                        <div
                          key={watch.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{watch.target.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {watch.condition.replace(/_/g, " ")} • Every{" "}
                              {watch.pollIntervalMinutes === 120
                                ? "2 hours"
                                : watch.pollIntervalMinutes === 180
                                  ? "3 hours"
                                  : watch.pollIntervalMinutes === 360
                                    ? "6 hours"
                                    : "24 hours"}
                              • Expires{" "}
                              {new Date(watch.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSimulateAlert(watch.id)}
                              title="Simulate an alert"
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                watch.snoozeUntil
                                  ? unsnoozeWatch.mutate({ watchId: watch.id }, {
                                      onSuccess: () => watchesQuery.refetch(),
                                    })
                                  : handleSnooze(watch.id)
                              }
                            >
                              {watch.snoozeUntil ? "Resume" : "Snooze"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleArchive(watch.id)}
                            >
                              <Archive className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "alerts" && <AlertHistory alerts={alerts} />}
            </div>
          </div>
        </div>
      </div>

      {/* Create Watch Dialog */}
      <CreateWatchDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          watchesQuery.refetch();
          setActiveTab("manage");
        }}
      />
    </div>
  );
}
