-- 001_init_ftth.sql: Database Migration Setup & Seed Data
-- Run this in your PostgreSQL database instance containing the PostGIS extension.

BEGIN;

-- 1. Create tables if they do not exist
-- (Includes similar code defined in main schema.sql)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sfp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    slot INTEGER NOT NULL DEFAULT 1,
    port INTEGER NOT NULL DEFAULT 1,
    tx_power_dbm DECIMAL(5, 2) NOT NULL DEFAULT 3.00,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    geom GEOMETRY(Point, 4326),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS odc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    geom GEOMETRY(Point, 4326),
    total_ports INTEGER NOT NULL DEFAULT 32,
    splitter_type VARCHAR(20) NOT NULL DEFAULT '1:16',
    splitter_loss_db DECIMAL(4, 2) NOT NULL DEFAULT 13.80,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS odp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    geom GEOMETRY(Point, 4326),
    odc_id UUID REFERENCES odc(id) ON DELETE SET NULL,
    total_ports INTEGER NOT NULL DEFAULT 8,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onu (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    geom GEOMETRY(Point, 4326),
    odp_id UUID REFERENCES odp(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fiber_cables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cable_code VARCHAR(50) NOT NULL UNIQUE,
    cable_name VARCHAR(100) NOT NULL,
    from_node_type VARCHAR(20) NOT NULL,
    from_node_id UUID NOT NULL,
    to_node_type VARCHAR(20) NOT NULL,
    to_node_id UUID NOT NULL,
    length_km DECIMAL(6, 3) NOT NULL DEFAULT 0.100,
    total_cores INTEGER NOT NULL DEFAULT 12,
    cable_type VARCHAR(50) NOT NULL,
    geometry_line GEOMETRY(LineString, 4326) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fiber_cores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cable_id UUID NOT NULL REFERENCES fiber_cables(id) ON DELETE CASCADE,
    core_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SPARE',
    CONSTRAINT unique_core_per_cable_migration UNIQUE (cable_id, core_number)
);

CREATE TABLE IF NOT EXISTS splice_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    splice_code VARCHAR(50) NOT NULL UNIQUE,
    splice_name VARCHAR(100) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    geom GEOMETRY(Point, 4326),
    splice_type VARCHAR(30) NOT NULL,
    loss_db DECIMAL(4, 3) NOT NULL DEFAULT 0.03,
    description TEXT
);

CREATE TABLE IF NOT EXISTS cable_splices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cable_id UUID NOT NULL REFERENCES fiber_cables(id) ON DELETE CASCADE,
    splice_id UUID NOT NULL REFERENCES splice_points(id) ON DELETE CASCADE,
    CONSTRAINT unique_cable_splice_pairing_migration UNIQUE (cable_id, splice_id)
);


