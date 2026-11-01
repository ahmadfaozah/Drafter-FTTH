package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// GeometryLine merepresentasikan koordinat jalur spasial garis (Polyline) untuk rute kabel serat optik.
// Disimpan sebagai array dari koordinat titik [latitude, longitude] (format [][]float64).
type GeometryLine [][]float64

// Value mengubah representasi data GeometryLine menjadi JSON byte slice saat akan disimpan ke MySQL.
// Mengimplementasikan interface driver.Valuer untuk ORM/database SQL bawaan Go.
func (g GeometryLine) Value() (driver.Value, error) {
	if len(g) == 0 {
		return nil, nil
	}
	return json.Marshal(g)
}

// Scan mengurai data geometry dari MySQL (berupa format JSON string atau format WKT LineString)
// kembali menjadi tipe data Go GeometryLine saat dibaca dari database.
func (g *GeometryLine) Scan(src interface{}) error {
	if src == nil {
		*g = nil
		return nil
	}

	var data []byte
	switch v := src.(type) {
	case string:
		data = []byte(v)
	case []byte:
		data = v
	default:
		return fmt.Errorf("tipe data geometry tidak didukung: %T", src)
	}

	if len(data) == 0 {
		*g = nil
		return nil
	}

	// Coba parsing jika format datanya adalah JSON array koordinat
	if err := json.Unmarshal(data, g); err == nil {
		return nil
	}

	// Coba parsing jika format datanya adalah Well-Known Text (WKT) LINESTRING (misal dari dump PostGIS/MySQL Spatial)
	parsed, err := parseWKTLineString(string(data))
	if err == nil {
		*g = parsed
		return nil
	}

	return fmt.Errorf("tidak dapat mengurai format geometry line: %s", string(data))
}

// parseWKTLineString adalah fungsi helper untuk mengubah WKT string LINESTRING(lon lat, lon lat) menjadi tipe GeometryLine
func parseWKTLineString(raw string) (GeometryLine, error) {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "LINESTRING")
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "(")
	raw = strings.TrimSuffix(raw, ")")
	if raw == "" {
		return nil, fmt.Errorf("linestring kosong")
	}

	parts := strings.Split(raw, ",")
	var line GeometryLine
	for _, part := range parts {
		coords := strings.Fields(strings.TrimSpace(part))
		if len(coords) != 2 {
			return nil, fmt.Errorf("format koordinat linestring tidak valid: %q", part)
		}
		// Format WKT umumnya menggunakan urutan: longitude latitude
		lon, err := strconv.ParseFloat(coords[0], 64)
		if err != nil {
			return nil, err
		}
		lat, err := strconv.ParseFloat(coords[1], 64)
		if err != nil {
			return nil, err
		}
		// Memetakan ke struktur internal Go kami: [latitude, longitude]
		line = append(line, []float64{lat, lon})
	}
	return line, nil
}

// SFP merepresentasikan modul GPON OLT Transceiver di Central Office (hulu jaringan)
type SFP struct {
	ID          uuid.UUID `json:"id"`            // ID unik modul SFP
	Code        string    `json:"code"`          // Kode unik modul SFP
	Name        string    `json:"name"`          // Nama/label modul SFP
	Slot        int       `json:"slot"`          // Slot fisik OLT tempat SFP terpasang
	Port        int       `json:"port"`          // Port fisik OLT tempat SFP terpasang
	TxPowerDBm  float64   `json:"tx_power_dbm"`  // Daya keluaran pancar optik awal (dBm)
	Latitude    float64   `json:"latitude"`      // Lokasi lintang geografis
	Longitude   float64   `json:"longitude"`     // Lokasi bujur geografis
	Description string    `json:"description"`   // Informasi pelengkap mengenai modul
	CreatedAt   time.Time `json:"created_at"`    // Waktu pembuatan data
	UpdatedAt   time.Time `json:"updated_at"`    // Waktu modifikasi data terakhir
}

