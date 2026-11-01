import React, { useState } from "react";
import { SFP, ODC, ODP, ONU, FiberCable, SplicePoint } from "../types";
import { Plus, Trash2, Edit2, Search, Sliders, MapPin, Radio, Key, Link } from "lucide-react";

interface AssetManagerProps {
  sfps: SFP[];
  odcs: ODC[];
  odps: ODP[];
  onus: ONU[];
  cables: FiberCable[];
  splices: SplicePoint[];
  onAddSfp: (data: any) => void;
  onUpdateSfp: (id: string, data: any) => void;
  onDeleteSfp: (id: string) => void;
  onAddOdc: (data: any) => void;
  onUpdateOdc: (id: string, data: any) => void;
  onDeleteOdc: (id: string) => void;
  onAddOdp: (data: any) => void;
  onUpdateOdp: (id: string, data: any) => void;
  onDeleteOdp: (id: string) => void;
  onAddOnu: (data: any) => void;
  onUpdateOnu: (id: string, data: any) => void;
  onDeleteOnu: (id: string) => void;
  onAddCable: (data: any) => void;
  onDeleteCable: (id: string) => void;
  onAddSplice: (data: any) => void;
  onDeleteSplice: (id: string) => void;
}

type TabType = "SFP" | "ODC" | "ODP" | "ONU" | "CABLE" | "SPLICE";

