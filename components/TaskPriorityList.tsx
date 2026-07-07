"use client";
// TaskPriorityList.tsx
// Shows active (proceed now) and held (gated) tasks in separate sections

import { PrioritizedTask } from "@/lib/sampleData";

const PRIORITY_COLORS = {
  CRITICAL: { text: "#EF4444", bg: "#EF444418", border: "#EF444433" },
  HIGH:     { text: "#F97316", bg: "#F9731618", border: "#F9731633" },
  MEDIUM:   { text: "#EAB308", bg: "#EAB30818", border: "#EAB30833" },
  LOW:      { text: "#6B7280", bg: "#6B728018", border: "#6B728033" },
};

const STATUS_ICONS: Record<string, string> = {
  "Blocked":     "🔴",
  "In Progress": "🟡",
  "Not Started": "⚪",
  "Done":        "🟢",
};

interface Props {
  tasks: PrioritizedTask[];
  heldTasks?: PrioritizedTask[];
}

function TaskRow({
  task,
  index,
  dimmed = false,
}: {
  task: PrioritizedTask;
  index: number;
  dimmed?: boolean;
}) {
  const colors = PRIORITY_COLORS[task.priority];
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border animate-slide-up"
      style={{
        background:     dimmed ? "rgba(107,114,128,0.06)" : colors.bg,
        borderColor:    dimmed ? "#374151" : colors.border,
        animationDelay: `${index * 60}ms`,
        animationFillMode: "both",
        opacity: dimmed ? 0.6 : 0,
      }}
    >
      {/* Rank / held indicator */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-mono text-xs font-bold"
        style={{
          background: dimmed ? "#37415133" : colors.border,
          color:      dimmed ? "#6B7280"   : colors.text,
        }}
      >
        {dimmed ? "⏸" : task.status === "Done" ? "✓" : index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-body text-sm text-text font-medium">
            {STATUS_ICONS[task.status]} {task.title}
          </span>
          <span
            className="font-mono text-[9px] px-1.5 py-0.5 rounded tracking-widest"
            style={{
              color:      dimmed ? "#6B7280"   : colors.text,
              background: dimmed ? "#37415133" : colors.border,
            }}
          >
            {task.priority}
          </span>
          {task.blocks_count > 0 && (
            <span className="font-mono text-[9px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
              blocks {task.blocks_count}
            </span>
          )}
          {dimmed && (
            <span className="font-mono text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
              HELD
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="font-mono text-[10px] text-muted">{task.assigned_to}</span>
          {task.days_idle > 0 && (
            <span className="font-mono text-[10px] text-muted">idle {task.days_idle}d</span>
          )}
          <span className="font-mono text-[10px] text-muted/60 italic">{task.reason}</span>
        </div>
      </div>
    </div>
  );
}

export default function TaskPriorityList({ tasks, heldTasks = [] }: Props) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 rounded-full bg-accent" />
        <h3 className="font-display font-semibold text-sm text-text">
          Prioritized Task Order
        </h3>
        <span className="font-mono text-[10px] text-muted ml-1">
          (what to work on first)
        </span>
        {heldTasks.length > 0 && (
          <span className="ml-auto font-mono text-[9px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
            {heldTasks.length} held
          </span>
        )}
      </div>

      {/* Active tasks */}
      <div className="flex flex-col gap-2">
        {tasks.length === 0 && (
          <p className="font-mono text-xs text-muted text-center py-4">
            No active tasks.
          </p>
        )}
        {tasks.map((task, i) => (
          <TaskRow key={`active-${i}`} task={task} index={i} />
        ))}
      </div>

      {/* Held tasks */}
      {heldTasks.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-5 mb-3">
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-[10px] text-amber-400/80 px-2 whitespace-nowrap">
              ⏸ HELD — awaiting saturation gate
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex flex-col gap-2">
            {heldTasks.map((task, i) => (
              <TaskRow key={`held-${i}`} task={task} index={i} dimmed />
            ))}
          </div>
        </>
      )}
    </div>
  );
}