package repository

import (
	"database/sql"
	"fmt"

	"ftth-network-mapper/backend/domain"

	"github.com/google/uuid"
)

// ODCRepository mendefinisikan kontrak operasi database untuk kabinet pembagi utama ODC.
type ODCRepository interface {
	Create(odc *domain.ODC) error
	GetByID(id uuid.UUID) (*domain.ODC, error)
	GetAll() ([]*domain.ODC, error)
	Update(odc *domain.ODC) error
	Delete(id uuid.UUID) error
}

type odcRepository struct {
	db *sql.DB
}

// NewODCRepository membuat instance repositori ODC baru.
func NewODCRepository(db *sql.DB) ODCRepository {
	return &odcRepository{db: db}
}

// Create menyimpan data kabinet ODC baru ke database.
func (r *odcRepository) Create(odc *domain.ODC) error {
	if odc.ID == uuid.Nil {
		odc.ID = uuid.New()
	}

	query := `
		INSERT INTO odc (id, code, name, latitude, longitude, total_ports, splitter_type, splitter_loss_db, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`

	_, err := r.db.Exec(query,
		odc.ID.String(),
		odc.Code,
		odc.Name,
		odc.Latitude,
		odc.Longitude,
		odc.TotalPorts,
		odc.SplitterType,
		odc.SplitterLossDB,
		odc.Description,
	)

	return err
}

// GetByID mengambil data ODC berdasarkan ID unik.
func (r *odcRepository) GetByID(id uuid.UUID) (*domain.ODC, error) {
	query := `
		SELECT id, code, name, latitude, longitude, total_ports, splitter_type, splitter_loss_db, description, created_at, updated_at
		FROM odc
		WHERE id = ?
	`

	odc := &domain.ODC{}
	var description sql.NullString
	err := r.db.QueryRow(query, id.String()).Scan(
		&odc.ID,
		&odc.Code,
		&odc.Name,
		&odc.Latitude,
		&odc.Longitude,
		&odc.TotalPorts,
		&odc.SplitterType,
		&odc.SplitterLossDB,
		&description,
		&odc.CreatedAt,
		&odc.UpdatedAt,
	)
	if err == nil {
		odc.Description = nullString(description)
	}

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("ODC not found")
	}

	return odc, err
}

// GetAll mengambil semua data ODC yang terdaftar.
func (r *odcRepository) GetAll() ([]*domain.ODC, error) {
	query := `
		SELECT id, code, name, latitude, longitude, total_ports, splitter_type, splitter_loss_db, description, created_at, updated_at
		FROM odc
		ORDER BY code
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var odcs []*domain.ODC
	for rows.Next() {
		odc := &domain.ODC{}
		var description sql.NullString
		err := rows.Scan(
			&odc.ID,
			&odc.Code,
			&odc.Name,
			&odc.Latitude,
			&odc.Longitude,
			&odc.TotalPorts,
			&odc.SplitterType,
			&odc.SplitterLossDB,
			&description,
			&odc.CreatedAt,
			&odc.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		odc.Description = nullString(description)
		odcs = append(odcs, odc)
	}

	return odcs, rows.Err()
}

// Update memperbarui data ODC yang sudah ada.
func (r *odcRepository) Update(odc *domain.ODC) error {
	query := `
		UPDATE odc
		SET code = ?, name = ?, latitude = ?, longitude = ?, total_ports = ?, splitter_type = ?, splitter_loss_db = ?, description = ?, updated_at = NOW()
		WHERE id = ?
	`

	result, err := r.db.Exec(query,
		odc.Code,
		odc.Name,
		odc.Latitude,
		odc.Longitude,
		odc.TotalPorts,
		odc.SplitterType,
		odc.SplitterLossDB,
		odc.Description,
		odc.ID.String(),
	)

	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("ODC not found")
	}

	return nil
}

// Delete menghapus data ODC berdasarkan ID.
func (r *odcRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM odc WHERE id = ?`

	result, err := r.db.Exec(query, id.String())
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("ODC not found")
	}

	return nil
}
