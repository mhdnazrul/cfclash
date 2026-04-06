import { ReactNode } from "react";
import { Navbar } from "./Navbar";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background bg-page-gradient overflow-hidden">
      <div className="relative z-10">
        <Navbar />
        {children}
      </div>
    </main>
  );
}
