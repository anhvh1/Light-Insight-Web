import type { Alarm, Incident, Device } from "@/types";

export const MOCK_ALARMS: Alarm[] = [
  { id: 'ALM-0847', pri: 'critical', type: 'lpr', title: 'Xe không đăng ký — Cổng B1', src: 'Futech LPR', loc: 'B1 · Cổng IN', status: 'new', time: '02:14:33', corr: 3 },
  { id: 'ALM-0846', pri: 'critical', type: 'ai', title: 'Đỗ xe sai vị trí · CAM-B1-04', src: 'Milestone AI', loc: 'B1 · Ô D22', status: 'new', time: '02:11:05', corr: 2 },
  { id: 'ALM-0845', pri: 'high', type: 'acs', title: 'Từ chối quẹt thẻ 3 lần · Cửa T2', src: 'BioStar2', loc: 'T2 · Thang máy', status: 'ack', time: '02:08:47', corr: 1 },
  { id: 'ALM-0844', pri: 'high', type: 'ai', title: 'Chiếm dụng hành lang · Sảnh L1', src: 'Milestone AI', loc: 'L1 · Hành lang A', status: 'prog', time: '01:55:20', corr: 0 },
  { id: 'ALM-0843', pri: 'medium', type: 'ai', title: 'Xe ngược chiều · CAM-B1-01', src: 'Milestone AI', loc: 'B1 · Làn A', status: 'ack', time: '01:42:10', corr: 2 },
  { id: 'ALM-0842', pri: 'medium', type: 'lpr', title: 'Biển số không rõ — CAM-LPR-03', src: 'Futech LPR', loc: 'Cổng ra B1', status: 'new', time: '01:38:05', corr: 0 },
  { id: 'ALM-0841', pri: 'low', type: 'tech', title: 'Camera mất tín hiệu · CAM-L3-07', src: 'Milestone', loc: 'L3 · Hành lang C', status: 'prog', time: '01:20:00', corr: 0 },
  { id: 'ALM-0840', pri: 'low', type: 'bms', title: 'Mất kết nối BMS 45s · Zone Fire', src: 'BMS Portal', loc: 'Server Room', status: 'ack', time: '00:58:30', corr: 0 },
];

export const MOCK_INCIDENTS: Incident[] = [
  { id: '0847', pri: 'critical', title: 'Xe không đăng ký Cổng B1 — Biển 43A-88821', src: 'lpr', loc: 'B1 · Cổng IN', status: 'new', user: 'Trần Hùng', mttd: '8s' },
  { id: '0846', pri: 'critical', title: 'Đỗ xe sai ô D22 · CAM-B1-04', src: 'ai', loc: 'B1 · Ô D22', status: 'new', user: 'Trần Hùng', mttd: '12s' },
  { id: '0845', pri: 'high', title: 'Từ chối quẹt thẻ 3 lần · Cửa T2', src: 'acs', loc: 'T2 · Thang máy', status: 'ack', user: 'Lê Văn Đức', mttd: '45s' },
  { id: '0844', pri: 'high', title: 'Chiếm dụng hành lang · Sảnh L1', src: 'ai', loc: 'L1 · Hành lang A', status: 'prog', user: 'Nguyễn Minh', mttd: '1m 20s' },
  { id: '0843', pri: 'medium', title: 'Xe ngược chiều · CAM-B1-01', src: 'ai', loc: 'B1 · Làn A', status: 'ack', user: 'Trần Hùng', mttd: '30s' },
  { id: '0842', pri: 'medium', title: 'Biển số không rõ — CAM-LPR-03', src: 'lpr', loc: 'Cổng ra B1', status: 'new', user: 'Chưa nhận', mttd: '—' },
  { id: '0841', pri: 'low', title: 'Camera mất tín hiệu · CAM-L3-07', src: 'tech', loc: 'L3 · Hành lang C', status: 'prog', user: 'Kỹ Thuật', mttd: '5m' },
  { id: '0840', pri: 'low', title: 'Mất kết nối BMS 45s · Zone Fire', src: 'bms', loc: 'Server Room', status: 'ack', user: 'Trần Hùng', mttd: '15s' },
  { id: '0839', pri: 'critical', title: 'Báo cháy giả · Zone 4 L5', src: 'fire', loc: 'L5 · Zone 4', status: 'res', user: 'Nguyễn Minh', mttd: '2m' },
  { id: '0838', pri: 'high', title: 'Xâm nhập vùng cấm · Kho 2', src: 'ai', loc: 'B2 · Kho 2', status: 'res', user: 'Lê Văn Đức', mttd: '1m 10s' },
];

export const MOCK_DEVICES: Device[] = [
  { id: 'CAM-B1-01', name: 'Camera Làn IN 01', loc: 'B1 · Cổng A', status: 'online', type: 'camera', fps: 25, res: '4K', info: 'Hikvision IP' },
  { id: 'CAM-B1-04', name: 'Camera Zone D22', loc: 'B1 · Khu vực D', status: 'alarm', type: 'camera', fps: 20, res: '2K', info: 'Milestone AI' },
  { id: 'CAM-L1-02', name: 'Camera Sảnh Chính', loc: 'L1 · Lobby', status: 'online', type: 'camera', fps: 30, res: '4K', info: 'Axis Q16' },
  { id: 'DOOR-L1-01', name: 'Cửa Sảnh A', loc: 'L1 · Entry', status: 'online', type: 'door', info: 'BioStar 2' },
  { id: 'CAM-L2-05', name: 'Camera Corridor B', loc: 'L2 · Hành lang', status: 'offline', type: 'camera', info: 'No Signal' },
  { id: 'BAR-B1-01', name: 'Barrier Cổng B1', loc: 'B1 · Cổng OUT', status: 'standby', type: 'barrier', info: 'Futech Controller' },
];
