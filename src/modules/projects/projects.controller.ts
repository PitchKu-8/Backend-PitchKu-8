// src/modules/projects/projects.controller.ts
import { UnauthorizedError } from "@shared/errors/app-errors";
import type { ApiSuccess } from "@shared/schemas/common.schema";
import type { Request, Response } from "express";

import type {
  CreateProjectRequest,
  ListProjectsQuery,
  ProjectResponse,
} from "./projects.schema";
import * as projectsService from "./projects.service";

const projectsApi = projectsService;

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new UnauthorizedError("User is not authenticated");
  }
  return req.userId;
}

/**
 * POST /projects
 */
export async function createProjectHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const input = req.body as CreateProjectRequest;

  const project = await projectsApi.createProject(userId, input);

  const response: ApiSuccess<ProjectResponse> = {
    success: true,
    data: project,
  };
  res.status(201).json(response);
}

/**
 * GET /projects/:id
 */
export async function getProjectHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const project = await projectsApi.getProjectById(
    userId,
    req.params.id as string,
  );

  const response: ApiSuccess<ProjectResponse> = {
    success: true,
    data: project,
  };
  res.status(200).json(response);
}

/**
 * GET /projects
 */
export async function listProjectsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const query = req.query as unknown as ListProjectsQuery;

  const { items, total } = await projectsApi.listProjects(userId, query);

  const response: ApiSuccess<ProjectResponse[]> = {
    success: true,
    data: items,
    meta: { page: query.page, limit: query.limit, total },
  };
  res.status(200).json(response);
}

/**
 * DELETE /projects/:id
 */
export async function deleteProjectHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  await projectsApi.deleteProject(userId, req.params.id as string);

  res.status(204).send();
}

/**
 * POST /projects/:id/duplicate
 */
export async function duplicateProjectHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const duplicated = await projectsApi.duplicateProject(
    userId,
    req.params.id as string,
  );

  const response: ApiSuccess<ProjectResponse> = {
    success: true,
    data: duplicated,
  };
  res.status(201).json(response);
}
