# Backend Go Architecture

Folder ini berisi kode backend aplikasi FTTH Mapper & Optical Loss Analysis yang dibangun menggunakan bahasa pemrograman Go.

## Struktur Folder

```
backend/
├── domain/       # Mendefinisikan struktur data/model bisnis (struct)
├── repository/   # Menangani komunikasi database (SQL query & CRUD)
└── service/      # Berisi logika bisnis (perhitungan redaman optik)
```

## Deskripsi Lapisan (Layers)

1. **Domain (`backend/domain/`):**
   * Berisi [models.go](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/backend/domain/models.go) yang mendefinisikan objek fisik jaringan seperti SFP, ODC, ODP, ONU, sambungan (SplicePoint), dan Kabel (FiberCable).
2. **Repository (`backend/repository/`):**
   * Mengatur operasi penulisan dan pembacaan ke database MySQL/Postgres.
   * Contoh: [onu_repo.go](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/backend/repository/onu_repo.go) menangani pembuatan, pembacaan, pembaruan, dan penghapusan data ONU pelanggan dengan aman.
3. **Service (`backend/service/`):**
   * Menangani logika perhitungan teknis. 
   * Contoh: `TracePathService` yang digunakan untuk menelusuri rute kabel optik dari ONU pelanggan hingga ke port SFP pusat untuk mendeteksi redaman.