export default function AssetManager({
  sfps,
  odcs,
  odps,
  onus,
  cables,
  splices,
  onAddSfp,
  onUpdateSfp,
  onDeleteSfp,
  onAddOdc,
  onUpdateOdc,
  onDeleteOdc,
  onAddOdp,
  onUpdateOdp,
  onDeleteOdp,
  onAddOnu,
  onUpdateOnu,
  onDeleteOnu,
  onAddCable,
  onDeleteCable,
  onAddSplice,
  onDeleteSplice
}: AssetManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("SFP");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fungsi pembantu untuk mencari SFP induk dengan menyusuri rute kabel serat optik dari ODC
  const findParentSfp = (odcId: string): any | null => {
    const visited = new Set<string>();
    const queue = [odcId];
    visited.add(odcId);

    while (queue.length > 0) {
      const currNodeId = queue.shift()!;
      for (const cable of cables) {
        let neighborId = "";
        let neighborType = "";

        if (cable.from_node_id === currNodeId) {
          neighborId = cable.to_node_id;
          neighborType = cable.to_node_type;
        } else if (cable.to_node_id === currNodeId) {
          neighborId = cable.from_node_id;
          neighborType = cable.from_node_type;
        } else {
          continue;
        }

        if (neighborType === "SFP") {
          const sfp = sfps.find(s => s.id === neighborId);
          if (sfp) return sfp;
        }

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          if (neighborType === "SPLICE") {
            queue.push(neighborId);
          }
        }
      }
    }
    return null;
  };

  // State untuk formulir input (form states)
  const [sfpForm, setSfpForm] = useState({ code: "", name: "", slot: 1, port: 1, tx_power_dbm: 3.0, latitude: 37.7770, longitude: -122.4140, description: "" });
  const [odcForm, setOdcForm] = useState({ code: "", name: "", latitude: 37.7775, longitude: -122.4135, total_ports: 32, splitter_type: "1:16", splitter_loss_db: 13.80, description: "" });
  const [odpForm, setOdpForm] = useState({ code: "", name: "", latitude: 37.7780, longitude: -122.4130, odc_id: "", total_ports: 8, splitter_loss_db: 10.30, description: "" });
  const [onuForm, setOnuForm] = useState({ code: "", name: "", customer_id: "", remote_address: "", latitude: 37.7785, longitude: -122.4125, odp_id: "", description: "" });
  const [cableForm, setCableForm] = useState({ cable_code: "", cable_name: "", from_node_type: "SFP" as any, from_node_id: "", to_node_type: "ODC" as any, to_node_id: "", length_km: 250, total_cores: 1, cable_type: "Single-mode G.652D", lat1: 37.7750, lon1: -122.4180, lat2: 37.7770, lon2: -122.4150, description: "" });
  const [spliceForm, setSpliceForm] = useState({ splice_code: "", splice_name: "", latitude: 37.7760, longitude: -122.4160, splice_type: "Fusion Splice" as any, loss_db: 0.03, cable_id: "", description: "" });

  const clearForms = () => {
    setSfpForm({ code: "", name: "", slot: 1, port: 1, tx_power_dbm: 3.0, latitude: 37.7770, longitude: -122.4140, description: "" });
    setOdcForm({ code: "", name: "", latitude: 37.7775, longitude: -122.4135, total_ports: 32, splitter_type: "1:16", splitter_loss_db: 13.80, description: "" });
    setOdpForm({ code: "", name: "", latitude: 37.7780, longitude: -122.4130, odc_id: "", total_ports: 8, splitter_loss_db: 10.30, description: "" });
    setOnuForm({ code: "", name: "", customer_id: "", remote_address: "", latitude: 37.7785, longitude: -122.4125, odp_id: "", description: "" });
    setCableForm({ cable_code: "", cable_name: "", from_node_type: "SFP", from_node_id: "", to_node_type: "ODC", to_node_id: "", length_km: 250, total_cores: 1, cable_type: "Single-mode G.652D", lat1: 37.7750, lon1: -122.4180, lat2: 37.7770, lon2: -122.4150, description: "" });
    setSpliceForm({ splice_code: "", splice_name: "", latitude: 37.7760, longitude: -122.4160, splice_type: "Fusion Splice", loss_db: 0.03, cable_id: "", description: "" });
    setEditingId(null);
  };

  const handleEdit = (type: TabType, item: any) => {
    setEditingId(item.id);
    setShowAddForm(true);
    if (type === "SFP") {
      setSfpForm({ ...item });
    } else if (type === "ODC") {
      setOdcForm({ ...item });
    } else if (type === "ODP") {
      setOdpForm({ ...item });
    } else if (type === "ONU") {
      setOnuForm({ ...item });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "SFP") {
      if (editingId) {
        onUpdateSfp(editingId, sfpForm);
      } else {
        onAddSfp(sfpForm);
      }
    } else if (activeTab === "ODC") {
      if (editingId) {
        onUpdateOdc(editingId, odcForm);
      } else {
        onAddOdc(odcForm);
      }
    } else if (activeTab === "ODP") {
      if (editingId) {
        onUpdateOdp(editingId, odpForm);
      } else {
        onAddOdp(odpForm);
      }
    } else if (activeTab === "ONU") {
      if (editingId) {
        onUpdateOnu(editingId, onuForm);
      } else {
        onAddOnu(onuForm);
      }
    } else if (activeTab === "CABLE") {
      // Build geometry line array from the two sets of lat/lon
      const geometry_line = [
        [Number(cableForm.lat1), Number(cableForm.lon1)],
        [Number(cableForm.lat2), Number(cableForm.lon2)]
      ];
      onAddCable({ ...cableForm, length_km: cableForm.length_km / 1000, geometry_line });
    } else if (activeTab === "SPLICE") {
      onAddSplice(spliceForm);
    }
    setShowAddForm(false);
    clearForms();
  };

  const getSfpList = () => sfps.filter(x => x.name.toLowerCase().includes(searchTerm.toLowerCase()) || x.code.toLowerCase().includes(searchTerm.toLowerCase()));
  const getOdcList = () => odcs.filter(x => x.name.toLowerCase().includes(searchTerm.toLowerCase()) || x.code.toLowerCase().includes(searchTerm.toLowerCase()));
  const getOdpList = () => odps.filter(x => x.name.toLowerCase().includes(searchTerm.toLowerCase()) || x.code.toLowerCase().includes(searchTerm.toLowerCase()));
  const getOnuList = () => onus.filter(x => x.name.toLowerCase().includes(searchTerm.toLowerCase()) || x.code.toLowerCase().includes(searchTerm.toLowerCase()));
  const getCableList = () => cables.filter(x => x.cable_name.toLowerCase().includes(searchTerm.toLowerCase()) || x.cable_code.toLowerCase().includes(searchTerm.toLowerCase()));
  const getSpliceList = () => splices.filter(x => x.splice_name.toLowerCase().includes(searchTerm.toLowerCase()) || x.splice_code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-4 min-h-[480px]">
      {/* Sidebar Navigation */}
      <div className="border-r border-slate-800 bg-slate-950/40 p-4 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inventaris Map</h3>
          <p className="text-[10px] text-slate-500 mt-1">Pencatatan Fisik FTTH</p>
        </div>

        <nav className="flex flex-col gap-1.5">
          {([
            { id: "SFP", label: "Pemancar SFP Pusat", count: sfps.length, color: "bg-rose-500" },
            { id: "ODC", label: "Hub ODC Utama", count: odcs.length, color: "bg-amber-500" },
            { id: "ODP", label: "Kotak ODP Cabang", count: odps.length, color: "bg-sky-500" },
            { id: "ONU", label: "ONU Pelanggan", count: onus.length, color: "bg-emerald-500" },
            { id: "CABLE", label: "Kabel Serat Optic", count: cables.length, color: "bg-cyan-500" },
            { id: "SPLICE", label: "Kotak Sambungan (Splice)", count: splices.length, color: "bg-yellow-500" }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm("");
                setShowAddForm(false);
                clearForms();
              }}
              className={`w-full text-left py-2 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${activeTab === tab.id ? "bg-slate-800 text-white shadow" : "bg-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${tab.color}`} />
                <span>{tab.label}</span>
              </div>
              <span className="text-[9px] bg-slate-950 text-slate-400 py-0.5 px-1.5 rounded-full border border-slate-850 font-bold">{tab.count}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Ledger Content */}
      <div className="lg:col-span-3 p-5 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {activeTab === "SFP" && "Modul Port Optik OLT"}
                {activeTab === "ODC" && "Daftar Kabinet ODC Utama"}
                {activeTab === "ODP" && "Terminal Box ODP Optik"}
                {activeTab === "ONU" && "Modem Serat Pelanggan (ONU)"}
                {activeTab === "CABLE" && "Rentang Rute Kabel Serat"}
                {activeTab === "SPLICE" && "Titik Sambung Sambungan (Splice)"}
              </h2>
              <p className="text-[10px] text-slate-500">Pengaturan hubungan fisik dan inventaris</p>
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code / name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-950 text-xs text-slate-300 py-1.5 pl-8 pr-3 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 w-44"
                />
              </div>

              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  clearForms();
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? "View Table" : "Add Asset"}</span>
              </button>
            </div>
          </div>

          {/* Form Overlay Panels */}
          {showAddForm ? (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 max-h-[420px] overflow-y-auto">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">
                {editingId ? "Update Existing Asset Attributes" : "Register a Brand New Network Asset"}
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SFP FORM */}
                {activeTab === "SFP" && (
                  <>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Optical Frame Code</label>
                      <input required type="text" placeholder="e.g. SFP-CO-302" value={sfpForm.code} onChange={e => setSfpForm({ ...sfpForm, code: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Transmitter Name</label>
                      <input required type="text" placeholder="e.g. Primary Port 4" value={sfpForm.name} onChange={e => setSfpForm({ ...sfpForm, name: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">OLT Rack Slot Index</label>
                      <input required type="number" min={1} value={sfpForm.slot} onChange={e => setSfpForm({ ...sfpForm, slot: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Port Index</label>
                      <input required type="number" min={1} value={sfpForm.port} onChange={e => setSfpForm({ ...sfpForm, port: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Transmit Lasers Power (dBm)</label>
                      <input required type="number" step="0.1" value={sfpForm.tx_power_dbm} onChange={e => setSfpForm({ ...sfpForm, tx_power_dbm: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">GPS Lat</label>
                        <input required type="number" step="0.0001" value={sfpForm.latitude} onChange={e => setSfpForm({ ...sfpForm, latitude: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">GPS Lon</label>
                        <input required type="number" step="0.0001" value={sfpForm.longitude} onChange={e => setSfpForm({ ...sfpForm, longitude: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Asset Description</label>
                      <textarea value={sfpForm.description} onChange={e => setSfpForm({ ...sfpForm, description: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full h-12" />
                    </div>
                  </>
                )}

                {/* ODC FORM */}
                {activeTab === "ODC" && (
                  <>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cabinet Code</label>
                      <input required type="text" placeholder="e.g. ODC-HUB-04" value={odcForm.code} onChange={e => setOdcForm({ ...odcForm, code: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cabinet Name</label>
                      <input required type="text" placeholder="e.g. block cabinet 10" value={odcForm.name} onChange={e => setOdcForm({ ...odcForm, name: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Theoretical Split Type</label>
                      <select value={odcForm.splitter_type} onChange={e => {
                        const loss = e.target.value === "1:32" ? 17.20 : (e.target.value === "1:16" ? 13.80 : 10.50);
                        setOdcForm({ ...odcForm, splitter_type: e.target.value, splitter_loss_db: loss });
                      }} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full">
                        <option value="1:8">1:8 Split (Loss ~10.5 dB)</option>
                        <option value="1:16">1:16 Split (Loss ~13.8 dB)</option>
                        <option value="1:32">1:32 Split (Loss ~17.2 dB)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Splitter Loss (dB)</label>
                      <input required type="number" step="0.01" value={odcForm.splitter_loss_db} onChange={e => setOdcForm({ ...odcForm, splitter_loss_db: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    {editingId && (() => {
                      const parentSfp = findParentSfp(editingId);
                      if (!parentSfp) return null;
                      const txPower = parentSfp.tx_power_dbm;
                      const estimatedSignal = txPower - odcForm.splitter_loss_db;
                      return (
                        <div>
                          <label className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Total Redaman (dBm)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={Number(estimatedSignal.toFixed(2))}
                            onChange={(e) => {
                              const newEst = Number(e.target.value);
                              const newLoss = txPower - newEst;
                              setOdcForm({ ...odcForm, splitter_loss_db: Number(newLoss.toFixed(2)) });
                            }}
                            className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-emerald-400 font-bold font-mono w-full focus:outline-none focus:border-emerald-500"
                            placeholder="Total Redaman"
                          />
                          <span className="text-[9px] text-slate-500 block italic leading-tight mt-1">
                            Mengubah kolom ini otomatis mengubah Splitter Loss (dB) dengan rumus: <span className="font-mono">Tx Power ({txPower.toFixed(2)} dBm) - Total Redaman</span>.
                          </span>
                        </div>
                      );
                    })()}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Output Splitter Ports</label>
                      <input required type="number" step="1" value={odcForm.total_ports} onChange={e => setOdcForm({ ...odcForm, total_ports: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">GPS Lat</label>
                        <input required type="number" step="0.0001" value={odcForm.latitude} onChange={e => setOdcForm({ ...odcForm, latitude: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">GPS Lon</label>
                        <input required type="number" step="0.0001" value={odcForm.longitude} onChange={e => setOdcForm({ ...odcForm, longitude: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                    </div>
                  </>
                )}

                {/* ODP FORM */}
                {activeTab === "ODP" && (
                  <>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ODP Box Code</label>
                      <input required type="text" placeholder="e.g. ODP-POLE-120" value={odpForm.code} onChange={e => setOdpForm({ ...odpForm, code: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ODP Box Name</label>
                      <input required type="text" placeholder="e.g. Pole terminal box" value={odpForm.name} onChange={e => setOdpForm({ ...odpForm, name: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Parent ODC Hub Cabinet</label>
                      <select value={odpForm.odc_id} onChange={e => setOdpForm({ ...odpForm, odc_id: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full">
                        <option value="">-- Choose Cabinet --</option>
                        {odcs.map(o => <option key={o.id} value={o.id}>{o.code} - {o.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Subscriber Splice Ports</label>
                      <input required type="number" step="1" value={odpForm.total_ports} onChange={e => setOdpForm({ ...odpForm, total_ports: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Splitter Loss (dB)</label>
                      <input required type="number" step="0.01" value={odpForm.splitter_loss_db} onChange={e => setOdpForm({ ...odpForm, splitter_loss_db: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">GPS Lat</label>
                        <input required type="number" step="0.0001" value={odpForm.latitude} onChange={e => setOdpForm({ ...odpForm, latitude: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">GPS Lon</label>
                        <input required type="number" step="0.0001" value={odpForm.longitude} onChange={e => setOdpForm({ ...odpForm, longitude: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                    </div>
                  </>
                )}

                {/* ONU FORM */}
                {activeTab === "ONU" && (
                  <>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ONU Device Code</label>
                      <input required type="text" placeholder="e.g. ONU-SUB-20" value={onuForm.code} onChange={e => setOnuForm({ ...onuForm, code: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Subscriber Name / Info</label>
                      <input required type="text" placeholder="e.g. Ronald subscriber" value={onuForm.name} onChange={e => setOnuForm({ ...onuForm, name: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ID Pelanggan (Username / PPPoE)</label>
                      <input type="text" placeholder="ID PPPoE (kosongkan jika sinkron otomatis)" value={onuForm.customer_id} onChange={e => setOnuForm({ ...onuForm, customer_id: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Remote Address (IP PPPoE)</label>
                      <input type="text" placeholder="IP PPPoE (kosongkan jika sinkron otomatis)" value={onuForm.remote_address} onChange={e => setOnuForm({ ...onuForm, remote_address: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Allocation ODP Distribution Point</label>
                      <select value={onuForm.odp_id} onChange={e => setOnuForm({ ...onuForm, odp_id: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full">
                        <option value="">-- Choose ODP --</option>
                        {odps.map(o => <option key={o.id} value={o.id}>{o.code} - {o.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">GPS Lat</label>
                        <input required type="number" step="0.0001" value={onuForm.latitude} onChange={e => setOnuForm({ ...onuForm, latitude: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">GPS Lon</label>
                        <input required type="number" step="0.0001" value={onuForm.longitude} onChange={e => setOnuForm({ ...onuForm, longitude: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                    </div>
                  </>
                )}

                {/* CABLE FORM */}
                {activeTab === "CABLE" && (
                  <>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Fiber Cable Code</label>
                      <input required type="text" placeholder="e.g. CAB-CO-05" value={cableForm.cable_code} onChange={e => setCableForm({ ...cableForm, cable_code: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cable Name / Segment Descriptor</label>
                      <input required type="text" placeholder="e.g. Feeder route 5" value={cableForm.cable_name} onChange={e => setCableForm({ ...cableForm, cable_name: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cable Type Class</label>
                      <input required type="text" placeholder="e.g. G.652D Single-mode" value={cableForm.cable_type} onChange={e => setCableForm({ ...cableForm, cable_type: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Route Length (m)</label>
                        <input required type="number" step="1" value={cableForm.length_km} onChange={e => setCableForm({ ...cableForm, length_km: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Core Strands</label>
                        <input required type="number" step="1" value={cableForm.total_cores} onChange={e => setCableForm({ ...cableForm, total_cores: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                    </div>

                    {/* Nodes connectors dropdowns */}
                    <div className="border border-slate-800/40 p-2.5 rounded bg-slate-900 mt-2 grid grid-cols-3 gap-2 md:col-span-2">
                      <div className="col-span-3 text-[10px] text-slate-400 uppercase font-bold">Relational GIS Connectivity Link</div>
                      <div>
                        <label className="text-[9px] uppercase text-slate-500 block mb-1">End 1 Type</label>
                        <select value={cableForm.from_node_type} onChange={e => setCableForm({ ...cableForm, from_node_type: e.target.value as any })} className="bg-slate-950 border border-slate-850 p-1.5 text-xs rounded text-white w-full">
                          <option value="SFP">SFP</option>
                          <option value="ODC">ODC</option>
                          <option value="ODP">ODP</option>
                          <option value="ONU">ONU</option>
                          <option value="SPLICE">SPLICE</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[9px] uppercase text-slate-500 block mb-1">End 1 Node ID</label>
                        <select value={cableForm.from_node_id} onChange={e => setCableForm({ ...cableForm, from_node_id: e.target.value })} className="bg-slate-950 border border-slate-850 p-1.5 text-xs rounded text-white w-full">
                          <option value="">-- Choose Node --</option>
                          {cableForm.from_node_type === "SFP" && sfps.map(x => <option value={x.id}>{x.code} - {x.name}</option>)}
                          {cableForm.from_node_type === "ODC" && odcs.map(x => <option value={x.id}>{x.code} - {x.name}</option>)}
                          {cableForm.from_node_type === "ODP" && odps.map(x => <option value={x.id}>{x.code} - {x.name}</option>)}
                          {cableForm.from_node_type === "ONU" && onus.map(x => <option value={x.id}>{x.code} - {x.name}</option>)}
                          {cableForm.from_node_type === "SPLICE" && splices.map(x => <option value={x.id}>{x.splice_code} - {x.splice_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase text-slate-500 block mb-1">End 2 Type</label>
                        <select value={cableForm.to_node_type} onChange={e => setCableForm({ ...cableForm, to_node_type: e.target.value as any })} className="bg-slate-950 border border-slate-850 p-1.5 text-xs rounded text-white w-full">
                          <option value="SFP">SFP</option>
                          <option value="ODC">ODC</option>
                          <option value="ODP">ODP</option>
                          <option value="ONU">ONU</option>
                          <option value="SPLICE">SPLICE</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[9px] uppercase text-slate-500 block mb-1">End 2 Node ID</label>
                        <select value={cableForm.to_node_id} onChange={e => setCableForm({ ...cableForm, to_node_id: e.target.value })} className="bg-slate-950 border border-slate-850 p-1.5 text-xs rounded text-white w-full">
                          <option value="">-- Choose Node --</option>
                          {cableForm.to_node_type === "SFP" && sfps.map(x => <option value={x.id}>{x.code} - {x.name}</option>)}
                          {cableForm.to_node_type === "ODC" && odcs.map(x => <option value={x.id}>{x.code} - {x.name}</option>)}
                          {cableForm.to_node_type === "ODP" && odps.map(x => <option value={x.id}>{x.code} - {x.name}</option>)}
                          {cableForm.to_node_type === "ONU" && onus.map(x => <option value={x.id}>{x.code} - {x.name}</option>)}
                          {cableForm.to_node_type === "SPLICE" && splices.map(x => <option value={x.id}>{x.splice_code} - {x.splice_name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="border border-slate-800/40 p-2.5 rounded bg-slate-900 grid grid-cols-4 gap-2 md:col-span-2">
                      <div className="col-span-4 text-[10px] text-slate-400 font-bold uppercase">Polyline Segment Terminus Nodes Coordinate Setup (GPS)</div>
                      <div>
                        <label className="text-[9px] text-slate-500 block">Lat 1 (Start)</label>
                        <input required type="number" step="0.0001" value={cableForm.lat1} onChange={e => setCableForm({ ...cableForm, lat1: Number(e.target.value) })} className="bg-slate-950 border border-slate-850 p-1 text-xs text-white rounded w-full" />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 block">Lon 1 (Start)</label>
                        <input required type="number" step="0.0001" value={cableForm.lon1} onChange={e => setCableForm({ ...cableForm, lon1: Number(e.target.value) })} className="bg-slate-950 border border-slate-850 p-1 text-xs text-white rounded w-full" />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 block">Lat 2 (End)</label>
                        <input required type="number" step="0.0001" value={cableForm.lat2} onChange={e => setCableForm({ ...cableForm, lat2: Number(e.target.value) })} className="bg-slate-950 border border-slate-850 p-1 text-xs text-white rounded w-full" />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 block">Lon 2 (End)</label>
                        <input required type="number" step="0.0001" value={cableForm.lon2} onChange={e => setCableForm({ ...cableForm, lon2: Number(e.target.value) })} className="bg-slate-950 border border-slate-850 p-1 text-xs text-white rounded w-full" />
                      </div>
                    </div>
                  </>
                )}

                {/* SPLICE POINT FORM */}
                {activeTab === "SPLICE" && (
                  <>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Splice Joint Box Code</label>
                      <input required type="text" placeholder="e.g. SPL-BOX-05" value={spliceForm.splice_code} onChange={e => setSpliceForm({ ...spliceForm, splice_code: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Joint Closure Name</label>
                      <input required type="text" placeholder="e.g. Midspan chamber" value={spliceForm.splice_name} onChange={e => setSpliceForm({ ...spliceForm, splice_name: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Splice Enclosure Joint Type</label>
                      <select value={spliceForm.splice_type} onChange={e => {
                        const loss = e.target.value === "Mechanical Splice" ? 0.20 : 0.03;
                        setSpliceForm({ ...spliceForm, splice_type: e.target.value as any, loss_db: loss });
                      }} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full">
                        <option value="Fusion Splice">Fusion Splice (Theoretical loss ~0.03dB)</option>
                        <option value="Mechanical Splice">Mechanical Splice (Theoretical loss ~0.20dB)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Direct Attenuation Loss (dB)</label>
                      <input required type="number" step="0.01" value={spliceForm.loss_db} onChange={e => setSpliceForm({ ...spliceForm, loss_db: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Link to fiber cable route</label>
                      <select value={spliceForm.cable_id} onChange={e => setSpliceForm({ ...spliceForm, cable_id: e.target.value })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full">
                        <option value="">-- Choose Fiber Route --</option>
                        {cables.map(c => <option key={c.id} value={c.id}>{c.cable_code} - {c.cable_name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">GPS Lat</label>
                        <input required type="number" step="0.0001" value={spliceForm.latitude} onChange={e => setSpliceForm({ ...spliceForm, latitude: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">GPS Lon</label>
                        <input required type="number" step="0.0001" value={spliceForm.longitude} onChange={e => setSpliceForm({ ...spliceForm, longitude: Number(e.target.value) })} className="bg-slate-900 border border-slate-800 text-xs p-2 rounded text-white w-full" />
                      </div>
                    </div>
                  </>
                )}

                <div className="md:col-span-2 pt-2 border-t border-slate-800 flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowAddForm(false); clearForms(); }} className="px-3 py-1.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer">
                    {editingId ? "Save Changes" : "Register Item"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Tables displaying ledger records */
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20 max-h-[360px] overflow-y-auto">
              {activeTab === "SFP" && (
                <table className="w-full text-xs text-slate-300 text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">SFP Code</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Slot/Port</th>
                      <th className="p-3">Laser Output</th>
                      <th className="p-3">Coordinates (WGS84)</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSfpList().map(item => (
                      <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-900/30">
                        <td className="p-3 font-mono text-cyan-400 font-bold">{item.code}</td>
                        <td className="p-3">{item.name}</td>
                        <td className="p-3">Slot {item.slot} - Port {item.port}</td>
                        <td className="p-3 font-semibold text-slate-200">{item.tx_power_dbm} dBm</td>
                        <td className="p-3 text-slate-500 font-mono text-[10px]">{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</td>
                        <td className="p-3 flex gap-2">
                          <button onClick={() => handleEdit("SFP", item)} className="text-slate-400 hover:text-white cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => onDeleteSfp(item.id)} className="text-rose-500 hover:text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "ODC" && (
                <table className="w-full text-xs text-slate-300 text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Kode ODC</th>
                      <th className="p-3">Nama Kabinet</th>
                      <th className="p-3">Tipe Splitter</th>
                      <th className="p-3">Redaman Split</th>
                      <th className="p-3">Kapasitas Port</th>
                      <th className="p-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getOdcList().map(item => (
                      <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-900/30">
                        <td className="p-3 font-mono text-amber-500 font-bold">{item.code}</td>
                        <td className="p-3">{item.name}</td>
                        <td className="p-3">{item.splitter_type} Split</td>
                        <td className="p-3 font-semibold text-rose-400">{item.splitter_loss_db} dB</td>
                        <td className="p-3">{item.total_ports} port</td>
                        <td className="p-3 flex gap-2">
                          <button onClick={() => handleEdit("ODC", item)} className="text-slate-400 hover:text-white cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => onDeleteOdc(item.id)} className="text-rose-500 hover:text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "ODP" && (
                <table className="w-full text-xs text-slate-300 text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Kode Box ODP</th>
                      <th className="p-3">Deskripsi Box</th>
                      <th className="p-3">ID Induk ODC</th>
                      <th className="p-3">Kapasitas Port</th>
                      <th className="p-3">GPS koordinat</th>
                      <th className="p-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getOdpList().map(item => (
                      <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-900/30">
                        <td className="p-3 font-mono text-sky-400 font-bold">{item.code}</td>
                        <td className="p-3">{item.name}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-400">{odcs.find(o => o.id === item.odc_id)?.code || "Unassigned"}</td>
                        <td className="p-3">{item.total_ports} Sambungan</td>
                        <td className="p-3 text-slate-500 font-mono text-[10px]">{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</td>
                        <td className="p-3 flex gap-2">
                          <button onClick={() => handleEdit("ODP", item)} className="text-slate-400 hover:text-white cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => onDeleteOdp(item.id)} className="text-rose-500 hover:text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "ONU" && (
                <table className="w-full text-xs text-slate-300 text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Kode Modem ONU</th>
                      <th className="p-3">Nama Pelanggan</th>
                      <th className="p-3">ID Pelanggan</th>
                      <th className="p-3">Remote Address</th>
                      <th className="p-3">Alokasi ODP Upstream</th>
                      <th className="p-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getOnuList().map(item => (
                      <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-900/30">
                        <td className="p-3 font-mono text-emerald-400 font-bold">{item.code}</td>
                        <td className="p-3 font-semibold text-slate-200">{item.name}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">{item.customer_id || "-"}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">{item.remote_address || "-"}</td>
                        <td className="p-3 font-mono text-[10px] text-sky-400">{odps.find(o => o.id === item.odp_id)?.code || "Terisolasi"}</td>
                        <td className="p-3 flex gap-2">
                          <button onClick={() => handleEdit("ONU", item)} className="text-slate-400 hover:text-white cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => onDeleteOnu(item.id)} className="text-rose-500 hover:text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "CABLE" && (
                <table className="w-full text-xs text-slate-300 text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Kode Kabel</th>
                      <th className="p-3">Nama</th>
                      <th className="p-3">Panjang (KM)</th>
                      <th className="p-3">Core</th>
                      <th className="p-3">Tautan Ujung Hubungan</th>
                      <th className="p-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCableList().map(item => (
                      <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-900/30">
                        <td className="p-3 font-mono text-cyan-400 font-bold">{item.cable_code}</td>
                        <td className="p-3">{item.cable_name}</td>
                        <td className="p-3 font-semibold text-slate-200">{(item.length_km * 1000).toFixed(0)} m</td>
                        <td className="p-3 italic text-indigo-300 font-bold">{item.total_cores} Core</td>
                        <td className="p-3 text-[10px] text-slate-500">
                          {item.from_node_type} &rarr; {item.to_node_type}
                        </td>
                        <td className="p-3">
                          <button onClick={() => onDeleteCable(item.id)} className="text-rose-500 hover:text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "SPLICE" && (
                <table className="w-full text-xs text-slate-300 text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Kode Sambung</th>
                      <th className="p-3">Nama</th>
                      <th className="p-3">Tipe</th>
                      <th className="p-3">Atenuasi Default</th>
                      <th className="p-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSpliceList().map(item => (
                      <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-900/30">
                        <td className="p-3 font-mono text-yellow-500 font-bold">{item.splice_code}</td>
                        <td className="p-3">{item.splice_name}</td>
                        <td className="p-3">{item.splice_type}</td>
                        <td className="p-3 font-semibold text-rose-400">{item.loss_db} dB</td>
                        <td className="p-3">
                          <button onClick={() => onDeleteSplice(item.id)} className="text-rose-500 hover:text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
