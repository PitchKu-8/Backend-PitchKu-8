// src/modules/projects/projects.service.ts
import { NotFoundError } from "@shared/errors/app-errors";
import { createModuleLogger } from "@shared/lib/logger";

import * as projectsRepository from "./projects.repository";
import type {
  CreateProjectRequest,
  ListProjectsQuery,
  ProjectResponse,
} from "./projects.schema";

const log = createModuleLogger("projects");

/**
 * Creates a project and stores its initial business context in a single
 * logical operation. If saving the business context fails after the
 * project row was created, the project is rolled back (deleted) so we
 * don't leave a project stuck without any usable context — the outline
 * generation step (ai-engine) depends on it being present.
 */
export async function createProject(
  userId: string,
  input: CreateProjectRequest,
): Promise<ProjectResponse> {
  const project = await projectsRepository.createProject(userId, input);

  try {
    await projectsRepository.saveInitialBusinessContext(
      project.id,
      input.businessContext,
    );
  } catch (error) {
    log.error(
      { action: "createProject", projectId: project.id, error },
      "Failed to save business context, rolling back project creation",
    );
    await projectsRepository.deleteProject(userId, project.id);
    throw error;
  }

  log.info(
    { action: "createProject", projectId: project.id, userId },
    "Project created",
  );

  return project;
}

export async function getProjectById(
  userId: string,
  projectId: string,
): Promise<ProjectResponse> {
  const project = await projectsRepository.findProjectById(userId, projectId);

  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`);
  }

  return project;
}

export async function listProjects(
  userId: string,
  query: ListProjectsQuery,
): Promise<{ items: ProjectResponse[]; total: number }> {
  return projectsRepository.listProjects(userId, query);
}

export async function deleteProject(
  userId: string,
  projectId: string,
): Promise<void> {
  const deleted = await projectsRepository.deleteProject(userId, projectId);

  if (!deleted) {
    throw new NotFoundError(`Project ${projectId} not found`);
  }

  log.info({ action: "deleteProject", projectId, userId }, "Project deleted");
}

export async function duplicateProject(
  userId: string,
  sourceProjectId: string,
): Promise<ProjectResponse> {
  const duplicated = await projectsRepository.duplicateProject(
    userId,
    sourceProjectId,
  );

  if (!duplicated) {
    throw new NotFoundError(`Project ${sourceProjectId} not found`);
  }

  log.info(
    {
      action: "duplicateProject",
      sourceProjectId,
      newProjectId: duplicated.id,
      userId,
    },
    "Project duplicated",
  );

  return duplicated;
}
