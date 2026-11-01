# Pemetaan Jaringan FTTH & Analisis Redaman Optik (FTTH Network Mapper & Optical Loss Analysis)

Aplikasi manajemen infrastruktur fisik jaringan serat optik FTTH (*Fiber to the Home*) mandiri yang dirancang untuk memetakan rute kabel secara spasial pada peta GIS dan menghitung anggaran daya optik (*Link Power Budget*) secara dinamis dari pemancar hulu OLT SFP hingga ke perangkat modem ONU pelanggan akhir.

---

## 🚀 Fitur Utama

1. **Dasbor Analitis (Dashboard):**
   * Metrik KPI jumlah aset jaringan secara *real-time* (SFP, ODC, ODP, ONU, Kabel, dan Sambungan).
   * Panel utilitas kapasitas port splitter global (ODC & ODP) untuk mencegah kepadatan port.
   * Grafik rata-rata redaman daya terima sinyal (Rx Power) pelanggan.

2. **Peta GIS Kartografi (Leaflet Map):**
   * Visualisasi interaktif perangkat dan jalur kabel serat optik dengan dukungan *basemap* satelit dan mode gelap.
   * Modul penggambaran kabel serat optik interaktif dengan penentuan titik belok (*bends*) otomatis.
   * Penempatan dan pengubahan lokasi koordinat geografis (lintang/bujur) aset langsung di peta.

3. **Manajer Kapasitas Core Serat (Capacity Panel):**
   * Panel visualisasi interaktif status alokasi core kabel serat optik individual (Aktif Terpakai, Bebas Cadangan, Direservasi, dan Rusak/Terputus).
   * Mendukung pengubahan status alokasi core secara instan dengan klik tombol.

4. **Mesin Pelacakan Jalur & Redaman (Trace Engine):**
   * Melacak jalur kabel serat optik dari ONU pelanggan ke atas (*upstream*) melewati kotak ODP, sambungan *splice*, kabinet ODC, hingga bermuara ke port OLT SFP.
   * Menghitung akumulasi kehilangan daya optik berdasarkan panjang serat kaca (0.35 dB/km), sambungan fusion (0.03 dB), sambungan mekanis (0.20 dB), redaman splitter rasio pasif, dan adaptor konektor.

5. **Pohon Grafis Topologi (Topology Viewer):**
   * Memvisualisasikan hubungan logis hierarki GPON secara terstruktur dari OLT hingga ONU menggunakan pohon grafis dinamis bertenaga React Flow.
   * Mendukung pencarian node secara instan dan penyorotan (*highlighting*) rute aktif.

6. **Validasi Rute & Audit Jaringan (Route Validation):**
   * Mendeteksi otomatis masalah kritis dalam skema jaringan seperti ONU terisolasi (tanpa upstream), port splitter 100% penuh, tingkat kerusakan core kabel melebihi 50%, atau daya Rx kritis di bawah standar sensitivitas GPON (-28.0 dBm).

---

## 🛠️ Teknologi yang Digunakan

* **Frontend:** React.js, TypeScript, Tailwind CSS, Leaflet (Peta GIS), React Flow (Topologi Pohon).
* **Backend:** Go (Golang), HTTP Router standar, driver MySQL bawaan.
* **Basis Data:** MySQL dengan dukungan data JSON spasial dan skema PostgreSQL + PostGIS (opsional).

---

## 📁 Struktur Direktori Proyek

```text
ftth-network-mapper-&-optical-loss-analysis/
├── backend/                  # Kode sumber backend Go (Golang)
│   ├── domain/               # Model data relasional & interface kontrak repositori
│   ├── repository/           # Implementasi kueri SQL & data akses untuk MySQL
│   └── service/              # Logika kalkulasi Link Power Budget redaman optik
├── database/                 # Skema basis data relasional
│   ├── schema.sql            # Skema spasial untuk PostgreSQL + PostGIS
│   └── schema_mysql.sql      # Skema relasional MySQL siap pakai
├── routes/                   # Handler HTTP & endpoint REST API
│   └── routes.go             # Pendaftaran endpoint API CRUD & kalkulasi
├── src/                      # Kode sumber frontend React & TypeScript
│   ├── components/           # Komponen antarmuka modul aplikasi (GIS, Topologi, Dasbor)
│   ├── types.ts              # Definisi interface tipe data TypeScript
│   ├── App.tsx               # Komponen utama UI & sinkronisasi data global
│   └── main.tsx              # Titik masuk React di peramban
├── main.go                   # Berkas utama server backend Go (entry point)
├── server.ts                 # Server proxy pengembangan lokal
└── vite.config.ts            # Konfigurasi pembundel Vite untuk frontend
```

---

## ⚙️ Petunjuk Instalasi & Cara Menjalankan

### **Prasyarat Sistem:**
* Node.js versi 18 ke atas.
* Go (Golang) versi 1.20 ke atas.
* MySQL Server aktif.

### **Langkah Pemasangan:**

1. **Persiapan Database:**
   * Masuk ke shell/admin database MySQL Anda, buat database baru dengan nama `ftth_network`:
     ```sql
     CREATE DATABASE ftth_network;
     ```
   * Impor skema tabel dan data inisialisasi awal (*seed data*) dari berkas [database/schema_mysql.sql](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/database/schema_mysql.sql) ke database Anda.

2. **Konfigurasi Variabel Lingkungan (.env):**
   * Salin berkas [.env.example](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/.env.example) menjadi `.env`:
     ```bash
     cp .env.example .env
     ```
   * Buka berkas `.env` dan sesuaikan kredensial koneksi database MySQL Anda:
     ```env
     PORT=3000
     DB_USER=username_mysql_anda
     DB_PASSWORD=password_mysql_anda
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_NAME=ftth_network
     ```

3. **Instalasi Dependensi Frontend:**
   * Jalankan perintah npm install pada direktori root proyek untuk mengunduh semua library frontend:
     ```bash
     npm install
     ```

4. **Menjalankan Aplikasi Secara Lokal:**
   * Jalankan perintah berikut untuk meluncurkan server backend Go dan menyajikan antarmuka frontend secara simultan:
     ```bash
     npm run dev
     ```
   * Setelah berjalan, buka peramban Anda di alamat [http://localhost:3000](http://localhost:3000).

---

## 📄 Lisensi

Proyek ini dikembangkan secara mandiri untuk kebutuhan visualisasi jaringan serat optik FTTH dan analisis redaman optik dengan performa optimal.
