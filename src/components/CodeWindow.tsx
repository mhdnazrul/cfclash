interface CodeWindowProps {
  variant?: "primary" | "secondary";
}

export function CodeWindow({ variant = "primary" }: CodeWindowProps) {
  const isPrimary = variant === "primary";

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="w-3 h-3 rounded-full bg-destructive/60" />
        <div className="w-3 h-3 rounded-full bg-chart-5/60" />
        <div className="w-3 h-3 rounded-full bg-[hsl(120,50%,50%)]/60" />
        <span className="ml-2 text-xs text-muted-foreground font-mono">
          {isPrimary ? "battle.cpp" : "solution.py"}
        </span>
      </div>
      <div className="p-4 font-mono text-sm leading-relaxed">
        {isPrimary ? (
          <pre className="text-muted-foreground">
            <code>
              <span className="text-accent">#include</span>{" "}
              <span className="text-[hsl(187,92%,69%)]">&lt;bits/stdc++.h&gt;</span>
              {"\n"}
              <span className="text-accent">using namespace</span> std;
              {"\n\n"}
              <span className="text-accent">int</span>{" "}
              <span className="text-primary">main</span>() {"{"}
              {"\n  "}
              <span className="text-muted-foreground">// Speed is everything</span>
              {"\n  "}ios_base::sync_with_stdio(
              <span className="text-chart-5">false</span>);
              {"\n  "}cin.tie(
              <span className="text-chart-5">NULL</span>);
              {"\n  "}
              <span className="text-accent">int</span> n;
              {"\n  "}cin {">> "}n;
              {"\n  "}
              <span className="text-muted-foreground">// Solve and conquer</span>
              {"\n}"}
            </code>
          </pre>
        ) : (
          <pre className="text-muted-foreground">
            <code>
              <span className="text-accent">def</span>{" "}
              <span className="text-primary">solve</span>():
              {"\n  "}n = <span className="text-accent">int</span>(
              <span className="text-primary">input</span>())
              {"\n  "}
              <span className="text-accent">print</span>(
              <span className="text-[hsl(187,92%,69%)]">"AC"</span>)
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
