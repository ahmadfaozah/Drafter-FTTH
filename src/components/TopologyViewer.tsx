import React, { useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, Handle, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SFP, ODC, ODP, ONU, FiberCable } from "../types";
import { Search, Network, Server, Network as NetworkIcon, Box, Home } from "lucide-react";

interface TopologyViewerProps {
  sfps: SFP[];
  odcs: ODC[];
  odps: ODP[];
  onus: ONU[];
  cables: FiberCable[];
  theme?: "light" | "dark";
}

// ----------------------------------------------------
// KOMPONEN NODE GPON KUSTOM (KARTU DINAMIS)
// ----------------------------------------------------
interface GPONNodeProps {
  id: string;
  data: {
    type: "SFP" | "ODC" | "ODP" | "ONU";
    code: string;
    name: string;
    detail: string;
    raw: any;
    isHighlighted?: boolean;
    theme?: "light" | "dark";
  };
  isConnectable?: boolean;
}

const GPONNode = ({ data, isConnectable }: GPONNodeProps) => {
  const isSfp = data.type === "SFP";
  const isOdc = data.type === "ODC";
  const isOdp = data.type === "ODP";
  const isOnu = data.type === "ONU";
  const isLight = data.theme === "light";

  let title = "";
  let icon = null;
  let bgGradient = "";
  let tagClass = "";
  let borderStyle = "";

  if (isSfp) {
    title = "SFP PUSAT";
    icon = <Server className={`w-3.5 h-3.5 ${isLight ? "text-rose-600" : "text-rose-400"}`} />;
    bgGradient = isLight ? "from-rose-500/5 via-white to-white" : "from-rose-500/10 via-[#1c1c24] to-[#1c1c24]";
    tagClass = isLight ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-rose-950/20 border-rose-900/40 text-rose-300";
    borderStyle = isLight
      ? "border-l-rose-500 border-slate-200 shadow-[0_2px_8px_rgba(244,63,94,0.05)]"
      : "border-l-rose-500 border-[#222533] shadow-[0_0_12px_rgba(244,63,94,0.1)]";
  } else if (isOdc) {
    title = "HUB ODC";
    icon = <NetworkIcon className={`w-3.5 h-3.5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />;
    bgGradient = isLight ? "from-amber-500/5 via-white to-white" : "from-amber-500/10 via-[#1c1c24] to-[#1c1c24]";
    tagClass = isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-950/20 border-amber-900/40 text-amber-300";
    borderStyle = isLight
      ? "border-l-amber-500 border-slate-200 shadow-[0_2px_8px_rgba(245,158,11,0.05)]"
      : "border-l-amber-500 border-[#222533] shadow-[0_0_12px_rgba(245,158,11,0.1)]";
  } else if (isOdp) {
    title = "ODP TIANG";
    icon = <Box className={`w-3.5 h-3.5 ${isLight ? "text-sky-600" : "text-sky-400"}`} />;
    bgGradient = isLight ? "from-sky-500/5 via-white to-white" : "from-sky-500/10 via-[#1c1c24] to-[#1c1c24]";
    tagClass = isLight ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-sky-950/20 border-sky-900/40 text-sky-300";
    borderStyle = isLight
      ? "border-l-sky-500 border-slate-200 shadow-[0_2px_8px_rgba(56,189,248,0.05)]"
      : "border-l-sky-500 border-[#222533] shadow-[0_0_12px_rgba(56,189,248,0.1)]";
  } else if (isOnu) {
    title = "ONU USER";
    icon = <Home className={`w-3.5 h-3.5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />;
    bgGradient = isLight ? "from-emerald-500/5 via-white to-white" : "from-emerald-500/10 via-[#1c1c24] to-[#1c1c24]";
    tagClass = isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-950/20 border-emerald-900/40 text-emerald-300";
    borderStyle = isLight
      ? "border-l-emerald-500 border-slate-200 shadow-[0_2px_8px_rgba(16,185,129,0.05)]"
      : "border-l-emerald-500 border-[#222533] shadow-[0_0_12px_rgba(16,185,129,0.1)]";
  }

  let highlightClass = "";
  if (data.isHighlighted === true) {
    highlightClass = isLight
      ? "border-cyan-500 ring-2 ring-cyan-500/30 scale-105 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
      : "border-cyan-400 ring-2 ring-cyan-500/50 scale-105 shadow-[0_0_20px_rgba(34,211,238,0.4)]";
  } else if (data.isHighlighted === false) {
    highlightClass = "opacity-30 scale-95";
  }

  return (
    <div className={`p-3.5 rounded-xl border border-l-4 ${borderStyle} ${highlightClass} bg-gradient-to-r ${bgGradient} w-44 text-left transition-all duration-300`}>
      {/* Handle input Target di sebelah Kiri */}
      {!isSfp && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          style={{
            background: isLight ? "#cbd5e1" : "#475569",
            width: 7,
            height: 7,
            border: isLight ? "1.5px solid #ffffff" : "1.5px solid #0f172a"
          }}
        />
      )}
      {/* Handle output Source di sebelah Kanan */}
      {!isOnu && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          style={{
            background: isLight ? "#cbd5e1" : "#475569",
            width: 7,
            height: 7,
            border: isLight ? "1.5px solid #ffffff" : "1.5px solid #0f172a"
          }}
        />
      )}

      <div className="flex items-start justify-between mb-2">
        <span className={`text-[7.5px] font-extrabold tracking-widest uppercase px-1.5 py-0.5 rounded border ${tagClass}`}>
          {title}
        </span>
        {icon}
      </div>

      <div className={`font-mono text-[11px] font-bold tracking-wide truncate ${isLight ? "text-slate-800" : "text-slate-100"}`}>{data.code}</div>
      <div className={`text-[9.5px] font-medium truncate mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>{data.name}</div>

      <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[9px] ${isLight ? "border-slate-100" : "border-slate-800/40"}`}>
        <span className={`font-semibold uppercase tracking-wider ${isLight ? "text-slate-400" : "text-slate-500"}`}>Info</span>
        <span className={`font-semibold ${isLight ? "text-slate-600" : "text-slate-300"}`}>{data.detail}</span>
      </div>
    </div>
  );
};

