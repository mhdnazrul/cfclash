import { useState, useEffect } from "react";

interface LoadingFallbackProps {
  message?: string;
  timeoutMs?: number;
}

export function LoadingFallback({ message = "Loading...", timeoutMs = 15000 }: LoadingFallbackProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [timeoutMs]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">{message}</p>
      {timedOut && (
        <p className="text-destructive text-xs">
          This is taking longer than expected. Please refresh the page.
        </p>
      )}
    </div>
  );
}
