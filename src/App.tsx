import { useEffect, useState } from "react";
import axios from "axios";
import { SFP, ODC, ODP, ONU, FiberCable, FiberCore, SplicePoint, FiberCoreStatus } from "./types";



declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Impor submodul kustom
import Dashboard from "./components/Dashboard";
import GisMap from "./components/GisMap";
import AssetManager from "./components/AssetManager";
import TraceEngine from "./components/TraceEngine";
import CapacityPanel from "./components/CapacityPanel";
import RouteValidation from "./components/RouteValidation";
import TopologyViewer from "./components/TopologyViewer";

// Impor ikon
import {
  Compass,
  Layers,
  Settings,
  TrendingUp,
  CheckSquare,
  Binary,
  HelpCircle,
  Activity,
  ActivitySquare,
  AlertTriangle,
  Github,
  Sun,
  Moon
} from "lucide-react";

type GlobalTab = "DASHBOARD" | "MAP" | "ASSETS" | "TRACE" | "CAPACITY" | "TOPOLOGY" | "VALIDATION";

export default function App() {
  // Status tema: mode gelap atau terang (disimpan di localStorage)
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  // Tab aktif pada navigasi dashboard (Dashboard, Map, Assets, dll)
  const [activeTab, setActiveTab] = useState<GlobalTab>("DASHBOARD");

  // State penyimpanan data terpusat (Database Client State)
  const [sfps, setSfps] = useState<SFP[]>([]);
  const [odcs, setOdcs] = useState<ODC[]>([]);
  const [odps, setOdps] = useState<ODP[]>([]); // Menyimpan daftar kotak ODP
  const [onus, setOnus] = useState<ONU[]>([]);     // Menyimpan daftar ONU pelanggan
  const [cables, setCables] = useState<FiberCable[]>([]); // Menyimpan daftar kabel serat optik
  const [cores, setCores] = useState<FiberCore[]>([]);   // Menyimpan status core serat optik
  const [splices, setSplices] = useState<SplicePoint[]>([]); // Menyimpan daftar splice box sambungan
  const [dashboardStats, setDashboardStats] = useState<any>(null); // Menyimpan statistik ringkasan dashboard

  // State untuk penelusuran (trace) rute optik pada peta GIS (Highlighting jalur terpilih)
  const [tracedCableIds, setTracedCableIds] = useState<string[]>([]);
  const [tracedNodeIds, setTracedNodeIds] = useState<string[]>([]);
  const [activeTraceOnuCode, setActiveTraceOnuCode] = useState<string>("");

  // State untuk mengontrol pesan notifikasi pop-up (Toast alert)
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // State untuk mengontrol modal konfirmasi sebelum menghapus aset jaringan
  const [confirmModal, setConfirmModal] = useState<{
    onConfirm: () => Promise<void>;
    title: string;
    message: string;
  } | null>(null);

  // Pembungkus konfirmasi aman untuk menampilkan modal sebelum mengeksekusi aksi hapus
  const safeConfirm = (message: string, onConfirm: (() => Promise<void>) | (() => void), title = "Confirm Action") => {
    setConfirmModal({
      title,
      message,
      onConfirm: async () => {
        await Promise.resolve(onConfirm());
        setConfirmModal(null);
      }
    });
  };

  // Fungsi helper untuk menampilkan toast alert di bagian bawah layar
  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000); // Otomatis disembunyikan setelah 4 detik
  };

  // 1. Core API Sync Loaders: Sinkronisasi seluruh data aset secara konkuren dari backend
  const syncAllData = async () => {
    try {
      // Memanggil seluruh endpoint backend secara simultan menggunakan Promise.all
      // Jika salah satu endpoint gagal (status 500), Promise.all akan langsung memicu catch error
      const [rSfp, rOdc, rOdp, rOnu, rCable, rCore, rSplice, rStats] = await Promise.all([
        axios.get("/api/sfps"),
        axios.get("/api/odcs"),
        axios.get("/api/odps"),
        axios.get("/api/onus"),
        axios.get("/api/fiber-cables"),
        axios.get("/api/fiber-cores"),
        axios.get("/api/splice-points"),
        axios.get("/api/dashboard/stats")
      ]);

      // Mengisi data ke state masing-masing setelah pemuatan sukses
      setSfps(rSfp.data);
      setOdcs(rOdc.data);
      setOdps(rOdp.data);
      setOnus(rOnu.data);
      setCables(rCable.data);
      setCores(rCore.data);
      setSplices(rSplice.data);
      setDashboardStats(rStats.data);
    } catch (err) {
      console.error("API synchronize error", err);
      // Memicu toast error jika backend mati atau terjadi kesalahan database (seperti kolom hilang)
      showToast("Backend Server Communication Offline. Periksa koneksi port.", "error");
    }
  };

  // Sinkronisasi data sekali saja saat komponen pertama kali dimuat di browser
  useEffect(() => {
    syncAllData();
  }, []);

  // 2. Core CRUD operations wrappers (Fungsi pembungkus operasi tambah/edit/hapus aset)
  const handleAddSfp = async (data: any) => {
    try {
      const res = await axios.post("/api/sfps", data);
      showToast(`Registered OLT SFP module ${res.data.code} successfully!`);
      syncAllData();
    } catch (err) {
      showToast("Failed to create SFP asset.", "error");
    }
  };

  const handleUpdateSfp = async (id: string, data: any) => {
    try {
      await axios.put(`/api/sfps/${id}`, data);
      showToast("Updated GPON SFP transmitter power config.");
      syncAllData();
    } catch (err) {
      showToast("Failed to update SFP.", "error");
    }
  };

  const handleDeleteSfp = async (id: string) => {
    safeConfirm(
      "Hapus SFP? Semua rute kabel serat hilir yang terhubung akan terputus!",
      async () => {
        try {
          await axios.delete(`/api/sfps/${id}`);
          showToast("Unit pemancar SFP dikeluarkan dari skema jaringan.", "info");
          syncAllData();
        } catch (err) {
          showToast("Gagal menghapus SFP.", "error");
        }
      },
      "Hapus Modul SFP"
    );
  };

  const handleAddOdc = async (data: any) => {
    try {
      const sanitizedData = { ...data };
      if (sanitizedData.splitter_loss_db !== undefined) {
        sanitizedData.splitter_loss_db = Math.abs(sanitizedData.splitter_loss_db);
      }
      const res = await axios.post("/api/odcs", sanitizedData);
      showToast(`Mapped Splitter Cabinet ${res.data.code} on standard WGS84.`);
      syncAllData();
    } catch (err) {
      showToast("Failed to map ODC cabinet.", "error");
    }
  };

  const handleUpdateOdc = async (id: string, data: any) => {
    try {
      const sanitizedData = { ...data };
      if (sanitizedData.splitter_loss_db !== undefined) {
        sanitizedData.splitter_loss_db = Math.abs(sanitizedData.splitter_loss_db);
      }
      await axios.put(`/api/odcs/${id}`, sanitizedData);
      showToast("Modified Cabinet splitter insertion formulas.");
      syncAllData();
    } catch (err) {
      showToast("Failed to update Cabinet.", "error");
    }
  };

  const handleDeleteOdc = async (id: string) => {
    safeConfirm(
      "Pensiunkan kabinet ODC?",
      async () => {
        try {
          await axios.delete(`/api/odcs/${id}`);
          showToast("Kabinet dikeluarkan dari database pusat.", "info");
          syncAllData();
        } catch (err) {
          showToast("Gagal mempensiunkan kabinet.", "error");
        }
      },
      "Keluarkan Kabinet ODC"
    );
  };

  const handleAddOdp = async (data: any) => {
    try {
      const sanitizedData = { ...data };
      if (sanitizedData.splitter_loss_db !== undefined) {
        sanitizedData.splitter_loss_db = Math.abs(sanitizedData.splitter_loss_db);
      }
      const res = await axios.post("/api/odps", sanitizedData);
      showToast(`Registered Pole Drop Mount box ${res.data.code}.`);
      syncAllData();
    } catch (err) {
      showToast("Failed to setup ODP box.", "error");
    }
  };

  const handleUpdateOdp = async (id: string, data: any) => {
    try {
      const sanitizedData = { ...data };
      if (sanitizedData.splitter_loss_db !== undefined) {
        sanitizedData.splitter_loss_db = Math.abs(sanitizedData.splitter_loss_db);
      }
      await axios.put(`/api/odps/${id}`, sanitizedData);
      showToast("Saved pole splicing capacity registers.");
      syncAllData();
    } catch (err) {
      showToast("Failed to update ODP.", "error");
    }
  };

  const handleDeleteOdp = async (id: string) => {
    safeConfirm(
      "Keluarkan kotak ODP?",
      async () => {
        try {
          await axios.delete(`/api/odps/${id}`);
          showToast("Mengeluarkan kabinet tiang dari jalur aktif.", "info");
          syncAllData();
        } catch (err) {
          showToast("Gagal menghapus kotak ODP.", "error");
        }
      },
      "Keluarkan ODP"
    );
  };

  const handleAddOnu = async (data: any) => {
    try {
      const res = await axios.post("/api/onus", data);
      showToast(`Registered Active Subscriber GPON modem ${res.data.code}!`);
      syncAllData();
    } catch (err) {
      showToast("Failed to register subscriber ONU.", "error");
    }
  };

  const handleUpdateOnu = async (id: string, data: any) => {
    try {
      await axios.put(`/api/onus/${id}`, data);
      showToast("Subscriber GPON serial pairing updated.");
      syncAllData();
    } catch (err) {
      showToast("Failed to update subscriber ONT.", "error");
    }
  };

  const handleDeleteOnu = async (id: string) => {
    safeConfirm(
      "Hapus sambungan ONU pelanggan?",
      async () => {
        try {
          await axios.delete(`/api/onus/${id}`);
          showToast("Pelanggan dihapus dari database loop optik.", "info");
          syncAllData();
        } catch (err) {
          showToast("Gagal mematikan ONU.", "error");
        }
      },
      "Putuskan Koneksi ONU"
    );
  };

  const handleAddCable = async (data: any) => {
    try {
      const res = await axios.post("/api/fiber-cables", data);
      showToast(`Allocated physical cable ${res.data.cable_code} with 1 core glass strands.`);
      syncAllData();
      return res.data;
    } catch (err) {
      showToast("Failed to wire fiber cable.", "error");
      return null;
    }
  };

  const handleDeleteCable = async (id: string) => {
    safeConfirm(
      "Lepaskan kabel serat dari jalur pipa? Semua data inti glass core akan ikut hilang!",
      async () => {
        try {
          await axios.delete(`/api/fiber-cables/${id}`);
          showToast("Kabel serat optik fisik telah dilepas.", "info");
          syncAllData();
        } catch (err) {
          showToast("Gagal menghapus rute kabel.", "error");
        }
      },
      "Lepaskan Kabel Serat"
    );
  };

  const handleUpdateCable = async (id: string, data: any) => {
    try {
      await axios.put(`/api/fiber-cables/${id}`, data);
      showToast("Updated fiber cable configuration parameters.");
      syncAllData();
    } catch (err) {
      showToast("Failed to update fiber cable.", "error");
    }
  };

  const handleAddSplice = async (data: any) => {
    try {
      const res = await axios.post("/api/splice-points", data);
      showToast(`Registered physical joint splice enclosure ${res.data.splice_code}.`);
      syncAllData();
    } catch (err) {
      showToast("Failed to register joint enclosure.", "error");
    }
  };

  const handleUpdateSplice = async (id: string, data: any) => {
    try {
      await axios.put(`/api/splice-points/${id}`, data);
      showToast("Updated splice point core parameters.");
      syncAllData();
    } catch (err) {
      showToast("Failed to update splice point.", "error");
    }
  };

  const handleDeleteSplice = async (id: string) => {
    safeConfirm(
      "Hapus kotak splice sambungan?",
      async () => {
        try {
          await axios.delete(`/api/splice-points/${id}`);
          showToast("Sambungan splice dihapus dari direktori GIS.", "info");
          syncAllData();
        } catch (err) {
          showToast("Gagal menghapus titik splice.", "error");
        }
      },
      "Hapus Enklosur Splice"
    );
  };

  const handleUpdateCoreStatus = async (coreId: string, status: FiberCoreStatus) => {
    try {
      await axios.patch(`/api/fiber-cores/${coreId}`, { status });
      syncAllData();
    } catch (err) {
      showToast("Failed to update Core configuration.", "error");
    }
  };

  // Penangan Pelacakan Terkoordinasi: sorotan (highlighting) lintas tampilan tab
  const handleOnuTraceCallback = (cableIds: string[], nodeIds: string[], activeOnuCode: string) => {
    setTracedCableIds(cableIds);
    setTracedNodeIds(nodeIds);
    setActiveTraceOnuCode(activeOnuCode);
  };

  // Pemicu tautan draf otomatis interaktif peta
  // Rumus Haversine untuk menghitung jarak antara koordinat dalam kilometer
  const calculatePathLength = (coords: [number, number][]): number => {
    let totalDist = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lat1, lon1] = coords[i];
      const [lat2, lon2] = coords[i + 1];
      
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDist += R * c;
    }
    return Number(totalDist.toFixed(3)); // dibulatkan ke presisi meter
  };

  const handleMapAddCable = async (fromType: string, fromId: string, toType: string, toId: string, vertices: [number, number][]) => {
    // Periksa apakah kabel sudah ada di antara kedua node ini untuk mencegah koneksi ganda
    const duplicate = cables.find(c =>
      (c.from_node_id === fromId && c.to_node_id === toId) ||
      (c.from_node_id === toId && c.to_node_id === fromId)
    );

    if (duplicate) {
      showToast("Kabel sudah terhubung antara kedua perangkat ini!", "error");
      return null;
    }

    // Hasilkan nilai draf berdasarkan tipe perangkat
    const fromNodePos = findNodePos(fromType, fromId);
    const toNodePos = findNodePos(toType, toId);

    // Buat garis geometri multi-koordinat yang mewakili belokan
    const geometry_line = [fromNodePos, ...vertices, toNodePos];

    // Hitung panjang default dinamis berdasarkan belokan jalur yang digambar!
    const length_km = calculatePathLength(geometry_line);

    const data = {
      cable_code: `CAB-DRAFT-${Math.floor(Math.random() * 1000)}`,
      cable_name: `Assisted Draft: ${fromType} to ${toType} segment`,
      from_node_type: fromType,
      from_node_id: fromId,
      to_node_type: toType,
      to_node_id: toId,
      length_km: length_km > 0 ? length_km : 0.05,
      total_cores: 1,
      cable_type: "Single-mode G.652D",
      splice_count: 0,
      lat1: fromNodePos[0],
      lon1: fromNodePos[1],
      lat2: toNodePos[0],
      lon2: toNodePos[1],
      description: "Interactively mapped via GIS vector coordinate assistant.",
      geometry_line
    };

    return await handleAddCable(data);
  };

  const findNodePos = (type: string, id: string): [number, number] => {
    if (type === "SFP") {
      const match = sfps.find(x => x.id === id);
      return match ? [match.latitude, match.longitude] : [37.777, -122.414];
    } else if (type === "ODC") {
      const match = odcs.find(x => x.id === id);
      return match ? [match.latitude, match.longitude] : [37.777, -122.414];
    } else if (type === "ODP") {
      const match = odps.find(x => x.id === id);
      return match ? [match.latitude, match.longitude] : [37.777, -122.414];
    } else if (type === "ONU") {
      const match = onus.find(x => x.id === id);
      return match ? [match.latitude, match.longitude] : [37.777, -122.414];
    } else if (type === "SPLICE") {
      const match = splices.find(x => x.id === id);
      return match ? [match.latitude, match.longitude] : [37.777, -122.414];
    }
    return [37.777, -122.414];
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans tracking-tight selection:bg-cyan-500 selection:text-slate-950 ${theme === "light" ? "light-mode" : ""}`}>

      {/* HUD Notifikasi Toast Dinamis */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-[9999] py-3 px-5 rounded-xl border flex items-center gap-3 shadow-2xl text-xs font-semibold animate-bounce ${toastMsg.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300" :
            toastMsg.type === "error" ? "bg-red-950/90 border-red-500/30 text-red-300" :
              "bg-indigo-950/90 border-indigo-500/30 text-indigo-300"
          }`}>
          {toastMsg.type === "error" ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Activity className="w-4 h-4 animate-pulse" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Utama */}
      <header className={`py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b transition-all ${theme === "light"
          ? "bg-white border-slate-200 text-slate-900 shadow-sm"
          : "bg-[#1c1c24] border-slate-800 text-slate-100"
        }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-xl shadow-lg shadow-cyan-900/20 text-white">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className={`text-sm font-black uppercase tracking-wider ${theme === "light" ? "text-slate-800" : "text-white"}`}>Pemetaan Jaringan FTTH</h1>
            <p className={`text-[10px] font-bold tracking-widest uppercase ${theme === "light" ? "text-[#5c67f2]" : "text-cyan-400"}`}>Peta GIS &amp; Ledger Analisis Redaman Optik</p>
          </div>
        </div>

        {/* Bar Kontrol Tab Global */}
        <div className={`flex items-center flex-wrap gap-1 p-1 rounded-lg border transition-all ${theme === "light"
            ? "bg-slate-100 border-slate-200"
            : "bg-slate-950 border-slate-850"
          }`}>
          {/* Tombol Pengalih Mode Terang/Gelap */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded cursor-pointer flex items-center justify-center transition-all mr-1 border-none bg-transparent ${theme === "light"
                ? "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
          </button>

          {([
            { id: "DASHBOARD", label: "Dashboard", icon: TrendingUp },
            { id: "MAP", label: "Peta GIS", icon: Layers },
            { id: "ASSETS", label: "Inventaris Aset", icon: Settings },
            { id: "TRACE", label: "Pelacakan Optik", icon: Binary },
            { id: "CAPACITY", label: "Kapasitas Core", icon: CheckSquare },
            { id: "TOPOLOGY", label: "Grafik Topologi", icon: ActivitySquare },
            { id: "VALIDATION", label: "Validasi Rute", icon: AlertTriangle }
          ] as const).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as GlobalTab);
                  if (tab.id !== "TRACE" && tab.id !== "MAP") {
                    // Turn off path glows when leaving GIS contexts
                    setTracedCableIds([]);
                    setTracedNodeIds([]);
                    setActiveTraceOnuCode("");
                  }
                }}
                className={`py-1.5 px-3 rounded text-[11px] font-bold uppercase cursor-pointer flex items-center gap-1.5 transition-all ${activeTab === tab.id
                    ? (theme === "light"
                        ? "bg-white border border-white shadow-sm"
                        : "bg-white border border-white shadow-md")
                    : (theme === "light"
                        ? "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900")
                  }`}
                style={activeTab === tab.id ? { color: theme === "light" ? "#0f172a" : "#13131a" } : undefined}
              >
                <Icon className="w-3.5 h-3.5" style={activeTab === tab.id ? { color: theme === "light" ? "#0f172a" : "#13131a" } : undefined} />
                <span style={activeTab === tab.id ? { color: theme === "light" ? "#0f172a" : "#13131a" } : undefined}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Kontainer Utama Viewport */}
      <main className="flex-grow p-6 max-w-7xl mx-auto w-full space-y-6">

        {activeTab === "DASHBOARD" && (
          <Dashboard
            sfps={sfps}
            odcs={odcs}
            odps={odps}
            onus={onus}
            cables={cables}
            splices={splices}
            cores={cores}
            stats={dashboardStats}
          />
        )}

        {activeTab === "MAP" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-slate-900">
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Viewport GIS Kartografi WGS84</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Aktifkan lapisan katalog dan pilih node untuk melacak anggaran sinyal.</p>
              </div>

              {activeTraceOnuCode && (
                <button
                  onClick={() => {
                    setTracedCableIds([]);
                    setTracedNodeIds([]);
                    setActiveTraceOnuCode("");
                  }}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-[10px] py-1 px-3 rounded-lg cursor-pointer"
                >
                  Bersihkan jalur terpilih
                </button>
              )}
            </div>

            <GisMap
              sfps={sfps}
              odcs={odcs}
              odps={odps}
              onus={onus}
              splices={splices}
              cables={cables}
              tracedCableIds={tracedCableIds}
              tracedNodeIds={tracedNodeIds}
              activeTraceOnu={activeTraceOnuCode}
              onAddCableClick={handleMapAddCable}
              onAddSfp={handleAddSfp}
              onUpdateSfp={handleUpdateSfp}
              onDeleteSfp={handleDeleteSfp}
              onAddOdc={handleAddOdc}
              onUpdateOdc={handleUpdateOdc}
              onDeleteOdc={handleDeleteOdc}
              onAddOdp={handleAddOdp}
              onUpdateOdp={handleUpdateOdp}
              onDeleteOdp={handleDeleteOdp}
              onAddOnu={handleAddOnu}
              onUpdateOnu={handleUpdateOnu}
              onDeleteOnu={handleDeleteOnu}
              onAddSplice={handleAddSplice}
              onUpdateSplice={handleUpdateSplice}
              onDeleteSplice={handleDeleteSplice}
              onDeleteCable={handleDeleteCable}
              onUpdateCable={handleUpdateCable}
            />
          </div>
        )}

        {activeTab === "ASSETS" && (
          <AssetManager
            sfps={sfps}
            odcs={odcs}
            odps={odps}
            onus={onus}
            cables={cables}
            splices={splices}
            onAddSfp={handleAddSfp}
            onUpdateSfp={handleUpdateSfp}
            onDeleteSfp={handleDeleteSfp}
            onAddOdc={handleAddOdc}
            onUpdateOdc={handleUpdateOdc}
            onDeleteOdc={handleDeleteOdc}
            onAddOdp={handleAddOdp}
            onUpdateOdp={handleUpdateOdp}
            onDeleteOdp={handleDeleteOdp}
            onAddOnu={handleAddOnu}
            onUpdateOnu={handleUpdateOnu}
            onDeleteOnu={handleDeleteOnu}
            onAddCable={handleAddCable}
            onDeleteCable={handleDeleteCable}
            onAddSplice={handleAddSplice}
            onDeleteSplice={handleDeleteSplice}
          />
        )}

        {activeTab === "TRACE" && (
          <TraceEngine
            onus={onus}
            onTraceResult={handleOnuTraceCallback}
          />
        )}

        {activeTab === "CAPACITY" && (
          <CapacityPanel
            odcs={odcs}
            odps={odps}
            onus={onus}
            cables={cables}
            cores={cores}
            onUpdateCoreStatus={handleUpdateCoreStatus}
          />
        )}

        {activeTab === "TOPOLOGY" && (
          <TopologyViewer
            sfps={sfps}
            odcs={odcs}
            odps={odps}
            onus={onus}
            cables={cables}
            theme={theme}
          />
        )}

        {activeTab === "VALIDATION" && (
          <RouteValidation
            sfps={sfps}
            odcs={odcs}
            odps={odps}
            onus={onus}
            cables={cables}
            cores={cores}
          />
        )}

      </main>

      {/* Modal Konfirmasi Kustom */}
      {confirmModal && (
        <div id="confirm-modal" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] px-4 w-full max-w-sm">
          <div className="bg-slate-900/95 backdrop-blur-md border border-red-500/20 rounded-xl shadow-2xl shadow-slate-950/85 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-red-950/60 border border-red-500/30 rounded-lg text-red-500 shrink-0">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex-grow">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">{confirmModal.title}</h3>
                <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed font-medium">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold uppercase rounded text-[9px] transition-all cursor-pointer border border-slate-700/40"
              >
                Batal
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold uppercase rounded text-[9px] transition-all cursor-pointer shadow-lg shadow-red-900/20"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Kredit dan Spesifikasi Sistem */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 py-4 px-6 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-slate-600 animate-pulse" />
          <span>Modul Web GIS Mandiri v1.0.0 | Konteks Sesi Admin Tunggal</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span>Spesifikasi Serat G.657 GPON Sesuai</span>
          <span>&middot;</span>
          <span>Definisi Siap MySql + PostGIS Dimuat</span>
        </div>
      </footer>
    </div>
  );
}
