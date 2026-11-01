import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SFP, ODC, ODP, ONU, SplicePoint, FiberCable } from "../types";
import { MapPin, Compass, Edit, Trash2, X, Save, Plus, Layers, Minimize2 } from "lucide-react";

interface GisMapProps {
  sfps: SFP[];
  odcs: ODC[];
  odps: ODP[];
  onus: ONU[];
  splices: SplicePoint[];
  cables: FiberCable[];
  tracedCableIds: string[];
  tracedNodeIds: string[];
  activeTraceOnu?: string;
  onSelectNode?: (type: "SFP" | "ODC" | "ODP" | "ONU" | "SPLICE", id: string) => void;
  onAddCableClick?: (fromType: string, fromId: string, toType: string, toId: string, vertices: [number, number][]) => Promise<any>;

  // Properti CRUD (Create, Read, Update, Delete)
  onAddSfp?: (data: any) => void;
  onUpdateSfp?: (id: string, data: any) => void;
  onDeleteSfp?: (id: string) => void;
  onAddOdc?: (data: any) => void;
  onUpdateOdc?: (id: string, data: any) => void;
  onDeleteOdc?: (id: string) => void;
  onAddOdp?: (data: any) => void;
  onUpdateOdp?: (id: string, data: any) => void;
  onDeleteOdp?: (id: string) => void;
  onAddOnu?: (data: any) => void;
  onUpdateOnu?: (id: string, data: any) => void;
  onDeleteOnu?: (id: string) => void;
  onAddSplice?: (data: any) => void;
  onUpdateSplice?: (id: string, data: any) => void;
  onDeleteSplice?: (id: string) => void;
  onDeleteCable?: (id: string) => void;
  onUpdateCable?: (id: string, data: any) => void;
}

