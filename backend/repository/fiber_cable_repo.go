package repository

import (
	"database/sql"
	"fmt"

	"ftth-network-mapper/backend/domain"

	"github.com/google/uuid"
)

// FiberCableRepository mendefinisikan kontrak operasi database untuk kabel serat optik.
type FiberCableRepository interface {
	Create(cable *domain.FiberCable) error
	GetByID(id uuid.UUID) (*domain.FiberCable, error)
	GetAll() ([]*domain.FiberCable, error)
	Update(cable *domain.FiberCable) error
	Delete(id uuid.UUID) error
}

type fiberCableRepository struct {
	db *sql.DB
}

// NewFiberCableRepository membuat instance repositori kabel serat optik baru.
func NewFiberCableRepository(db *sql.DB) FiberCableRepository {
	return &fiberCableRepository{db: db}
}

// Create menyimpan data kabel serat optik baru ke database beserta inisialisasi core-nya.
func (r *fiberCableRepository) Create(cable *domain.FiberCable) error {
	if cable.ID == uuid.Nil {
		cable.ID = uuid.New()
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}

	query := `
		INSERT INTO fiber_cable (id, cable_code, cable_name, from_node_type, from_node_id, to_node_type, to_node_id, length_km, total_cores, cable_type, splice_count, geometry_line, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`

	_, err = tx.Exec(query,
		cable.ID.String(),
		cable.CableCode,
		cable.CableName,
		cable.FromNodeType,
		cable.FromNodeID.String(),
		cable.ToNodeType,
		cable.ToNodeID.String(),
		cable.LengthKM,
		cable.TotalCores,
		cable.CableType,
		cable.SpliceCount,
		cable.GeometryLine,
		cable.Description,
	)
	if err != nil {
		tx.Rollback()
		return err
	}

	for i := 1; i <= cable.TotalCores; i++ {
		coreID := uuid.New().String()
		_, err = tx.Exec("INSERT INTO fiber_core (id, cable_id, core_number, status) VALUES (?, ?, ?, 'SPARE')",
			coreID,
			cable.ID.String(),
			i,
		)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

// GetByID mengambil data kabel serat optik berdasarkan ID unik.
func (r *fiberCableRepository) GetByID(id uuid.UUID) (*domain.FiberCable, error) {
	query := `
		SELECT id, cable_code, cable_name, from_node_type, from_node_id, to_node_type, to_node_id, length_km, total_cores, cable_type, splice_count, geometry_line, description, created_at, updated_at
		FROM fiber_cable
		WHERE id = ?
	`

	cable := &domain.FiberCable{}
	var description sql.NullString
	err := r.db.QueryRow(query, id.String()).Scan(
		&cable.ID,
		&cable.CableCode,
		&cable.CableName,
		&cable.FromNodeType,
		&cable.FromNodeID,
		&cable.ToNodeType,
		&cable.ToNodeID,
		&cable.LengthKM,
		&cable.TotalCores,
		&cable.CableType,
		&cable.SpliceCount,
		&cable.GeometryLine,
		&description,
		&cable.CreatedAt,
		&cable.UpdatedAt,
	)
	if err == nil {
		cable.Description = nullString(description)
	}

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("Fiber Cable not found")
	}

	return cable, err
}

// GetAll mengambil semua data kabel serat optik yang terdaftar.
func (r *fiberCableRepository) GetAll() ([]*domain.FiberCable, error) {
	query := `
		SELECT id, cable_code, cable_name, from_node_type, from_node_id, to_node_type, to_node_id, length_km, total_cores, cable_type, splice_count, geometry_line, description, created_at, updated_at
		FROM fiber_cable
		ORDER BY cable_code
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cables []*domain.FiberCable
	for rows.Next() {
		cable := &domain.FiberCable{}
		var description sql.NullString
		err := rows.Scan(
			&cable.ID,
			&cable.CableCode,
			&cable.CableName,
			&cable.FromNodeType,
			&cable.FromNodeID,
			&cable.ToNodeType,
			&cable.ToNodeID,
			&cable.LengthKM,
			&cable.TotalCores,
			&cable.CableType,
			&cable.SpliceCount,
			&cable.GeometryLine,
			&description,
			&cable.CreatedAt,
			&cable.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		cable.Description = nullString(description)
		cables = append(cables, cable)
	}

	return cables, rows.Err()
}

// Update memperbarui data kabel serat optik beserta penyesuaian core-nya.
func (r *fiberCableRepository) Update(cable *domain.FiberCable) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}

	query := `
		UPDATE fiber_cable
		SET cable_code = ?, cable_name = ?, from_node_type = ?, from_node_id = ?, to_node_type = ?, to_node_id = ?, length_km = ?, total_cores = ?, cable_type = ?, splice_count = ?, geometry_line = ?, description = ?, updated_at = NOW()
		WHERE id = ?
	`

	result, err := tx.Exec(query,
		cable.CableCode,
		cable.CableName,
		cable.FromNodeType,
		cable.FromNodeID.String(),
		cable.ToNodeType,
		cable.ToNodeID.String(),
		cable.LengthKM,
		cable.TotalCores,
		cable.CableType,
		cable.SpliceCount,
		cable.GeometryLine,
		cable.Description,
		cable.ID.String(),
	)
	if err != nil {
		tx.Rollback()
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		tx.Rollback()
		return err
	}

	if rows == 0 {
		tx.Rollback()
		return fmt.Errorf("Fiber Cable not found")
	}

	// 1. Hapus core yang berlebih jika total_cores diperkecil (misalnya diubah dari 12 ke 1)
	_, err = tx.Exec("DELETE FROM fiber_core WHERE cable_id = ? AND core_number > ?", cable.ID.String(), cable.TotalCores)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Tambahkan core baru yang belum ada (jika total_cores diperbesar)
	for i := 1; i <= cable.TotalCores; i++ {
		var exists bool
		err := tx.QueryRow("SELECT EXISTS(SELECT 1 FROM fiber_core WHERE cable_id = ? AND core_number = ?)",
			cable.ID.String(), i).Scan(&exists)
		if err != nil {
			tx.Rollback()
			return err
		}
		if !exists {
			coreID := uuid.New().String()
			_, err = tx.Exec("INSERT INTO fiber_core (id, cable_id, core_number, status) VALUES (?, ?, ?, 'SPARE')",
				coreID, cable.ID.String(), i)
			if err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit()
}

// Delete menghapus data kabel serat optik berdasarkan ID.
func (r *fiberCableRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM fiber_cable WHERE id = ?`

	result, err := r.db.Exec(query, id.String())
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("Fiber Cable not found")
	}

	return nil
}
