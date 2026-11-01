# Database Schemas & Migrations

Folder ini berisi rancangan skema database relasional (MySQL dan PostgreSQL) untuk FTTH Network Mapper.

## Daftar File Skema

1. **[schema_mysql.sql](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/database/schema_mysql.sql) (MySQL):**
   * Digunakan untuk sistem produksi lokal menggunakan XAMPP/MySQL.
   * Berisi definisi tabel fisik (SFP, ODC, ODP, ONU, FiberCable, SplicePoint, FiberCore) lengkap dengan indeks spasial koordinat Lintang/Bujur.
2. **[schema.sql](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/database/schema.sql) (PostgreSQL + PostGIS):**
   * Opsi skema database canggih menggunakan PostGIS untuk pengindeksan spasial peta GIS berbasis vektor.

## Pengisian Kolom Baru (Mikrotik PPPoE Sync)
Tabel `onu` telah diperbarui dengan kolom-kolom baru:
* `customer_id`: Menyimpan ID / Username PPPoE dari Mikrotik (dapat dikosongkan).
* `remote_address`: Menyimpan IP Address Remote dari koneksi aktif Mikrotik.
