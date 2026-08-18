import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { RunStatusBadge } from "@/components/common/status-badge";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  configurationsQuery,
  datasetsQuery,
  evaluationsQuery,
} from "@/hooks/use-ragbench";
import { formatDate, formatDuration } from "@/lib/format";
import { evaluationService } from "@/services/ragbench";

export const Route = createFileRoute("/evaluations")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(evaluationsQuery()),
      context.queryClient.ensureQueryData(datasetsQuery()),
      context.queryClient.ensureQueryData(configurationsQuery()),
    ]),
  head: () => ({
    meta: [
      { title: "Evaluation Harness — RAGBench" },
      {
        name: "description",
        content:
          "Run automated evaluation suites against your RAG pipeline: retrieval, generation and performance metrics.",
      },
      { property: "og:title", content: "Evaluation Harness — RAGBench" },
      { property: "og:description", content: "Automated RAG evaluation suites and run history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EvaluationsPage,
  errorComponent: ({ error }) => (
    <AppShell title="Evaluations">
      <div role="alert" className="panel p-6 text-sm text-destructive">
        Failed to load evaluations: {error.message}
      </div>
    </AppShell>
  ),
});

type RunPhase = "idle" | "preparing" | "running" | "done";

function EvaluationsPage() {
  const { data: runs } = useSuspenseQuery(evaluationsQuery());
  const { data: datasets } = useSuspenseQuery(datasetsQuery());
  const { data: configurations } = useSuspenseQuery(configurationsQuery());

  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [configId, setConfigId] = useState(configurations[0]?.id ?? "");
  const [questionCount, setQuestionCount] = useState("500");
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [progress, setProgress] = useState(0);

  const runMutation = useMutation({
    mutationFn: () =>
      evaluationService.run({
        datasetId,
        configurationId: configId,
        questions: Number(questionCount),
      }),
    onSuccess: () => {
      setPhase("running");
    },
    onError: () => {
      setPhase("idle");
      toast.error("Could not start the evaluation run.");
    },
  });

  useEffect(() => {
    if (phase !== "running") return;
    const total = Number(questionCount);
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + Math.ceil(total / 24), total);
        if (next >= total) {
          clearInterval(timer);
          setPhase("done");
          toast.success("Evaluation run completed.");
        }
        return next;
      });
    }, 400);
    return () => clearInterval(timer);
  }, [phase, questionCount]);

  const startRun = () => {
    setProgress(0);
    setPhase("preparing");
    runMutation.mutate();
  };

  const latest = runs[0];

  return (
    <AppShell title="Evaluations">
      <PageHeader
        title="Evaluation Harness"
        description="Run automated evaluation suites against your RAG pipeline."
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Dataset</Label>
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger className="h-9 w-56 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {datasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id} className="text-xs">
                    {dataset.name} ({dataset.totalQuestions})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">RAG Configuration</Label>
            <Select value={configId} onValueChange={setConfigId}>
              <SelectTrigger className="h-9 w-64 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {configurations.map((configuration) => (
                  <SelectItem key={configuration.id} value={configuration.id} className="text-xs">
                    {configuration.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Questions</Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["100", "250", "500"].map((count) => (
                  <SelectItem key={count} value={count} className="text-xs">
                    {count}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={startRun}
            disabled={phase === "preparing" || phase === "running"}
            className="ml-auto"
          >
            <Play className="size-3.5" /> Run Evaluation
          </Button>
        </CardContent>
        {(phase === "preparing" || phase === "running") && (
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {phase === "preparing"
                  ? "Preparing dataset…"
                  : `Running ${progress} / ${questionCount} queries`}
              </span>
              <span className="num">
                {Math.round((progress / Number(questionCount)) * 100)}%
              </span>
            </div>
            <Progress
              value={phase === "preparing" ? 4 : (progress / Number(questionCount)) * 100}
              className="mt-2 h-1.5"
            />
          </div>
        )}
      </Card>

      {latest && (
        <>
          <h2 className="text-sm font-semibold text-foreground">
            Latest completed run — {latest.label}
          </h2>
          <div className="space-y-4">
            {(
              [
                ["Retrieval Metrics", latest.retrieval],
                ["Generation Metrics", latest.generation],
                ["Performance Metrics", latest.performance],
              ] as const
            ).map(([title, metrics]) => (
              <Card key={title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                  {metrics.map((metric) => (
                    <MetricCard key={metric.key} metric={metric} />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Run History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead>Configuration</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium text-foreground">{run.label}</TableCell>
                  <TableCell className="text-muted-foreground">{run.datasetName}</TableCell>
                  <TableCell className="text-muted-foreground">{run.configurationName}</TableCell>
                  <TableCell className="num text-right text-muted-foreground">
                    {run.questions}
                  </TableCell>
                  <TableCell>
                    <RunStatusBadge status={run.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(run.startedAt)}</TableCell>
                  <TableCell className="num text-muted-foreground">
                    {formatDuration(run.durationMs)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                      <Link to="/evaluations/$runId" params={{ runId: run.id }}>
                        Details <ChevronRight className="size-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
