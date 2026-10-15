"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientApiError, errorMessage } from "@/lib/api-client";
import { statusLabels } from "./presentation";
import type { SubmissionStatus } from "./types";

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-h5 md:text-h3">{title}</h1>
        {description && (
          <p className="mt-2 text-b8 text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div role="status" aria-label="Memuat halaman" className="space-y-4">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-48 w-full" />
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Permintaan belum berhasil</AlertTitle>
      <AlertDescription>
        <p>{errorMessage(error)}</p>
        {error instanceof ClientApiError && error.requestId && (
          <p className="text-xs">ID permintaan: {error.requestId}</p>
        )}
        {retry && (
          <Button variant="outline" onClick={retry}>
            Coba lagi
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 py-10 text-center">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {action}
      </CardContent>
    </Card>
  );
}
export function LinkButton({
  href,
  children,
  variant = "default",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "outline" | "ghost" | "neutral";
  className?: string;
}) {
  return (
    <Button
      role="link"
      nativeButton={false}
      variant={variant}
      className={className}
      render={<Link href={href} />}
    >
      {children}
    </Button>
  );
}
export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge
      variant={
        status === "ANALYSIS_FAILED"
          ? "destructive"
          : status === "COMPLETED"
            ? "success"
            : status === "ANALYZING" || status === "QUEUED"
              ? "secondary"
              : status === "AWAITING_REVIEW"
                ? "warning"
                : "default"
      }
    >
      {statusLabels[status]}
    </Badge>
  );
}
export function Choice({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
      items={options}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={label} className="w-full">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
