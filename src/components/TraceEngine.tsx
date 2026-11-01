import { useState, useEffect } from "react";
import axios from "axios";
import { ONU, TracePathResponse } from "../types";
import { Search, Cable, HelpCircle, AlertTriangle, CheckCircle2, RefreshCw, Layers } from "lucide-react";

interface TraceEngineProps {
  onus: ONU[];
  onTraceResult?: (cables: string[], nodes: string[], activeOnuCode: string) => void;
}

export default function TraceEngine({ onus, onTraceResult }: TraceEngineProps) {
  const [selectedOnuId, setSelectedOnuId] = useState("");
  const [loading, setLoading] = useState(false);
  const [traceData, setTraceData] = useState<TracePathResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOnus = onus.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.customer_id && o.customer_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleTrace = async (onuId: string) => {
    if (!onuId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/trace/onu/${onuId}`);
      setTraceData(response.data);

      // Callback untuk mewarnai lapisan peta (layer map)
      if (onTraceResult && response.data) {
        const cablesArray = response.data.cables.map((c: any) => c.id);
        const nodesArray = response.data.path.map((n: any) => n.id);
        onTraceResult(cablesArray, nodesArray, response.data.onu.code);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Gagal melacak ONU pelanggan yang dipilih.");
      setTraceData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (onus.length > 0 && !selectedOnuId) {
      setSelectedOnuId(onus[0].id);
      handleTrace(onus[0].id);
    }
  }, [onus]);

  const rx = traceData?.total_loss_calculation?.estimated_rx_power_dbm ?? -25.0;

  let signalClass = "bg-green-500/10 border-green-500/30 text-green-400";
  let signalText = "DAYA OPTIK STABIL / BAGUS";
  if (rx < -28.0) {
    signalClass = "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse";
    signalText = "GAGAL / REDAMAN KRITIS";
  } else if (rx < -24.0) {
    signalClass = "bg-amber-500/10 border-amber-500/30 text-amber-500";
    signalText = "STABILITAS OPTIK MARGINAL / LEMAH";
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Left Column: Input Selection Feed */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400" /> Lacak ONU ke Pemancar SFP
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Lacak jalur kabel optik dari ONU ke atas hierarki</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 block">Pilih Pelanggan Aktif</label>
          <input
            type="text"
            placeholder="Cari nama, kode, atau ID pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 p-2 text-xs rounded text-white focus:outline-none focus:border-cyan-500"
          />
          <div className="flex gap-2">
            <select
               value={selectedOnuId}
               onChange={(e) => setSelectedOnuId(e.target.value)}
               className="flex-grow bg-slate-950 border border-slate-850 p-2 text-xs rounded text-white font-medium"
            >
              <option value="">-- Pilih ONU Pelanggan --</option>
              {filteredOnus.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} - {o.name} {o.customer_id ? `(${o.customer_id})` : ""}
                </option>
              ))}
            </select>
            <button
               onClick={() => handleTrace(selectedOnuId)}
               disabled={loading}
               className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/20 border border-red-900 text-red-400 rounded-lg text-xs flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-950 font-mono text-[10px] text-slate-500 space-y-2 rounded border border-slate-850">
          <p className="font-bold text-slate-400 uppercase tracking-widest">Parameter Redaman Standar</p>
          <div className="flex justify-between">
            <span>Atenuasi Kabel Serat:</span>
            <span className="text-slate-300">0.35 dB/km</span>
          </div>
          <div className="flex justify-between">
            <span>Redaman Konektor:</span>
            <span className="text-slate-300">0.50 dB per titik</span>
          </div>
          <div className="flex justify-between">
            <span>Sambungan Fusion:</span>
            <span className="text-slate-300">0.03 dB</span>
          </div>
          <div className="flex justify-between">
            <span>Sambungan Mekanis (Splice):</span>
            <span className="text-slate-300">0.20 dB</span>
          </div>
        </div>
      </div>

      {/* Right 2 Columns: Trace Outputs & Budgets */}
      <div className="lg:col-span-2 space-y-4">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
            Melacak rute budget optik secara real-time...
          </div>
        ) : traceData ? (
          <div className="space-y-4">
            {/* Hierarki rute kaskade visual (visual cascading route) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Rute Diagram Alir Fisik Jalur</h4>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-xs gap-3">
                {traceData.path.map((node, index) => (
                  <div key={node.id} className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Tampilan visual node */}
                    <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex-grow">
                      <div className="text-[8px] uppercase font-bold tracking-widest text-slate-500">
                        {node.type === "SFP" && "Transmitter OLT / SFP"}
                        {node.type === "ODC" && "Kabinet ODC"}
                        {node.type === "ODP" && "Terminal ODP"}
                        {node.type === "ONU" && "ONU Pelanggan"}
                      </div>
                      <div className="font-bold text-slate-100 font-mono mt-0.5">{node.code}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate w-24">{node.name}</div>
                    </div>

                    {/* Panah penghubung atau jarak kabel (linking arrow/mileage) */}
                    {index < traceData.path.length - 1 && (
                      <div className="flex sm:flex-col items-center justify-center text-[10px] text-cyan-400 px-2 gap-1 font-mono">
                        <Cable className="w-3.5 h-3.5" />
                        <span className="font-bold">{((traceData.cables[index]?.length_km || 0.25) * 1000).toFixed(0)}m</span>
                        <span className="hidden sm:inline">&rarr;</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Analisis anggaran daya dB (dB budget analysis) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* HUD Sinyal (Signal HUD) */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${signalClass}`}>
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-bold">Daya Terima Sinyal (Rx)</span>
                  <div className="text-3xl font-extrabold mt-1.5 font-mono">{rx} <span className="text-sm font-medium">dBm</span></div>
                </div>
                <div className="text-[10px] uppercase font-bold tracking-widest mt-4 flex items-center gap-1.5">
                  {rx < -28 ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4" />}
                  {signalText}
                </div>
              </div>

              {/* Tabel kalkulasi total (total calculations table) */}
              <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-1.5 border-b border-slate-800 flex items-center justify-between">
                  <span>Log Redaman Daya Sinyal</span>
                  <span className="text-[10px] text-slate-500">GPON IEEE 802.3ah</span>
                </h4>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div className="text-slate-400">Daya Output SFP OLT:</div>
                  <div className="text-right text-slate-100 font-semibold font-mono">
                    +{((traceData.path.find(n => n.type === "SFP")?.tx_power_dbm) ?? 3.00).toFixed(2)} dBm
                  </div>

                   <div className="text-slate-400">Redaman Kabel Serat Optik:</div>
                  <div className="text-right text-rose-400 font-mono">
                    -{Math.abs(traceData.total_loss_calculation.total_fiber_loss_db)} dB
                  </div>

                  <div className="text-slate-400">Redaman Pembagi (Splitter ODC & ODP):</div>
                  <div className="text-right text-rose-400 font-mono">
                    -{Math.abs(traceData.total_loss_calculation.total_splitter_loss_db)} dB
                  </div>

                  <div className="text-slate-400">Redaman Titik Gendong (Splice):</div>
                  <div className="text-right text-rose-400 font-mono">
                    -{Math.abs(traceData.total_loss_calculation.total_splice_loss_db)} dB
                  </div>

                  <div className="text-slate-400">Redaman Konektor & Adaptor:</div>
                  <div className="text-right text-rose-400 font-mono">
                    -{Math.abs(traceData.total_loss_calculation.total_connector_loss_db)} dB
                  </div>

                  <div className="text-cyan-400 font-semibold border-t border-slate-800/40 pt-1.5">Total Kerugian Redaman Rute:</div>
                  <div className="text-right text-cyan-400 font-bold font-mono border-t border-slate-800/40 pt-1.5">
                    {traceData.total_loss_calculation.total_route_loss_db} dB
                  </div>
                </div>
              </div>
            </div>

            {/* Blok peringatan validasi (validation warning block) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" /> Peringatan Validasi Rute & Jalur
              </h4>

              <div className="space-y-1.5 text-xs">
                {traceData.validation_messages.map((msg, i) => (
                  <div key={i} className="flex gap-2 text-slate-400 py-1 border-b border-slate-800/20 last:border-0">
                    <span className="text-indigo-400 font-bold">&#8226;</span>
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
            Pilih pelanggan untuk memuat diagnostik pelacakan rute secara langsung.
          </div>
        )}
      </div>
    </div>
  );
}
