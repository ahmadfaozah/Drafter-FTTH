import { useState } from "react";
import { ODC, ODP, ONU, FiberCable, FiberCore, FiberCoreStatus } from "../types";
import { Server, Grid, Sliders, CheckSquare, Save, RefreshCw } from "lucide-react";

interface CapacityPanelProps {
  odcs: ODC[];
  odps: ODP[];
  onus: ONU[];
  cables: FiberCable[];
  cores: FiberCore[];
  onUpdateCoreStatus: (coreId: string, status: FiberCoreStatus) => void;
}

export default function CapacityPanel({
  odcs,
  odps,
  onus,
  cables,
  cores,
  onUpdateCoreStatus
}: CapacityPanelProps) {
  const [selectedCableId, setSelectedCableId] = useState("");

  const handleCableChange = (id: string) => {
    setSelectedCableId(id);
  };

  const getFilteredCores = () => {
    if (!selectedCableId) return [];
    return cores.filter((c) => c.cable_id === selectedCableId).sort((a, b) => a.core_number - b.core_number);
  };

  const selectedCable = cables.find((c) => c.id === selectedCableId);

  // Kelas penanda status (status badges classes)
  const getCoreBg = (status: FiberCoreStatus) => {
    if (status === "USED") return "bg-emerald-500 hover:bg-emerald-400 border-emerald-600";
    if (status === "RESERVED") return "bg-amber-500 hover:bg-amber-400 border-amber-600";
    if (status === "BROKEN") return "bg-red-600 hover:bg-red-500 border-red-700 animate-pulse";
    return "bg-slate-800 hover:bg-slate-700 border-slate-700";
  };

  const cycleStatus = (core: FiberCore) => {
    const sequence: FiberCoreStatus[] = ["SPARE", "USED", "RESERVED", "BROKEN"];
    const currentIdx = sequence.indexOf(core.status);
    const nextStatus = sequence[(currentIdx + 1) % sequence.length];
    onUpdateCoreStatus(core.id, nextStatus);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Kolom Kiri: Daftar Kapasitas Port Splitter */}
      <div className="lg:col-span-1 space-y-4">
        {/* Daftar port splitter ODC */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-500" /> Status Port Splitter ODC
          </h3>
          <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
            {odcs.map((o) => {
              // Hitung ODP yang terhubung (linked ODPs)
              const linkedOdps = odps.filter((p) => p.odc_id === o.id).length;
              const usedPorts = linkedOdps;
              const pct = o.total_ports > 0 ? (usedPorts / o.total_ports) * 100 : 0;
              return (
                <div key={o.id} className="p-2 bg-slate-950 rounded border border-slate-850 text-xs">
                  <div className="flex justify-between font-mono font-bold text-slate-300">
                    <span>{o.code}</span>
                    <span className="text-slate-400">
                      {usedPorts} / {o.total_ports} port ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full mt-1.5 overflow-hidden">
                    <div style={{ width: `${pct}%` }} className="h-full bg-amber-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daftar port splitter drop ODP */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <Grid className="w-4 h-4 text-sky-400" /> Utilitas Drop Bay ODP
          </h3>
          <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
            {odps.map((o) => {
              // Hitung ONU yang terhubung (connected ONUs)
              const linkedOnus = onus.filter((onu) => onu.odp_id === o.id).length;
              const pct = o.total_ports > 0 ? (linkedOnus / o.total_ports) * 100 : 0;
              return (
                <div key={o.id} className="p-2 bg-slate-950 rounded border border-slate-850 text-xs">
                  <div className="flex justify-between font-mono font-bold text-slate-300">
                    <span>{o.code}</span>
                    <span className="text-slate-400">
                      {linkedOnus} / {o.total_ports} port ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full mt-1.5 overflow-hidden">
                    <div style={{ width: `${pct}%` }} className="h-full bg-sky-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kolom Kanan: Manajer core visual interaktif */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-cyan-400" /> Grid Alokasi Core Serat Optik Interaktif
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Konfigurasi status core serat kabel optik</p>
            </div>

            <select
               value={selectedCableId}
               onChange={(e) => handleCableChange(e.target.value)}
               className="bg-slate-950 border border-slate-850 p-1.5 text-xs rounded text-white font-medium"
            >
              <option value="">-- Pilih Rute Kabel Optik --</option>
              {cables.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cable_code} - {c.cable_name} ({c.total_cores} Core)
                </option>
              ))}
            </select>
          </div>

          {selectedCableId ? (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 text-xs text-slate-400">
                <h4 className="font-bold text-white mb-1">{selectedCable?.cable_name}</h4>
                <p>Tipe: <span className="text-slate-300 font-semibold">{selectedCable?.cable_type}</span> | Panjang: <span className="text-slate-300 font-semibold">{selectedCable?.length_km} km</span></p>
              </div>

              {/* Peta grid core berwarna */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Inti Core (Klik core untuk mengganti status)</p>
                
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                  {getFilteredCores().map((core) => (
                    <button
                       key={core.id}
                       onClick={() => cycleStatus(core)}
                       className={`py-3 px-2 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer font-bold ${getCoreBg(core.status)}`}
                    >
                      <span className="text-xs text-white">{core.core_number}</span>
                      <span className="text-[8px] opacity-90 text-white mt-1 uppercase tracking-tighter">
                        {core.status === "SPARE" ? "BEBAS" : core.status === "USED" ? "TERPAKAI" : core.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              Pilih kabel serat optik aktif dari menu drop-down untuk memuat dan mengatur alokasi core.
            </div>
          )}
        </div>

        {selectedCableId && (
          <div className="flex gap-4 border-t border-slate-850 pt-3 mt-4 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>TERPAKAI (Used)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-800" />
              <span>BEBAS (Spare)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" />
              <span>RESERVED</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-red-600" />
              <span>RUSAK (Broken)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
