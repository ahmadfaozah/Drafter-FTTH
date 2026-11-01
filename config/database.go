package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	// Driver MySQL Go (diimpor secara implisit untuk inisialisasi driver sql.Open)
	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
)

// InitDB menginisialisasi dan mengkonfigurasi koneksi pool ke database MySQL.
func InitDB() (*sql.DB, error) {
	// Mengambil kredensial database dari variabel lingkungan (.env)
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASS")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	// Mengatur nilai default jika variabel lingkungan tidak ditentukan
	if dbUser == "" {
		dbUser = "root"
	}
	if dbHost == "" {
		dbHost = "localhost"
	}
	if dbPort == "" {
		dbPort = "3306"
	}
	if dbName == "" {
		dbName = "ftth_network"
	}

	// Membangun DSN (Data Source Name) sesuai spesifikasi driver MySQL Go
	// Format: username:password@tcp(host:port)/database_name?parseTime=true
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", dbUser, dbPass, dbHost, dbPort, dbName)

	// Membuka koneksi pool ke database
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("error membuka database: %w", err)
	}

	// Mengkonfigurasi batasan koneksi pool (Connection Pooling) untuk keamanan performa server
	db.SetMaxOpenConns(25) // Batas maksimum koneksi terbuka secara bersamaan
	db.SetMaxIdleConns(5)  // Jumlah maksimum koneksi idle/menganggur yang tetap dipertahankan di memori

	// Menjalankan pengecekan self-healing alokasi core serat optik kabel yang sudah ada
	if err := EnsureFiberCoresExist(db); err != nil {
		log.Printf("⚠️ Gagal sinkronisasi data core kabel: %v", err)
	}

	return db, nil
}

// EnsureFiberCoresExist memastikan setiap kabel optik yang tersimpan memiliki entri core individu di tabel fiber_core.
func EnsureFiberCoresExist(db *sql.DB) error {
	rows, err := db.Query("SELECT id, total_cores FROM fiber_cable")
	if err != nil {
		return err
	}
	defer rows.Close()

	type cableInfo struct {
		id         string
		totalCores int
	}
	var cables []cableInfo
	for rows.Next() {
		var c cableInfo
		if err := rows.Scan(&c.id, &c.totalCores); err != nil {
			return err
		}
		cables = append(cables, c)
	}

	for _, cable := range cables {
		// Hapus core yang berlebih jika total_cores diperkecil (misalnya diubah dari 12 ke 1)
		_, err = db.Exec("DELETE FROM fiber_core WHERE cable_id = ? AND core_number > ?", cable.id, cable.totalCores)
		if err != nil {
			return err
		}

		for i := 1; i <= cable.totalCores; i++ {
			var exists bool
			err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM fiber_core WHERE cable_id = ? AND core_number = ?)",
				cable.id, i).Scan(&exists)
			if err != nil {
				return err
			}
			if !exists {
				coreID := uuid.New().String()
				_, err = db.Exec("INSERT INTO fiber_core (id, cable_id, core_number, status) VALUES (?, ?, ?, 'SPARE')",
					coreID, cable.id, i)
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}
