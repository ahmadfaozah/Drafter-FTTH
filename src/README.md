# Frontend Source Code Overview

Folder ini berisi seluruh kode sumber frontend aplikasi FTTH Network Mapper yang dibangun menggunakan **React**, **TypeScript**, dan **Vite**.

## Struktur File Utama

* **[App.tsx](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/src/App.tsx):**
  * Entry point utama dan pengatur status (*state manager*) global aplikasi.
  * Mengatur perpindahan tab menu (Dashboard, Peta GIS, Inventaris Aset, Pelacakan Optik, Kapasitas Core, Grafik Topologi).
* **[types.ts](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/src/types.ts):**
  * Berisi definisi interface TypeScript untuk memastikan konsistensi tipe data antara backend Go dan frontend React (SFP, ODC, ODP, ONU, dll).
* **`components/`:**
  * Komponen-komponen UI terpisah (Peta Leaflet, Bagan Alir React Flow, Manajemen Aset, dll).
