import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE_PATH = path.join(process.cwd(), "src", "db", "db_store.json");

app.use(express.json());

// Helper to read DB
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      return { sfps: [], odcs: [], odps: [], onus: [], fiber_cables: [], fiber_cores: [], splice_points: [], cable_splices: [] };
    }
    const data = fs.readFileSync(DB_FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file", err);
    return { sfps: [], odcs: [], odps: [], onus: [], fiber_cables: [], fiber_cores: [], splice_points: [], cable_splices: [] };
  }
}

// Helper to write DB
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing database file", err);
    return false;
  }
}

// Optical Loss Engine Core logic
function calculateOpticalLoss(routeCables: any[], routeSplices: any[], odcSplitterLoss = 0, sfpTxPower = 3.0) {
  // Constant values
  const FIBER_LOSS_PER_KM = 0.35; // dB/km
  const CONNECTOR_LOSS = 0.50;    // dB per connector
  const FUSION_SPLICE_LOSS = 0.03; // dB
  const MECHANICAL_SPLICE_LOSS = 0.20; // dB

  let totalCableLength = 0;
  let totalFiberLoss = 0;
  for (const cable of routeCables) {
    const len = Number(cable.length_km) || 0;
    totalCableLength += len;
    totalFiberLoss += len * FIBER_LOSS_PER_KM;
  }

  let totalSpliceLoss = 0;
  for (const splice of routeSplices) {
    if (splice.loss_db !== undefined && splice.loss_db !== null) {
      totalSpliceLoss += Number(splice.loss_db);
    } else {
      totalSpliceLoss += splice.splice_type === "Mechanical Splice" ? MECHANICAL_SPLICE_LOSS : FUSION_SPLICE_LOSS;
    }
  }

  // Count connectors
  // Let's assume standard FTTH connector counts:
  // Each cable segment has 2 connectors (entry and exit)
  // For 3 segments SFP->ODC, ODC->ODP, ODP->ONU, there are 6 connectors.
  // We can calculate connector count dynamically: routeCables.length * 2
  const connectorCount = Math.max(0, routeCables.length * 2);
  const totalConnectorLoss = connectorCount * CONNECTOR_LOSS;

  const totalSplitterLoss = Number(odcSplitterLoss) || 0;

  const totalLoss = totalFiberLoss + totalSpliceLoss + totalConnectorLoss + totalSplitterLoss;
  const estimatedRxPower = sfpTxPower - totalLoss;

  return {
    total_fiber_loss_db: Number(totalFiberLoss.toFixed(3)),
    total_splice_loss_db: Number(totalSpliceLoss.toFixed(3)),
    total_connector_loss_db: Number(totalConnectorLoss.toFixed(2)),
    total_splitter_loss_db: Number(totalSplitterLoss.toFixed(2)),
    total_route_loss_db: Number(totalLoss.toFixed(3)),
    estimated_rx_power_dbm: Number(estimatedRxPower.toFixed(3)),
    cable_length_km: Number(totalCableLength.toFixed(3))
  };
}

// ==========================================
// REST APIs
// ==========================================

// SFP APIs
app.get("/api/sfps", (req, res) => {
  const db = readDB();
  res.json(db.sfps || []);
});

app.post("/api/sfps", (req, res) => {
  const db = readDB();
  const newSfp = {
    id: "sfp-" + Date.now(),
    code: req.body.code || "SFP-" + Math.floor(Math.random() * 1000),
    name: req.body.name || "SFP Port",
    slot: Number(req.body.slot) || 1,
    port: Number(req.body.port) || 1,
    tx_power_dbm: Number(req.body.tx_power_dbm) !== undefined ? Number(req.body.tx_power_dbm) : 3.0,
    latitude: Number(req.body.latitude) || 37.7749,
    longitude: Number(req.body.longitude) || -122.4194,
    description: req.body.description || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.sfps.push(newSfp);
  writeDB(db);
  res.status(201).json(newSfp);
});

app.put("/api/sfps/:id", (req, res) => {
  const db = readDB();
  const idx = db.sfps.findIndex((x: any) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "SFP not found" });

  db.sfps[idx] = {
    ...db.sfps[idx],
    code: req.body.code || db.sfps[idx].code,
    name: req.body.name || db.sfps[idx].name,
    slot: Number(req.body.slot) || db.sfps[idx].slot,
    port: Number(req.body.port) || db.sfps[idx].port,
    tx_power_dbm: Number(req.body.tx_power_dbm) !== undefined ? Number(req.body.tx_power_dbm) : db.sfps[idx].tx_power_dbm,
    latitude: Number(req.body.latitude) || db.sfps[idx].latitude,
    longitude: Number(req.body.longitude) || db.sfps[idx].longitude,
    description: req.body.description !== undefined ? req.body.description : db.sfps[idx].description,
    updated_at: new Date().toISOString()
  };
  writeDB(db);
  res.json(db.sfps[idx]);
});

