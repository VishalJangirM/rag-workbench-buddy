import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Download, FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { datasetsQuery } from "@/hooks/use-ragbench";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/types";

export const Route = createFileRoute("/datasets")({
  loader: ({ context }) => context.queryClient.ensureQueryData(datasetsQuery()),
  head: () => ({
    meta: [
      { title: "Evaluation Datasets — RAGBench" },
      {
        name: "description",
        content:
          "Manage evaluation datasets: questions, expected answers, evidence, difficulty and categories.",
      },
      { property: "og:title", content: "Evaluation Datasets — RAGBench" },
      { property: "og:description", content: "Golden QA datasets for RAG evaluation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DatasetsPage,
  errorComponent: ({ error }) => (
    <AppShell title="Datasets">
      <div role="alert" className="panel p-6 text-sm text-destructive">
        Failed to load datasets: {error.message}
      </div>
    </AppShell>
  ),
});

const difficultyClass: Record<Difficulty, string> = {
  easy: "text-success",
  medium: "text-warning",
  hard: "text-destructive",
};

function DatasetsPage() {
  const { data: datasets } = useSuspenseQuery(datasetsQuery());
  const [activeId, setActiveId] = useState(datasets[0]!.id);
  const active = datasets.find((dataset) => dataset.id === activeId) ?? datasets[0]!;

  return (
    <AppShell title="Datasets">
      <PageHeader
        title="Evaluation Datasets"
        description="Golden question/answer sets used by the evaluation harness."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Dataset import expects a CSV or JSONL file from the backend.")}
            >
              <FileUp className="size-3.5" /> Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`Exporting ${active.name} as JSONL.`)}
            >
              <Download className="size-3.5" /> Export
            </Button>
            <Button size="sm" onClick={() => toast.info("Dataset builder will be wired to the backend.")}>
              <Plus className="size-3.5" /> Create Dataset
            </Button>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {datasets.map((dataset) => (
          <button
            key={dataset.id}
            type="button"
            onClick={() => setActiveId(dataset.id)}
            className={cn(
              "panel p-4 text-left transition-colors hover:border-border-strong",
              dataset.id === activeId && "border-primary/50 bg-primary/[0.04]",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{dataset.name}</span>
              <Badge variant="outline" className="num text-[10px]">
                {dataset.totalQuestions}
              </Badge>
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {dataset.description}
            </p>
            <div className="mt-3 text-[11px] text-muted-foreground">
              Updated {formatDate(dataset.updatedAt)}
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(
          [
            ["Total Questions", active.totalQuestions],
            ["Easy", active.breakdown.easy],
            ["Medium", active.breakdown.medium],
            ["Hard", active.breakdown.hard],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="panel p-4">
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div className="metric-value mt-2 text-2xl font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {active.name} — sample questions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[26%]">Question</TableHead>
                <TableHead className="w-[26%]">Expected Answer</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.questions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell className="max-w-0">
                    <span className="line-clamp-2 font-medium text-foreground">
                      {question.question}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-0">
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {question.expectedAnswer}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {question.source}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {question.evidence}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-xs font-medium uppercase tracking-wide",
                        difficultyClass[question.difficulty],
                      )}
                    >
                      {question.difficulty}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{question.category}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