-- Triggers for Geom generation
CREATE OR REPLACE FUNCTION update_spatial_geometry_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_Point(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sfp_spatial ON sfp;
CREATE TRIGGER trg_sfp_spatial BEFORE INSERT OR UPDATE ON sfp FOR EACH ROW EXECUTE FUNCTION update_spatial_geometry_trigger();

DROP TRIGGER IF EXISTS trg_odc_spatial ON odc;
CREATE TRIGGER trg_odc_spatial BEFORE INSERT OR UPDATE ON odc FOR EACH ROW EXECUTE FUNCTION update_spatial_geometry_trigger();

DROP TRIGGER IF EXISTS trg_odp_spatial ON odp;
CREATE TRIGGER trg_odp_spatial BEFORE INSERT OR UPDATE ON odp FOR EACH ROW EXECUTE FUNCTION update_spatial_geometry_trigger();

DROP TRIGGER IF EXISTS trg_onu_spatial ON onu;
CREATE TRIGGER trg_onu_spatial BEFORE INSERT OR UPDATE ON onu FOR EACH ROW EXECUTE FUNCTION update_spatial_geometry_trigger();

DROP TRIGGER IF EXISTS trg_splice_spatial ON splice_points;
CREATE TRIGGER trg_splice_spatial BEFORE INSERT OR UPDATE ON splice_points FOR EACH ROW EXECUTE FUNCTION update_spatial_geometry_trigger();


-- SEED RECORDS (WGS84 geometry automatically populated via Triggers!)
-- Insert SFP
INSERT INTO sfp (id, code, name, slot, port, tx_power_dbm, latitude, longitude, description)
VALUES 
('d5a2d10c-569b-449e-ba78-afcb456d9531', 'SFP-CO-01', 'Central Office SFP S1-P1', 1, 1, 3.00, 37.7750, -122.4180, 'Primary GPON OLT SFP transmitter housed in regional Central Office.')
ON CONFLICT (code) DO NOTHING;

-- Insert ODC
INSERT INTO odc (id, code, name, latitude, longitude, total_ports, splitter_type, splitter_loss_db, description)
VALUES 
('2dbbbfcc-6ac5-48b4-be74-51bf16f863ef', 'ODC-HUB-01', 'Main Distribution Cabinet ODC-1', 37.7770, -122.4150, 32, '1:16', 13.80, 'Main primary distribution cabinet serving SF Center North blocks.')
ON CONFLICT (code) DO NOTHING;

-- Insert ODP
INSERT INTO odp (id, code, name, latitude, longitude, odc_id, total_ports, description)
VALUES 
('9fcfc5ef-1b2c-47fc-8f64-4bf819fe8a11', 'ODP-POLE-101', 'Pole-mount Term ODP-101', 37.7790, -122.4130, '2dbbbfcc-6ac5-48b4-be74-51bf16f863ef', 8, 'ODP box mounted on utility pole 44B.')
ON CONFLICT (code) DO NOTHING;

-- Insert ONU
INSERT INTO onu (id, code, name, serial_number, latitude, longitude, odp_id, description)
VALUES 
('77ee00dd-01ea-4be8-8db9-fdbcfeb94001', 'ONU-SUB-9001', 'Subscriber Residential ONU-1', 'GPON10293847-A', 37.7805, -122.4120, '9fcfc5ef-1b2c-47fc-8f64-4bf819fe8a11', 'ONU residential customer terminal in apartment unit 3B.')
ON CONFLICT (code) DO NOTHING;

-- Insert Splice point
INSERT INTO splice_points (id, splice_code, splice_name, latitude, longitude, splice_type, loss_db, description)
VALUES 
('5cb5b2cc-3ee8-4444-99dd-881188339dec', 'SPL-BOX-01', 'Midspan Closure S1', 37.7760, -122.4165, 'Fusion Splice', 0.030, 'Standard overhead closure.')
ON CONFLICT (splice_code) DO NOTHING;

-- Insert Fiber Cable (Feeder SFP to ODC)
INSERT INTO fiber_cables (id, cable_code, cable_name, from_node_type, from_node_id, to_node_type, to_node_id, length_km, total_cores, cable_type, geometry_line, description)
VALUES 
('c1a2e3f4-1122-3344-5566-778899aabbcc', 'CAB-CO-ODC1', 'Feeder Trunk SFP to ODC-1', 'SFP', 'd5a2d10c-569b-449e-ba78-afcb456d9531', 'ODC', '2dbbbfcc-6ac5-48b4-be74-51bf16f863ef', 0.450, 12, 'G.652D Loose tube', ST_GeomFromText('LINESTRING(-122.4180 37.7750, -122.4165 37.7760, -122.4150 37.7770)', 4326), 'Heavy core backbone under 8th Ave.')
ON CONFLICT (cable_code) DO NOTHING;

-- Insert Cable Splice correlation
INSERT INTO cable_splices (id, cable_id, splice_id)
VALUES 
('11bb8877-0099-aa88-ff22-ddccbbaaee77', 'c1a2e3f4-1122-3344-5566-778899aabbcc', '5cb5b2cc-3ee8-4444-99dd-881188339dec')
ON CONFLICT DO NOTHING;

-- Insert Cores for Feeder
INSERT INTO fiber_cores (cable_id, core_number, status)
VALUES 
('c1a2e3f4-1122-3344-5566-778899aabbcc', 1, 'USED'),
('c1a2e3f4-1122-3344-5566-778899aabbcc', 2, 'USED'),
('c1a2e3f4-1122-3344-5566-778899aabbcc', 3, 'SPARE'),
('c1a2e3f4-1122-3344-5566-778899aabbcc', 4, 'SPARE'),
('c1a2e3f4-1122-3344-5566-778899aabbcc', 5, 'SPARE'),
('c1a2e3f4-1122-3344-5566-778899aabbcc', 6, 'BROKEN'),
('c1a2e3f4-1122-3344-5566-778899aabbcc', 7, 'SPARE'),
('c1a2e3f4-1122-3344-5566-778899aabbcc', 8, 'SPARE'),
('c1a2e3f4-1122-3344-5566-778899aabbcc', 9, 'SPARE'),
('c1a2e3f4-1122-3344-5566-778899aabbcc', 10, 'SPARE'),
('c1a2e3f4-1122-3344-5566-778899aabbcc', 11, 'RESERVED'),
('c1a2e3f4-1122-3344-5566-778899aabbcc', 12, 'SPARE')
ON CONFLICT DO NOTHING;

COMMIT;
