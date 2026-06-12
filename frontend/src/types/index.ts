export type UserRole = 'admin' | 'employee' | 'supervisor';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  real_name: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface DeviceType {
  id: number;
  name: string;
  description: string;
  warning_threshold: number;
  available_count: number;
  total_count: number;
  created_at: string;
}

export interface Location {
  id: number;
  name: string;
  description: string;
  device_count: number;
  created_at: string;
}

export type DeviceStatus = 
  | 'available' 
  | 'borrowed' 
  | 'pending_maintenance' 
  | 'exception_pending' 
  | 'maintaining' 
  | 'recovered' 
  | 'decommissioned';

export interface CurrentBorrower {
  id: number;
  real_name: string;
  borrow_date: string;
  expected_return_date: string;
}

export interface Device {
  id: number;
  asset_number: string;
  name: string;
  device_type_id: number;
  device_type_name: string;
  location_id: number;
  location_name: string;
  status: DeviceStatus;
  status_display: string;
  specification: string;
  purchase_date: string | null;
  is_overdue: boolean;
  turnover_count: number;
  current_borrower: CurrentBorrower | null;
  created_at: string;
}

export type ReservationStatus = 'pending' | 'notified' | 'fulfilled' | 'cancelled' | 'expired';

export interface Reservation {
  id: number;
  device: number;
  device_name: string;
  asset_number: string;
  user: number;
  user_name: string;
  expected_borrow_date: string;
  expected_return_date: string;
  purpose: string;
  status: ReservationStatus;
  status_display: string;
  created_at: string;
  notified_at: string | null;
  fulfilled_at: string | null;
}

export interface DeviceDetail extends Device {
  last_maintenance_date: string | null;
  borrow_records: BorrowRecord[];
  maintenance_records: MaintenanceRecord[];
  exception_records: ExceptionRecord[];
  reservation_records: Reservation[];
}

export interface BorrowRecord {
  id: number;
  device: number;
  device_name: string;
  asset_number: string;
  borrower: number;
  borrower_name: string;
  borrow_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  returned: boolean;
  borrow_purpose: string;
  return_notes: string;
  damage_notes: string;
  is_overdue: boolean;
}

export interface MaintenanceRecord {
  id: number;
  device: number;
  device_name: string;
  asset_number: string;
  operator: number;
  operator_name: string;
  maintenance_date: string;
  maintenance_type: string;
  description: string;
  result: string;
  completed: boolean;
  completed_date: string | null;
}

export type ExceptionType = 'damage' | 'loss' | 'overdue' | 'missing_maintenance' | 'other';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ExceptionRecord {
  id: number;
  device: number;
  device_name: string;
  asset_number: string;
  reporter: number;
  reporter_name: string;
  exception_type: ExceptionType;
  exception_type_display: string;
  description: string;
  reported_date: string;
  review_status: ReviewStatus;
  review_status_display: string;
  reviewer: number | null;
  reviewer_name: string | null;
  review_date: string | null;
  review_result: string;
}

export interface Statistics {
  total_turnover: number;
  pending_maintenance: number;
  exception_distribution: Record<string, number>;
  low_stock_types: {
    id: number;
    name: string;
    available: number;
    total: number;
    threshold: number;
  }[];
  pending_reservations: number;
}

export interface DeviceFilters {
  device_type?: number;
  location?: number;
  status?: DeviceStatus;
  borrower?: number;
  start_date?: string;
  end_date?: string;
}
