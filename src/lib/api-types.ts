export type UserRole = "board" | "craftsman";

export type AuthUser = {
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
  residents: Resident[];
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
