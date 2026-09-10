// src/modules/projects/projects.repository.ts
import { supabaseAdmin } from "@shared/lib/supabase-client";

import type {
  BusinessContext,
  CreateProjectRequest,
  ListProjectsQuery,
  ProjectResponse,
} from "./projects.schema";

type ProjectRow = {
  id: string;
  title: string;
  template_type: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function toProjectResponse(row: ProjectRow): ProjectResponse {
  return {
    id: row.id,
    title: row.title,
    templateType: row.template_type as ProjectResponse["templateType"],
    status: row.status as ProjectResponse["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const PROJECT_COLUMNS =
  "id, title, template_type, status, created_at, updated_at";

/**
 * Creates a new project in 'draft' status. The business context itself
 * is stored in the initial deck_versions row (version 1), not on the
 * projects table — projects only holds metadata, per FRD 5.2.
 */
export async function createProject(
  userId: string,
  input: CreateProjectRequest,
): Promise<ProjectResponse> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({
      user_id: userId,
      title: input.title,
      template_type: input.templateType,
      status: "draft",
    })
    .select(PROJECT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return toProjectResponse(data);
}

/**
 * Stores the business context as the first deck_versions snapshot for a
 * newly created project, so it can be retrieved later by the ai-engine
 * module when generating the outline (Stage 1 LLM call).
 */
export async function saveInitialBusinessContext(
  projectId: string,
  businessContext: BusinessContext,
): Promise<void> {
  const { error } = await supabaseAdmin.from("deck_versions").insert({
    project_id: projectId,
    version_number: 1,
    slides_json: { businessContext, slides: [] },
  });

  if (error) {
    throw error;
  }
}

export async function findProjectById(
  userId: string,
  projectId: string,
): Promise<ProjectResponse | null> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toProjectResponse(data);
}

export async function listProjects(
  userId: string,
  query: ListProjectsQuery,
): Promise<{ items: ProjectResponse[]; total: number }> {
  const offset = (query.page - 1) * query.limit;

  let dbQuery = supabaseAdmin
    .from("projects")
    .select(PROJECT_COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + query.limit - 1);

  if (query.status) {
    dbQuery = dbQuery.eq("status", query.status);
  }

  const { data, error, count } = await dbQuery;

  if (error) {
    throw error;
  }

  return {
    items: data.map(toProjectResponse),
    total: count ?? 0,
  };
}

export async function deleteProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const { error, count } = await supabaseAdmin
    .from("projects")
    .delete({ count: "exact" })
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

/**
 * Duplicates a project: creates a new 'draft' project with the same
 * template, and copies the latest deck_versions snapshot as the starting
 * point for the new project (FR-06.1).
 */
export async function duplicateProject(
  userId: string,
  sourceProjectId: string,
): Promise<ProjectResponse | null> {
  const source = await findProjectById(userId, sourceProjectId);
  if (!source) {
    return null;
  }

  const { data: latestVersion, error: versionError } = await supabaseAdmin
    .from("deck_versions")
    .select("slides_json")
    .eq("project_id", sourceProjectId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionError) {
    throw versionError;
  }

  const { data: newProject, error: createError } = await supabaseAdmin
    .from("projects")
    .insert({
      user_id: userId,
      title: `${source.title} (Copy)`,
      template_type: source.templateType,
      status: "draft",
    })
    .select(PROJECT_COLUMNS)
    .single();

  if (createError) {
    throw createError;
  }

  if (latestVersion) {
    const { error: copyError } = await supabaseAdmin
      .from("deck_versions")
      .insert({
        project_id: newProject.id as string,
        version_number: 1,
        slides_json: latestVersion.slides_json,
      });

    if (copyError) {
      throw copyError;
    }
  }

  return toProjectResponse(newProject);
}
