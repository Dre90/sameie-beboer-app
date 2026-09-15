import { apiRequest } from "./api";
import type { CompletionKind, Overview, ResponseKind, UnitStatus } from "./filter-types";

export const filterApi = {
  overview: () => apiRequest<Overview>("/api/units"),
  setResponse: (unit: UnitStatus, response: ResponseKind) =>
    apiRequest<{ unit: UnitStatus }>(`/api/units/${encodeURIComponent(unit.id)}/response`, {
      method: "PATCH",
      body: JSON.stringify({ response, version: unit.version }),
    }),
  setCompletion: (unit: UnitStatus, completion: CompletionKind) =>
    apiRequest<{ unit: UnitStatus }>(`/api/units/${encodeURIComponent(unit.id)}/completion`, {
      method: "PATCH",
      body: JSON.stringify({ completion, version: unit.version }),
    }),
};
