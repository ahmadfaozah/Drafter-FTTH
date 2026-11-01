package repository

import (
	"database/sql"
	"fmt"

	"ftth-network-mapper/backend/domain"

	"github.com/google/uuid"
)

// SFPRepository mendefinisikan kontrak operasi database untuk modul SFP OLT.
type SFPRepository interface {
	Create(sfp *domain.SFP) error
	GetByID(id uuid.UUID) (*domain.SFP, error)
	GetAll() ([]*domain.SFP, error)
	Update(sfp *domain.SFP) error
	Delete(id uuid.UUID) error
}

type sfpRepository struct {
	db *sql.DB
}

// NewSFPRepository membuat instance repositori modul SFP baru.
func NewSFPRepository(db *sql.DB) SFPRepository {
	return &sfpRepository{db: db}
}

// Create menyimpan data modul SFP baru ke database.
func (r *sfpRepository) Create(sfp *domain.SFP) error {
	if sfp.ID == uuid.Nil {
		sfp.ID = uuid.New()
	}

	query := `
		INSERT INTO sfp (id, code, name, slot, port, tx_power_dbm, latitude, longitude, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`

	_, err := r.db.Exec(query,
		sfp.ID.String(),
		sfp.Code,
		sfp.Name,
		sfp.Slot,
		sfp.Port,
		sfp.TxPowerDBm,
		sfp.Latitude,
		sfp.Longitude,
		sfp.Description,
	)

	return err
}

// GetByID mengambil data modul SFP berdasarkan ID unik.
func (r *sfpRepository) GetByID(id uuid.UUID) (*domain.SFP, error) {
	query := `
		SELECT id, code, name, slot, port, tx_power_dbm, latitude, longitude, description, created_at, updated_at
		FROM sfp
		WHERE id = ?
	`

	sfp := &domain.SFP{}
	var description sql.NullString
	err := r.db.QueryRow(query, id.String()).Scan(
		&sfp.ID,
		&sfp.Code,
		&sfp.Name,
		&sfp.Slot,
		&sfp.Port,
		&sfp.TxPowerDBm,
		&sfp.Latitude,
		&sfp.Longitude,
		&description,
		&sfp.CreatedAt,
		&sfp.UpdatedAt,
	)
	if err == nil {
		sfp.Description = nullString(description)
	}

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("SFP not found")
	}

	return sfp, err
}

// GetAll mengambil semua data modul SFP yang tersimpan.
func (r *sfpRepository) GetAll() ([]*domain.SFP, error) {
	query := `
		SELECT id, code, name, slot, port, tx_power_dbm, latitude, longitude, description, created_at, updated_at
		FROM sfp
		ORDER BY code
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sfps []*domain.SFP
	for rows.Next() {
		sfp := &domain.SFP{}
		var description sql.NullString
		err := rows.Scan(
			&sfp.ID,
			&sfp.Code,
			&sfp.Name,
			&sfp.Slot,
			&sfp.Port,
			&sfp.TxPowerDBm,
			&sfp.Latitude,
			&sfp.Longitude,
			&description,
			&sfp.CreatedAt,
			&sfp.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		sfp.Description = nullString(description)
		sfps = append(sfps, sfp)
	}

	return sfps, rows.Err()
}

// Update memperbarui data modul SFP yang sudah ada.
func (r *sfpRepository) Update(sfp *domain.SFP) error {
	query := `
		UPDATE sfp
		SET code = ?, name = ?, slot = ?, port = ?, tx_power_dbm = ?, latitude = ?, longitude = ?, description = ?, updated_at = NOW()
		WHERE id = ?
	`

	result, err := r.db.Exec(query,
		sfp.Code,
		sfp.Name,
		sfp.Slot,
		sfp.Port,
		sfp.TxPowerDBm,
		sfp.Latitude,
		sfp.Longitude,
		sfp.Description,
		sfp.ID.String(),
	)

	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("SFP not found")
	}

	return nil
}

// Delete menghapus data modul SFP dari database berdasarkan ID.
func (r *sfpRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM sfp WHERE id = ?`

	result, err := r.db.Exec(query, id.String())
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("SFP not found")
	}

	return nil
}
