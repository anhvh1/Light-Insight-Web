export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type AlarmStatus = 'new' | 'in progress' | 'on hold' | 'close' | string;
export type IncidentStatus = 'new' | 'prog' | 'res' | 'ack';
export type AlarmType = 'ai' | 'lpr' | 'acs' | 'fire' | 'bms' | 'tech' | 'light';

export interface Alarm {
  id: string;
  pri: string;
  /** priorityName gốc từ API/socket — dùng làm fallback khi remap theo Priorities/GetAll */
  apiPriorityName?: string;
  type: AlarmType;
  typeLabel?: string;
  title: string;
  src: string;
  loc: string;
  status: string;
  statusLabel?: string;
  statusLevel?: number;
  time: string;
  alarmTimeRaw?: string;
  cameraId?: string;
  corr: number;
  isNew: boolean;
  connectorName?: string;
  ipadress?: string;
}

export interface Incident {
  id: string;
  pri: Priority;
  title: string;
  src: AlarmType | 'manual';
  loc: string;
  status: IncidentStatus;
  user: string;
  mttd: string;
}

export interface SOPStep {
  text: string;
  done: boolean;
}

export interface Device {
  id: string | number;
  name: string;
  loc: string;
  status: 'online' | 'offline' | 'alarm' | 'warn' | 'standby';
  type: 'camera' | 'barrier' | 'door' | 'server' | 'storage';
  fps?: number;
  res?: string;
  info?: string;
}

export interface AuditLog {
  t: string;
  u: string;
  a: string;
  ctx: string;
}

export interface Rule {
  name: string;
  trigger: string;
  action: string;
  on: boolean;
}

// --- API PRIORITY TYPES ---
export interface PriorityLevel {
  ID: number;
  PriorityName: string;
}

export interface AnalyticsEvent {
  ID: string;
  Name: string;
}

export interface CameraDropdownOption {
  id: string;
  name: string;
}

export interface PriorityMapping {
  ID: number;
  PriorityID: number;
  PriorityName: string;
  AnalyticsEvents: string[]; // Danh sách tên các event
}

export interface ApiResponse<T> {
  Status: number;
  Message: string;
  MessageDetail: string | null;
  Data: T;
  TotalRow: number;
}

// --- INCIDENT API TYPES ---
export interface IncidentApiItem {
  id: string;
  sop_id: string | null;
  priority: string;
  source_id: string;
  status: string;
  vms_id: string | null;
  vms_name: string | null;
  alarm_time: string | null;
  description: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentPagingParams {
  Keyword?: string;
  Status?: string;
  Page?: number;
  PageSize?: number;
}

export interface MapTreeNode {
  Id: string;
  Name: string;
  Code: string;
  ParentId: string | null;
  Children: MapTreeNode[];
  MapImagePath: string | null;
  CreatedAt: string;
}

// --- SOP TYPES ---
export interface SopTrigger {
  id?: string;
  connector_id: string;
  camera_id: string;
  event_id: string;
}

export interface SopStep {
  id?: string;
  step_order: number;
  step_name: string;
  execution_type: string;
  target_device_id: string | null;
  action_code: string;
  action_payload?: unknown;
}

export interface SopListItem {
  Id: string;
  Name: string;
  Description: string | null;
  CreatedAt: string;
}

export interface SopDetail {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  triggers: SopTrigger[];
  steps: SopStep[];
}
