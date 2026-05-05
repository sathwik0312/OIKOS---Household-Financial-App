export type BudgetCategory = "travel" | "dining" | "groceries" | "leisure" | "utilities";

export interface CategoryBudget {
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
}

export interface BudgetStatus {
  month: string;
  budgets: Record<BudgetCategory, CategoryBudget>;
  total: {
    limit: number;
    spent: number;
    remaining: number;
    percent: number;
  };
  days_remaining_in_month: number;
  per_member: Record<string, { name: string; spent: number }>;
  overspent_categories: string[];
  health: "good" | "warning" | "critical";
  upcoming_committed: UpcomingExpense[];
}

export interface UpcomingExpense {
  name: string;
  amount: number;
  date: string;
}

export interface HouseholdMember {
  id: string;
  name: string;
  email: string;
}

export interface Household {
  id: string;
  name: string;
  admin_user_id: string;
  invite_token: string;
  members: HouseholdMember[];
  budget: Record<BudgetCategory, number> | null;
}

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string[];
  institution: string;
  user_id: string;
}