export default function GisMap({
  sfps,
  odcs,
  odps,
  onus,
  splices,
  cables,
  tracedCableIds,
  tracedNodeIds,
  activeTraceOnu,
  onSelectNode,
  onAddCableClick,
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
  onAddSplice,
  onUpdateSplice,
  onDeleteSplice,
  onDeleteCable,
  onUpdateCable
}: GisMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const hasFitBoundsRef = useRef(false);
  const layersRef = useRef<{ [key: string]: L.LayerGroup }>({});

  // State pemilihan basemap ("satellite" sebagai default bawaan, atau "dark")
  const [basemap, setBasemap] = useState<"satellite" | "dark" | "street">("satellite");
  const basemapLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);

  // State Pelacakan GPS
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const userLocationGroupRef = useRef<L.LayerGroup | null>(null);

  // Filter Lapisan Peta (Layer filters)
  const [layers, setLayers] = useState({
    sfp: true,
    odc: true,
    odp: true,
    onu: true,
    splice: true,
    cables: true,
  });

  // State pembantu penggambaran kabel (Cable Drafting)
  const [draftSource, setDraftSource] = useState<{ type: string; id: string; name: string } | null>(null);
  const [draftVertices, setDraftVertices] = useState<[number, number][]>([]);

  const [editingCableGeom, setEditingCableGeom] = useState<{ id: string; coords: [number, number][] } | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  const editingCableGeomRef = useRef<any>(null);
  useEffect(() => {
    editingCableGeomRef.current = editingCableGeom;
  }, [editingCableGeom]);

  const draftVerticesRef = useRef<[number, number][]>([]);
  useEffect(() => {
    draftVerticesRef.current = draftVertices;
  }, [draftVertices]);

  const draftSourceRef = useRef<any>(null);
  useEffect(() => {
    draftSourceRef.current = draftSource;
    if (!draftSource) {
      setDraftVertices([]);
    }
  }, [draftSource]);

  const calculatePathLength = (coords: [number, number][]): number => {
    let totalDist = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lat1, lon1] = coords[i];
      const [lat2, lon2] = coords[i + 1];
      
      const R = 6371; // Jari-jari bumi dalam kilometer
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

  const saveCableGeometry = () => {
    if (!editingCableGeom) return;
    const cable = cables.find(c => c.id === editingCableGeom.id);
    if (cable && onUpdateCable) {
      const newLength = calculatePathLength(editingCableGeom.coords);
      onUpdateCable(cable.id, {
        ...cable,
        geometry_line: editingCableGeom.coords,
        length_km: newLength
      });
    }
    setEditingCableGeom(null);
  };

  const getNodePos = (type: string, id: string): [number, number] | null => {
    if (type === "SFP") {
      const match = sfps.find(x => x.id === id);
      return match ? [match.latitude, match.longitude] : null;
    }
    if (type === "ODC") {
      const match = odcs.find(x => x.id === id);
      return match ? [match.latitude, match.longitude] : null;
    }
    if (type === "ODP") {
      const match = odps.find(x => x.id === id);
      return match ? [match.latitude, match.longitude] : null;
    }
    if (type === "ONU") {
      const match = onus.find(x => x.id === id);
      return match ? [match.latitude, match.longitude] : null;
    }
    if (type === "SPLICE") {
      const match = splices.find(x => x.id === id);
      return match ? [match.latitude, match.longitude] : null;
    }
    return null;
  };

  // State Peta CRUD
  const [mapAddMode, setMapAddMode] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showTip, setShowTip] = useState<boolean>(() => !localStorage.getItem("hasSeenGisTip"));

  useEffect(() => {
    if (showTip) {
      const timer = setTimeout(() => {
        setShowTip(false);
        localStorage.setItem("hasSeenGisTip", "true");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showTip]);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [createAssetType, setCreateAssetType] = useState<"SFP" | "ODC" | "ODP" | "ONU" | "SPLICE">("SFP");

  // Informasi umum aset yang sedang aktif diedit
  const [editingAsset, setEditingAsset] = useState<{ id: string; type: "SFP" | "ODC" | "ODP" | "ONU" | "SPLICE" | "CABLE" } | null>(null);

  const [cableForm, setCableForm] = useState({
    cable_code: "",
    cable_name: "",
    length_km: 100,
    total_cores: 1,
    cable_type: "Single-mode G.652D",
    splice_count: 0,
    description: "",
    from_node_type: "",
    from_node_id: "",
    to_node_type: "",
    to_node_id: "",
    geometry_line: [] as [number, number][]
  });

  // State Mode Cepat
  const [plantMode, setPlantMode] = useState<boolean>(false);
  const [cablingMode, setCablingMode] = useState<boolean>(false);

  const plantModeRef = useRef(plantMode);
  const cablingModeRef = useRef(cablingMode);

  // Fungsi pembantu untuk mencari ODC induk dengan menyusuri rute kabel
  const findParentOdc = useCallback((odpId: string): ODC | null => {
    const visited = new Set<string>();
    const queue = [odpId];
    visited.add(odpId);

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

        if (neighborType === "ODC") {
          const odc = odcs.find(o => o.id === neighborId);
          if (odc) return odc;
        }
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          if (neighborType === "SPLICE" || neighborType === "ODP") {
            queue.push(neighborId);
          }
        }
      }
    }
    return null;
  }, [cables, odcs]);

  // BFS untuk mencari jalur kabel terpendek dari SFP ke target node manapun, sekaligus menghitung redaman
  const findUpstreamPath = useCallback((targetType: string, targetId: string) => {
    const queue: { id: string; type: string; path: { id: string; type: string; loss: number }[] }[] = [];

    // Inisialisasi antrean (queue) dengan semua perangkat SFP
    sfps.forEach(sfp => {
      queue.push({
        id: sfp.id,
        type: "SFP",
        path: [{ id: sfp.id, type: "SFP", loss: 0 }]
      });
    });

    const visited = new Set<string>();
    sfps.forEach(sfp => visited.add(sfp.id));

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.id === targetId && curr.type === targetType) {
        return curr.path;
      }

      for (const cable of cables) {
        let neighborId = "";
        let neighborType = "";
        if (cable.from_node_id === curr.id && cable.from_node_type === curr.type) {
          neighborId = cable.to_node_id;
          neighborType = cable.to_node_type;
        } else if (cable.to_node_id === curr.id && cable.to_node_type === curr.type) {
          neighborId = cable.from_node_id;
          neighborType = cable.from_node_type;
        } else {
          continue;
        }

        if (!visited.has(neighborId)) {
          visited.add(neighborId);

          let nodeLoss = 0;
          if (curr.type === "ODC") {
            const odc = odcs.find(o => o.id === curr.id);
            nodeLoss = odc ? Math.abs(odc.splitter_loss_db) : 13.80;
          } else if (curr.type === "ODP") {
            const odp = odps.find(o => o.id === curr.id);
            nodeLoss = odp ? Math.abs(odp.splitter_loss_db) : 10.30;
          }

          const newPath = [...curr.path, { id: neighborId, type: neighborType, loss: nodeLoss }];
          queue.push({ id: neighborId, type: neighborType, path: newPath });
        }
      }
    }
    return null;
  }, [sfps, odcs, odps, cables]);

  // Fungsi pembantu untuk mencari SFP induk dengan menyusuri rute kabel dari ODC
  const findParentSfp = useCallback((odcId: string): SFP | null => {
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
  }, [cables, sfps]);

  useEffect(() => {
    plantModeRef.current = plantMode;
  }, [plantMode]);

  useEffect(() => {
    cablingModeRef.current = cablingMode;
    if (!cablingMode) {
      setDraftSource(null);
    }
  }, [cablingMode]);

  // State Formulir Masing-Masing Aset
  const [sfpForm, setSfpForm] = useState({ code: "", name: "", slot: 1, port: 1, tx_power_dbm: 3.0, description: "" });
  const [odcForm, setOdcForm] = useState({ code: "", name: "", splitter_type: "1:16", splitter_loss_db: 13.80, total_ports: 32, description: "" });
  const [odpForm, setOdpForm] = useState({ code: "", name: "", odc_id: "", odc_port: 0, total_ports: 8, splitter_loss_db: 10.30, description: "" });
  const [onuForm, setOnuForm] = useState({ code: "", name: "", customer_id: "", remote_address: "", odp_id: "", odp_port: 0, status: "Inactive", description: "" });
  const [spliceForm, setSpliceForm] = useState({ splice_code: "", splice_name: "", splice_type: "Fusion Splice" as const, loss_db: 0.03, description: "" });

  // Pembantu pengalih (toggle helper)
  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const layerGroup = layersRef.current[key];
      if (layerGroup && mapRef.current) {
        if (next[key]) {
          mapRef.current.addLayer(layerGroup);
        } else {
          mapRef.current.removeLayer(layerGroup);
        }
      }
      return next;
    });
  };

  const resetFormsForAdd = (lat: number, lng: number) => {
    setClickedCoords({ lat, lng });
    setEditingAsset(null);
    setShowCreateModal(true);

    // Hasilkan angka kode acak (seed)
    const rand = Math.floor(Math.random() * 900) + 100;
    setSfpForm({ code: `SFP-CO-${rand}`, name: `Port Pemancar ${rand}`, slot: 1, port: 1, tx_power_dbm: 3.0, description: "" });
    setOdcForm({ code: `ODC-HUB-${rand}`, name: `Kabinet ODC ${rand}`, splitter_type: "1:16", splitter_loss_db: 13.80, total_ports: 32, description: "" });
    setOdpForm({ code: `ODP-POLE-${rand}`, name: `Kotak ODP ${rand}`, odc_id: odcs[0]?.id || "", odc_port: 1, total_ports: 8, splitter_loss_db: 10.30, description: "" });
    setOnuForm({ code: `ONU-SUB-${rand}`, name: `ONU Pelanggan ${rand}`, customer_id: "", remote_address: "", odp_id: odps[0]?.id || "", odp_port: 1, status: "Inactive", description: "" });
    setSpliceForm({ splice_code: `SP-${rand}`, splice_name: `Titik Sambung SP ${rand}`, splice_type: "Fusion Splice", loss_db: 0.03, description: "" });
  };

  const openEditModal = (type: "SFP" | "ODC" | "ODP" | "ONU" | "SPLICE" | "CABLE", item: any) => {
    setEditingAsset({ id: item.id, type });
    if (type === "SFP") {
      setSfpForm({
        code: item.code || "",
        name: item.name || "",
        slot: item.slot || 1,
        port: item.port || 1,
        tx_power_dbm: item.tx_power_dbm || 3.0,
        description: item.description || ""
      });
      setClickedCoords({ lat: item.latitude, lng: item.longitude });
    } else if (type === "ODC") {
      setOdcForm({
        code: item.code || "",
        name: item.name || "",
        splitter_type: item.splitter_type || "1:16",
        splitter_loss_db: item.splitter_loss_db || 13.8,
        total_ports: item.total_ports || 32,
        description: item.description || ""
      });
      setClickedCoords({ lat: item.latitude, lng: item.longitude });
    } else if (type === "ODP") {
      setOdpForm({
        code: item.code || "",
        name: item.name || "",
        odc_id: item.odc_id || "",
        odc_port: item.odc_port || 0,
        total_ports: item.total_ports || 8,
        splitter_loss_db: item.splitter_loss_db || 10.30,
        description: item.description || ""
      });
      setClickedCoords({ lat: item.latitude, lng: item.longitude });
    } else if (type === "ONU") {
      setOnuForm({
        code: item.code || "",
        name: item.name || "",
        customer_id: item.customer_id || "",
        remote_address: item.remote_address || "",
        odp_id: item.odp_id || "",
        odp_port: item.odp_port || 0,
        status: item.status || "Inactive",
        description: item.description || ""
      });
      setClickedCoords({ lat: item.latitude, lng: item.longitude });
    } else if (type === "SPLICE") {
      setSpliceForm({
        splice_code: item.splice_code || "",
        splice_name: item.splice_name || "",
        splice_type: item.splice_type || "Fusion Splice",
        loss_db: item.loss_db || 0.03,
        description: item.description || ""
      });
      setClickedCoords({ lat: item.latitude, lng: item.longitude });
    } else if (type === "CABLE") {
      setCableForm({
        cable_code: item.cable_code || "",
        cable_name: item.cable_name || "",
        length_km: item.length_km ? Number((item.length_km * 1000).toFixed(0)) : 100,
        total_cores: item.total_cores || 1,
        cable_type: item.cable_type || "Single-mode G.652D",
        splice_count: item.splice_count || 0,
        description: item.description || "",
        from_node_type: item.from_node_type || "",
        from_node_id: item.from_node_id || "",
        to_node_type: item.to_node_type || "",
        to_node_id: item.to_node_id || "",
        geometry_line: item.geometry_line || []
      });
      if (item.geometry_line && item.geometry_line.length > 0) {
        setClickedCoords({ lat: item.geometry_line[0][0], lng: item.geometry_line[0][1] });
      } else {
        setClickedCoords({ lat: 0, lng: 0 });
      }
    }
    setShowCreateModal(true); // Mode Edit juga menggunakan panel laci overlay UI absolut yang sama di atas peta
  };

  // Inisialisasi peta sekali saja
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const container = mapContainerRef.current;
    if ((container as any)._leaflet_id) return;

    // Pusatkan peta di sekitar koordinat Indonesia (Jakarta)
    const map = L.map(container, {
      center: [-6.2088, 106.8456],
      zoom: 15,
      maxZoom: 22,
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    // Default: Lapisan Satelit adalah default bawaan!
    const satelliteTile = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 22,
      maxNativeZoom: 18,
    }).addTo(map);

    // Tambahkan label transparan agar lapisan satelit mudah dibaca dan profesional
    const labelTile = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; CARTO',
      maxZoom: 22,
      maxNativeZoom: 20,
    }).addTo(map);

    basemapLayerRef.current = satelliteTile;
    labelLayerRef.current = labelTile;

    mapRef.current = map;

    // Buat grup lapisan peta (layer groups)
    const sfpGroup = L.layerGroup().addTo(map);
    const odcGroup = L.layerGroup().addTo(map);
    const odpGroup = L.layerGroup().addTo(map);
    const onuGroup = L.layerGroup().addTo(map);
    const spliceGroup = L.layerGroup().addTo(map);
    const cablesGroup = L.layerGroup().addTo(map);
    const userGroup = L.layerGroup().addTo(map);

    layersRef.current = {
      sfp: sfpGroup,
      odc: odcGroup,
      odp: odpGroup,
      onu: onuGroup,
      splice: spliceGroup,
      cables: cablesGroup,
    };
    userLocationGroupRef.current = userGroup;

    // Nonaktifkan zoom klik ganda bawaan agar klik ganda memicu penanaman node baru
    map.doubleClickZoom.disable();

    const onDblClick = (e: L.LeafletMouseEvent) => {
      resetFormsForAdd(e.latlng.lat, e.latlng.lng);
    };

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (plantModeRef.current) {
        resetFormsForAdd(e.latlng.lat, e.latlng.lng);
      } else if (cablingModeRef.current && draftSourceRef.current) {
        setDraftVertices((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      }
    };

    map.on("dblclick", onDblClick);
    map.on("click", onMapClick);

    return () => {
      map.off("dblclick", onDblClick);
      map.off("click", onMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const locateUser = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation tidak didukung oleh browser ini.");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        const { latitude, longitude, accuracy } = position.coords;

        if (mapRef.current && userLocationGroupRef.current) {
          const map = mapRef.current;
          const userGroup = userLocationGroupRef.current;

          // Bersihkan penanda lokasi pengguna yang ada
          userGroup.clearLayers();

          // divIcon denyut biru dinamis untuk lokasi saat ini
          const gpsIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center w-8 h-8">
                <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-45"></div>
                <div class="relative w-4.5 h-4.5 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
              </div>`,
            className: "bg-transparent",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          // Tambahkan lingkaran akurasi
          const circle = L.circle([latitude, longitude], {
            radius: accuracy,
            color: "#1d4ed8",
            weight: 1.5,
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
            interactive: false,
          });

          // Tambahkan penanda (marker)
          const marker = L.marker([latitude, longitude], { icon: gpsIcon })
            .bindPopup(`
              <div class="p-1 text-slate-800">
                <div class="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">📍 Lokasi Anda Sekarang</div>
                <div class="text-[11px] text-slate-600">
                  Akurasi: <span class="font-bold text-slate-900">${accuracy.toFixed(1)} meter</span>
                </div>
                <div class="text-[10px] text-slate-400 font-mono mt-1.5">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</div>
              </div>
            `);

          userGroup.addLayer(circle);
          userGroup.addLayer(marker);

          // Arahkan peta ke lokasi pengguna (flyTo)
          map.flyTo([latitude, longitude], 16, {
            animate: true,
            duration: 1.5
          });

          // Buka popup penanda setelah transisi selesai
          setTimeout(() => {
            marker.openPopup();
          }, 1600);
        }
      },
      (err) => {
        setGpsLoading(false);
        console.error("GPS Geolocation error:", err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError("Izin lokasi ditolak browser/perangkat Anda.");
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsError("Sinyal posisi GPS tidak terdeteksi.");
            break;
          case err.TIMEOUT:
            setGpsError("Tenggat waktu pembacaan lokasi habis.");
            break;
          default:
            setGpsError("Gagal membaca koordinat GPS.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Sinkronisasikan pilihan basemap
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Hapus lapisan peta yang lama
    if (basemapLayerRef.current) {
      map.removeLayer(basemapLayerRef.current);
    }
    if (labelLayerRef.current) {
      map.removeLayer(labelLayerRef.current);
    }

    if (basemap === "satellite") {
      const satelliteTile = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 22,
        maxNativeZoom: 18,
      }).addTo(map);

      // Overlay label terang/transparan
      const labelTile = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; CARTO',
        maxZoom: 22,
        maxNativeZoom: 20,
      }).addTo(map);

      basemapLayerRef.current = satelliteTile;
      labelLayerRef.current = labelTile;
    } else {
      const darkTile = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 22,
        maxNativeZoom: 20,
      }).addTo(map);

      basemapLayerRef.current = darkTile;
      labelLayerRef.current = null;
    }
  }, [basemap]);

  // Perbaiki ketidakcocokan render ukuran/offset Leaflet setelah komponen dimuat & transisi kontainer selesai
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Perbarui ukuran peta segera (invalidateSize)
    map.invalidateSize();

    // Atur penundaan singkat untuk memastikan dimensi CSS akhir diterapkan sepenuhnya
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 50);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const timer3 = setTimeout(() => {
      map.invalidateSize();
    }, 550);

    const timer4 = setTimeout(() => {
      map.invalidateSize();
    }, 950);

    // Hitung ulang pada setiap aktivitas pengubahan ukuran jendela (window resize)
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Sinkronisasikan grup lapisan peta
  useEffect(() => {
    if (!mapRef.current) return;

    const { sfp, odc, odp, onu, splice, cables: cablesLayer } = layersRef.current;

    // Bersihkan data sebelumnya
    sfp.clearLayers();
    odc.clearLayers();
    odp.clearLayers();
    onu.clearLayers();
    splice.clearLayers();
    cablesLayer.clearLayers();

    // DIV ICON KUSTOM UNTUK TITIK VEKTOR KONTRAS TINGGI DENGAN LABEL OPSIONAL
    const createCustomIcon = (colorClass: string, isHighlighted: boolean, symbol: string, labelText?: string) => {
      return L.divIcon({
        html: `
          <div class="relative flex flex-col items-center justify-center">
            <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 ${isHighlighted ? "border-cyan-400 bg-cyan-900 shadow-lg scale-125 z-50 animate-pulse" : "border-slate-800 " + colorClass} text-white">
              <span class="text-xs font-semibold select-none">${symbol}</span>
              ${isHighlighted ? `<div class="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-slate-900"></div>` : ""}
            </div>
            ${labelText ? `
              <div class="absolute top-9 bg-slate-950/90 text-white text-[9px] px-1.5 py-0.5 rounded border border-slate-800 whitespace-nowrap shadow-md font-sans font-medium pointer-events-none z-[1000] scale-90 map-marker-label">
                ${labelText}
              </div>
            ` : ""}
          </div>`,
        className: "bg-transparent",
        iconSize: [32, 45],
        iconAnchor: [16, 16],
      });
    };

    // Fungsi pembantu untuk menghitung redaman splitter berdasarkan total port
    const getSplitterLoss = (ports: number): number => {
      switch (ports) {
        case 2: return 3.5;
        case 4: return 7.2;
        case 8: return 10.3;
        case 16: return 13.8;
        case 32: return 17.0;
        default:
          if (ports <= 0) return 0;
          return parseFloat((3.2 * Math.log2(ports) + 0.5).toFixed(2));
      }
    };



    // 1. TAMBAHKAN PENANDA SFP
    sfps.forEach((item) => {
      const isTraced = tracedNodeIds.includes(item.id);
      const isDraftSource = draftSource?.id === item.id;
      const icon = createCustomIcon("bg-rose-600", isTraced || isDraftSource, "CO");
      const marker = L.marker([item.latitude, item.longitude], { icon })
        .bindPopup(`
          <div class="p-1 dark:text-slate-200 min-w-[150px]">
            <div class="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Central Office SFP</div>
            <h4 class="font-bold text-sm text-slate-800 m-0">${item.name}</h4>
            <div class="grid grid-cols-2 gap-x-2 text-xs text-slate-600 mt-2">
              <div>Kode:</div><div class="font-mono text-slate-950 font-bold">${item.code}</div>
              <div>Slot/Port:</div><div class="text-slate-900">${item.slot} / ${item.port}</div>
              <div>Daya TX:</div><div class="font-semibold text-slate-900">${item.tx_power_dbm} dBm</div>
            </div>
            <div class="flex gap-1.5 mt-3 pt-2 border-t border-slate-100">
              <button id="btn-sfp-cabling-${item.id}" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[9px] py-1 px-1 rounded cursor-pointer transition-all">
                Tandai Kabel
              </button>
              <button id="btn-sfp-edit-${item.id}" class="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all">
                Edit
              </button>
              <button id="btn-sfp-delete-${item.id}" class="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all">
                Hapus
              </button>
            </div>
          </div>
        `);

      marker.on("popupopen", () => {
        document.getElementById(`btn-sfp-cabling-${item.id}`)?.addEventListener("click", () => {
          handleDraftClick("SFP", item.id, item.name);
          marker.closePopup();
        });
        document.getElementById(`btn-sfp-edit-${item.id}`)?.addEventListener("click", () => {
          openEditModal("SFP", item);
          marker.closePopup();
        });
        document.getElementById(`btn-sfp-delete-${item.id}`)?.addEventListener("click", () => {
          if (onDeleteSfp) onDeleteSfp(item.id);
          marker.closePopup();
        });
        if (onSelectNode) onSelectNode("SFP", item.id);
      });

      marker.on("click", () => {
        if (cablingModeRef.current) {
          setTimeout(() => marker.closePopup(), 0);
          handleDraftClick("SFP", item.id, item.name);
        }
      });

      sfp.addLayer(marker);
    });

    // 2. TAMBAHKAN PENANDA KABINET ODC
    odcs.forEach((item) => {
      const isTraced = tracedNodeIds.includes(item.id);
      const isDraftSource = draftSource?.id === item.id;
      const icon = createCustomIcon("bg-amber-600", isTraced || isDraftSource, "ODC");

      const parentSfp = findParentSfp(item.id);
      const odcLoss = Math.abs(item.splitter_loss_db);
      let attenuationHtml = "";

      if (parentSfp) {
        const txPower = parentSfp.tx_power_dbm;
        const estSignal = txPower - odcLoss;
        attenuationHtml = `
          <div class="text-[10px] text-indigo-500 font-bold mt-1.5 uppercase tracking-wide">Koneksi SFP Parent:</div>
          <div class="text-slate-800 text-xs font-bold font-mono pl-1">${parentSfp.code} (+${txPower.toFixed(2)} dBm)</div>
          <div class="text-[10px] text-indigo-500 font-bold mt-1 uppercase tracking-wide">Splitter ODC:</div>
          <div class="text-slate-800 text-xs pl-1 font-mono">${item.splitter_type} (-${odcLoss.toFixed(2)} dB)</div>
          <div class="text-[10px] text-cyan-600 font-extrabold mt-1.5 border-t border-slate-100 pt-1 uppercase tracking-wide">Total Redaman Jalur:</div>
          <div class="text-cyan-600 text-xs font-extrabold pl-1 font-mono">-${odcLoss.toFixed(2)} dB</div>
          <div class="text-[10px] text-emerald-600 font-extrabold mt-1 uppercase tracking-wide">Estimasi Daya Sinyal (Rx):</div>
          <div class="text-emerald-600 text-xs font-extrabold pl-1 font-mono">${estSignal.toFixed(2)} dBm</div>
        `;
      } else {
        attenuationHtml = `
          <div class="text-[10px] text-indigo-500 font-bold mt-1.5 uppercase tracking-wide">Splitter ODC:</div>
          <div class="text-slate-800 text-xs pl-1 font-mono">${item.splitter_type} (-${odcLoss.toFixed(2)} dB)</div>
          <div class="text-[10px] text-slate-400 italic mt-1.5 font-sans">(Tidak terhubung ke SFP Parent)</div>
        `;
      }

      const marker = L.marker([item.latitude, item.longitude], { icon })
        .bindPopup(`
          <div class="p-1 dark:text-slate-200 min-w-[170px] font-sans">
            <div class="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Hub ODC Utama</div>
            <h4 class="font-bold text-sm text-slate-800 m-0">${item.name}</h4>
            <div class="grid grid-cols-2 gap-x-2 text-xs text-slate-600 mt-2">
              <div>Kode:</div><div class="font-mono text-slate-950 font-bold">${item.code}</div>
              <div>Kapasitas:</div><div class="text-slate-900">${item.total_ports} Port</div>
            </div>
            <div class="mt-2 pt-2 border-t border-slate-100">
              ${attenuationHtml}
            </div>
            <div class="flex gap-1.5 mt-3 pt-2 border-t border-slate-100">
              <button id="btn-odc-cabling-${item.id}" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[9px] py-1 px-1 rounded cursor-pointer transition-all">
                Tandai Kabel
              </button>
              <button id="btn-odc-edit-${item.id}" class="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all">
                Edit
              </button>
              <button id="btn-odc-delete-${item.id}" class="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all">
                Hapus
              </button>
            </div>
          </div>
        `);

      marker.on("popupopen", () => {
        document.getElementById(`btn-odc-cabling-${item.id}`)?.addEventListener("click", () => {
          handleDraftClick("ODC", item.id, item.name);
          marker.closePopup();
        });
        document.getElementById(`btn-odc-edit-${item.id}`)?.addEventListener("click", () => {
          openEditModal("ODC", item);
          marker.closePopup();
        });
        document.getElementById(`btn-odc-delete-${item.id}`)?.addEventListener("click", () => {
          if (onDeleteOdc) onDeleteOdc(item.id);
          marker.closePopup();
        });
        if (onSelectNode) onSelectNode("ODC", item.id);
      });

      marker.on("click", () => {
        if (cablingModeRef.current) {
          setTimeout(() => marker.closePopup(), 0);
          handleDraftClick("ODC", item.id, item.name);
        }
      });

      odc.addLayer(marker);
    });

    // 3. TAMBAHKAN PENANDA KOTAK ODP
    odps.forEach((item) => {
      const isTraced = tracedNodeIds.includes(item.id);
      const isDraftSource = draftSource?.id === item.id;
      const icon = createCustomIcon("bg-sky-500", isTraced || isDraftSource, "ODP", item.name);

      const path = findUpstreamPath("ODP", item.id);
      const odpLoss = Math.abs(item.splitter_loss_db || getSplitterLoss(item.total_ports));
      let attenuationHtml = "";

      if (path && path.length > 1) {
        // Cari node induk (langkah sebelum ODP target pada jalur)
        const parentStep = path[path.length - 2];
        let parentName = "Unknown Parent";
        let parentCode = "";

        if (parentStep.type === "ODC") {
          const pNode = odcs.find(n => n.id === parentStep.id);
          parentName = pNode ? pNode.name : parentName;
          parentCode = pNode ? pNode.code : "";
        } else if (parentStep.type === "ODP") {
          const pNode = odps.find(n => n.id === parentStep.id);
          parentName = pNode ? pNode.name : parentName;
          parentCode = pNode ? pNode.code : "";
        }

        // Dapatkan daya pancar awal (txPower) dari SFP
        const sfpStep = path.find(step => step.type === "SFP");
        const sfpNode = sfpStep ? sfps.find(s => s.id === sfpStep.id) : null;
        const txPower = sfpNode ? sfpNode.tx_power_dbm : 3.0;

        // Hitung akumulasi redaman dari seluruh node induk di sepanjang jalur
        let cumulativeParentLoss = 0;
        for (let i = 0; i < path.length - 1; i++) {
          cumulativeParentLoss += path[i + 1].loss;
        }

        const inputSignal = txPower - cumulativeParentLoss;
        const estSignal = inputSignal - odpLoss;
        const totalLoss = cumulativeParentLoss + odpLoss;

        const parentLabel = parentStep.type === "ODC" ? "Koneksi ODC Parent:" : "Koneksi ODP Parent:";
        const portText = item.odc_port ? ` (Port ${item.odc_port})` : "";

        attenuationHtml = `
          <div class="text-[10px] text-indigo-500 font-bold mt-1.5 uppercase tracking-wide">${parentLabel}</div>
          <div class="text-slate-800 text-xs font-bold font-mono pl-1">${parentCode || parentName}${portText}</div>
          
          <div class="text-[10px] text-indigo-500 font-bold mt-1.5 uppercase tracking-wide">Daya Input dari Parent:</div>
          <div class="text-slate-800 text-xs font-bold font-mono pl-1">${inputSignal.toFixed(2)} dBm</div>
          
          <div class="text-[10px] text-indigo-500 font-bold mt-1 uppercase tracking-wide">Splitter ODP:</div>
          <div class="text-slate-800 text-xs pl-1 font-mono">1:${item.total_ports} (-${odpLoss.toFixed(2)} dB)</div>
          
          <div class="text-[10px] text-cyan-600 font-extrabold mt-1.5 border-t border-slate-100 pt-1 uppercase tracking-wide">Total Redaman Jalur:</div>
          <div class="text-cyan-600 text-xs font-extrabold pl-1 font-mono">-${totalLoss.toFixed(2)} dB</div>
          
          <div class="text-[10px] text-emerald-600 font-extrabold mt-1 uppercase tracking-wide">Estimasi Daya Sinyal (Rx):</div>
          <div class="text-emerald-600 text-xs font-extrabold pl-1 font-mono">${estSignal.toFixed(2)} dBm</div>
        `;
      } else {
        attenuationHtml = `
          <div class="text-[10px] text-indigo-500 font-bold mt-1.5 uppercase tracking-wide">Splitter ODP:</div>
          <div class="text-slate-800 text-xs pl-1 font-mono">1:${item.total_ports} (-${odpLoss.toFixed(2)} dB)</div>
          <div class="text-[10px] text-slate-400 italic mt-1.5 font-sans">(Tidak terhubung ke ODC Parent)</div>
        `;
      }

      // Hitung daftar status port dan ringkasannya
      const portStatusList: string[] = [];
      let totalUsed = 0;
      for (let p = 1; p <= item.total_ports; p++) {
        const connectedOnu = onus.find(o => o.odp_id === item.id && o.odp_port === p);
        const connectedChildOdp = odps.find(o => o.odc_id === item.id && o.odc_port === p);

        if (connectedOnu) {
          totalUsed++;
          portStatusList.push(`<div class="text-[10px] py-0.5 border-b border-slate-100 last:border-0 flex justify-between"><span class="font-mono font-bold text-slate-700">Port ${p}:</span> <span class="text-emerald-600 font-semibold truncate max-w-[110px]" title="${connectedOnu.name} (ONU)">${connectedOnu.name} (ONU)</span></div>`);
        } else if (connectedChildOdp) {
          totalUsed++;
          portStatusList.push(`<div class="text-[10px] py-0.5 border-b border-slate-100 last:border-0 flex justify-between"><span class="font-mono font-bold text-slate-700">Port ${p}:</span> <span class="text-sky-600 font-semibold truncate max-w-[110px]" title="${connectedChildOdp.name} (ODP)">${connectedChildOdp.name} (ODP)</span></div>`);
        } else {
          portStatusList.push(`<div class="text-[10px] py-0.5 border-b border-slate-100 last:border-0 flex justify-between"><span class="font-mono text-slate-400">Port ${p}:</span> <span class="text-slate-400 italic">Kosong</span></div>`);
        }
      }
      const totalFree = item.total_ports - totalUsed;

      const marker = L.marker([item.latitude, item.longitude], { icon })
        .bindPopup(`
          <div class="p-1 dark:text-slate-200 min-w-[190px] font-sans">
            <div class="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-1">Kotak Distribusi ODP</div>
            <h4 class="font-bold text-sm text-slate-800 m-0">${item.name}</h4>
            <div class="grid grid-cols-2 gap-x-2 text-xs text-slate-600 mt-2">
              <div>Kode:</div><div class="font-mono text-slate-950 font-bold">${item.code}</div>
              <div>Kapasitas:</div><div class="text-slate-900">${item.total_ports} Port</div>
              <div>Penggunaan:</div><div class="text-slate-900 font-semibold">${totalUsed} Terpakai / ${totalFree} Kosong</div>
            </div>
            <div class="mt-2 pt-2 border-t border-slate-100">
              ${attenuationHtml}
            </div>
            <div class="mt-2 pt-2 border-t border-slate-100">
              <div class="text-[10px] text-indigo-500 font-bold uppercase tracking-wide mb-1">Rincian Penggunaan Port:</div>
              <div class="max-h-[110px] overflow-y-auto pr-1 bg-slate-50/80 rounded p-1.5 border border-slate-100">
                ${portStatusList.join("")}
              </div>
            </div>
            <div class="flex gap-1.5 mt-3 pt-2 border-t border-slate-100">
              <button id="btn-odp-cabling-${item.id}" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[9px] py-1 px-1 rounded cursor-pointer transition-all">
                Tandai Kabel
              </button>
              <button id="btn-odp-edit-${item.id}" class="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all">
                Edit
              </button>
              <button id="btn-odp-delete-${item.id}" class="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all">
                Hapus
              </button>
            </div>
          </div>
        `);

      marker.on("popupopen", () => {
        document.getElementById(`btn-odp-cabling-${item.id}`)?.addEventListener("click", () => {
          handleDraftClick("ODP", item.id, item.name);
          marker.closePopup();
        });
        document.getElementById(`btn-odp-edit-${item.id}`)?.addEventListener("click", () => {
          openEditModal("ODP", item);
          marker.closePopup();
        });
        document.getElementById(`btn-odp-delete-${item.id}`)?.addEventListener("click", () => {
          if (onDeleteOdp) onDeleteOdp(item.id);
          marker.closePopup();
        });
        if (onSelectNode) onSelectNode("ODP", item.id);
      });

      marker.on("click", () => {
        if (cablingModeRef.current) {
          setTimeout(() => marker.closePopup(), 0);
          handleDraftClick("ODP", item.id, item.name);
        }
      });

      odp.addLayer(marker);
    });

    // 4. TAMBAHKAN PENANDA ONU PELANGGAN
    onus.forEach((item) => {
      const isTraced = tracedNodeIds.includes(item.id);
      const isDraftSource = draftSource?.id === item.id;
      const icon = createCustomIcon("bg-emerald-600", isTraced || isDraftSource, "ONU", item.name);

      const parentOdp = odps.find(o => o.id === item.odp_id);
      let attenuationHtml = "";
      if (parentOdp) {
        const path = findUpstreamPath("ODP", parentOdp.id);
        const odpLoss = Math.abs(parentOdp.splitter_loss_db || getSplitterLoss(parentOdp.total_ports));
        let odpOutputSignal = -25.0;

        if (path && path.length > 0) {
          const sfpStep = path.find(step => step.type === "SFP");
          const sfpNode = sfpStep ? sfps.find(s => s.id === sfpStep.id) : null;
          const txPower = sfpNode ? sfpNode.tx_power_dbm : 3.0;

          let cumulativeParentLoss = 0;
          for (let i = 0; i < path.length - 1; i++) {
            cumulativeParentLoss += path[i + 1].loss;
          }
          odpOutputSignal = txPower - cumulativeParentLoss - odpLoss;
        }

        const connectorLoss = 0.50;
        const estSignal = odpOutputSignal - connectorLoss;
        const portText = item.odp_port ? ` (Port ${item.odp_port})` : "";

        attenuationHtml = `
          <div class="mt-2 pt-2 border-t border-slate-100">
            <div class="text-[10px] text-indigo-500 font-bold uppercase tracking-wide">Koneksi ODP Parent:</div>
            <div class="text-slate-800 text-xs font-bold font-mono pl-1">${parentOdp.code}${portText}</div>
            
            <div class="text-[10px] text-indigo-500 font-bold mt-1 uppercase tracking-wide">Daya Input dari ODP:</div>
            <div class="text-slate-800 text-xs font-bold font-mono pl-1">${odpOutputSignal.toFixed(2)} dBm</div>
            
            <div class="text-[10px] text-emerald-600 font-extrabold mt-1.5 border-t border-slate-100 pt-1 uppercase tracking-wide">Estimasi Daya Sinyal (Rx):</div>
            <div class="text-emerald-600 text-xs font-extrabold pl-1 font-mono">${estSignal.toFixed(2)} dBm</div>
          </div>
        `;
      }

      const marker = L.marker([item.latitude, item.longitude], { icon })
        .bindPopup(`
          <div class="p-1 dark:text-slate-200 min-w-[150px] font-sans">
            <div class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Terminal Pelanggan (ONU)</div>
            <h4 class="font-bold text-sm text-slate-800 m-0">${item.name}</h4>
            <div class="grid grid-cols-2 gap-x-2 text-xs text-slate-600 mt-2">
              <div>Kode:</div><div class="font-mono text-slate-950 font-bold">${item.code}</div>
              <div>ID Pelanggan:</div><div class="text-slate-800 font-mono break-all">${item.customer_id || "-"}</div>
              <div>Remote Address:</div><div class="text-slate-800 font-mono break-all">${item.remote_address || "-"}</div>
            </div>
            ${attenuationHtml}
            <div class="flex gap-1.5 mt-3 pt-2 border-t border-slate-100">
              <button id="btn-onu-cabling-${item.id}" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[9px] py-1 px-1 rounded cursor-pointer transition-all">
                Tandai Kabel
              </button>
              <button id="btn-onu-edit-${item.id}" class="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all">
                Edit
              </button>
              <button id="btn-onu-delete-${item.id}" class="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all">
                Hapus
              </button>
            </div>
          </div>
        `);

      marker.on("popupopen", () => {
        document.getElementById(`btn-onu-cabling-${item.id}`)?.addEventListener("click", () => {
          handleDraftClick("ONU", item.id, item.name);
          marker.closePopup();
        });
        document.getElementById(`btn-onu-edit-${item.id}`)?.addEventListener("click", () => {
          openEditModal("ONU", item);
          marker.closePopup();
        });
        document.getElementById(`btn-onu-delete-${item.id}`)?.addEventListener("click", () => {
          if (onDeleteOnu) onDeleteOnu(item.id);
          marker.closePopup();
        });
        if (onSelectNode) onSelectNode("ONU", item.id);
      });

      marker.on("click", () => {
        if (cablingModeRef.current) {
          setTimeout(() => marker.closePopup(), 0);
          handleDraftClick("ONU", item.id, item.name);
        }
      });

      onu.addLayer(marker);
    });

    // 5. TAMBAHKAN PENANDA SAMBUNGAN (SPLICE)
    splices.forEach((item) => {
      const isDraftSource = draftSource?.id === item.id;
      const icon = L.divIcon({
        html: `
          <div class="flex items-center justify-center w-6 h-6 rounded-full border ${isDraftSource ? "border-cyan-400 bg-cyan-900 text-cyan-300 animate-pulse scale-125 z-50" : "border-slate-700 bg-yellow-500 text-slate-900"} shadow-md transform hover:scale-110 transition-all font-bold text-[10px]">
             SP
          </div>`,
        className: "bg-transparent",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const marker = L.marker([item.latitude, item.longitude], { icon })
        .bindPopup(`
          <div class="p-1 dark:text-slate-200 min-w-[150px]">
            <div class="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-1">Titik Sambung (Splice)</div>
            <h4 class="font-bold text-sm text-slate-800 m-0">${item.splice_name}</h4>
            <div class="grid grid-cols-2 gap-x-2 text-xs text-slate-600 mt-2">
              <div>Kode:</div><div class="font-mono text-slate-950 font-bold">${item.splice_code}</div>
              <div>Tipe:</div><div class="text-slate-900">${item.splice_type}</div>
              <div>Redaman:</div><div class="font-semibold text-slate-900">${item.loss_db} dB</div>
            </div>
            <div class="flex gap-1.5 mt-3 pt-2 border-t border-slate-100">
              <button id="btn-spl-cabling-${item.id}" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[9px] py-1 px-1 rounded cursor-pointer transition-all">
                Tandai Kabel
              </button>
              <button id="btn-spl-edit-${item.id}" class="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all">
                Edit
              </button>
              <button id="btn-spl-delete-${item.id}" class="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all">
                Hapus
              </button>
            </div>
          </div>
        `);

      marker.on("popupopen", () => {
        document.getElementById(`btn-spl-cabling-${item.id}`)?.addEventListener("click", () => {
          handleDraftClick("SPLICE", item.id, item.splice_name);
          marker.closePopup();
        });
        document.getElementById(`btn-spl-edit-${item.id}`)?.addEventListener("click", () => {
          openEditModal("SPLICE", item);
          marker.closePopup();
        });
        document.getElementById(`btn-spl-delete-${item.id}`)?.addEventListener("click", () => {
          if (onDeleteSplice) onDeleteSplice(item.id);
          marker.closePopup();
        });
        if (onSelectNode) onSelectNode("SPLICE", item.id);
      });

      marker.on("click", () => {
        if (cablingModeRef.current) {
          setTimeout(() => marker.closePopup(), 0);
          handleDraftClick("SPLICE", item.id, item.splice_name);
        }
      });

      splice.addLayer(marker);
    });

    // 6. RENDER RUTE KABEL SERAT OPTIK (POLILINE)
    cables.forEach((cable) => {
      // Sembunyikan render kabel biasa jika kabel sedang dalam proses pengeditan geometri rute
      if (editingCableGeom && editingCableGeom.id === cable.id) {
        return;
      }

      const isTraced = tracedCableIds.includes(cable.id);

      // Perbedaan gaya visual untuk kabel feeder, distribusi, dan drop
      let strokeColor = "#38bdf8"; // default warna biru langit (sky blue)
      let weight = 3;
      let dashArray = undefined;

      if (cable.cable_code.includes("CO") || cable.cable_name.toLowerCase().includes("feeder")) {
        strokeColor = "#f43f5e"; // merah muda terang (rose) untuk kabel backbone kapasitas tinggi
        weight = 5;
      } else if (cable.cable_name.toLowerCase().includes("drop")) {
        strokeColor = "#10b981"; // hijau zamrud (emerald) untuk kabel drop ke rumah
        weight = 2.5;
        dashArray = "4, 6";
      }

      // Sorotan neon jika aktif dalam jalur pelacakan ONU
      if (!cable.geometry_line || !Array.isArray(cable.geometry_line) || cable.geometry_line.length === 0) {
        return;
      }

      const polyline = L.polyline(cable.geometry_line, {
        color: isTraced ? "#22d3ee" : strokeColor,
        weight: isTraced ? 8 : weight,
        opacity: isTraced ? 1.0 : 0.65,
        dashArray: isTraced ? undefined : dashArray,
        className: isTraced 
          ? "cable-flow-traced" 
          : (cable.cable_code.includes("CO") || cable.cable_name.toLowerCase().includes("feeder"))
            ? "cable-flow-feeder"
            : cable.cable_name.toLowerCase().includes("drop")
              ? "cable-flow-drop"
              : "cable-flow-distribution",
      });

      // Lapisan kabel transparan lebar (width 18px) untuk mempermudah klik/hover mouse
      const clickToleranceLine = L.polyline(cable.geometry_line, {
        color: "transparent",
        weight: 18,
        opacity: 0,
        interactive: true,
      }).bindPopup(`
        <div class="p-1 dark:text-slate-200 min-w-[170px]">
          <div class="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1">Segmen Rute Kabel Serat</div>
          <h4 class="font-bold text-sm text-slate-800 m-0">${cable.cable_name}</h4>
          <div class="grid grid-cols-2 gap-x-2 text-xs text-slate-600 mt-2">
            <div>Kode:</div><div class="font-mono text-slate-900">${cable.cable_code}</div>
            <div>Panjang:</div><div class="font-semibold text-slate-900">${(cable.length_km * 1000).toFixed(0)} m</div>
            <div>Inti Core:</div><div class="text-slate-900">${cable.total_cores} Core</div>
            <div>Tipe Kabel:</div><div class="text-slate-950 font-medium">${cable.cable_type}</div>
            <div>Sambungan:</div><div class="text-slate-950 font-bold">${cable.splice_count} Splice</div>
            <div>Dari:</div><div class="text-slate-900">${cable.from_node_type}</div>
            <div>Ke:</div><div class="text-slate-900">${cable.to_node_type}</div>
          </div>
          <div class="flex gap-1.5 mt-3 pt-2 border-t border-slate-100 shrink-0">
            <button id="btn-cable-edit-${cable.id}" class="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all border-none">
              Edit Detail
            </button>
            <button id="btn-cable-delete-${cable.id}" class="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px] py-1 px-1.5 rounded cursor-pointer transition-all border-none">
              Hapus
            </button>
          </div>
        </div>
      `);

      clickToleranceLine.on("popupopen", () => {
        document.getElementById(`btn-cable-edit-${cable.id}`)?.addEventListener("click", () => {
          openEditModal("CABLE", cable);
          clickToleranceLine.closePopup();
        });
        document.getElementById(`btn-cable-delete-${cable.id}`)?.addEventListener("click", () => {
          if (onDeleteCable) onDeleteCable(cable.id);
          clickToleranceLine.closePopup();
        });
      });

      // Klik ganda pada kabel untuk masuk ke Mode Edit Rute (Geometri Rute Belok-Belok)
      clickToleranceLine.on("dblclick", (e: any) => {
        L.DomEvent.stopPropagation(e);
        clickToleranceLine.closePopup();
        setEditingCableGeom({ id: cable.id, coords: [...cable.geometry_line] });
      });

      // Efek Hover: Menebalkan dan memperjelas garis kabel asli saat kursor mendekati rute
      clickToleranceLine.on("mouseover", () => {
        polyline.setStyle({ opacity: 1.0, weight: isTraced ? 10 : weight + 2 });
      });
      clickToleranceLine.on("mouseout", () => {
        polyline.setStyle({ opacity: isTraced ? 1.0 : 0.65, weight: isTraced ? 8 : weight });
      });

      cablesLayer.addLayer(polyline);
      cablesLayer.addLayer(clickToleranceLine);
    });

    // 7. RENDER DRAFT RUTE KABEL DENGAN BELOKAN
    if (draftSource) {
      const startPos = getNodePos(draftSource.type, draftSource.id);
      if (startPos) {
        const lineCoords = [startPos, ...draftVertices];
        
        const draftPolyline = L.polyline(lineCoords, {
          color: "#f97316",
          weight: 4,
          opacity: 0.8,
          dashArray: "6, 6",
        });
        cablesLayer.addLayer(draftPolyline);

        draftVertices.forEach((vertex, vIndex) => {
          const vertexMarker = L.circleMarker(vertex, {
            radius: 5,
            color: "#ea580c",
            fillColor: "#fff",
            fillOpacity: 1.0,
            weight: 2,
          }).bindTooltip(`Tikungan ${vIndex + 1}<br><span class="text-[9px] text-slate-400">Klik kanan untuk hapus</span>`, { direction: "top" });

          vertexMarker.on("contextmenu", (e) => {
            L.DomEvent.stopPropagation(e);
            setDraftVertices((prev) => prev.filter((_, idx) => idx !== vIndex));
          });

          cablesLayer.addLayer(vertexMarker);
        });
      }
    }

    // 8. RENDER EDITOR GEOMETRI KABEL (TITIK YANG DAPAT DIGESER)
    if (editingCableGeom) {
      const currentCoords = [...editingCableGeom.coords];

      const editPolyline = L.polyline(currentCoords, {
        color: "#ea580c",
        weight: 5,
        opacity: 0.9,
        dashArray: "4, 4"
      });
      cablesLayer.addLayer(editPolyline);

      // Render penanda titik sudut (koordinat yang sudah ada)
      currentCoords.forEach((coord, index) => {
        const isEndpoint = index === 0 || index === currentCoords.length - 1;

        const markerIcon = L.divIcon({
          className: "custom-vertex-icon",
          html: `<div style="width: 10px; height: 10px; background-color: white; border: 2px solid ${isEndpoint ? '#94a3b8' : '#ea580c'}; border-radius: 50%; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        });

        const vertexMarker = L.marker(coord, {
          icon: markerIcon,
          draggable: !isEndpoint,
          zIndexOffset: 1000
        });

        if (!isEndpoint) {
          vertexMarker.on("drag", (e: any) => {
            const newLatLng = e.target.getLatLng();
            currentCoords[index] = [newLatLng.lat, newLatLng.lng];
            editPolyline.setLatLngs(currentCoords);
          });

          vertexMarker.on("dragend", () => {
            setEditingCableGeom({ ...editingCableGeom, coords: [...currentCoords] });
          });

          vertexMarker.on("dblclick", (e: any) => {
            L.DomEvent.stopPropagation(e);
            const filteredCoords = currentCoords.filter((_, idx) => idx !== index);
            setEditingCableGeom({ ...editingCableGeom, coords: filteredCoords });
          });

          vertexMarker.bindTooltip("Seret untuk melengkungkan<br>Klik ganda untuk hapus titik", { direction: "top" });
        } else {
          vertexMarker.bindTooltip("Titik Ujung (Terkunci pada perangkat)", { direction: "top" });
        }

        cablesLayer.addLayer(vertexMarker);
      });

      // Render penanda titik tengah untuk memungkinkan penambahan belokan baru
      for (let i = 0; i < currentCoords.length - 1; i++) {
        const p1 = currentCoords[i];
        const p2 = currentCoords[i + 1];
        const midLat = (p1[0] + p2[0]) / 2;
        const midLng = (p1[1] + p2[1]) / 2;

        const midIcon = L.divIcon({
          className: "custom-midpoint-icon",
          html: `<div style="width: 8px; height: 8px; background-color: #fbd5c0; border: 1.5px solid #ea580c; border-radius: 50%; opacity: 0.8; box-shadow: 0 0 3px rgba(0,0,0,0.3);"></div>`,
          iconSize: [8, 8],
          iconAnchor: [4, 4]
        });

        const midMarker = L.marker([midLat, midLng], {
          icon: midIcon,
          draggable: true,
          zIndexOffset: 900
        }).bindTooltip("Tarik untuk menambah tikungan baru", { direction: "top" });

        midMarker.on("dragstart", (e: any) => {
          const latLng = e.target.getLatLng();
          currentCoords.splice(i + 1, 0, [latLng.lat, latLng.lng]);
          editPolyline.setLatLngs(currentCoords);
        });

        midMarker.on("drag", (e: any) => {
          const latLng = e.target.getLatLng();
          currentCoords[i + 1] = [latLng.lat, latLng.lng];
          editPolyline.setLatLngs(currentCoords);
        });

        midMarker.on("dragend", () => {
          setEditingCableGeom({ ...editingCableGeom, coords: [...currentCoords] });
        });

        cablesLayer.addLayer(midMarker);
      }
    }

    // Secara otomatis sesuaikan batas peta sekali saat data dimuat agar fokus pada lokasi aset riil
    if (!hasFitBoundsRef.current && (sfps.length > 0 || odcs.length > 0 || odps.length > 0 || onus.length > 0)) {
      const coords: L.LatLngTuple[] = [];
      sfps.forEach(item => coords.push([item.latitude, item.longitude]));
      odcs.forEach(item => coords.push([item.latitude, item.longitude]));
      odps.forEach(item => coords.push([item.latitude, item.longitude]));
      onus.forEach(item => coords.push([item.latitude, item.longitude]));

      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        hasFitBoundsRef.current = true;
      }
    }

  }, [
    sfps,
    odcs,
    odps,
    onus,
    splices,
    cables,
    tracedCableIds,
    tracedNodeIds,
    onDeleteSfp,
    onDeleteOdc,
    onDeleteOdp,
    onDeleteOnu,
    onDeleteSplice,
    onDeleteCable,
    onUpdateCable,
    onSelectNode,
    draftSource,
    draftVertices,
    editingCableGeom,
    findParentOdc,
    findParentSfp
  ]);

  // Tangani alur pemilihan penggambaran kabel (drafting)
  const handleDraftClick = (type: string, id: string, name: string) => {
    if (!draftSource) {
      setDraftSource({ type, id, name });
    } else {
      if (draftSource.id === id) {
        setDraftSource(null);
        return;
      }
      if (onAddCableClick) {
        onAddCableClick(draftSource.type, draftSource.id, type, id, draftVertices).then((createdCable) => {
          if (createdCable) {
            openEditModal("CABLE", createdCable);
          }
        });
      }
      setDraftSource(null);
    }
  };

  return (
    <div id="gis-viewport" className="relative w-full h-[540px] md:h-[620px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col">
      {/* Floating Control Bar for Geometry Route Editing */}
      {editingCableGeom && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur border border-amber-600 rounded-lg p-3 z-[1001] shadow-2xl flex items-center gap-3 min-w-[340px]">
          <div className="text-xs text-slate-200">
            <span className="text-amber-400 font-bold">Mode Edit Rute:</span> Geser bulatan putih untuk menekuk kabel. Klik ganda bulatan untuk hapus tikungan.
          </div>
          <button
            type="button"
            onClick={() => saveCableGeometry()}
            className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] px-2.5 py-1.5 rounded font-bold cursor-pointer transition-all shrink-0 border-none"
          >
            Simpan Rute
          </button>
          <button
            type="button"
            onClick={() => setEditingCableGeom(null)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2.5 py-1.5 rounded cursor-pointer transition-all shrink-0 border-none"
          >
            Batal
          </button>
        </div>
      )}
      {/* Dynamic Header Controls Overlay */}
      {!showOverlay ? (
        <button
          type="button"
          onClick={() => setShowOverlay(true)}
          className="absolute top-4 left-4 z-[1001] bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-800 p-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all text-slate-200"
          title="Tampilkan Kontrol Overlay"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Tampilkan Kontrol</span>
        </button>
      ) : (
        <div className="absolute top-4 left-4 z-[1001] bg-slate-900/90 backdrop-blur-md border border-slate-800 py-2.5 px-4 rounded-lg flex flex-col gap-2 shadow-lg max-w-xs md:max-w-md">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase">Kontrol Overlay GIS</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-slate-800 text-slate-400 py-0.5 px-1.5 rounded border border-slate-700">WGS84</span>
              <button
                type="button"
                onClick={() => setShowOverlay(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer border-none bg-transparent flex items-center justify-center transition-all"
                title="Sembunyikan Kontrol"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tipe Peta selector */}
          <div className="flex items-center gap-1.5 py-1.5 border-y border-slate-800/60 my-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tipe Peta:</span>
            <button
              type="button"
              onClick={() => setBasemap("satellite")}
              className={`text-[9.5px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer border ${basemap === "satellite"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm"
                  : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                }`}
            >
              🛰️ Satelit Hybrid
            </button>
            <button
              type="button"
              onClick={() => setBasemap("dark")}
              className={`text-[9.5px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer border ${basemap === "dark"
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm"
                  : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                }`}
            >
              🌑 Mode Gelap
            </button>
          </div>

          {/* Peralatan Cepat */}
          <div className="flex flex-col gap-1.5 pb-1.5 border-b border-slate-800/60 my-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Peralatan Cepat:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPlantMode(!plantMode);
                  setCablingMode(false);
                }}
                className={`flex-1 text-[9.5px] font-bold px-2 py-1.5 rounded transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${plantMode
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
                    : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-350"
                  }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Mode Pasang Node
              </button>
              <button
                type="button"
                onClick={() => {
                  setCablingMode(!cablingMode);
                  setPlantMode(false);
                }}
                className={`flex-1 text-[9.5px] font-bold px-2 py-1.5 rounded transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${cablingMode
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm"
                    : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-350"
                  }`}
              >
                <Edit className="w-3.5 h-3.5" />
                Hubung Kabel
              </button>
            </div>
          </div>

          {/* GPS Geolocation Control */}
          <div className="flex flex-col gap-1.5 pb-1.5 border-b border-slate-800/60 my-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-medium">GPS Presisi:</span>
              <button
                type="button"
                onClick={locateUser}
                disabled={gpsLoading}
                className={`text-[9.5px] font-bold px-3 py-1 rounded transition-all cursor-pointer border flex items-center gap-1.5 ${gpsLoading
                    ? "bg-blue-500/15 border-blue-500/30 text-blue-300 animate-pulse"
                    : "bg-blue-600/10 border-blue-600/35 hover:bg-blue-600/20 text-blue-300 shadow-sm"
                  }`}
              >
                <Compass className={`w-3.5 h-3.5 text-blue-400 ${gpsLoading ? "animate-spin" : ""}`} />
                {gpsLoading ? "Mencari GPS..." : "🎯 Temukan Lokasi Saya"}
              </button>
            </div>
            {gpsError && (
              <div className="text-[9px] text-rose-300 font-medium leading-tight bg-rose-950/40 border border-rose-900/40 px-2.5 py-1 rounded">
                ⚠️ {gpsError}
              </div>
            )}
          </div>

          {/* Toggle Layers Switches Grid */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            <button
              onClick={() => toggleLayer("sfp")}
              className={`text-[10px] py-1 px-2 rounded border font-medium cursor-pointer flex items-center gap-1.5 transition-all text-left ${layers.sfp ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              SFP Pusat
            </button>
            <button
              onClick={() => toggleLayer("odc")}
              className={`text-[10px] py-1 px-2 rounded border font-medium cursor-pointer flex items-center gap-1.5 transition-all text-left ${layers.odc ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Hub ODC
            </button>
            <button
              onClick={() => toggleLayer("odp")}
              className={`text-[10px] py-1 px-2 rounded border font-medium cursor-pointer flex items-center gap-1.5 transition-all text-left ${layers.odp ? "bg-sky-500/10 border-sky-500/30 text-sky-300" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              ODP Tiang
            </button>
            <button
              onClick={() => toggleLayer("onu")}
              className={`text-[10px] py-1 px-2 rounded border font-medium cursor-pointer flex items-center gap-1.5 transition-all text-left ${layers.onu ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              ONU Pelanggan
            </button>
            <button
              onClick={() => toggleLayer("splice")}
              className={`text-[10px] py-1 px-2 rounded border font-medium cursor-pointer flex items-center gap-1.5 transition-all text-left ${layers.splice ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
              Sambungan
            </button>
            <button
              onClick={() => toggleLayer("cables")}
              className={`text-[10px] py-1 px-2 rounded border font-medium cursor-pointer flex items-center gap-1.5 transition-all text-left ${layers.cables ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Kabel Serat
            </button>
          </div>

          {/* Cable Drafting Instructions block */}
          {draftSource ? (
            <div className="mt-2 py-1 px-2.5 bg-cyan-950/50 border border-cyan-800/40 text-cyan-200 rounded text-[10px] flex items-center justify-between animate-pulse">
              <div>
                <span>Menggambar Serat: </span>
                <strong className="text-white">{draftSource.name}</strong> &rarr; Klik node tujuan untuk menghubungkan!
              </div>
              <button onClick={() => setDraftSource(null)} className="ml-2 text-red-400 hover:text-red-300 font-bold cursor-pointer">Batal</button>
            </div>
          ) : (
            <p className="text-[9px] text-slate-500 mt-1 italic">
              *Petunjuk: Untuk memetakan rute kabel baru, klik penanda peta mana saja lalu pilih "Tandai Ujung Kabel", kemudian klik penanda tujuan!
            </p>
          )}
        </div>
      )}

      {/* Dynamic Instruction Banner */}
      {(plantMode || cablingMode || showTip) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-slate-900/95 backdrop-blur-md border border-slate-800 text-[10px] py-1.5 px-4 rounded-full shadow-lg text-slate-200 flex items-center gap-2 font-semibold">
          {plantMode ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span className="text-amber-300">Mode Pasang Aktif:</span> Klik sekali pada peta untuk membuat perangkat baru!
            </>
          ) : cablingMode ? (
            <>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-cyan-300">Mode Hubung Aktif:</span> Klik dua perangkat bergantian untuk langsung menyambung kabel!
            </>
          ) : (
            <>
              <span className="text-cyan-400 font-bold">💡</span>
              <span>Double-klik area peta kosong untuk memasang perangkat baru secara presisi!</span>
              <button
                type="button"
                onClick={() => {
                  setShowTip(false);
                  localStorage.setItem("hasSeenGisTip", "true");
                }}
                className="text-slate-400 hover:text-white ml-1.5 focus:outline-none cursor-pointer text-xs border-none bg-transparent"
              >
                ×
              </button>
            </>
          )}
        </div>
      )}

      {/* Interactive Map-Based CRUD Drawer */}
      {showCreateModal && (
        <div id="gis-crud-drawer" className="absolute top-4 right-4 bottom-4 w-80 z-[1002] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg flex flex-col shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-800 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {editingAsset ? "Edit Detail Perangkat" : "Pasang Node Baru"}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Koordinat: {clickedCoords?.lat.toFixed(6)}, {clickedCoords?.lng.toFixed(6)}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Asset Type Selector Tab - ONLY SHOW IF ADDING NEW */}
          {!editingAsset && (
            <div className="p-2 bg-slate-950/40 border-b border-slate-850 shrink-0 flex flex-wrap gap-1">
              {(["SFP", "ODC", "ODP", "ONU", "SPLICE"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setCreateAssetType(type)}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-all cursor-pointer ${createAssetType === type
                      ? "bg-cyan-500 text-white shadow"
                      : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {/* Main Form Area */}
          <div className="flex-1 p-3 space-y-3">
            {/* 1. SFP FORM */}
            {(editingAsset?.type === "SFP" || (!editingAsset && createAssetType === "SFP")) && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Kode SFP</label>
                  <input
                    type="text"
                    value={sfpForm.code}
                    onChange={(e) => setSfpForm({ ...sfpForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Nama Central Office</label>
                  <input
                    type="text"
                    value={sfpForm.name}
                    onChange={(e) => setSfpForm({ ...sfpForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Slot</label>
                    <input
                      type="number"
                      value={sfpForm.slot}
                      onChange={(e) => setSfpForm({ ...sfpForm, slot: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Port Number</label>
                    <input
                      type="number"
                      value={sfpForm.port}
                      onChange={(e) => setSfpForm({ ...sfpForm, port: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Daya TX Power (dBm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={sfpForm.tx_power_dbm}
                    onChange={(e) => setSfpForm({ ...sfpForm, tx_power_dbm: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Deskripsi / Lokasi</label>
                  <textarea
                    value={sfpForm.description}
                    onChange={(e) => setSfpForm({ ...sfpForm, description: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* 2. ODC FORM */}
            {(editingAsset?.type === "ODC" || (!editingAsset && createAssetType === "ODC")) && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Kode ODC</label>
                  <input
                    type="text"
                    value={odcForm.code}
                    onChange={(e) => setOdcForm({ ...odcForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Nama Kabinet ODC</label>
                  <input
                    type="text"
                    value={odcForm.name}
                    onChange={(e) => setOdcForm({ ...odcForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Tipe Splitter</label>
                    <select
                      value={odcForm.splitter_type}
                      onChange={(e) => {
                        const type = e.target.value;
                        const ports = type === "1:2" ? 2 : type === "1:4" ? 4 : type === "1:8" ? 8 : type === "1:16" ? 16 : 32;
                        const loss = type === "1:2" ? 3.5 : type === "1:4" ? 7.2 : type === "1:8" ? 10.3 : type === "1:16" ? 13.8 : 17.0;
                        setOdcForm({ ...odcForm, splitter_type: type, total_ports: ports, splitter_loss_db: loss });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="1:2">1:2</option>
                      <option value="1:4">1:4</option>
                      <option value="1:8">1:8</option>
                      <option value="1:16">1:16</option>
                      <option value="1:32">1:32</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Splitter Loss (dB)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={odcForm.splitter_loss_db}
                      onChange={(e) => setOdcForm({ ...odcForm, splitter_loss_db: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                {editingAsset?.type === "ODC" && (() => {
                  const parentSfp = findParentSfp(editingAsset.id);
                  if (!parentSfp) return null;
                  const txPower = parentSfp.tx_power_dbm;
                  const estimatedSignal = txPower - odcForm.splitter_loss_db;
                  return (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-300 block">Total Redaman (dBm)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={Number(estimatedSignal.toFixed(2))}
                        onChange={(e) => {
                          const newEst = Number(e.target.value);
                          const newLoss = txPower - newEst;
                          setOdcForm({ ...odcForm, splitter_loss_db: Number(newLoss.toFixed(2)) });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-emerald-400 font-bold font-mono focus:outline-none focus:border-emerald-500"
                        placeholder="Total Redaman"
                      />
                      <span className="text-[10px] text-slate-500 block italic leading-tight">
                        Mengubah kolom ini otomatis mengubah Splitter Loss (dB) dengan rumus: <span className="font-mono">Tx Power ({txPower.toFixed(2)} dBm) - Total Redaman</span>.
                      </span>
                    </div>
                  );
                })()}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Kapasitas Port</label>
                  <input
                    type="number"
                    value={odcForm.total_ports}
                    onChange={(e) => setOdcForm({ ...odcForm, total_ports: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Informasi Lokasi</label>
                  <textarea
                    value={odcForm.description}
                    onChange={(e) => setOdcForm({ ...odcForm, description: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* 3. ODP FORM */}
            {(editingAsset?.type === "ODP" || (!editingAsset && createAssetType === "ODP")) && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Kode ODP</label>
                  <input
                    type="text"
                    value={odpForm.code}
                    onChange={(e) => setOdpForm({ ...odpForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Nama Kotak ODP</label>
                  <input
                    type="text"
                    value={odpForm.name}
                    onChange={(e) => setOdpForm({ ...odpForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Koneksi Supply (ODC / ODP Parent)</label>
                  <select
                    value={odpForm.odc_id}
                    onChange={(e) => setOdpForm({ ...odpForm, odc_id: e.target.value, odc_port: 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Hubungkan ke ODC atau ODP --</option>
                    <optgroup label="Kabinet ODC">
                      {odcs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.code})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Kotak ODP (Cascading)">
                      {odps.filter((o) => o.id !== editingAsset?.id).map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.code})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {odpForm.odc_id && (() => {
                    const parentOdc = odcs.find((o) => o.id === odpForm.odc_id);
                    const parentOdp = odps.find((o) => o.id === odpForm.odc_id);
                    const totalPorts = parentOdc ? parentOdc.total_ports : (parentOdp ? parentOdp.total_ports : 8);
                    const parentLabel = parentOdp ? "Port ODP Induk" : "Port ODC Induk";

                    const occupiedPorts = new Set<number>();
                    odps.forEach(odp => {
                      if (odp.odc_id === odpForm.odc_id && odp.id !== editingAsset?.id && odp.odc_port) {
                        occupiedPorts.add(odp.odc_port);
                      }
                    });

                    return (
                      <div className="space-y-1">
                        <label className="font-bold text-slate-300 block">{parentLabel}</label>
                        <select
                          value={odpForm.odc_port}
                          onChange={(e) => setOdpForm({ ...odpForm, odc_port: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="0">-- Pilih Port --</option>
                          {Array.from({ length: totalPorts }, (_, i) => i + 1)
                            .filter(p => !occupiedPorts.has(p) || p === odpForm.odc_port)
                            .map((p) => (
                              <option key={p} value={p}>
                                Port {p}
                              </option>
                            ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Port Maks (Kapasitas Pelanggan)</label>
                  <input
                    type="number"
                    value={odpForm.total_ports}
                    onChange={(e) => {
                      const ports = Number(e.target.value);
                      const getLoss = (p: number) => {
                        switch (p) {
                          case 2: return 3.5;
                          case 4: return 7.2;
                          case 8: return 10.3;
                          case 16: return 13.8;
                          case 32: return 17.0;
                          default:
                            if (p <= 0) return 0;
                            return parseFloat((3.2 * Math.log2(p) + 0.5).toFixed(2));
                        }
                      };
                      setOdpForm({ ...odpForm, total_ports: ports, splitter_loss_db: getLoss(ports) });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Redaman Splitter ODP (dB)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={odpForm.splitter_loss_db}
                    onChange={(e) => setOdpForm({ ...odpForm, splitter_loss_db: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Informasi Lokasi</label>
                  <textarea
                    value={odpForm.description}
                    onChange={(e) => setOdpForm({ ...odpForm, description: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* 4. ONU FORM */}
            {(editingAsset?.type === "ONU" || (!editingAsset && createAssetType === "ONU")) && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Kode ONU</label>
                  <input
                    type="text"
                    value={onuForm.code}
                    onChange={(e) => setOnuForm({ ...onuForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Nama Pelanggan / ONU</label>
                  <input
                    type="text"
                    value={onuForm.name}
                    onChange={(e) => setOnuForm({ ...onuForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">ID Pelanggan (Username / PPPoE)</label>
                  <input
                    type="text"
                    value={onuForm.customer_id}
                    onChange={(e) => setOnuForm({ ...onuForm, customer_id: e.target.value })}
                    placeholder="ID PPPoE (kosongkan jika sinkron otomatis)"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Remote Address (IP PPPoE)</label>
                  <input
                    type="text"
                    value={onuForm.remote_address}
                    onChange={(e) => setOnuForm({ ...onuForm, remote_address: e.target.value })}
                    placeholder="IP PPPoE (kosongkan jika sinkron otomatis)"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Koneksi ke ODP Distribusi</label>
                  <select
                    value={onuForm.odp_id}
                    onChange={(e) => setOnuForm({ ...onuForm, odp_id: e.target.value, odp_port: 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Hubungkan ke ODP --</option>
                    {odps.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.code})
                      </option>
                    ))}
                  </select>
                </div>
                {onuForm.odp_id && (() => {
                  const selectedOdp = odps.find((o) => o.id === onuForm.odp_id);
                  const totalPorts = selectedOdp?.total_ports || 8;

                  const occupiedPorts = new Set<number>();
                  onus.forEach(onu => {
                    if (onu.odp_id === onuForm.odp_id && onu.id !== editingAsset?.id && onu.odp_port) {
                      occupiedPorts.add(onu.odp_port);
                    }
                  });
                  odps.forEach(odp => {
                    if (odp.odc_id === onuForm.odp_id && odp.id !== editingAsset?.id && odp.odc_port) {
                      occupiedPorts.add(odp.odc_port);
                    }
                  });

                  return (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-300 block">Port ODP Induk</label>
                      <select
                        value={onuForm.odp_port}
                        onChange={(e) => setOnuForm({ ...onuForm, odp_port: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="0">-- Pilih Port --</option>
                        {Array.from({ length: totalPorts }, (_, i) => i + 1)
                          .filter(p => !occupiedPorts.has(p) || p === onuForm.odp_port)
                          .map((p) => (
                            <option key={p} value={p}>
                              Port {p}
                            </option>
                          ))}
                      </select>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 5. SPLICE FORM */}
            {(editingAsset?.type === "SPLICE" || (!editingAsset && createAssetType === "SPLICE")) && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Splice Code</label>
                  <input
                    type="text"
                    value={spliceForm.splice_code}
                    onChange={(e) => setSpliceForm({ ...spliceForm, splice_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Nama Titik Sambung</label>
                  <input
                    type="text"
                    value={spliceForm.splice_name}
                    onChange={(e) => setSpliceForm({ ...spliceForm, splice_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Tipe Sambungan</label>
                    <select
                      value={spliceForm.splice_type}
                      onChange={(e) => setSpliceForm({ ...spliceForm, splice_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Fusion Splice">Fusion Splice</option>
                      <option value="Mechanical Splice">Mechanical Splice</option>
                      <option value="Patchcord Connection">Patchcord Connection</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Redaman Loss (dB)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={spliceForm.loss_db}
                      onChange={(e) => setSpliceForm({ ...spliceForm, loss_db: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block font-sans">Keterangan Dus / Box</label>
                  <textarea
                    value={spliceForm.description}
                    onChange={(e) => setSpliceForm({ ...spliceForm, description: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                  />
                </div>
              </div>
            )}

            {/* 6. CABLE FORM */}
            {(editingAsset?.type === "CABLE") && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Kode Kabel</label>
                  <input
                    type="text"
                    value={cableForm.cable_code}
                    onChange={(e) => setCableForm({ ...cableForm, cable_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Nama Kabel</label>
                  <input
                    type="text"
                    value={cableForm.cable_name}
                    onChange={(e) => setCableForm({ ...cableForm, cable_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Panjang (m)</label>
                    <input
                      type="number"
                      step="1"
                      value={cableForm.length_km}
                      onChange={(e) => setCableForm({ ...cableForm, length_km: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Jumlah Core</label>
                    <input
                      type="number"
                      value={cableForm.total_cores}
                      onChange={(e) => setCableForm({ ...cableForm, total_cores: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Tipe Kabel</label>
                    <input
                      type="text"
                      value={cableForm.cable_type}
                      onChange={(e) => setCableForm({ ...cableForm, cable_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                      placeholder="G.652D / G.657A"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Jumlah Sambungan / Splis</label>
                    <input
                      type="number"
                      value={cableForm.splice_count}
                      onChange={(e) => setCableForm({ ...cableForm, splice_count: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-bold text-cyan-400"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Keterangan / Deskripsi</label>
                  <textarea
                    value={cableForm.description}
                    onChange={(e) => setCableForm({ ...cableForm, description: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-3 bg-slate-950/60 border-t border-slate-850 shrink-0 flex gap-2">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded cursor-pointer transition-all"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (!clickedCoords) return;

                // Proses penyimpanan rute
                if (editingAsset) {
                  const id = editingAsset.id;
                  const type = editingAsset.type;
                  if (type === "SFP") {
                    if (onUpdateSfp) onUpdateSfp(id, { ...sfpForm, latitude: clickedCoords.lat, longitude: clickedCoords.lng });
                  } else if (type === "ODC") {
                    if (onUpdateOdc) onUpdateOdc(id, { ...odcForm, latitude: clickedCoords.lat, longitude: clickedCoords.lng });
                  } else if (type === "ODP") {
                    if (onUpdateOdp) onUpdateOdp(id, { ...odpForm, latitude: clickedCoords.lat, longitude: clickedCoords.lng });
                  } else if (type === "ONU") {
                    if (onUpdateOnu) onUpdateOnu(id, { ...onuForm, latitude: clickedCoords.lat, longitude: clickedCoords.lng });
                  } else if (type === "SPLICE") {
                    if (onUpdateSplice) onUpdateSplice(id, { ...spliceForm, latitude: clickedCoords.lat, longitude: clickedCoords.lng });
                  }
                  if (editingAsset.type === "CABLE") {
                    if (onUpdateCable) onUpdateCable(id, { ...cableForm, length_km: cableForm.length_km / 1000 });
                  }
                } else {
                  const lat = clickedCoords.lat;
                  const lng = clickedCoords.lng;
                  if (createAssetType === "SFP") {
                    if (onAddSfp) onAddSfp({ ...sfpForm, latitude: lat, longitude: lng });
                  } else if (createAssetType === "ODC") {
                    if (onAddOdc) onAddOdc({ ...odcForm, latitude: lat, longitude: lng });
                  } else if (createAssetType === "ODP") {
                    if (onAddOdp) onAddOdp({ ...odpForm, latitude: lat, longitude: lng });
                  } else if (createAssetType === "ONU") {
                    if (onAddOnu) onAddOnu({ ...onuForm, latitude: lat, longitude: lng });
                  } else if (createAssetType === "SPLICE") {
                    if (onAddSplice) onAddSplice({ ...spliceForm, latitude: lat, longitude: lng });
                  }
                }
                setShowCreateModal(false);
              }}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2 rounded shadow cursor-pointer transition-all"
            >
              Simpan
            </button>
          </div>
        </div>
      )}

      {/* Traced Signal Box HUD */}
      {activeTraceOnu && (
        <div className="absolute bottom-4 left-4 z-[1001] bg-cyan-950/90 backdrop-blur-md border border-cyan-800 py-2 px-3 rounded shadow-lg text-[11px] text-cyan-100 flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping"></div>
          <div>
            Pelacakan Aktif: <span className="font-bold text-white uppercase">{activeTraceOnu}</span>. Jalur serat menyembur terang.
          </div>
        </div>
      )}

      {/* Actual Map Container */}
      <div ref={mapContainerRef} className="w-full flex-grow cursor-crosshair h-full" />
    </div>
  );
}