const nodeTypes = {
  gpon: GPONNode
};

export default function TopologyViewer({
  sfps,
  odcs,
  odps,
  onus,
  cables,
  theme = "dark"
}: TopologyViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<{ name: string; type: string; details: any } | null>(null);

  const isLight = theme === "light";

  // Hasilkan hierarki DAG saat pemuatan awal atau pembaruan data
  useEffect(() => {
    const listNodes: any[] = [];
    const listEdges: any[] = [];
    const Y_START = 60;
    const X_SPACING = 230;

    // Buat peta relasi pohon (tree relationship map)
    const parentMap = new Map<string, string>();
    const childrenMap = new Map<string, string[]>();

    // Tahap Pertama: Proses koneksi tingkat berbeda (SFP -> ODC -> ODP -> ONU)
    cables.forEach((cable) => {
      const typeA = cable.from_node_type.toUpperCase();
      const typeB = cable.to_node_type.toUpperCase();
      const idA = `${typeA.toLowerCase()}-${cable.from_node_id}`;
      const idB = `${typeB.toLowerCase()}-${cable.to_node_id}`;

      const levelMap: Record<string, number> = { SFP: 0, ODC: 1, ODP: 2, ONU: 3 };
      const lvlA = levelMap[typeA] ?? 99;
      const lvlB = levelMap[typeB] ?? 99;

      if (lvlA !== 99 && lvlB !== 99 && lvlA !== lvlB) {
        const parentId = lvlA < lvlB ? idA : idB;
        const childId = lvlA < lvlB ? idB : idA;

        parentMap.set(childId, parentId);

        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(childId);
      }
    });

    // Tahap Kedua: Proses koneksi tingkat yang sama (misal: ODP -> ODP)
    cables.forEach((cable) => {
      const typeA = cable.from_node_type.toUpperCase();
      const typeB = cable.to_node_type.toUpperCase();
      const idA = `${typeA.toLowerCase()}-${cable.from_node_id}`;
      const idB = `${typeB.toLowerCase()}-${cable.to_node_id}`;

      const levelMap: Record<string, number> = { SFP: 0, ODC: 1, ODP: 2, ONU: 3 };
      const lvlA = levelMap[typeA] ?? 99;
      const lvlB = levelMap[typeB] ?? 99;

      if (lvlA !== 99 && lvlB !== 99 && lvlA === lvlB) {
          let parentId: string, childId: string;
          if (parentMap.has(idB) && !parentMap.has(idA)) {
            parentId = idB;
            childId = idA;
          } else if (parentMap.has(idA) && !parentMap.has(idB)) {
            parentId = idA;
            childId = idB;
          } else {
            parentId = idA;
            childId = idB;
          }

        parentMap.set(childId, parentId);

        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(childId);
      }
    });

    // Kami menetapkan koordinat Y menggunakan tata letak hierarki
    const yCoords = new Map<string, number>();
    let leafIndex = 0;
    const Y_GAP = 120; // Celah jarak vertikal agar tampak rapi dan terpisah

    // Tata letak pohon post-order untuk memusatkan node parent di atas anak-anaknya
    const layoutNode = (nodeId: string) => {
      const children = childrenMap.get(nodeId) || [];
      if (children.length === 0) {
        yCoords.set(nodeId, Y_START + leafIndex * Y_GAP);
        leafIndex++;
      } else {
        children.forEach((childId) => {
          layoutNode(childId);
        });
        const childYs = children.map(childId => yCoords.get(childId) ?? 0);
        const minY = Math.min(...childYs);
        const maxY = Math.max(...childYs);
        yCoords.set(nodeId, (minY + maxY) / 2);
      }
    };

    // Kumpulkan semua ID node (Gather all node IDs)
    const allNodeIds: string[] = [];
    sfps.forEach(sfp => allNodeIds.push(`sfp-${sfp.id}`));
    odcs.forEach(odc => allNodeIds.push(`odc-${odc.id}`));
    odps.forEach(odp => allNodeIds.push(`odp-${odp.id}`));
    onus.forEach(onu => allNodeIds.push(`onu-${onu.id}`));

    // Cari node akar (root nodes)
    const levelMap: Record<string, number> = { sfp: 0, odc: 1, odp: 2, onu: 3 };
    const getLevelOfId = (id: string) => {
      const type = id.split("-")[0];
      return levelMap[type] ?? 99;
    };

    const roots = allNodeIds.filter(id => !parentMap.has(id));
    roots.sort((a, b) => getLevelOfId(a) - getLevelOfId(b));

    // Run layout for all roots
    roots.forEach((rootId) => {
      layoutNode(rootId);
    });

    // Cadangan untuk node mana pun yang tidak mendapatkan koordinat Y (fallback)
    allNodeIds.forEach((nodeId) => {
      if (yCoords.get(nodeId) === undefined) {
        yCoords.set(nodeId, Y_START + leafIndex * Y_GAP);
        leafIndex++;
      }
    });

    // 1. Petakan SFP (Kolom 1 - OLT)
    sfps.forEach((sfp) => {
      const nodeId = `sfp-${sfp.id}`;
      listNodes.push({
        id: nodeId,
        type: "gpon",
        data: {
          type: "SFP",
          code: sfp.code,
          name: sfp.name,
          detail: `${sfp.tx_power_dbm} dBm`,
          raw: sfp,
          theme
        },
        position: { x: 30, y: yCoords.get(nodeId) ?? 150 },
        className: "border-0 p-0 shadow-lg",
        isConnectable: false
      });
    });

    // 2. Petakan ODC (Kolom 2 - Kabinet)
    odcs.forEach((odc) => {
      const nodeId = `odc-${odc.id}`;
      listNodes.push({
        id: nodeId,
        type: "gpon",
        data: {
          type: "ODC",
          code: odc.code,
          name: odc.name,
          detail: `${odc.splitter_type} (-${Math.abs(odc.splitter_loss_db)}dB)`,
          raw: odc,
          theme
        },
        position: { x: 30 + X_SPACING, y: yCoords.get(nodeId) ?? 150 },
        className: "border-0 p-0 shadow-lg",
        isConnectable: false
      });
    });

    // 3. Petakan ODP (Kolom 3 - Kotak Tiang)
    odps.forEach((odp) => {
      const nodeId = `odp-${odp.id}`;
      listNodes.push({
        id: nodeId,
        type: "gpon",
        data: {
          type: "ODP",
          code: odp.code,
          name: odp.name,
          detail: `${odp.total_ports} Socket`,
          raw: odp,
          theme
        },
        position: { x: 30 + X_SPACING * 2, y: yCoords.get(nodeId) ?? 150 },
        className: "border-0 p-0 shadow-lg",
        isConnectable: false
      });
    });

    // 4. Petakan ONU (Kolom 4 - Rumah)
    onus.forEach((onu) => {
      const nodeId = `onu-${onu.id}`;
      listNodes.push({
        id: nodeId,
        type: "gpon",
        data: {
          type: "ONU",
          code: onu.code,
          name: onu.name,
          detail: onu.customer_id || "Active",
          raw: onu,
          theme
        },
        position: { x: 30 + X_SPACING * 3, y: yCoords.get(nodeId) ?? 150 },
        className: "border-0 p-0 shadow-lg",
        isConnectable: false
      });
    });

    // Hubungkan kabel berdasarkan data fisik (Connect cables based on physical data)
    cables.forEach((cable) => {
      const typeA = cable.from_node_type.toUpperCase();
      const typeB = cable.to_node_type.toUpperCase();
      const idA = `${typeA.toLowerCase()}-${cable.from_node_id}`;
      const idB = `${typeB.toLowerCase()}-${cable.to_node_id}`;

      const levelMap: Record<string, number> = { SFP: 0, ODC: 1, ODP: 2, ONU: 3 };
      const lvlA = levelMap[typeA] ?? 99;
      const lvlB = levelMap[typeB] ?? 99;

      if (lvlA !== 99 && lvlB !== 99) {
        let parentId: string, childId: string;
        if (lvlA === lvlB) {
          if (parentMap.get(idA) === idB) {
            parentId = idB;
            childId = idA;
          } else {
            parentId = idA;
            childId = idB;
          }
        } else {
          parentId = lvlA < lvlB ? idA : idB;
          childId = lvlA < lvlB ? idB : idA;
        }

        let strokeColor = "#64748b";
        let isAnimated = true;
        let strokeDash = undefined;

        const parentType = (lvlA === lvlB)
          ? (parentId === idA ? typeA : typeB)
          : (lvlA < lvlB ? typeA : typeB);

        if (parentType === "SFP") {
          strokeColor = "#f43f5e";
        }
        else if (parentType === "ODC") {
          strokeColor = isLight ? "#0284c7" : "#38bdf8";
        }
        else if (parentType === "ODP") {
          strokeColor = isLight ? "#16a34a" : "#10b981";
          strokeDash = "4,4";
        }

        const sourceExists = listNodes.some(n => n.id === parentId);
        const targetExists = listNodes.some(n => n.id === childId);
        if (sourceExists && targetExists) {
          listEdges.push({
            id: `edge-cable-${cable.id}`,
            source: parentId,
            target: childId,
            type: "smoothstep",
            animated: isAnimated,
            style: {
              stroke: strokeColor,
              strokeWidth: 2,
              strokeDasharray: strokeDash
            },
          });
        }
      }
    });

    // Saring berdasarkan pencarian (Filter based on search)
    if (searchTerm) {
      const matchLower = searchTerm.toLowerCase();
      const filteredNodes = listNodes.map((n) => {
        const matches = n.data.code.toLowerCase().includes(matchLower) || n.data.name.toLowerCase().includes(matchLower);
        return {
          ...n,
          data: {
            ...n.data,
            isHighlighted: matches
          }
        };
      });
      setNodes(filteredNodes);
    } else {
      setNodes(listNodes);
    }

    setEdges(listEdges);
  }, [sfps, odcs, odps, onus, cables, searchTerm, theme]);

  // Pemicu klik node untuk menampilkan laci info (drawer info)
  const onNodeClick = (event: React.MouseEvent, node: any) => {
    const raw = node.data.raw;
    const type = node.data.type;
    setSelectedNodeInfo({
      name: raw.name || raw.splice_name || "Unknown Asset",
      type,
      details: raw
    });
  };

  return (
    <div className={`border rounded-xl overflow-hidden h-[540px] md:h-[580px] flex flex-col relative shadow-2xl transition-all duration-300 ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
      {/* HUD Bar Pencarian (Search HUD bar) */}
      <div className={`p-3 border-b flex items-center justify-between gap-4 z-10 shrink-0 ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-slate-800/60"}`}>
        <div>
          <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isLight ? "text-slate-800" : "text-slate-200"}`}>
            <Network className={`w-4 h-4 ${isLight ? "text-blue-600" : "text-cyan-400"}`} /> Pohon Grafis Optik Aktif (Topologi GPON)
          </h3>
          <p className={`text-[10px] mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>Diagram alir distribusi hierarki GPON</p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari node..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`text-xs py-1 pl-8 pr-3 rounded border focus:outline-none focus:border-cyan-500 w-48 transition-all ${isLight
                ? "bg-white border-slate-350 text-slate-800 focus:ring-1 focus:ring-cyan-500/30"
                : "bg-slate-900 border-slate-850 text-slate-300"
              }`}
          />
        </div>
      </div>

      {/* Laci Informasi Mengambang (Floating details popup drawer) */}
      {selectedNodeInfo && (
        <div className={`absolute top-14 right-4 p-3.5 rounded-lg border z-40 max-w-xs text-xs shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${isLight
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-slate-950/95 border-slate-800 text-white"
          }`}>
          <div className={`flex justify-between items-start mb-2 pb-1.5 border-b ${isLight ? "border-slate-100" : "border-slate-850"}`}>
            <div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${isLight ? "bg-blue-50 text-blue-700" : "bg-cyan-950 text-cyan-300"
                }`}>
                Info Node {selectedNodeInfo.type}
              </span>
              <h4 className={`font-bold mt-1 ${isLight ? "text-slate-800" : "text-white"}`}>{selectedNodeInfo.details.code}</h4>
            </div>
            <button
              onClick={() => setSelectedNodeInfo(null)}
              className={`text-sm font-bold cursor-pointer border-none bg-transparent ${isLight ? "text-slate-400 hover:text-slate-600" : "text-slate-500 hover:text-slate-300"
                }`}
            >
              &#10005;
            </button>
          </div>

          <div className={`space-y-1.5 text-[11px] ${isLight ? "text-slate-600" : "text-slate-300"}`}>
            <p><span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-medium`}>Nama:</span> {selectedNodeInfo.name}</p>
            {selectedNodeInfo.type === "SFP" && (
              <>
                <p><span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-medium`}>Slot/Port:</span> Slot {selectedNodeInfo.details.slot} - Port {selectedNodeInfo.details.port}</p>
                <p><span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-medium`}>Laser TX:</span> {selectedNodeInfo.details.tx_power_dbm} dBm</p>
              </>
            )}
            {selectedNodeInfo.type === "ODC" && (
              <>
                <p><span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-medium`}>Rasio Splitter:</span> {selectedNodeInfo.details.splitter_type}</p>
                <p><span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-medium`}>Redaman Splitter:</span> {Math.abs(selectedNodeInfo.details.splitter_loss_db)} dB</p>
                <p><span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-medium`}>Kaps. Sambungan:</span> {selectedNodeInfo.details.total_ports} Sambungan</p>
              </>
            )}
            {selectedNodeInfo.type === "ODP" && (
              <>
                <p><span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-medium`}>Kaps. Soket:</span> {selectedNodeInfo.details.total_ports} Soket</p>
                <p><span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-medium`}>Redaman Splitter:</span> {Math.abs(selectedNodeInfo.details.splitter_loss_db || 10.30)} dB</p>
              </>
            )}
            {selectedNodeInfo.type === "ONU" && (
              <>
                <p><span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-medium`}>ID Pelanggan:</span> <span className="font-mono">{selectedNodeInfo.details.customer_id || "-"}</span></p>
                <p><span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-medium`}>Remote Address:</span> <span className="font-mono">{selectedNodeInfo.details.remote_address || "-"}</span></p>
              </>
            )}
            <p><span className={`${isLight ? "text-slate-400" : "text-slate-500"} font-medium`}>Koordinat GPS:</span> {selectedNodeInfo.details.latitude}, {selectedNodeInfo.details.longitude}</p>
            <p className={`text-[10px] italic leading-relaxed pt-1 ${isLight ? "text-slate-400" : "text-slate-500"}`}>{selectedNodeInfo.details.description || "*Tidak ada catatan"}</p>
          </div>
        </div>
      )}

      {/* Kontainer React Flow (React Flow Container) */}
      <div className={`w-full flex-grow relative ${isLight ? "bg-slate-50" : "bg-slate-950"}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          isConnectable={false}
          fitView
          fitViewOptions={{ padding: 0.15 }}
        >
          <Background color={isLight ? "#cbd5e1" : "#1e293b"} size={1.5} gap={20} />
          <Controls position="bottom-right" className={isLight ? "bg-white border-slate-200 text-slate-700 [&_button]:border-slate-100" : "bg-slate-900 border-slate-800 text-slate-300 [&_button]:border-slate-800/80"} />
        </ReactFlow>

        {/* Overlay Legenda (Legend overlays) */}
        <div className={`absolute bottom-4 left-4 z-10 p-3 rounded-lg text-[10px] flex flex-col gap-1.5 shadow-lg border ${isLight
            ? "bg-white border-slate-200 text-slate-600"
            : "bg-slate-950/90 border-slate-850 text-slate-400"
          }`}>
          <div className="flex items-center gap-2"><span className="w-3 h-2 bg-[#f43f5e] rounded" /><span>Kabel Feeder (CO &rarr; ODC)</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-2 bg-[#0284c7] rounded" /><span>Kabel Distribusi (ODC &rarr; ODP)</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-2 bg-[#16a34a] border-dashed" /><span>Kabel Drop (ODP &rarr; ONU)</span></div>
        </div>
      </div>
    </div>
  );
}
