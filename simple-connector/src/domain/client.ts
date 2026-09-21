export type Client = {
  id: string;
  name: string;
  email: string | null;
  status: "active" | "inactive";
};
