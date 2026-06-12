import { http } from './http';
import type {
  LoginResponse, User, DeviceType, Location, Device, DeviceDetail,
  BorrowRecord, MaintenanceRecord, ExceptionRecord, Statistics, DeviceFilters
} from '../types';

export const api = {
  auth: {
    login(username: string, password: string): Promise<LoginResponse> {
      return http.post('/auth/login/', { username, password });
    },
    refresh(refresh: string): Promise<{ access: string }> {
      return http.post('/auth/refresh/', { refresh });
    },
    profile(): Promise<User> {
      return http.get('/auth/profile/');
    },
  },

  deviceTypes: {
    list(): Promise<DeviceType[]> {
      return http.get('/device-types/');
    },
    create(data: Partial<DeviceType>): Promise<DeviceType> {
      return http.post('/device-types/', data);
    },
    update(id: number, data: Partial<DeviceType>): Promise<DeviceType> {
      return http.put(`/device-types/${id}/`, data);
    },
    delete(id: number): Promise<void> {
      return http.delete(`/device-types/${id}/`);
    },
  },

  locations: {
    list(): Promise<Location[]> {
      return http.get('/locations/');
    },
    create(data: Partial<Location>): Promise<Location> {
      return http.post('/locations/', data);
    },
    update(id: number, data: Partial<Location>): Promise<Location> {
      return http.put(`/locations/${id}/`, data);
    },
    delete(id: number): Promise<void> {
      return http.delete(`/locations/${id}/`);
    },
  },

  devices: {
    list(filters?: DeviceFilters): Promise<Device[]> {
      return http.get('/devices/', filters);
    },
    detail(id: number): Promise<DeviceDetail> {
      return http.get(`/devices/${id}/`);
    },
    create(data: any): Promise<Device> {
      return http.post('/devices/', data);
    },
    update(id: number, data: Partial<Device>): Promise<Device> {
      return http.put(`/devices/${id}/`, data);
    },
    delete(id: number): Promise<void> {
      return http.delete(`/devices/${id}/`);
    },
  },

  borrowRecords: {
    list(): Promise<BorrowRecord[]> {
      return http.get('/borrow-records/');
    },
    create(data: { device: number; expected_return_date: string; borrow_purpose: string }): Promise<BorrowRecord> {
      return http.post('/borrow-records/', data);
    },
    returnDevice(id: number, data: { return_notes?: string; damage_notes?: string; needs_maintenance?: boolean }): Promise<BorrowRecord> {
      return http.post(`/borrow-records/${id}/return_device/`, data);
    },
  },

  maintenanceRecords: {
    list(): Promise<MaintenanceRecord[]> {
      return http.get('/maintenance-records/');
    },
    create(data: { device: number; maintenance_type: string; description: string; result: string }): Promise<MaintenanceRecord> {
      return http.post('/maintenance-records/', data);
    },
  },

  exceptionRecords: {
    list(filters?: { review_status?: string; exception_type?: string }): Promise<ExceptionRecord[]> {
      return http.get('/exception-records/', filters);
    },
    create(data: { device: number; exception_type: string; description: string }): Promise<ExceptionRecord> {
      return http.post('/exception-records/', data);
    },
    review(id: number, data: { review_result: string; action: string }): Promise<ExceptionRecord> {
      return http.post(`/exception-records/${id}/review/`, data);
    },
  },

  statistics: {
    get(): Promise<Statistics> {
      return http.get('/statistics/');
    },
    checkOverdue(): Promise<{ overdue_count: number; auto_created_exceptions: string[] }> {
      return http.get('/check-overdue/');
    },
  },

  users: {
    list(): Promise<User[]> {
      return http.get('/users/');
    },
    create(data: { username: string; password: string; role: string; real_name: string }): Promise<User> {
      return http.post('/users/', data);
    },
    update(id: number, data: Partial<User>): Promise<User> {
      return http.put(`/users/${id}/`, data);
    },
    delete(id: number): Promise<void> {
      return http.delete(`/users/${id}/`);
    },
  },
};
