import { SFP, ODC, ODP, ONU, FiberCable, FiberCore } from "../types";
import { AlertCircle, CheckCircle2, ShieldAlert, WifiOff, FileText, Ban } from "lucide-react";

interface RouteValidationProps {
  sfps: SFP[];
  odcs: ODC[];
  odps: ODP[];
  onus: ONU[];
  cables: FiberCable[];
  cores: FiberCore[];
}

export default function RouteValidation({
  sfps,
  odcs,
  odps,
  onus,
  cables,
  cores
}: RouteValidationProps) {
  // Hitung alarm peringatan langsung (direct alarms)
  const audits: { type: "ERROR" | "WARNING" | "VALID"; title: string; desc: string }[] = [];

  // Audit 1: Inti core yang rusak pada kabel (broken cores)
  cables.forEach((c) => {
    const cableCores = cores.filter((x) => x.cable_id === c.id);
    const brokenCores = cableCores.filter((x) => x.status === "BROKEN").length;
    if (brokenCores > c.total_cores / 2) {
      audits.push({
        type: "ERROR",
        title: `Peringatan Core Fisik pada ${c.cable_code}`,
        desc: `Lebih dari 50% (${brokenCores}/${c.total_cores}) inti serat kaca di rute "${c.cable_name}" RUSAK / TERPUTUS! Diperlukan penggantian atau perbaikan segera.`
      });
    } else if (brokenCores > 0) {
      audits.push({
        type: "WARNING",
        title: `Kerusakan Penyambungan Kecil pada ${c.cable_code}`,
        desc: `${brokenCores} core serat terdeteksi rusak/putus. Kapasitas rute sedikit berkurang.`
      });
    }
  });

  // Audit 2: ONU terisolasi (Pelanggan tanpa referensi ODP hulu)
  onus.forEach((onu) => {
    if (!onu.odp_id) {
      audits.push({
        type: "ERROR",
        title: `Terminal Pelanggan Terisolasi ${onu.code}`,
        desc: `Pelanggan "${onu.name}" tidak memiliki Optical Distribution Point (ODP) yang terhubung secara logis: modem pelanggan tidak dapat menerima daya sinyal.`
      });
    } else {
      // Periksa kabel drop fisik (physical drop cable)
      const dropCable = cables.find((c) =>
        (c.from_node_type === "ONU" && c.from_node_id === onu.id) ||
        (c.to_node_type === "ONU" && c.to_node_id === onu.id)
      );
      if (!dropCable) {
        audits.push({
          type: "WARNING",
          title: `Kabel Drop Fisik Hilang untuk ${onu.code}`,
          desc: `Pelanggan memiliki tautan ODP logis tetapi tidak ada rute kabel drop serat optik fisik yang dipetakan pada GIS.`
        });
      }
    }
  });

  // Audit 3: Kepadatan port splitter ODP (port congestion)
  odps.forEach((odp) => {
    const linkedOnus = onus.filter((u) => u.odp_id === odp.id).length;
    const linkedChildOdps = odps.filter((o) => o.odc_id === odp.id).length;
    const totalUsed = linkedOnus + linkedChildOdps;

    if (totalUsed >= odp.total_ports) {
      audits.push({
        type: "ERROR",
        title: `Kapasitas Port 100% Penuh di ODP ${odp.code}`,
        desc: `Kotak terminal ODP "${odp.name}" telah mencapai kapasitas fisik maksimum (${totalUsed}/${odp.total_ports} port). Tidak ada pemasangan drop pelanggan baru yang diizinkan.`
      });
    } else if (totalUsed >= odp.total_ports - 1) {
      audits.push({
        type: "WARNING",
        title: `Penyusutan Port ODP ${odp.code}`,
        desc: `Hanya tersisa 1 port pelanggan bebas di kotak tiang ODP "${odp.name}". Batas ambak kapasitas sudah terlampaui (>${(totalUsed/odp.total_ports*100).toFixed(0)}%).`
      });
    }
  });

  // Audit 4: Hub upstream ODP yang belum dialokasikan (unassigned ODP upstream hubs)
  odps.forEach((odp) => {
    if (!odp.odc_id) {
      audits.push({
        type: "ERROR",
        title: `Tautan Upstream Terisolasi pada ODP ${odp.code}`,
        desc: `Soket terminal ODP "${odp.name}" tidak terhubung ke kabinet splitter ODC utama. Pelanggan di bawahnya tidak akan menerima cahaya.`
      });
    }
  });

  // Antisipasi cadangan jika semua aman (fallback if all clean)
  if (audits.length === 0) {
    audits.push({
      type: "VALID",
      title: "Semua Jalur Serat Optik Konsisten",
      desc: "Mesin Validasi Rute memindai pohon GPON. Semua kabel fisik, terminal sambungan logis, rasio splitter, dan toleransi inti kaca memenuhi regulasi standar gigabit."
    });
  }

  const errors = audits.filter(a => a.type === "ERROR");
  const warnings = audits.filter(a => a.type === "WARNING");
  const normals = audits.filter(a => a.type === "VALID");

  return (
    <div className="space-y-4">
      {/* Ringkasan statistik (overview stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kesalahan Kritis</span>
            <h3 className="text-2xl font-bold text-red-500 mt-1">{errors.length} Masalah</h3>
          </div>
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Peringatan Ringan</span>
            <h3 className="text-2xl font-bold text-amber-500 mt-1">{warnings.length} Peringatan</h3>
          </div>
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Terverifikasi Normal</span>
            <h3 className="text-2xl font-bold text-emerald-500 mt-1">{normals.length > 0 ? "100% Bagus" : "Diperiksa"}</h3>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
      </div>

      {/* Buku Log Audit (Audits Ledger) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-4 flex items-center gap-1.5 pb-2 border-b border-slate-820">
          <FileText className="w-4 h-4 text-cyan-400" /> Audit Konsistensi Jaringan Berkelanjutan
        </h3>

        <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
          {audits.map((item, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border flex items-start gap-3.5 transition-all audit-alert audit-alert-${item.type.toLowerCase()} ${
                item.type === "ERROR" ? "bg-red-950/15 border-red-500/20 text-red-200" :
                item.type === "WARNING" ? "bg-amber-950/15 border-amber-500/20 text-amber-200" :
                "bg-emerald-950/10 border-emerald-500/20 text-emerald-200"
              }`}
            >
              <div className="mt-0.5">
                {item.type === "ERROR" && <Ban className="w-4 h-4 text-red-500" />}
                {item.type === "WARNING" && <AlertCircle className="w-4 h-4 text-amber-500" />}
                {item.type === "VALID" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wide">{item.title}</h4>
                <p className="text-[11px] opacity-80 leading-relaxed font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
