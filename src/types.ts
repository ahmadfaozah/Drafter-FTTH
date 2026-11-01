/**
 * Tipe data Pemetaan Jaringan FTTH
 */

export interface SFP {
  id: string;
  code: string;
  name: string;
  slot: number;
  port: number;
  tx_power_dbm: number;
  latitude: number;
  longitude: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ODC {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  total_ports: number;
  splitter_type: string; // Contoh: "1:8", "1:16"
  splitter_loss_db: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ODP {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  odc_id: string;
  odc_port?: number;
  total_ports: number;
  splitter_loss_db: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ONU {
  id: string;
  code: string;
  name: string;
  customer_id: string;
  remote_address?: string;
  latitude: number;
  longitude: number;
  odp_id: string;
  odp_port?: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface FiberCable {
  id: string;
  cable_code: string;
  cable_name: string;
  from_node_type: "SFP" | "ODC" | "ODP" | "ONU" | "SPLICE";
  from_node_id: string;
  to_node_type: "SFP" | "ODC" | "ODP" | "ONU" | "SPLICE";
  to_node_id: string;
  length_km: number;
  total_cores: number;
  cable_type: string; // Contoh: "Single-mode", "Multi-mode"
  splice_count: number;
  geometry_line: [number, number][]; // Array koordinat penitik: [lat, lng]
  description: string;
  created_at: string;
  updated_at: string;
}

export type FiberCoreStatus = "USED" | "SPARE" | "RESERVED" | "BROKEN";

export interface FiberCore {
  id: string;
  cable_id: string;
  core_number: number;
  status: FiberCoreStatus;
}

export type SpliceType = "Fusion Splice" | "Mechanical Splice";

export interface SplicePoint {
  id: string;
  splice_code: string;
  splice_name: string;
  latitude: number;
  longitude: number;
  splice_type: SpliceType;
  loss_db: number;
  description: string;
}

export interface CableSplice {
  id: string;
  cable_id: string;
  splice_id: string;
}

// Tipe Respons dari Mesin Perhitungan Redaman Optik (Optical Loss Engine)
export interface OpticalLossResult {
  total_fiber_loss_db: number;
  total_splice_loss_db: number;
  total_connector_loss_db: number;
  total_splitter_loss_db: number;
  total_route_loss_db: number;
  estimated_rx_power_dbm: number;
}

// Tipe Elemen Jalur Pelacakan (Trace Path)
export interface TraceNode {
  type: "SFP" | "ODC" | "ODP" | "ONU";
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  tx_power_dbm?: number;
}

export interface TracePathResponse {
  onu: ONU;
  path: TraceNode[];
  cables: FiberCable[];
  splices: SplicePoint[];
  meters_length: number;
  total_loss_calculation: OpticalLossResult;
  validation_status: "VALID" | "WARNING" | "ERROR";
  validation_messages: string[];
}

// Metrik Penganalisis Kapasitas (Capacity Analyzer)
export interface CapacityMetric {
  id: string;
  code: string;
  name: string;
  type: "ODC" | "ODP";
  total_ports: number;
  used_ports: number;
  free_ports: number;
  utilization_percentage: number;
}
