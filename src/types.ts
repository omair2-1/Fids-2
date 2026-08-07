export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  is_veg: boolean;
  is_available: boolean;
  image_url: string;
  spice_level?: 'Mild' | 'Medium' | 'Spicy';
  calories?: string;
  prep_time_est?: number; // in minutes
  rating?: number;
  review_count?: number;
  tags?: string[];
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  is_veg: boolean;
  notes?: string;
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_type: 'delivery' | 'pickup' | 'dine_in';
  table_number?: string;
  total_amount: number;
  status: OrderStatus;
  estimated_prep_time: number; // in minutes
  payment_status: 'Paid' | 'Unpaid';
  payment_method: 'GPay / PhonePe (UPI)' | 'Credit / Debit Card' | 'Cash on Delivery';
  payment_transaction_id?: string;
  created_at: string;
  items: OrderItem[];
  special_instructions?: string;
  history: OrderStatusHistory[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialNotes?: string;
}

export interface TableReservation {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  date: string;
  time: string;
  guests_count: number;
  table_preference?: string;
  special_occasion?: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedActions?: {
    label: string;
    action: 'add_to_cart' | 'navigate' | 'track_order' | 'open_reservation';
    payload: any;
  }[];
}

