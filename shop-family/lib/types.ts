export interface Profile {
  id: string;
  username: string;
  full_name: string;
  created_at: string;
}

export interface Family {
  id: string;
  name: string;
  invite_code: string | null;
  created_at: string;
}

export interface FamilyMember {
  family_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: Profile;
}

export interface Product {
  id: string;
  family_id: string | null;
  name: string;
  created_at: string;
}

export interface ShoppingList {
  id: string;
  family_id: string | null;
  title: string;
  type: string | null;
  is_completed: boolean;
  created_by: string | null;
  created_at: string;
  shopping_items?: ShoppingItem[];
  profiles?: Profile;
}

export interface ShoppingItem {
  id: string;
  list_id: string | null;
  product_id: string | null;
  quantity: number;
  unit: string | null;
  is_purchased: boolean;
  actual_price: number | null;
  purchased_by: string | null;
  updated_at: string;
  products?: Product;
  profiles?: Profile;
}

export interface PriceHistory {
  product_name: string;
  prices: { price: number; date: string; list_title: string }[];
  trend: 'up' | 'down' | 'stable';
  latest_price: number;
  previous_price: number | null;
}
