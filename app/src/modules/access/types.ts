export type AlmoxRole = "admin" | "employee";

export interface Profile {
  id: string;
  display_name: string;
  role: AlmoxRole;
  active: boolean;
}
