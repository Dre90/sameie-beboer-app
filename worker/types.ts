/**
 * Cloudflare Worker environment bindings.
 * Keep in sync with wrangler.jsonc.
 */
export type WorkerEnv = {
  DB: D1Database;
  /** Cloudflare Access team domain, e.g. "your-team.cloudflareaccess.com" */
  ACCESS_TEAM_DOMAIN: string;
  /** Access Application Audience (AUD) tag */
  ACCESS_AUD: string;
  /** When "true", skip JWT verification (for local dev without Access). */
  DEV_BYPASS_AUTH?: string;
  /** Email to impersonate when DEV_BYPASS_AUTH=true. */
  DEV_USER_EMAIL?: string;
  /** ES256 private key (PKCS8 PEM) used to sign Access External Evaluation responses. */
  ACCESS_EVAL_PRIVATE_KEY?: string;
  /** Key id for External Evaluation responses. Optional; defaults to "access-eval". */
  ACCESS_EVAL_KEY_ID?: string;
};

export type UserRole = "board" | "craftsman";

export type User = {
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
};

export type Unit = {
  id: string;
  is_rented: boolean;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  updated_at: string;
};

export type Resident = {
  id: number;
  unit_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export type ActivityStatus = "draft" | "active" | "done";

export type Activity = {
  id: number;
  title: string;
  description: string | null;
  status: ActivityStatus;
  deadline: string | null;
  created_at: string;
};

export type ActivityResponseKind = "home" | "consent" | "self_service" | "unanswered";

export type ActivityResponse = {
  activity_id: number;
  unit_id: string;
  response: ActivityResponseKind;
  note: string | null;
  updated_at: string;
};

export type CompletionType = "performed" | "delivered";

export type ActivityCompletion = {
  activity_id: number;
  unit_id: string;
  completed_by_email: string;
  completion_type: CompletionType;
  notes: string | null;
  completed_at: string;
};

/** Hono Variables set by middleware. */
export type AppVariables = {
  user: User;
  jwtEmail: string;
};
