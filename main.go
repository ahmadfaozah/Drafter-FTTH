package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"ftth-network-mapper/config"
	"ftth-network-mapper/routes"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
)

func main() {
	// Memuat file .env untuk membaca konfigurasi variabel lingkungan lokal
	godotenv.Load()

	// Menginisialisasi koneksi awal ke database MySQL
	db, err := config.InitDB()
	if err != nil {
		log.Fatalf("Koneksi database gagal: %v", err)
	}
	defer db.Close() // Menutup koneksi database ketika aplikasi dihentikan

	// Melakukan uji Ping untuk memastikan database benar-benar aktif dan merespon
	if err := db.Ping(); err != nil {
		log.Fatalf("Uji Ping ke database gagal: %v", err)
	}
	log.Println("✅ Database terhubung dengan sukses")

	// Menginisialisasi router Chi untuk penanganan rute HTTP backend
	router := chi.NewRouter()

	// Mendaftarkan middleware standar bawaan Chi
	router.Use(middleware.Logger)    // Untuk mencatat detail log aktivitas request HTTP masuk
	router.Use(middleware.Recoverer) // Menangkap panic agar server tidak langsung mati jika ada error internal
	router.Use(corsMiddleware)      // Memperbolehkan request lintas domain (Cross-Origin Resource Sharing)

	// Menyajikan file statis React untuk sisi klien (Frontend Single Page Application)
	fileServer := http.FileServer(http.Dir("./dist"))
	router.Handle("/assets/*", fileServer)
	router.Get("/", serveIndex)
	router.Get("/index.html", serveIndex)

	// Menyiapkan rute API backend (registrasi endpoint CRUD dan kalkulasi)
	routes.SetupRoutes(router, db)

	// Mendapatkan port jalannya server dari konfigurasi .env (default: 3000)
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	fmt.Printf("🚀 Server berjalan di http://localhost:%s\n", port)
	// Mulai mendengarkan request HTTP pada port yang telah ditentukan
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Server gagal dijalankan: %v", err)
	}
}

// corsMiddleware menangani izin Cross-Origin Resource Sharing agar frontend React dapat memanggil API backend
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Jika metode request adalah OPTIONS (preflight request), langsung kirim status 204 tanpa proses lanjutan
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// serveIndex menyajikan file utama index.html React dari folder dist
func serveIndex(w http.ResponseWriter, r *http.Request) {
	indexPath := filepath.Join("dist", "index.html")
	http.ServeFile(w, r, indexPath)
}

// writeJSON menyederhanakan penulisan respons HTTP berformat JSON
func writeJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

// writeError menyederhanakan penulisan respons HTTP error berformat JSON
func writeError(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, map[string]string{"error": message})
}