// ODC merepresentasikan Optical Distribution Cabinet (kabinet hub pembagi utama)
type ODC struct {
	ID             uuid.UUID `json:"id"`               // ID unik kabinet ODC
	Code           string    `json:"code"`             // Kode unik kabinet ODC
	Name           string    `json:"name"`             // Nama kabinet ODC
	Latitude       float64   `json:"latitude"`         // Lokasi lintang geografis
	Longitude      float64   `json:"longitude"`        // Lokasi bujur geografis
	TotalPorts     int       `json:"total_ports"`       // Kapasitas port fisik kabinet
	SplitterType   string    `json:"splitter_type"`     // Jenis splitter rasio (1:16, 1:32)
	SplitterLossDB float64   `json:"splitter_loss_db"`  // Nilai redaman daya bawaan splitter (dB)
	Description    string    `json:"description"`      // Catatan tambahan mengenai kabinet
	CreatedAt      time.Time `json:"created_at"`       // Waktu pembuatan data
	UpdatedAt      time.Time `json:"updated_at"`       // Waktu modifikasi data terakhir
}

// ODP merepresentasikan Optical Distribution Point (kotak tiang distribusi akhir ke pelanggan)
type ODP struct {
	ID             uuid.UUID `json:"id"`               // ID unik kotak ODP
	Code           string    `json:"code"`             // Kode unik kotak ODP
	Name           string    `json:"name"`             // Nama/keterangan kotak ODP
	Latitude       float64   `json:"latitude"`         // Lokasi lintang geografis
	Longitude      float64   `json:"longitude"`        // Lokasi bujur geografis
	TotalPorts     int       `json:"total_ports"`       // Kapasitas port distribusi ke pelanggan
	SplitterLossDB float64   `json:"splitter_loss_db"`  // Nilai redaman pasif splitter di ODP (dB)
	Description    string    `json:"description"`      // Catatan tambahan mengenai ODP
	ODCID          string    `json:"odc_id"`           // ID ODC Induk
	ODCPort        int       `json:"odc_port"`         // Nomor port ODC Induk
	CreatedAt      time.Time `json:"created_at"`       // Waktu pembuatan data
	UpdatedAt      time.Time `json:"updated_at"`       // Waktu modifikasi data terakhir
}

// ONU merepresentasikan Optical Network Unit (perangkat modem di rumah pelanggan)
type ONU struct {
	ID            uuid.UUID `json:"id"`             // ID unik perangkat ONU pelanggan
	Code          string    `json:"code"`           // Kode langganan sirkuit internet
	Name          string    `json:"name"`           // Nama pelanggan/pemilik rumah
	CustomerID    string    `json:"customer_id"`    // ID Pelanggan (Mikrotik PPPoE Username)
	RemoteAddress string    `json:"remote_address"` // IP Remote Address (Mikrotik PPPoE Active Connection)
	Latitude      float64   `json:"latitude"`       // Lokasi lintang rumah pelanggan
	Longitude     float64   `json:"longitude"`      // Lokasi bujur rumah pelanggan
	Status        string    `json:"status"`         // Status koneksi (Active/Inactive/Suspended)
	Description   string    `json:"description"`    // Catatan (misal: alamat lengkap)
	ODPID         string    `json:"odp_id"`         // ID ODP Induk yang terhubung
	ODPPort       int       `json:"odp_port"`       // Nomor port ODP Induk yang terhubung
	CreatedAt     time.Time `json:"created_at"`     // Waktu pembuatan data
	UpdatedAt     time.Time `json:"updated_at"`     // Waktu modifikasi data terakhir
}

