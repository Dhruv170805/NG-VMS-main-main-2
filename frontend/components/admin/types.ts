// Shared types for all admin sub-components

export interface Visitor {
  _id: string;
  name: string;
  phone: string;
  company?: string;
  purpose: string;
  hostName: string;
  hostId?: { _id: string; name: string; email: string; department: string };
  status: string;
  photoUrl?: string;
  createdAt: string;
  checkInTime?: string;
  meetInTime?: string;
  meetOutTime?: string;
  checkOutTime?: string;
  idNumberHash?: string;
  hostRemark?: string;
  idProofPhotoUrl?: string;
  encryptedIdProofPreview?: string;
  aadhaarImageUrl?: string;
  aadhaarVerified?: boolean;
  maskedAadhaar?: string;
}

export interface Employee {
  _id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  isAvailable: boolean;
  isHost: boolean;
}

export interface AnalyticsData {
  traffic: { _id: string; count: number }[];
  purposes: { _id: string; count: number }[];
  hosts: { _id: string; count: number }[];
  hourly?: { hour: string; count: number }[];
  daily?: { day: string; count: number }[];
  statusDist?: { _id: string; count: number }[];
}

export interface BlacklistEntry {
  _id: string;
  idNumberHash: string;
  name?: string;
  company?: string;
  visitorId?: string;
  reason: string;
  active: boolean;
  createdAt: string;
}

export interface ExportConfig {
  timeRange: string;
  customFrom: string;
  customTo: string;
  customMonth?: number;
  customYear?: number;
  filterType: string;
  filterValue: string;
  downloadType: string;
  format: string;
}

export interface PhotoTarget {
  url: string;
  title: string;
  isAadhaar?: boolean;
  id?: string;
}

export interface SmtpConfig {
  host: string;
  port: string;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

export interface GuardConfig {
  autoScan: boolean;
  folderName: string;
  printMode: 'DIGITAL_ONLY' | 'HARD_PRINT_BOTH' | 'QR_VID_ONLY';
  requireAadhaar?: boolean;
}

export const CHART_COLORS = ['#007AFF', '#34C759', '#FFCC00', '#FF3B30', '#AF52DE', '#FF9500'];
