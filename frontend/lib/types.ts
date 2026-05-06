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

// ── Trip Builder types ────────────────────────────────────────────────────────

export interface TripMeta {
  destination:      string;
  destination_iata: string;
  origin_iata:      string;
  departure_date:   string;   // "YYYY-MM-DD"
  return_date:      string;
  travelers:        number;
  nights:           number;
  budget_available: number;
}

export interface TBFlight {
  id?:           string;
  airline:       string;
  flight_number?:string;
  airline_code?: string;
  airline_logo?: string;
  price?:        number;
  price_total?:  number;
  price_per_person?: number;
  depart_time?:  string;
  arrive_time?:  string;
  departure_time?: string;
  arrival_time?: string;
  duration:      string;
  stops:         number;
  booking_url?:  string;
  booking_link?: string;
}

export interface TBHotel {
  name:           string;
  rating:         number;
  price_per_night:number;
  total_price:    number;
  nights:         number;
  room_type:      string;
  address?:       string;
  booking_url:    string;
}

export interface TBAttraction {
  place_id:   string;
  name:       string;
  rating:     number;
  address:    string;
  price_range:string;
  maps_url:   string;
  types:      string[];
}

export interface TBRestaurant {
  name:            string;
  cuisine:         string;
  rating:          number;
  price_range:     string;
  address:         string;
  phone:           string;
  yelp_url:        string;
  reservation_url: string;
  image_url:       string;
}

export interface MealSlot {
  slot_id:    string;
  day:        number;
  meal:       "lunch" | "dinner";
  label:      string;
  restaurant: TBRestaurant | null;
}

export interface DayItem {
  time:  string;
  type:  "flight" | "hotel" | "attraction" | "restaurant" | "transport";
  title: string;
  detail:string;
  cost?: string;
}

export interface DayItinerary {
  day_number: number;
  date:       string;
  day_name:   string;
  items:      DayItem[];
}

export interface TripPDFData {
  household_name:   string;
  destination:      string;
  destination_full: string;
  departure_date:   string;
  return_date:      string;
  travelers:        number;
  flight:           { airline:string; flight_number:string; origin:string; destination:string; depart_time:string; arrive_time:string; return_flight_number:string; return_depart_time:string; price:number };
  hotel:            { name:string; address:string; nights:number; room_type:string; price:number };
  days:             DayItinerary[];
  budget:           { available:number; flight_cost:number; hotel_cost:number; food_estimate:number; total:number; remaining:number };
  generated_at:     string;
}

export interface ConfirmResult {
  success:       boolean;
  calendar_link: string;
  email_sent:    boolean;
  sms_sent:      boolean;
  trip_id:       string;
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string[];
  institution: string;
  user_id: string;
}
