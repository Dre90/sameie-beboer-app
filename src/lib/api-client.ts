import { apiRequest } from "@/lib/api";
import type {
  Activity,
  ActivityCompletion,
  ActivityResponse,
  ActivityResponseKind,
  ActivityStatus,
  AuthUser,
  CompletionType,
  Resident,
  Unit,
  UserRole,
} from "@/lib/api-types";

export const api = {
  me: () => apiRequest<{ user: AuthUser }>("/api/me"),

  users: {
    list: () => apiRequest<{ users: AuthUser[] }>("/api/users"),
    create: (input: { email: string; name: string; role: UserRole }) =>
      apiRequest<{ user: AuthUser }>("/api/users", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (email: string, patch: { name?: string; role?: UserRole }) =>
      apiRequest<{ user: AuthUser }>(`/api/users/${encodeURIComponent(email)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    remove: (email: string) =>
      apiRequest<{ ok: true }>(`/api/users/${encodeURIComponent(email)}`, {
        method: "DELETE",
      }),
  },

  units: {
    list: () => apiRequest<{ units: Unit[] }>("/api/units"),
    get: (id: string) =>
      apiRequest<{ unit: Unit; residents: Resident[] }>(`/api/units/${encodeURIComponent(id)}`),
    upsert: (
      id: string,
      data: {
        is_rented: boolean;
        owner_name?: string | null;
        owner_email?: string | null;
        owner_phone?: string | null;
      },
    ) =>
      apiRequest<{ unit: Unit }>(`/api/units/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    addResident: (
      unitId: string,
      data: { name: string; email?: string | null; phone?: string | null },
    ) =>
      apiRequest<{ resident: Resident }>(`/api/units/${encodeURIComponent(unitId)}/residents`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateResident: (
      unitId: string,
      residentId: number,
      data: Partial<{ name: string; email: string | null; phone: string | null }>,
    ) =>
      apiRequest<{ resident: Resident }>(
        `/api/units/${encodeURIComponent(unitId)}/residents/${residentId}`,
        { method: "PATCH", body: JSON.stringify(data) },
      ),
    removeResident: (unitId: string, residentId: number) =>
      apiRequest<{ ok: true }>(`/api/units/${encodeURIComponent(unitId)}/residents/${residentId}`, {
        method: "DELETE",
      }),
  },

  activities: {
    list: () => apiRequest<{ activities: Activity[] }>("/api/activities"),
    create: (input: {
      title: string;
      description?: string | null;
      status?: ActivityStatus;
      deadline?: string | null;
    }) =>
      apiRequest<{ activity: Activity }>("/api/activities", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (
      id: number,
      patch: Partial<Pick<Activity, "title" | "description" | "status" | "deadline">>,
    ) =>
      apiRequest<{ activity: Activity }>(`/api/activities/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    status: (id: number) =>
      apiRequest<{
        responses: ActivityResponse[];
        completions: ActivityCompletion[];
      }>(`/api/activities/${id}/status`),
    setResponse: (
      id: number,
      unitId: string,
      input: { response: ActivityResponseKind; note?: string | null },
    ) =>
      apiRequest<{ response: ActivityResponse }>(
        `/api/activities/${id}/responses/${encodeURIComponent(unitId)}`,
        { method: "PUT", body: JSON.stringify(input) },
      ),
    complete: (
      id: number,
      unitId: string,
      input: { completion_type: CompletionType; notes?: string | null },
    ) =>
      apiRequest<{ completion: ActivityCompletion }>(
        `/api/activities/${id}/completions/${encodeURIComponent(unitId)}`,
        { method: "POST", body: JSON.stringify(input) },
      ),
    undoComplete: (id: number, unitId: string) =>
      apiRequest<{ ok: true }>(`/api/activities/${id}/completions/${encodeURIComponent(unitId)}`, {
        method: "DELETE",
      }),
  },
};
