import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background bg-page-gradient overflow-x-hidden flex flex-col">
      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </main>
  );
}
