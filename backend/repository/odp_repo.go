package repository

import (
	"database/sql"
	"fmt"

	"ftth-network-mapper/backend/domain"

	"github.com/google/uuid"
)

// ODPRepository mendefinisikan kontrak operasi database untuk titik pembagi akhir ODP.
type ODPRepository interface {
	Create(odp *domain.ODP) error
	GetByID(id uuid.UUID) (*domain.ODP, error)
	GetAll() ([]*domain.ODP, error)
	Update(odp *domain.ODP) error
	Delete(id uuid.UUID) error
}

type odpRepository struct {
	db *sql.DB
}

// NewODPRepository membuat instance repositori ODP baru.
func NewODPRepository(db *sql.DB) ODPRepository {
	return &odpRepository{db: db}
}

// Create menyimpan data ODP baru ke database.
func (r *odpRepository) Create(odp *domain.ODP) error {
	if odp.ID == uuid.Nil {
		odp.ID = uuid.New()
	}

	query := `
		INSERT INTO odp (id, code, name, latitude, longitude, total_ports, splitter_loss_db, description, odc_id, odc_port, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`

	var odcIDVal any = nil
	if odp.ODCID != "" {
		odcIDVal = odp.ODCID
	}
	var odcPortVal any = nil
	if odp.ODCPort > 0 {
		odcPortVal = odp.ODCPort
	}

	_, err := r.db.Exec(query,
		odp.ID.String(),
		odp.Code,
		odp.Name,
		odp.Latitude,
		odp.Longitude,
		odp.TotalPorts,
		odp.SplitterLossDB,
		odp.Description,
		odcIDVal,
		odcPortVal,
	)

	return err
}

// GetByID mengambil data ODP berdasarkan ID unik.
func (r *odpRepository) GetByID(id uuid.UUID) (*domain.ODP, error) {
	query := `
		SELECT id, code, name, latitude, longitude, total_ports, splitter_loss_db, description, odc_id, odc_port, created_at, updated_at
		FROM odp
		WHERE id = ?
	`

	odp := &domain.ODP{}
	var description sql.NullString
	var odcID sql.NullString
	var odcPort sql.NullInt64

	err := r.db.QueryRow(query, id.String()).Scan(
		&odp.ID,
		&odp.Code,
		&odp.Name,
		&odp.Latitude,
		&odp.Longitude,
		&odp.TotalPorts,
		&odp.SplitterLossDB,
		&description,
		&odcID,
		&odcPort,
		&odp.CreatedAt,
		&odp.UpdatedAt,
	)
	if err == nil {
		odp.Description = nullString(description)
		if odcID.Valid {
			odp.ODCID = odcID.String
		}
		if odcPort.Valid {
			odp.ODCPort = int(odcPort.Int64)
		}
	}

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("ODP not found")
	}

	return odp, err
}

// GetAll mengambil semua data ODP yang terdaftar.
func (r *odpRepository) GetAll() ([]*domain.ODP, error) {
	query := `
		SELECT id, code, name, latitude, longitude, total_ports, splitter_loss_db, description, odc_id, odc_port, created_at, updated_at
		FROM odp
		ORDER BY code
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var odps []*domain.ODP
	for rows.Next() {
		odp := &domain.ODP{}
		var description sql.NullString
		var odcID sql.NullString
		var odcPort sql.NullInt64

		err := rows.Scan(
			&odp.ID,
			&odp.Code,
			&odp.Name,
			&odp.Latitude,
			&odp.Longitude,
			&odp.TotalPorts,
			&odp.SplitterLossDB,
			&description,
			&odcID,
			&odcPort,
			&odp.CreatedAt,
			&odp.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		odp.Description = nullString(description)
		if odcID.Valid {
			odp.ODCID = odcID.String
		}
		if odcPort.Valid {
			odp.ODCPort = int(odcPort.Int64)
		}
		odps = append(odps, odp)
	}

	return odps, rows.Err()
}

// Update memperbarui data ODP yang sudah ada.
func (r *odpRepository) Update(odp *domain.ODP) error {
	query := `
		UPDATE odp
		SET code = ?, name = ?, latitude = ?, longitude = ?, total_ports = ?, splitter_loss_db = ?, description = ?, odc_id = ?, odc_port = ?, updated_at = NOW()
		WHERE id = ?
	`

	var odcIDVal any = nil
	if odp.ODCID != "" {
		odcIDVal = odp.ODCID
	}
	var odcPortVal any = nil
	if odp.ODCPort > 0 {
		odcPortVal = odp.ODCPort
	}

	result, err := r.db.Exec(query,
		odp.Code,
		odp.Name,
		odp.Latitude,
		odp.Longitude,
		odp.TotalPorts,
		odp.SplitterLossDB,
		odp.Description,
		odcIDVal,
		odcPortVal,
		odp.ID.String(),
	)

	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("ODP not found")
	}

	return nil
}

// Delete menghapus data ODP berdasarkan ID.
func (r *odpRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM odp WHERE id = ?`

	result, err := r.db.Exec(query, id.String())
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("ODP not found")
	}

	return nil
}