app.delete("/api/sfps/:id", (req, res) => {
  const db = readDB();
  db.sfps = db.sfps.filter((x: any) => x.id !== req.params.id);
  // Also clean up referencing cables
  db.fiber_cables = db.fiber_cables.filter((x: any) => !(x.from_node_type === "SFP" && x.from_node_id === req.params.id) && !(x.to_node_type === "SFP" && x.to_node_id === req.params.id));
  writeDB(db);
  res.json({ success: true });
});

// ODC APIs
app.get("/api/odcs", (req, res) => {
  const db = readDB();
  res.json(db.odcs || []);
});

app.post("/api/odcs", (req, res) => {
  const db = readDB();
  const newOdc = {
    id: "odc-" + Date.now(),
    code: req.body.code || "ODC-" + Math.floor(Math.random() * 1000),
    name: req.body.name || "ODC Cabinet",
    latitude: Number(req.body.latitude) || 37.7749,
    longitude: Number(req.body.longitude) || -122.4194,
    total_ports: Number(req.body.total_ports) || 32,
    splitter_type: req.body.splitter_type || "1:16",
    splitter_loss_db: Number(req.body.splitter_loss_db) || 13.8,
    description: req.body.description || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.odcs.push(newOdc);
  writeDB(db);
  res.status(201).json(newOdc);
});

app.put("/api/odcs/:id", (req, res) => {
  const db = readDB();
  const idx = db.odcs.findIndex((x: any) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "ODC not found" });

  db.odcs[idx] = {
    ...db.odcs[idx],
    code: req.body.code || db.odcs[idx].code,
    name: req.body.name || db.odcs[idx].name,
    latitude: Number(req.body.latitude) || db.odcs[idx].latitude,
    longitude: Number(req.body.longitude) || db.odcs[idx].longitude,
    total_ports: Number(req.body.total_ports) || db.odcs[idx].total_ports,
    splitter_type: req.body.splitter_type || db.odcs[idx].splitter_type,
    splitter_loss_db: Number(req.body.splitter_loss_db) || db.odcs[idx].splitter_loss_db,
    description: req.body.description !== undefined ? req.body.description : db.odcs[idx].description,
    updated_at: new Date().toISOString()
  };
  writeDB(db);
  res.json(db.odcs[idx]);
});

app.delete("/api/odcs/:id", (req, res) => {
  const db = readDB();
  db.odcs = db.odcs.filter((x: any) => x.id !== req.params.id);
  // Also clean up referencing cables
  db.fiber_cables = db.fiber_cables.filter((x: any) => !(x.from_node_type === "ODC" && x.from_node_id === req.params.id) && !(x.to_node_type === "ODC" && x.to_node_id === req.params.id));
  // Orphan odps linked to this odc
  db.odps = db.odps.map((x: any) => x.odc_id === req.params.id ? { ...x, odc_id: "" } : x);
  writeDB(db);
  res.json({ success: true });
});

// ODP APIs
app.get("/api/odps", (req, res) => {
  const db = readDB();
  res.json(db.odps || []);
});

