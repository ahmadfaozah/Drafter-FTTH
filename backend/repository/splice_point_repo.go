package repository

import (
	"database/sql"
	"fmt"

	"ftth-network-mapper/backend/domain"

	"github.com/google/uuid"
)

// SplicePointRepository mendefinisikan interface database untuk entitas SplicePoint.
type SplicePointRepository interface {
	Create(splice *domain.SplicePoint) error
	GetByID(id uuid.UUID) (*domain.SplicePoint, error)
	GetAll() ([]*domain.SplicePoint, error)
	GetByCableID(cableID uuid.UUID) ([]*domain.SplicePoint, error)
	Update(splice *domain.SplicePoint) error
	Delete(id uuid.UUID) error
}

type splicePointRepository struct {
	db *sql.DB
}

// NewSplicePointRepository membuat instance baru dari repositori splicePoint.
func NewSplicePointRepository(db *sql.DB) SplicePointRepository {
	return &splicePointRepository{db: db}
}

// Create menyimpan data baru SplicePoint ke dalam tabel splice_point
func (r *splicePointRepository) Create(splice *domain.SplicePoint) error {
	// Menghasilkan UUID baru secara otomatis jika belum didefinisikan
	if splice.ID == uuid.Nil {
		splice.ID = uuid.New()
	}

	query := `
		INSERT INTO splice_point (id, cable_id, splice_type, loss_db, core_id_from, core_id_to, location, latitude, longitude, splice_code, splice_name, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`

	_, err := r.db.Exec(query,
		splice.ID.String(),
		splice.CableID.String(),
		splice.SpliceType,
		splice.LossDB,
		splice.CoreIDFrom,
		splice.CoreIDTo,
		splice.Location,
		splice.Latitude,
		splice.Longitude,
		splice.SpliceCode,
		splice.SpliceName,
		splice.Description,
	)

	return err
}

// GetByID mengambil satu baris data SplicePoint berdasarkan ID kuncinya
func (r *splicePointRepository) GetByID(id uuid.UUID) (*domain.SplicePoint, error) {
	query := `
		SELECT id, cable_id, splice_type, loss_db, core_id_from, core_id_to, location, latitude, longitude, splice_code, splice_name, description, created_at, updated_at
		FROM splice_point
		WHERE id = ?
	`

	splice := &domain.SplicePoint{}
	var coreIDFrom sql.NullString
	var coreIDTo sql.NullString
	var location sql.NullString
	var description sql.NullString

	// Memindai baris data dan menangani kolom yang mungkin bernilai NULL menggunakan sql.NullString
	err := r.db.QueryRow(query, id.String()).Scan(
		&splice.ID,
		&splice.CableID,
		&splice.SpliceType,
		&splice.LossDB,
		&coreIDFrom,
		&coreIDTo,
		&location,
		&splice.Latitude,
		&splice.Longitude,
		&splice.SpliceCode,
		&splice.SpliceName,
		&description,
		&splice.CreatedAt,
		&splice.UpdatedAt,
	)
	if err == nil {
		// Mengubah tipe data penampung NULL menjadi string Go standar
		splice.CoreIDFrom = nullString(coreIDFrom)
		splice.CoreIDTo = nullString(coreIDTo)
		splice.Location = nullString(location)
		splice.Description = nullString(description)
	}

	// Jika data tidak ditemukan, kembalikan pesan error yang informatif
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("Splice Point tidak ditemukan")
	}

	return splice, err
}

// GetByCableID mengambil semua daftar sambungan (splice points) yang berada di bawah ID kabel tertentu
func (r *splicePointRepository) GetByCableID(cableID uuid.UUID) ([]*domain.SplicePoint, error) {
	query := `
		SELECT id, cable_id, splice_type, loss_db, core_id_from, core_id_to, location, latitude, longitude, splice_code, splice_name, description, created_at, updated_at
		FROM splice_point
		WHERE cable_id = ?
		ORDER BY location
	`

	rows, err := r.db.Query(query, cableID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var splices []*domain.SplicePoint
	for rows.Next() {
		splice := &domain.SplicePoint{}
		var coreIDFrom sql.NullString
		var coreIDTo sql.NullString
		var location sql.NullString
		var description sql.NullString

		err := rows.Scan(
			&splice.ID,
			&splice.CableID,
			&splice.SpliceType,
			&splice.LossDB,
			&coreIDFrom,
			&coreIDTo,
			&location,
			&splice.Latitude,
			&splice.Longitude,
			&splice.SpliceCode,
			&splice.SpliceName,
			&description,
			&splice.CreatedAt,
			&splice.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		splice.CoreIDFrom = nullString(coreIDFrom)
		splice.CoreIDTo = nullString(coreIDTo)
		splice.Location = nullString(location)
		splice.Description = nullString(description)
		splices = append(splices, splice)
	}

	return splices, rows.Err()
}

// GetAll mengambil seluruh baris data SplicePoint dari tabel di database
func (r *splicePointRepository) GetAll() ([]*domain.SplicePoint, error) {
	query := `
		SELECT id, cable_id, splice_type, loss_db, core_id_from, core_id_to, location, latitude, longitude, splice_code, splice_name, description, created_at, updated_at
		FROM splice_point
		ORDER BY cable_id, location
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var splices []*domain.SplicePoint
	for rows.Next() {
		splice := &domain.SplicePoint{}
		var coreIDFrom sql.NullString
		var coreIDTo sql.NullString
		var location sql.NullString
		var description sql.NullString

		err := rows.Scan(
			&splice.ID,
			&splice.CableID,
			&splice.SpliceType,
			&splice.LossDB,
			&coreIDFrom,
			&coreIDTo,
			&location,
			&splice.Latitude,
			&splice.Longitude,
			&splice.SpliceCode,
			&splice.SpliceName,
			&description,
			&splice.CreatedAt,
			&splice.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		splice.CoreIDFrom = nullString(coreIDFrom)
		splice.CoreIDTo = nullString(coreIDTo)
		splice.Location = nullString(location)
		splice.Description = nullString(description)
		splices = append(splices, splice)
	}

	return splices, rows.Err()
}

// Update memperbarui data SplicePoint yang sudah ada berdasarkan ID uniknya
func (r *splicePointRepository) Update(splice *domain.SplicePoint) error {
	query := `
		UPDATE splice_point
		SET cable_id = ?, splice_type = ?, loss_db = ?, core_id_from = ?, core_id_to = ?, location = ?, latitude = ?, longitude = ?, splice_code = ?, splice_name = ?, description = ?, updated_at = NOW()
		WHERE id = ?
	`

	result, err := r.db.Exec(query,
		splice.CableID.String(),
		splice.SpliceType,
		splice.LossDB,
		splice.CoreIDFrom,
		splice.CoreIDTo,
		splice.Location,
		splice.Latitude,
		splice.Longitude,
		splice.SpliceCode,
		splice.SpliceName,
		splice.Description,
		splice.ID.String(),
	)

	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("Splice Point tidak ditemukan")
	}

	return nil
}

// Delete menghapus data SplicePoint secara permanen dari database berdasarkan ID kuncinya
func (r *splicePointRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM splice_point WHERE id = ?`

	result, err := r.db.Exec(query, id.String())
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("Splice Point tidak ditemukan")
	}

	return nil
}
