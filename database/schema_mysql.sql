-- Skema Database MySQL untuk Pemetaan Jaringan FTTH & Analisis Redaman Optik
-- Jalankan skrip ini untuk membuat database dan tabel-tabel yang diperlukan

-- Membuat database jika belum ada
CREATE DATABASE IF NOT EXISTS ftth_network;
USE ftth_network;

-- =========================================================================
-- 1. TABEL SFP (GPON OLT Transceiver / Regional Central Office)
-- =========================================================================
CREATE TABLE IF NOT EXISTS sfp (
    id VARCHAR(36) PRIMARY KEY,                         -- ID unik (menggunakan format UUID)
    code VARCHAR(50) NOT NULL UNIQUE,                  -- Kode modul SFP (misal: SFP-001)
    name VARCHAR(100) NOT NULL,                        -- Nama atau label pemancar SFP
    slot INT NOT NULL DEFAULT 1,                       -- Nomor slot fisik pada OLT
    port INT NOT NULL DEFAULT 1,                       -- Nomor port fisik pada slot OLT
    tx_power_dbm DECIMAL(5, 2) NOT NULL DEFAULT 3.00,  -- Daya pancar standar SFP (dBm)
    latitude DECIMAL(9, 6) NOT NULL,                   -- Koordinat geografis lintang
    longitude DECIMAL(9, 6) NOT NULL,                  -- Koordinat geografis bujur
    description LONGTEXT,                              -- Deskripsi tambahan mengenai modul SFP
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Waktu pembuatan data
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Waktu perubahan terakhir
    KEY idx_code (code),                               -- Indeks pencarian cepat berdasarkan kode
    KEY idx_location (latitude, longitude)             -- Indeks pencarian berdasarkan lokasi geografis
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 2. TABEL ODC (Optical Distribution Cabinet / Lemari Pembagi Utama)
-- =========================================================================
CREATE TABLE IF NOT EXISTS odc (
    id VARCHAR(36) PRIMARY KEY,                         -- ID unik (format UUID)
    code VARCHAR(50) NOT NULL UNIQUE,                  -- Kode unik kabinet ODC (misal: ODC-001)
    name VARCHAR(100) NOT NULL,                        -- Nama kabinet / lokasi hub
    latitude DECIMAL(9, 6) NOT NULL,                   -- Lokasi geografis lintang
    longitude DECIMAL(9, 6) NOT NULL,                  -- Lokasi geografis bujur
    total_ports INT NOT NULL DEFAULT 32,               -- Jumlah port splitter yang tersedia di kabinet
    splitter_type VARCHAR(20) NOT NULL DEFAULT '1:16', -- Jenis rasio splitter (misal: '1:16', '1:32')
    splitter_loss_db DECIMAL(4, 2) NOT NULL DEFAULT 13.80, -- Nilai redaman bawaan splitter (dB)
    description LONGTEXT,                              -- Keterangan tambahan mengenai kabinet ODC
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Waktu pembuatan data
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Waktu perubahan terakhir
    KEY idx_code (code),
    KEY idx_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 3. TABEL ODP (Optical Distribution Point / Kotak Distribusi ke Pelanggan)
-- =========================================================================
CREATE TABLE IF NOT EXISTS odp (
    id VARCHAR(36) PRIMARY KEY,                         -- ID unik (format UUID)
    code VARCHAR(50) NOT NULL UNIQUE,                  -- Kode kotak ODP (misal: ODP-001)
    name VARCHAR(100) NOT NULL,                        -- Nama / lokasi tiang ODP
    latitude DECIMAL(9, 6) NOT NULL,                   -- Lokasi geografis lintang
    longitude DECIMAL(9, 6) NOT NULL,                  -- Lokasi geografis bujur
    total_ports INT NOT NULL DEFAULT 8,                -- Kapasitas port distribusi ke pelanggan
    splitter_loss_db DECIMAL(4, 2) NOT NULL DEFAULT 13.80, -- Nilai redaman pasif dari splitter di ODP (dB)
    description LONGTEXT,                              -- Catatan tambahan mengenai ODP
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Waktu pembuatan data
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Waktu perubahan terakhir
    KEY idx_code (code),
    KEY idx_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 4. TABEL ONU (Optical Network Unit / Perangkat Pelanggan / User)
-- =========================================================================
CREATE TABLE IF NOT EXISTS onu (
    id VARCHAR(36) PRIMARY KEY,                         -- ID unik (format UUID)
    code VARCHAR(50) NOT NULL UNIQUE,                  -- Kode pelanggan / nomor sirkuit internet
    name VARCHAR(100) NOT NULL,                        -- Nama pelanggan / pemilik rumah
    customer_id VARCHAR(100),                          -- ID Pelanggan (Mikrotik PPPoE Username)
    remote_address VARCHAR(100),                       -- IP Remote Address (Mikrotik PPPoE Active Connection)
    latitude DECIMAL(9, 6) NOT NULL,                   -- Koordinat lintang rumah pelanggan
    longitude DECIMAL(9, 6) NOT NULL,                  -- Koordinat bujur rumah pelanggan
    status VARCHAR(50) NOT NULL DEFAULT 'Inactive',    -- Status koneksi pelanggan (Active/Inactive/Blocked)
    description LONGTEXT,                              -- Catatan khusus (alamat lengkap pelanggan)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Waktu pembuatan data
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Waktu perubahan terakhir
    KEY idx_code (code),
    KEY idx_status (status),
    KEY idx_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 5. TABEL FIBER CABLE (Kabel Serat Optik Fisik / Jalur Penghubung)
-- =========================================================================
CREATE TABLE IF NOT EXISTS fiber_cable (
    id VARCHAR(36) PRIMARY KEY,                         -- ID unik kabel (format UUID)
    cable_code VARCHAR(50) NOT NULL UNIQUE,            -- Kode identitas kabel (misal: CAB-001)
    cable_name VARCHAR(100) NOT NULL,                  -- Nama ruas jalur kabel serat optik
    from_node_type VARCHAR(20) NOT NULL,               -- Jenis node asal (SFP / ODC / ODP / ONU / SPLICE)
    from_node_id VARCHAR(36) NOT NULL,                 -- ID perangkat asal (relasi UUID non-FK karena dinamis)
    to_node_type VARCHAR(20) NOT NULL,                 -- Jenis node tujuan (SFP / ODC / ODP / ONU / SPLICE)
    to_node_id VARCHAR(36) NOT NULL,                   -- ID perangkat tujuan (relasi UUID non-FK karena dinamis)
    length_km DECIMAL(6, 3) NOT NULL DEFAULT 0.1,      -- Panjang bentang kabel dalam satuan kilometer (km)
    total_cores INT NOT NULL DEFAULT 12,               -- Jumlah core serat optik di dalam kabel
    cable_type VARCHAR(50) NOT NULL,                   -- Spesifikasi kabel (misal: G.652D Loose Tube)
    splice_count INT NOT NULL DEFAULT 0,               -- Jumlah titik sambungan (splice) di sepanjang kabel ini
    geometry_line LONGTEXT,                            -- Data spasial jalur kabel (Format JSON koordinat poliline)
    description LONGTEXT,                              -- Catatan rute kabel (misal: jalur bawah tanah / udara)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Waktu pembuatan data
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Waktu perubahan terakhir
    KEY idx_code (cable_code),
    KEY idx_from_node (from_node_type, from_node_id),
    KEY idx_to_node (to_node_type, to_node_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 6. TABEL FIBER CORE (Core Serat Optik Individu di Dalam Kabel)
-- =========================================================================
CREATE TABLE IF NOT EXISTS fiber_core (
    id VARCHAR(36) PRIMARY KEY,                         -- ID unik core (format UUID)
    cable_id VARCHAR(36) NOT NULL,                     -- ID kabel tempat core berada
    core_number INT NOT NULL,                          -- Nomor core (misal: Core 1 s.d Core 12)
    status VARCHAR(20) NOT NULL DEFAULT 'SPARE',       -- Status core (USED / SPARE / RESERVED / BROKEN)
    FOREIGN KEY (cable_id) REFERENCES fiber_cable(id) ON DELETE CASCADE, -- Hapus core jika kabel dihapus
    KEY idx_cable_id (cable_id),
    KEY idx_status (status),
    UNIQUE KEY uk_cable_core (cable_id, core_number)    -- Batasan: nomor core tidak boleh duplikat pada satu kabel
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 7. TABEL SPLICE POINT (Titik Sambungan Sambungan Fisik / Splicing Box)
-- =========================================================================
CREATE TABLE IF NOT EXISTS splice_point (
    id VARCHAR(36) PRIMARY KEY,                         -- ID unik titik sambungan (format UUID)
    cable_id VARCHAR(36) NOT NULL,                     -- ID kabel serat optik utama tempat sambungan dipasang
    splice_type VARCHAR(50) NOT NULL,                  -- Metode penyambungan (Fusion Splice / Mechanical Splice)
    loss_db DECIMAL(4, 2),                             -- Nilai kehilangan daya redaman sambungan (dalam dB)
    core_id_from VARCHAR(36),                          -- ID core asal yang disambungkan
    core_id_to VARCHAR(36),                            -- ID core tujuan yang disambungkan
    location VARCHAR(255),                             -- Lokasi tiang / titik geografis sambungan (deskriptif)
    latitude DECIMAL(9, 6) NOT NULL,                   -- Koordinat geografis lintang posisi sambungan
    longitude DECIMAL(9, 6) NOT NULL,                  -- Koordinat geografis bujur posisi sambungan
    splice_code VARCHAR(50) NOT NULL UNIQUE,            -- Kode sambungan unik (misal: SPL-001)
    splice_name VARCHAR(100) NOT NULL,                  -- Nama identifikasi splice box
    description LONGTEXT,                              -- Keterangan kondisi fisik penutup sambungan
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- Waktu pembuatan data
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Waktu perubahan terakhir
    FOREIGN KEY (cable_id) REFERENCES fiber_cable(id) ON DELETE CASCADE,
    KEY idx_cable_id (cable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- INDEKS DAN KUNCI TAMBAHAN UNTUK OPTIMALISASI KINERJA QUERY
-- =========================================================================
CREATE INDEX idx_sfp_created ON sfp(created_at);
CREATE INDEX idx_odc_created ON odc(created_at);
CREATE INDEX idx_onu_created ON onu(created_at);
CREATE INDEX idx_cable_created ON fiber_cable(created_at);

-- =========================================================================
-- MEMASUKKAN DATA CONTOH (SEED DATA) UNTUK INISIALISASI AWAL
-- =========================================================================
-- Data Contoh SFP (Central Office regional)
INSERT INTO sfp (id, code, name, latitude, longitude, tx_power_dbm)
VALUES ('550e8400-e29b-41d4-a716-446655440001', 'SFP-001', 'OLT Port 1', -6.2088, 106.8456, 3.0);

-- Data Contoh ODC (Kabinet Pembagi)
INSERT INTO odc (id, code, name, latitude, longitude, splitter_type, splitter_loss_db)
VALUES ('550e8400-e29b-41d4-a716-446655440002', 'ODC-001', 'Distribution Cabinet 1', -6.2100, 106.8470, '1:16', 13.80);

-- Data Contoh ODP (Kotak Tiang Distribusi)
INSERT INTO odp (id, code, name, latitude, longitude, total_ports)
VALUES ('550e8400-e29b-41d4-a716-446655440003', 'ODP-001', 'Distribution Point 1', -6.2110, 106.8480, 8);

-- Data Contoh ONU (Pelanggan Akhir)
INSERT INTO onu (id, code, name, latitude, longitude, status)
VALUES ('550e8400-e29b-41d4-a716-446655440004', 'ONU-001', 'End User 1', -6.2120, 106.8490, 'Active');
