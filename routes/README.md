# API Endpoints & Routes Routing

Folder ini berisi definisi endpoint HTTP REST API backend yang menghubungkan frontend React dengan database MySQL.

## File Utama
* **[routes.go](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/routes/routes.go):**
  * Mendefinisikan penanganan rute (*routes handler*) menggunakan router **Chi (`github.com/go-chi/chi/v5`)**.
  * Berisi fungsi CRUD (Create, Read, Update, Delete) untuk seluruh perangkat fisik (SFP, ODC, ODP, ONU, Kabel, dan Sambungan).
  * Menyediakan fungsi kalkulasi redaman optik dan pencarian rute (`/api/trace/onu/{id}`).

## Cara Menambah API Baru
1. Buka [routes.go](file:///c:/BUG/NETWORK/ftth-network-mapper-&-optical-loss-analysis/routes/routes.go).
2. Tambahkan deklarasi rute di fungsi `SetupRoutes()`, contoh:
   ```go
   r.Get("/api/my-custom-endpoint", handleMyCustomEndpoint(db))
   ```
3. Tulis fungsi handler `handleMyCustomEndpoint` di bagian bawah dengan tipe parameter `http.HandlerFunc`.
