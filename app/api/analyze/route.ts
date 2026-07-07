import { NextRequest, NextResponse } from "next/server";
import { analyzeProject } from "@/lib/analyzeProject";
import { sampleProject, ProjectData } from "@/lib/sampleData";

export async function POST(req: NextRequest) {
  try {
    let body: { project?: ProjectData } | null = null;

    try {
      body = await req.json();
    } catch {
      console.warn("[API] Could not parse request body — using sample project");
    }

    const incoming = body?.project ?? sampleProject;

    const projectData: ProjectData = {
      project_name:      incoming.project_name      ?? "Unnamed Project",
      release_date:      incoming.release_date       ?? "2025-12-31",
      initial_features:  incoming.initial_features   ?? [],
      current_features:  incoming.current_features   ?? [],
      tasks:             incoming.tasks              ?? [],
      messages:          incoming.messages           ?? [],
      commits:           incoming.commits            ?? [],
      whatsapp_messages: incoming.whatsapp_messages  ?? [],
      budget_items:      incoming.budget_items       ?? [],
    };

    const result = await analyzeProject(projectData);

    console.log("[API] saturation.isBlocked :", result.saturation?.isBlocked);
    console.log("[API] saturation.isWarning :", result.saturation?.isWarning);
    console.log("[API] waiting score        :", result.saturation?.waiting?.score);
    console.log("[API] scope_drift score    :", result.saturation?.scope_drift?.score);
    console.log("[API] held_tasks count     :", result.held_tasks?.length);
    console.log("[API] blockReason          :", result.saturation?.blockReason);

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error("[API] FATAL error:", error);
    return NextResponse.json(
      {
        success: false,
        error:   "Analysis failed",
        detail:  error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}