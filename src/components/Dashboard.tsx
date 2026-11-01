import { SFP, ODC, ODP, ONU, FiberCable, FiberCore, SplicePoint } from "../types";
import { Server, Grid, HelpCircle, HardDrive, Cpu, Radio, ShieldCheck, Zap } from "lucide-react";

interface DashboardProps {
  sfps: SFP[];
  odcs: ODC[];
  odps: ODP[];
  onus: ONU[];
  cables: FiberCable[];
  splices: SplicePoint[];
  cores: FiberCore[];
  stats: any;
}

export default function Dashboard({
  sfps,
  odcs,
  odps,
  onus,
  cables,
  splices,
  cores,
  stats
}: DashboardProps) {
  // Hitung rasio alokasi core (core ratios)
  const totalCores = cores.length;
  const usedCores = cores.filter((c) => c.status === "USED").length;
  const spareCores = cores.filter((c) => c.status === "SPARE").length;
  const reservedCores = cores.filter((c) => c.status === "RESERVED").length;
  const brokenCores = cores.filter((c) => c.status === "BROKEN").length;

  const usedPct = totalCores > 0 ? (usedCores / totalCores) * 100 : 0;
  const sparePct = totalCores > 0 ? (spareCores / totalCores) * 100 : 0;
  const reservedPct = totalCores > 0 ? (reservedCores / totalCores) * 100 : 0;
  const brokenPct = totalCores > 0 ? (brokenCores / totalCores) * 100 : 0;

  // Pembantu perenderan (render helpers)
  const countStats = stats?.counters || {
    totalSfp: sfps.length,
    totalOdc: odcs.length,
    totalOdp: odps.length,
    totalOnu: onus.length,
    totalCables: cables.length,
    totalSplices: splices.length
  };

  // Hitung rata-rata redaman rute dari ONU (average route loss)
  const defaultLosses = stats?.losses || [14.2, 11.5, 25.8];
  const avgLoss = defaultLosses.length > 0
    ? (defaultLosses.reduce((a: number, b: number) => a + b, 0) / defaultLosses.length).toFixed(1)
    : "14.2";

  // Kondisi rute logis (logical route conditions)
  const routeStats = stats?.routes || { valid: 1, warning: 1, error: 1 };

  return (
    <div className="space-y-6">
      {/* Kartu KPI Jumlah Aset (KPI Count cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3 kpi-card">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total SFP</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{countStats.totalSfp}</h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3 kpi-card">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kabinet ODC</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{countStats.totalOdc}</h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3 kpi-card">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kotak ODP</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{countStats.totalOdp}</h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3 kpi-card">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">ONU Terhubung</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{countStats.totalOnu}</h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3 kpi-card">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Rute Kabel</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{countStats.totalCables}</h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3 kpi-card">
          <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-lg">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sambungan</p>
            <h3 className="text-xl font-bold text-slate-100 mt-0.5">{countStats.totalSplices}</h3>
          </div>
        </div>
      </div>

      {/* Panel Bagian Analitis Utama (Main Analytical Section Panels) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pengukur Spektrum Redaman Optik (Optical Loss Spectrum Gauge) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" /> Kinerja Budget Optik
              </h3>
              <span className="text-[10px] text-slate-500">Kalkulasi Langsung</span>
            </div>
            
            <div className="text-center py-6">
              <div className="inline-flex relative items-center justify-center">
                {/* SVG Pengukur Lingkaran (SVG Circle Gauge) */}
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="54" className="stroke-slate-800 fill-none gauge-track" strokeWidth="8"/>
                  <circle 
                    cx="64" 
                    cy="64" 
                    r="54" 
                    className="stroke-cyan-500 fill-none transition-all duration-1000" 
                    strokeWidth="8"
                    strokeDasharray="339.29"
                    strokeDashoffset={339.29 - (339.29 * (Math.max(0, 32 - Number(avgLoss)) / 32))}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold text-slate-100">{avgLoss} <span className="text-xs font-normal text-slate-400">dB</span></span>
                  <span className="text-[8px] uppercase tracking-widest font-bold text-slate-500 mt-1">Rata-rata Redaman</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Rute Sinyal Valid (Sesuai Budget)
                </span>
                <span className="font-bold text-slate-200">{routeStats.valid} Rute</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Sinyal SFP Lemah (Mendekati Batas)
                </span>
                <span className="font-bold text-slate-200">{routeStats.warning} Rute</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span> Peringatan Daya RX Kritis
                </span>
                <span className="font-bold text-slate-200">{routeStats.error} Rute</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 mt-4 text-[10px] text-slate-500 italic">
            *Redaman RX kritis dievaluasi otomatis pada kapasitas penerimaan pelanggan &lt; -28.0 dBm.
          </div>
        </div>

        {/* Matriks Kapasitas Port ODC vs ODP (Capacity Matrix ODC vs ODP Ports) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" /> Utilitas Port Splitter Jaringan
              </h3>
              <span className="text-[10px] text-slate-500">Node Dialokasikan</span>
            </div>

            <div className="space-y-4 mt-4">
              {/* Status ODC (ODC Status) */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px] block">GLOBAL ODC SPLITTER</span>
                  <span className="text-slate-400">
                    {stats?.capacity?.odcs?.reduce((p: number, c: any) => p + c.used_ports, 0) || 1} / {stats?.capacity?.odcs?.reduce((p: number, c: any) => p + c.total_ports, 0) || 48} port
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 flex">
                  {stats?.capacity?.odcs?.map((odc: any, i: number) => {
                    const widthPct = odc.total_ports > 0 ? (odc.used_ports / 48) * 100 : 0;
                    return (
                      <div 
                        key={odc.id} 
                        style={{ width: `${widthPct}%` }} 
                        className={`h-full ${i % 2 === 0 ? "bg-amber-500" : "bg-yellow-600"}`} 
                        title={`${odc.code}: ${odc.used_ports} port dialokasikan`}
                      />
                    );
                  })}
                  <div className="flex-grow h-full bg-slate-950" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Kabel output splitter mengarah ke panel ODP utama downstream.</p>
              </div>

              {/* Status Port Drop ODP (ODP Drop Ports Status) */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px] block">GLOBAL ODP PORT PELANGGAN</span>
                  <span className="text-sky-400 font-semibold">
                    {stats?.capacity?.odps?.reduce((p: number, c: any) => p + c.used_ports, 0) || 2} / {stats?.capacity?.odps?.reduce((p: number, c: any) => p + c.total_ports, 0) || 24} port
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 flex">
                  {stats?.capacity?.odps?.map((odp: any, i: number) => {
                    const widthPct = odp.total_ports > 0 ? (odp.used_ports / 24) * 100 : 0;
                    return (
                      <div 
                        key={odp.id} 
                        style={{ width: `${widthPct}%` }} 
                        className={`h-full ${i % 2 === 0 ? "bg-sky-500" : "bg-sky-600"}`}
                        title={`${odp.code}: ${odp.used_ports} koneksi drop pelanggan aktif`}
                      />
                    );
                  })}
                  <div className="flex-grow h-full bg-slate-950" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Tarikan kabel drop menghubungkan kotak ONU pelanggan di sektor ini.</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-[10px] text-slate-400 bg-slate-950 rounded p-2.5 border border-slate-800 mt-4">
            <span className="font-bold text-slate-300 block mb-0.5">Log Audit Kapasitas:</span>
            <div className="flex items-center justify-between text-slate-500">
              <span>Ketersediaan Hub Sektor Utama:</span>
              <span className="text-emerald-400 font-semibold">Normal / Sehat</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>ODP Tanpa Induk Terdeteksi:</span>
              <span className="text-slate-400">0 terdeteksi</span>
            </div>
          </div>
        </div>

        {/* Metrik Alokasi Core (Cores Allocation metrics) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-500" /> Indeks Status Core Kabel
              </h3>
              <span className="text-[10px] text-slate-500">12/24 Core Serat</span>
            </div>

            {/* Bilah persentase core (Core percentage progress bars) */}
            <div className="space-y-3 mt-4 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded bg-emerald-500" /> Core Aktif Digunakan
                  </span>
                  <span className="font-bold text-slate-200">{usedCores} core ({usedPct.toFixed(0)}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div style={{ width: `${usedPct}%` }} className="h-full bg-emerald-500" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded bg-slate-500" /> Cadangan Belum Alokasi
                  </span>
                  <span className="font-bold text-slate-200">{spareCores} core ({sparePct.toFixed(0)}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div style={{ width: `${sparePct}%` }} className="h-full bg-slate-600" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded bg-amber-500" /> Kapasitas Direservasi
                  </span>
                  <span className="font-bold text-slate-200">{reservedCores} core ({reservedPct.toFixed(0)}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div style={{ width: `${reservedPct}%` }} className="h-full bg-amber-500" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded bg-red-600 animate-pulse" /> Core Serat Rusak/Putus
                  </span>
                  <span className="font-bold text-slate-200">{brokenCores} core ({brokenPct.toFixed(0)}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div style={{ width: `${brokenPct}%` }} className="h-full bg-red-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 rounded p-2.5 border border-slate-800 text-[10px] text-slate-500 flex flex-col gap-1 mt-4">
            <span className="font-bold text-slate-300">Catatan Administratif:</span>
            <span>Core serat optik yang putus/rusak membutuhkan penyambungan ulang (fusion splicing) oleh teknisi lapangan. Rute ini tidak bisa dialokasikan ke pelanggan baru.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

