export interface Plan {
  id: string;
  type: PlanType;
  name: string;
  prompt: string;
  content?: string;
}

type PlanType = "planning";
