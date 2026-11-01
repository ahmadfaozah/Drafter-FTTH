package repository

import (
	"database/sql"
	"fmt"

	"ftth-network-mapper/backend/domain"

	"github.com/google/uuid"
)

// FiberCoreRepository mendefinisikan kontrak operasi database untuk core optik individual.
type FiberCoreRepository interface {
	Create(core *domain.FiberCore) error
	GetByID(id uuid.UUID) (*domain.FiberCore, error)
	GetAll() ([]*domain.FiberCore, error)
	GetByCableID(cableID uuid.UUID) ([]*domain.FiberCore, error)
	Update(core *domain.FiberCore) error
	Delete(id uuid.UUID) error
}

type fiberCoreRepository struct {
	db *sql.DB
}

// NewFiberCoreRepository membuat instance repositori core optik baru.
func NewFiberCoreRepository(db *sql.DB) FiberCoreRepository {
	return &fiberCoreRepository{db: db}
}

// Create menyimpan data core optik baru ke database.
func (r *fiberCoreRepository) Create(core *domain.FiberCore) error {
	if core.ID == uuid.Nil {
		core.ID = uuid.New()
	}

	query := `
		INSERT INTO fiber_core (id, cable_id, core_number, status)
		VALUES (?, ?, ?, ?)
	`

	_, err := r.db.Exec(query,
		core.ID.String(),
		core.CableID.String(),
		core.CoreNumber,
		core.Status,
	)

	return err
}

// GetByID mengambil data core optik berdasarkan ID unik.
func (r *fiberCoreRepository) GetByID(id uuid.UUID) (*domain.FiberCore, error) {
	query := `
		SELECT id, cable_id, core_number, status
		FROM fiber_core
		WHERE id = ?
	`

	core := &domain.FiberCore{}
	err := r.db.QueryRow(query, id.String()).Scan(
		&core.ID,
		&core.CableID,
		&core.CoreNumber,
		&core.Status,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("Fiber Core not found")
	}

	return core, err
}

// GetByCableID mengambil daftar core optik berdasarkan ID kabel pemilik.
func (r *fiberCoreRepository) GetByCableID(cableID uuid.UUID) ([]*domain.FiberCore, error) {
	query := `
		SELECT id, cable_id, core_number, status
		FROM fiber_core
		WHERE cable_id = ?
		ORDER BY core_number
	`

	rows, err := r.db.Query(query, cableID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cores []*domain.FiberCore
	for rows.Next() {
		core := &domain.FiberCore{}
		err := rows.Scan(
			&core.ID,
			&core.CableID,
			&core.CoreNumber,
			&core.Status,
		)
		if err != nil {
			return nil, err
		}
		cores = append(cores, core)
	}

	return cores, rows.Err()
}

// GetAll mengambil semua data core optik yang tersimpan.
func (r *fiberCoreRepository) GetAll() ([]*domain.FiberCore, error) {
	query := `
		SELECT id, cable_id, core_number, status
		FROM fiber_core
		ORDER BY cable_id, core_number
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cores []*domain.FiberCore
	for rows.Next() {
		core := &domain.FiberCore{}
		err := rows.Scan(
			&core.ID,
			&core.CableID,
			&core.CoreNumber,
			&core.Status,
		)
		if err != nil {
			return nil, err
		}
		cores = append(cores, core)
	}

	return cores, rows.Err()
}

// Update memperbarui data status atau nomor core optik.
func (r *fiberCoreRepository) Update(core *domain.FiberCore) error {
	query := `
		UPDATE fiber_core
		SET cable_id = ?, core_number = ?, status = ?
		WHERE id = ?
	`

	result, err := r.db.Exec(query,
		core.CableID.String(),
		core.CoreNumber,
		core.Status,
		core.ID.String(),
	)

	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("Fiber Core not found")
	}

	return nil
}

// Delete menghapus data core optik berdasarkan ID.
func (r *fiberCoreRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM fiber_core WHERE id = ?`

	result, err := r.db.Exec(query, id.String())
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("Fiber Core not found")
	}

	return nil
}
