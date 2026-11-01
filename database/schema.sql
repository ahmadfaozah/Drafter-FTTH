-- Skema Database PostgreSQL + PostGIS untuk Pemetaan Jaringan FTTH & Analisis Redaman Optik
-- Desain sesuai dengan standar indeks spasial dan hierarki fisik kelas produksi.

-- Aktifkan ekstensi PostGIS jika belum dimuat
CREATE EXTENSION IF NOT EXISTS postgis;

-- Aktifkan ekstensi pembuatan UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabel SFP (GPON OLT Transceivers)
CREATE TABLE sfp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    slot INTEGER NOT NULL DEFAULT 1,
    port INTEGER NOT NULL DEFAULT 1,
    tx_power_dbm DECIMAL(5, 2) NOT NULL DEFAULT 3.00,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    -- Titik spasial PostGIS (WGS84 EPSG:4326)
    geom GEOMETRY(Point, 4326),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indeks titik geografis SFP menggunakan GiST
CREATE INDEX idx_sfp_geom ON sfp USING GIST (geom);
CREATE INDEX idx_sfp_code ON sfp(code);

-- 2. Tabel ODC (Optical Distribution Cabinet Hubs)
CREATE TABLE odc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    geom GEOMETRY(Point, 4326),
    total_ports INTEGER NOT NULL DEFAULT 32,
    splitter_type VARCHAR(20) NOT NULL DEFAULT '1:16', -- Contoh: "1:8", "1:16", "1:32"
    splitter_loss_db DECIMAL(4, 2) NOT NULL DEFAULT 13.80, -- Nilai redaman teoritis splitter + insertion loss
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indeks titik geografis Kabinet ODC
CREATE INDEX idx_odc_geom ON odc USING GIST (geom);
CREATE INDEX idx_odc_code ON odc(code);

-- 3. Tabel ODP (Optical Distribution Points)
CREATE TABLE odp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    geom GEOMETRY(Point, 4326),
    odc_id UUID REFERENCES odc(id) ON DELETE SET NULL, -- Rute upstream ke kabinet ODC
    total_ports INTEGER NOT NULL DEFAULT 8,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indeks posisi geografis Kotak ODP
CREATE INDEX idx_odp_geom ON odp USING GIST (geom);
CREATE INDEX idx_odp_code ON odp(code);
CREATE INDEX idx_odp_odc_id ON odp(odc_id);

-- 4. Tabel ONU (Optical Network Units / Pelanggan)
CREATE TABLE onu (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100) UNIQUE,
    remote_address VARCHAR(100),
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    geom GEOMETRY(Point, 4326),
    odp_id UUID REFERENCES odp(id) ON DELETE SET NULL, -- Port asal koneksi ODP
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indeks lokasi geografis ONU Pelanggan
CREATE INDEX idx_onu_geom ON onu USING GIST (geom);
CREATE INDEX idx_onu_code ON onu(code);
CREATE INDEX idx_onu_odp_id ON onu(odp_id);

-- 5. Tabel Kabel Serat Optik (FIBER CABLES)
CREATE TABLE fiber_cables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cable_code VARCHAR(50) NOT NULL UNIQUE,
    cable_name VARCHAR(100) NOT NULL,
    -- Koneksi Node Fleksibel yang membentang di seluruh arsitektur
    from_node_type VARCHAR(20) NOT NULL CHECK (from_node_type IN ('SFP', 'ODC', 'ODP', 'ONU', 'SPLICE')),
    from_node_id UUID NOT NULL,
    to_node_type VARCHAR(20) NOT NULL CHECK (to_node_type IN ('SFP', 'ODC', 'ODP', 'ONU', 'SPLICE')),
    to_node_id UUID NOT NULL,
    length_km DECIMAL(6, 3) NOT NULL DEFAULT 0.100,
    total_cores INTEGER NOT NULL DEFAULT 12 CHECK (total_cores > 0),
    cable_type VARCHAR(50) NOT NULL DEFAULT 'G.652D Loose tube',
    -- String Poliline PostGIS yang mewakili rute kabel geografis fisik 
    geometry_line GEOMETRY(LineString, 4326) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indeks LineStrings untuk kueri perutean geospasial cepat
CREATE INDEX idx_fiber_cables_geom ON fiber_cables USING GIST (geometry_line);
CREATE INDEX idx_fiber_cables_code ON fiber_cables(cable_code);

-- 6. Tabel Core Serat Optik (FIBER CORES)
CREATE TABLE fiber_cores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cable_id UUID NOT NULL REFERENCES fiber_cables(id) ON DELETE CASCADE,
    core_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SPARE' CHECK (status IN ('USED', 'SPARE', 'RESERVED', 'BROKEN')),
    CONSTRAINT unique_core_per_cable UNIQUE (cable_id, core_number)
);

-- Indeks core untuk pemetaan status cepat
CREATE INDEX idx_fiber_cores_cable_id ON fiber_cores(cable_id);
CREATE INDEX idx_fiber_cores_status ON fiber_cores(status);

-- 7. Tabel Titik Sambungan (SPLICE POINTS)
CREATE TABLE splice_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    splice_code VARCHAR(50) NOT NULL UNIQUE,
    splice_name VARCHAR(100) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    geom GEOMETRY(Point, 4326),
    splice_type VARCHAR(30) NOT NULL DEFAULT 'Fusion Splice' CHECK (splice_type IN ('Fusion Splice', 'Mechanical Splice')),
    loss_db DECIMAL(4, 3) NOT NULL DEFAULT 0.03 CHECK (loss_db >= 0),
    description TEXT
);

-- Indeks Titik Sambungan (Splice points)
CREATE INDEX idx_splice_points_geom ON splice_points USING GIST (geom);
CREATE INDEX idx_splice_points_code ON splice_points(splice_code);

-- 8. Tabel Persimpangan CABLE SPLICES (Pemetaan hubungan Many-to-Many Kabel melalui Kotak Splice)
CREATE TABLE cable_splices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cable_id UUID NOT NULL REFERENCES fiber_cables(id) ON DELETE CASCADE,
    splice_id UUID NOT NULL REFERENCES splice_points(id) ON DELETE CASCADE,
    CONSTRAINT unique_cable_splice_pairing UNIQUE (cable_id, splice_id)
);

-- Indeks Tabel Gabungan (Join tables)
CREATE INDEX idx_cable_splices_cable_id ON cable_splices(cable_id);
CREATE INDEX idx_cable_splices_splice_id ON cable_splices(splice_id);

-- Fungsi trigger untuk memperbarui kolom geom geografis secara otomatis saat lat/lng diisi atau diubah
CREATE OR REPLACE FUNCTION update_spatial_geometry()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_Point(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Terapkan trigger spasial ke penanda (markers)
CREATE TRIGGER trg_sfp_spatial BEFORE INSERT OR UPDATE ON sfp FOR EACH ROW EXECUTE FUNCTION update_spatial_geometry();
CREATE TRIGGER trg_odc_spatial BEFORE INSERT OR UPDATE ON odc FOR EACH ROW EXECUTE FUNCTION update_spatial_geometry();
CREATE TRIGGER trg_odp_spatial BEFORE INSERT OR UPDATE ON odp FOR EACH ROW EXECUTE FUNCTION update_spatial_geometry();
CREATE TRIGGER trg_onu_spatial BEFORE INSERT OR UPDATE ON onu FOR EACH ROW EXECUTE FUNCTION update_spatial_geometry();
CREATE TRIGGER trg_splice_spatial BEFORE INSERT OR UPDATE ON splice_points FOR EACH ROW EXECUTE FUNCTION update_spatial_geometry();