// FiberCable merepresentasikan kabel optik fisik penghubung antar perangkat
type FiberCable struct {
	ID           uuid.UUID    `json:"id"`             // ID unik kabel serat optik
	CableCode    string       `json:"cable_code"`     // Kode identitas kabel
	CableName    string       `json:"cable_name"`     // Nama ruas jalur kabel
	FromNodeType string       `json:"from_node_type"`  // Tipe perangkat asal (SFP, ODC, ODP, ONU, SPLICE)
	FromNodeID   uuid.UUID    `json:"from_node_id"`   // ID perangkat asal
	ToNodeType   string       `json:"to_node_type"`    // Tipe perangkat tujuan
	ToNodeID     uuid.UUID    `json:"to_node_id"`     // ID perangkat tujuan
	LengthKM     float64      `json:"length_km"`      // Bentang panjang kabel (km)
	TotalCores   int          `json:"total_cores"`    // Jumlah core optik di dalam kabel (misal: 12)
	CableType    string       `json:"cable_type"`     // Spesifikasi kabel
	SpliceCount  int          `json:"splice_count"`   // Jumlah titik sambungan (splice) pada kabel ini
	GeometryLine GeometryLine `json:"geometry_line"`  // Data spasial rute kabel (poliline koordinat)
	Description  string       `json:"description"`    // Deskripsi rute lintasan kabel
	CreatedAt    time.Time    `json:"created_at"`     // Waktu pembuatan data
	UpdatedAt    time.Time    `json:"updated_at"`     // Waktu modifikasi data terakhir
}

// FiberCore merepresentasikan satu serat (core) di dalam kabel optik
type FiberCore struct {
	ID         uuid.UUID `json:"id"`           // ID unik core
	CableID    uuid.UUID `json:"cable_id"`     // ID kabel tempat core bernaung
	CoreNumber int       `json:"core_number"`   // Nomor urut core di dalam kabel (misal: core 1 s.d 12)
	Status     string    `json:"status"`       // Status core (USED, SPARE, RESERVED, BROKEN)
}

// SplicePoint merepresentasikan lokasi penyambungan kabel serat optik (Splice Box/Closure)
type SplicePoint struct {
	ID          uuid.UUID `json:"id"`            // ID unik splice point
	CableID     uuid.UUID `json:"cable_id"`      // ID kabel utama tempat sambungan dipasang
	SpliceCode  string    `json:"splice_code"`    // Kode identitas unik kotak sambungan
	SpliceName  string    `json:"splice_name"`    // Nama kotak sambungan
	Latitude    float64   `json:"latitude"`      // Lokasi lintang geografis
	Longitude   float64   `json:"longitude"`     // Lokasi bujur geografis
	SpliceType  string    `json:"splice_type"`    // Tipe sambungan (Fusion Splice / Mechanical Splice)
	LossDB      float64   `json:"loss_db"`       // Redaman daya sambungan optik (dB)
	CoreIDFrom  string    `json:"core_id_from"`  // ID core asal yang disambungkan
	CoreIDTo    string    `json:"core_id_to"`    // ID core tujuan yang disambungkan
	Location    string    `json:"location"`      // Deskripsi lokasi tiang sambungan (deskriptif)
	Description string    `json:"description"`   // Informasi kondisi fisik sambungan
	CreatedAt   time.Time `json:"created_at"`    // Waktu pembuatan data
	UpdatedAt   time.Time `json:"updated_at"`    // Waktu modifikasi data terakhir
}

// OpticalLossResult merepresentasikan hasil kalkulasi anggaran daya redaman optik (Link Power Budget)
type OpticalLossResult struct {
	TotalFiberLossDB     float64 `json:"total_fiber_loss_db"`     // Total kehilangan daya dari serat kaca (redaman per km)
	TotalSpliceLossDB    float64 `json:"total_splice_loss_db"`    // Total redaman dari semua sambungan fusion/mekanik
	TotalConnectorLossDB float64 `json:"total_connector_loss_db"` // Total redaman konektor (default: 0.5 dB per patch cord)
	TotalSplitterLossDB  float64 `json:"total_splitter_loss_db"`  // Total redaman pasif dari splitter ODC dan ODP
	TotalRouteLossDB     float64 `json:"total_route_loss_db"`     // Akumulasi total redaman di sepanjang jalur distribusi (dB)
	EstimatedRxPowerDBm  float64 `json:"estimated_rx_power_dbm"`  // Estimasi daya optik yang diterima perangkat pelanggan (dBm)
	CableLengthKM        float64 `json:"cable_length_km"`        // Akumulasi panjang kabel yang dilalui (km)
}