app.post("/api/odps", (req, res) => {
  const db = readDB();
  const newOdp = {
    id: "odp-" + Date.now(),
    code: req.body.code || "ODP-" + Math.floor(Math.random() * 1000),
    name: req.body.name || "ODP Box",
    latitude: Number(req.body.latitude) || 37.7749,
    longitude: Number(req.body.longitude) || -122.4194,
    odc_id: req.body.odc_id || "",
    total_ports: Number(req.body.total_ports) || 8,
    description: req.body.description || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.odps.push(newOdp);
  writeDB(db);
  res.status(201).json(newOdp);
});

app.put("/api/odps/:id", (req, res) => {
  const db = readDB();
  const idx = db.odps.findIndex((x: any) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "ODP not found" });

  db.odps[idx] = {
    ...db.odps[idx],
    code: req.body.code || db.odps[idx].code,
    name: req.body.name || db.odps[idx].name,
    latitude: Number(req.body.latitude) || db.odps[idx].latitude,
    longitude: Number(req.body.longitude) || db.odps[idx].longitude,
    odc_id: req.body.odc_id !== undefined ? req.body.odc_id : db.odps[idx].odc_id,
    total_ports: Number(req.body.total_ports) || db.odps[idx].total_ports,
    description: req.body.description !== undefined ? req.body.description : db.odps[idx].description,
    updated_at: new Date().toISOString()
  };
  writeDB(db);
  res.json(db.odps[idx]);
});

app.delete("/api/odps/:id", (req, res) => {
  const db = readDB();
  db.odps = db.odps.filter((x: any) => x.id !== req.params.id);
  // Clean up referencing cables
  db.fiber_cables = db.fiber_cables.filter((x: any) => !(x.from_node_type === "ODP" && x.from_node_id === req.params.id) && !(x.to_node_type === "ODP" && x.to_node_id === req.params.id));
  // Orphan onus
  db.onus = db.onus.map((x: any) => x.odp_id === req.params.id ? { ...x, odp_id: "" } : x);
  writeDB(db);
  res.json({ success: true });
});

// ONU APIs
app.get("/api/onus", (req, res) => {
  const db = readDB();
  res.json(db.onus || []);
});

app.post("/api/onus", (req, res) => {
  const db = readDB();
  const newOnu = {
    id: "onu-" + Date.now(),
    code: req.body.code || "ONU-" + Math.floor(Math.random() * 1000),
    name: req.body.name || "Subscriber ONU",
    serial_number: req.body.serial_number || "GPON" + Math.floor(Math.random() * 90000000 + 10000000),
    latitude: Number(req.body.latitude) || 37.7749,
    longitude: Number(req.body.longitude) || -122.4194,
    odp_id: req.body.odp_id || "",
    description: req.body.description || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.onus.push(newOnu);
  writeDB(db);
  res.status(201).json(newOnu);
});

app.put("/api/onus/:id", (req, res) => {
  const db = readDB();
  const idx = db.onus.findIndex((x: any) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "ONU not found" });

  db.onus[idx] = {
    ...db.onus[idx],
    code: req.body.code || db.onus[idx].code,
    name: req.body.name || db.onus[idx].name,
    serial_number: req.body.serial_number || db.onus[idx].serial_number,
    latitude: Number(req.body.latitude) || db.onus[idx].latitude,
    longitude: Number(req.body.longitude) || db.onus[idx].longitude,
    odp_id: req.body.odp_id !== undefined ? req.body.odp_id : db.onus[idx].odp_id,
    description: req.body.description !== undefined ? req.body.description : db.onus[idx].description,
    updated_at: new Date().toISOString()
  };
  writeDB(db);
  res.json(db.onus[idx]);
});

app.delete("/api/onus/:id", (req, res) => {
  const db = readDB();
  db.onus = db.onus.filter((x: any) => x.id !== req.params.id);
  // Clean up referencing cables
  db.fiber_cables = db.fiber_cables.filter((x: any) => !(x.from_node_type === "ONU" && x.from_node_id === req.params.id) && !(x.to_node_type === "ONU" && x.to_node_id === req.params.id));
  writeDB(db);
  res.json({ success: true });
});

// FIBER CABLE APIs
app.get("/api/fiber-cables", (req, res) => {
  const db = readDB();
  res.json(db.fiber_cables || []);
});

