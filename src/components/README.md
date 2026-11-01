# Frontend React Components

Folder ini berisi komponen-komponen utama pembentuk antarmuka (UI) aplikasi.

## Daftar Komponen Utama

1. **[GisMap.tsx](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/src/components/GisMap.tsx) (Peta GIS):**
   * Mengintegrasikan peta spasial interaktif menggunakan pustaka **Leaflet.js**.
   * Menangani penempatan marker koordinat GPS perangkat secara akurat dan menggambar garis rute kabel serat optik.
   * Menyediakan mode interaktif *Hubung Kabel* dengan modal popup yang otomatis terbuka sesaat setelah kabel terhubung untuk merekam data panjang kabel.
2. **[AssetManager.tsx](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/src/components/AssetManager.tsx) (Inventaris Aset):**
   * Menyediakan tabel manajemen inventaris data fisik (CRUD SFP, ODC, ODP, ONU, Splice Point, dan Kabel) dalam bentuk list yang bersih dan rapi.
3. **[TopologyViewer.tsx](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/src/components/TopologyViewer.tsx) (Grafik Topologi):**
   * Menggambar bagan topologi jaringan fisik secara hierarki dari OLT/SFP -> ODC -> ODP -> ONU menggunakan **React Flow**.
4. **[TraceEngine.tsx](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/src/components/TraceEngine.tsx) (Pelacakan Optik):**
   * Menyediakan antarmuka pencarian data pelanggan (dilengkapi kotak pencarian dinamis) dan menampilkan kalkulasi redaman jalur serat kaca secara visual.
5. **[CapacityPanel.tsx](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/src/components/CapacityPanel.tsx) (Kapasitas Core):**
   * Menampilkan utilitas penggunaan core kaca (core aktif, cadangan, rusak) pada setiap segmen rute kabel.
