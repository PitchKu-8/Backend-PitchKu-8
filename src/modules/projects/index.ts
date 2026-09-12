// src/modules/projects/index.ts
export {
  createProjectHandler,
  getProjectHandler,
  listProjectsHandler,
  deleteProjectHandler,
  duplicateProjectHandler,
} from "./projects.controller";
export {
  CreateProjectRequestSchema,
  ListProjectsQuerySchema,
} from "./projects.schema";
export {
  getLatestDeckVersion,
  appendDeckVersion,
  updateProjectStatus,
  findProjectById,
} from "./projects.repository";
export type {
  CreateProjectRequest,
  ListProjectsQuery,
  ProjectResponse,
  TemplateType,
  ProjectStatus,
  BusinessContext,
} from "./projects.schema";