app.post("/api/fiber-cables", (req, res) => {
  const db = readDB();
  const id = "cable-" + Date.now();
  const totalCores = Number(req.body.total_cores) || 12;

  const newCable = {
    id,
    cable_code: req.body.cable_code || "CAB-" + Math.floor(Math.random() * 1000),
    cable_name: req.body.cable_name || "Fiber Route Segment",
    from_node_type: req.body.from_node_type || "SFP",
    from_node_id: req.body.from_node_id || "",
    to_node_type: req.body.to_node_type || "ODC",
    to_node_id: req.body.to_node_id || "",
    length_km: Number(req.body.length_km) || 0.5,
    total_cores: totalCores,
    cable_type: req.body.cable_type || "Single-mode G.652D",
    geometry_line: req.body.geometry_line || [[37.7749, -122.4194], [37.7759, -122.4184]],
    description: req.body.description || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.fiber_cables.push(newCable);

  // Automatically seed cores for this cable
  for (let i = 1; i <= totalCores; i++) {
    db.fiber_cores.push({
      id: `core-${id}-${i}-${Math.floor(Math.random() * 1000)}`,
      cable_id: id,
      core_number: i,
      status: i === 1 ? "USED" : "SPARE" // Default core 1 to USED, rest SPARE
    });
  }

  writeDB(db);
  res.status(201).json(newCable);
});

app.put("/api/fiber-cables/:id", (req, res) => {
  const db = readDB();
  const idx = db.fiber_cables.findIndex((x: any) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Cable not found" });

  const oldTotalCores = db.fiber_cables[idx].total_cores;
  const newTotalCores = Number(req.body.total_cores) || oldTotalCores;

  db.fiber_cables[idx] = {
    ...db.fiber_cables[idx],
    cable_code: req.body.cable_code || db.fiber_cables[idx].cable_code,
    cable_name: req.body.cable_name || db.fiber_cables[idx].cable_name,
    from_node_type: req.body.from_node_type || db.fiber_cables[idx].from_node_type,
    from_node_id: req.body.from_node_id || db.fiber_cables[idx].from_node_id,
    to_node_type: req.body.to_node_type || db.fiber_cables[idx].to_node_type,
    to_node_id: req.body.to_node_id || db.fiber_cables[idx].to_node_id,
    length_km: Number(req.body.length_km) || db.fiber_cables[idx].length_km,
    total_cores: newTotalCores,
    cable_type: req.body.cable_type || db.fiber_cables[idx].cable_type,
    geometry_line: req.body.geometry_line || db.fiber_cables[idx].geometry_line,
    description: req.body.description !== undefined ? req.body.description : db.fiber_cables[idx].description,
    updated_at: new Date().toISOString()
  };

  // Adjust core count if updated
  if (newTotalCores !== oldTotalCores) {
    // Delete existing cores for this cable
    let cores = db.fiber_cores.filter((c: any) => c.cable_id === req.params.id);
    if (newTotalCores > oldTotalCores) {
      // Add missing cores
      for (let i = oldTotalCores + 1; i <= newTotalCores; i++) {
        db.fiber_cores.push({
          id: `core-${req.params.id}-${i}-${Math.floor(Math.random() * 1000)}`,
          cable_id: req.params.id,
          core_number: i,
          status: "SPARE"
        });
      }
    } else {
      // Truncate cores
      db.fiber_cores = db.fiber_cores.filter((c: any) => !(c.cable_id === req.params.id && c.core_number > newTotalCores));
    }
  }

  writeDB(db);
  res.json(db.fiber_cables[idx]);
});

app.delete("/api/fiber-cables/:id", (req, res) => {
  const db = readDB();
  db.fiber_cables = db.fiber_cables.filter((x: any) => x.id !== req.params.id);
  // Remove associated cores
  db.fiber_cores = db.fiber_cores.filter((x: any) => x.cable_id !== req.params.id);
  // Remove cable splices
  db.cable_splices = db.cable_splices.filter((x: any) => x.cable_id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// CORE MANAGEMENT APIs
app.get("/api/fiber-cores", (req, res) => {
  const db = readDB();
  const cableId = req.query.cable_id;
  if (cableId) {
    res.json(db.fiber_cores.filter((c: any) => c.cable_id === cableId));
  } else {
    res.json(db.fiber_cores || []);
  }
});

app.patch("/api/fiber-cores/:id", (req, res) => {
  const db = readDB();
  const idx = db.fiber_cores.findIndex((x: any) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Fiber core not found" });

  db.fiber_cores[idx].status = req.body.status || db.fiber_cores[idx].status;
  writeDB(db);
  res.json(db.fiber_cores[idx]);
});

// SPLICE POINT APIs
app.get("/api/splice-points", (req, res) => {
  const db = readDB();
  res.json(db.splice_points || []);
});

app.post("/api/splice-points", (req, res) => {
  const db = readDB();
  const id = "splice-" + Date.now();
  const newSplice = {
    id,
    splice_code: req.body.splice_code || "SPL-" + Math.floor(Math.random() * 1000),
    splice_name: req.body.splice_name || "Enclosure Point",
    latitude: Number(req.body.latitude) || 37.7749,
    longitude: Number(req.body.longitude) || -122.4194,
    splice_type: req.body.splice_type || "Fusion Splice",
    loss_db: Number(req.body.loss_db) !== undefined ? Number(req.body.loss_db) : (req.body.splice_type === "Mechanical Splice" ? 0.20 : 0.03),
    description: req.body.description || ""
  };

  db.splice_points.push(newSplice);

  // If associated cable_id is passed, create the link
  if (req.body.cable_id) {
    db.cable_splices.push({
      id: "cs-" + Date.now(),
      cable_id: req.body.cable_id,
      splice_id: id
    });
  }

  writeDB(db);
  res.status(201).json(newSplice);
});

app.put("/api/splice-points/:id", (req, res) => {
  const db = readDB();
  const idx = db.splice_points.findIndex((x: any) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Splice point not found" });

  db.splice_points[idx] = {
    ...db.splice_points[idx],
    splice_code: req.body.splice_code || db.splice_points[idx].splice_code,
    splice_name: req.body.splice_name || db.splice_points[idx].splice_name,
    latitude: Number(req.body.latitude) || db.splice_points[idx].latitude,
    longitude: Number(req.body.longitude) || db.splice_points[idx].longitude,
    splice_type: req.body.splice_type || db.splice_points[idx].splice_type,
    loss_db: Number(req.body.loss_db) !== undefined ? Number(req.body.loss_db) : db.splice_points[idx].loss_db,
    description: req.body.description !== undefined ? req.body.description : db.splice_points[idx].description
  };
  writeDB(db);
  res.json(db.splice_points[idx]);
});

app.delete("/api/splice-points/:id", (req, res) => {
  const db = readDB();
  db.splice_points = db.splice_points.filter((x: any) => x.id !== req.params.id);
  db.cable_splices = db.cable_splices.filter((x: any) => x.splice_id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// CABLE SPLICES APIs
app.get("/api/cable-splices", (req, res) => {
  const db = readDB();
  res.json(db.cable_splices || []);
});

app.post("/api/cable-splices", (req, res) => {
  const db = readDB();
  const cs = {
    id: "cs-" + Date.now(),
    cable_id: req.body.cable_id,
    splice_id: req.body.splice_id
  };
  db.cable_splices.push(cs);
  writeDB(db);
  res.status(201).json(cs);
});

app.delete("/api/cable-splices/:id", (req, res) => {
  const db = readDB();
  db.cable_splices = db.cable_splices.filter((x: any) => x.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// ==========================================
// TRACE & VALIDATION ENGINES
// ==========================================

// GET /api/trace/onu/{id}
app.get("/api/trace/onu/:id", (req, res) => {
  const db = readDB();
  const onuId = req.params.id;

  const onu = db.onus.find((x: any) => x.id === onuId);
  if (!onu) {
    return res.status(404).json({ error: `ONU ID ${onuId} not found.` });
  }

  // Trace back: ONU -> ODP -> ODC -> SFP
  const pathNodes: any[] = [];
  const pathCables: any[] = [];
  const pathSplices: any[] = [];
  const messages: string[] = [];
  let status: string = "VALID";
  let odc: any = null;

  // 1. Add ONU
  pathNodes.push({
    type: "ONU",
    id: onu.id,
    code: onu.code,
    name: onu.name,
    latitude: onu.latitude,
    longitude: onu.longitude
  });

  // 2. Trace ODP
  let odp = db.odps.find((x: any) => x.id === onu.odp_id);
  // Find physical drop cable
  const dropCable = db.fiber_cables.find((c: any) =>
    (c.from_node_type === "ONU" && c.from_node_id === onu.id) ||
    (c.to_node_type === "ONU" && c.to_node_id === onu.id)
  );

  if (dropCable) {
    pathCables.push(dropCable);
    const otherEndType = dropCable.from_node_id === onu.id ? dropCable.to_node_type : dropCable.from_node_type;
    const otherEndId = dropCable.from_node_id === onu.id ? dropCable.to_node_id : dropCable.from_node_id;

    if (otherEndType === "ODP") {
      const pOdp = db.odps.find((x: any) => x.id === otherEndId);
      if (pOdp) {
        odp = pOdp;
      }
    }
  }

  if (!odp) {
    status = "ERROR";
    messages.push(`ONU is orphaned: no linked ODP box detected in database standard hierarchy.`);
  } else {
    pathNodes.push({
      type: "ODP",
      id: odp.id,
      code: odp.code,
      name: odp.name,
      latitude: odp.latitude,
      longitude: odp.longitude
    });

    if (!dropCable) {
      status = "WARNING";
      messages.push(`ONU matches logical reference ODP ${odp.code}, but no physical Drop Fiber Cable was mapped in GIS.`);
    }

    // 3. Trace ODC
    odc = db.odcs.find((x: any) => x.id === odp.odc_id);
    const distCable = db.fiber_cables.find((c: any) =>
      ((c.from_node_type === "ODP" && c.from_node_id === odp.id) || (c.to_node_type === "ODP" && c.to_node_id === odp.id)) &&
      ((c.from_node_type === "ODC") || (c.to_node_type === "ODC"))
    );

    if (distCable) {
      pathCables.push(distCable);
      const otherEndType = distCable.from_node_id === odp.id ? distCable.to_node_type : distCable.from_node_type;
      const otherEndId = distCable.from_node_id === odp.id ? distCable.to_node_id : distCable.from_node_id;

      if (otherEndType === "ODC") {
        const pOdc = db.odcs.find((x: any) => x.id === otherEndId);
        if (pOdc) {
          odc = pOdc;
        }
      }
    }

    if (!odc) {
      status = "ERROR";
      messages.push(`Distribution ODP has no valid upstream ODC Hub Cabinet.`);
    } else {
      pathNodes.push({
        type: "ODC",
        id: odc.id,
        code: odc.code,
        name: odc.name,
        latitude: odc.latitude,
        longitude: odc.longitude
      });

      if (!distCable) {
        if (status !== "ERROR") status = "WARNING";
        messages.push(`ODP logically references ODC Cabinet ${odc.code}, but no active distribution fiber cable exists.`);
      }

      // 4. Trace SFP
      let sfp = null;
      const feederCable = db.fiber_cables.find((c: any) =>
        ((c.from_node_type === "ODC" && c.from_node_id === odc.id) || (c.to_node_type === "ODC" && c.to_node_id === odc.id)) &&
        ((c.from_node_type === "SFP") || (c.to_node_type === "SFP"))
      );

      if (feederCable) {
        pathCables.push(feederCable);
        const otherEndType = feederCable.from_node_id === odc.id ? feederCable.to_node_type : feederCable.from_node_type;
        const otherEndId = feederCable.from_node_id === odc.id ? feederCable.to_node_id : feederCable.from_node_id;

        if (otherEndType === "SFP") {
          sfp = db.sfps.find((x: any) => x.id === otherEndId);
        }
      }

      // Fallback: If no direct feeder cable, find first SFP in DB to provide complete flow
      if (!sfp && db.sfps.length > 0) {
        sfp = db.sfps[0];
        if (status !== "ERROR") status = "WARNING";
        messages.push(`No direct continuous feeder cable from ODC ${odc.code} back to Central Office. Auto-coupling top primary SFP.`);
      }

      if (!sfp) {
        status = "ERROR";
        messages.push(`Upstream Central SFP receiver port not found.`);
      } else {
        pathNodes.push({
          type: "SFP",
          id: sfp.id,
          code: sfp.code,
          name: sfp.name,
          latitude: sfp.latitude,
          longitude: sfp.longitude
        });
      }
    }
  }

  // Reverse complete path so order is SFP -> ODC -> ODP -> ONU
  pathNodes.reverse();

  // Look up splices on these cables
  for (const cable of pathCables) {
    const associations = db.cable_splices.filter((cs: any) => cs.cable_id === cable.id);
    for (const assoc of associations) {
      const sp = db.splice_points.find((x: any) => x.id === assoc.splice_id);
      if (sp && !pathSplices.some(x => x.id === sp.id)) {
        pathSplices.push(sp);
      }
    }
  }

  // Calculate optical properties
  const splitterLoss = odc ? Number(odc.splitter_loss_db) || 13.8 : 0;
  const sfpTx = pathNodes.find(n => n.type === "SFP") ? (db.sfps.find((x: any) => x.id === pathNodes.find(n => n.type === "SFP").id)?.tx_power_dbm || 3.0) : 3.0;

  const logs = calculateOpticalLoss(pathCables, pathSplices, splitterLoss, sfpTx);

  // Core status validation on path
  for (const cable of pathCables) {
    const cableCores = db.fiber_cores.filter((c: any) => c.cable_id === cable.id);
    const brokenCores = cableCores.filter((c: any) => c.status === "BROKEN").length;
    const reservedCores = cableCores.filter((c: any) => c.status === "RESERVED").length;
    const usedCores = cableCores.filter((c: any) => c.status === "USED").length;

    if (brokenCores > cable.total_cores / 2) {
      status = "ERROR";
      messages.push(`Segment ${cable.cable_code} critical core alert: >50% of cores BROKEN.`);
    } else if (usedCores + reservedCores >= cable.total_cores) {
      if (status !== "ERROR") status = "WARNING";
      messages.push(`Segment ${cable.cable_code} capacity at 100%: no spare cores available for allocation.`);
    }
  }

  // Final validation response
  if (logs.estimated_rx_power_dbm < -28.0) {
    status = "ERROR";
    messages.push(`Critical Signal Loss: Calculated RX signal (${logs.estimated_rx_power_dbm} dBm) below GPON receiver limit of -28 dBm.`);
  } else if (logs.estimated_rx_power_dbm < -24.0) {
    if (status !== "ERROR") status = "WARNING";
    messages.push(`Weak Optical Budget Margin: Signal is currently ${logs.estimated_rx_power_dbm} dBm, nearing GPON fail threshold.`);
  }

  if (messages.length === 0) {
    messages.push("Path fully verified. Optical budgets, fiber physical routes, and core connections comply with standard parameters.");
  }

  res.json({
    onu,
    path: pathNodes,
    cables: pathCables,
    splices: pathSplices,
    meters_length: logs.cable_length_km * 1000,
    total_loss_calculation: {
      total_fiber_loss_db: logs.total_fiber_loss_db,
      total_splice_loss_db: logs.total_splice_loss_db,
      total_connector_loss_db: logs.total_connector_loss_db,
      total_splitter_loss_db: logs.total_splitter_loss_db,
      total_route_loss_db: logs.total_route_loss_db,
      estimated_rx_power_dbm: logs.estimated_rx_power_dbm
    },
    validation_status: status,
    validation_messages: messages
  });
});

// GET /api/dashboard/stats
app.get("/api/dashboard/stats", (req, res) => {
  const db = readDB();

  const totalSfp = db.sfps.length;
  const totalOdc = db.odcs.length;
  const totalOdp = db.odps.length;
  const totalOnu = db.onus.length;
  const totalCables = db.fiber_cables.length;
  const totalSplices = db.splice_points.length;

  const cores = db.fiber_cores || [];
  const totalUsedCores = cores.filter((c: any) => c.status === "USED").length;
  const totalSpareCores = cores.filter((c: any) => c.status === "SPARE").length;
  const totalReservedCores = cores.filter((c: any) => c.status === "RESERVED").length;
  const totalBrokenCores = cores.filter((c: any) => c.status === "BROKEN").length;

  // Capacity calculations for ODC ports
  const odcCapacityList = db.odcs.map((odc: any) => {
    // Count ODPs connected to this ODC
    const linkedOdps = db.odps.filter((o: any) => o.odc_id === odc.id);
    const usedPorts = linkedOdps.length; // Each linked ODP occupies an ODC splitter port
    const freePorts = Math.max(0, odc.total_ports - usedPorts);
    return {
      id: odc.id,
      code: odc.code,
      name: odc.name,
      type: "ODC",
      total_ports: odc.total_ports,
      used_ports: usedPorts,
      free_ports: freePorts,
      utilization_percentage: odc.total_ports > 0 ? Number(((usedPorts / odc.total_ports) * 100).toFixed(1)) : 0
    };
  });

  // Capacity calculations for ODP ports
  const odpCapacityList = db.odps.map((odp: any) => {
    // Count ONUs connected to this ODP
    const linkedOnus = db.onus.filter((u: any) => u.odp_id === odp.id);
    const usedPorts = linkedOnus.length;
    const freePorts = Math.max(0, odp.total_ports - usedPorts);
    return {
      id: odp.id,
      code: odp.code,
      name: odp.name,
      type: "ODP",
      total_ports: odp.total_ports,
      used_ports: usedPorts,
      free_ports: freePorts,
      utilization_percentage: odp.total_ports > 0 ? Number(((usedPorts / odp.total_ports) * 100).toFixed(1)) : 0
    };
  });

  // Route validation aggregate
  let validPathCount = 0;
  let warnPathCount = 0;
  let errPathCount = 0;

  // Track loss metrics
  const losses: number[] = [];

  for (const onu of db.onus) {
    // Basic loss trace simulated
    const odp = db.odps.find((x: any) => x.id === onu.odp_id);
    const odc = odp ? db.odcs.find((x: any) => x.id === odp.odc_id) : null;
    const drop = db.fiber_cables.find((c: any) => (c.from_node_type === "ONU" && c.from_node_id === onu.id) || (c.to_node_type === "ONU" && c.to_node_id === onu.id));
    const dist = odp ? db.fiber_cables.find((c: any) => (c.from_node_type === "ODP" && c.from_node_id === odp.id) || (c.to_node_type === "ODP" && c.to_node_id === odp.id)) : null;

    let segmentCables = [];
    if (drop) segmentCables.push(drop);
    if (dist) segmentCables.push(dist);

    const splitterLoss = odc ? Number(odc.splitter_loss_db) || 12.0 : 0;
    const reports = calculateOpticalLoss(segmentCables, [], splitterLoss, 3.0);
    losses.push(reports.total_route_loss_db);

    if (reports.total_route_loss_db > 24) {
      errPathCount++;
    } else if (reports.total_route_loss_db > 16) {
      warnPathCount++;
    } else {
      validPathCount++;
    }
  }

  res.json({
    counters: {
      totalSfp,
      totalOdc,
      totalOdp,
      totalOnu,
      totalCables,
      totalSplices,
      totalUsedCores,
      totalSpareCores,
      totalReservedCores,
      totalBrokenCores
    },
    capacity: {
      odcs: odcCapacityList,
      odps: odpCapacityList
    },
    routes: {
      valid: validPathCount,
      warning: warnPathCount,
      error: errPathCount
    },
    losses: losses
  });
});

// ==========================================
// CLIENT SERVING & DEVELOPMENT
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully operational on http://localhost:${PORT}`);
  });
}

startServer();
