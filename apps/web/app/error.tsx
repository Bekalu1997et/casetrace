"use client";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="space-y-4"><h1>Workspace unavailable</h1>
    <p>The workspace could not be loaded. Please try again.</p><Button onClick={reset}>Try again</Button></section>;
}
