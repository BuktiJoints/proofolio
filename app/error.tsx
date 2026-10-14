"use client";
import { ErrorState } from "@/modules/shared/ui";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="p-6"><ErrorState error={new Error()} retry={reset}/></main>; }
