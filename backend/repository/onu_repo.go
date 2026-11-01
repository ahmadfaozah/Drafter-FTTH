package repository

import (
	"database/sql"
	"fmt"

	"ftth-network-mapper/backend/domain"

	"github.com/google/uuid"
)

// ONURepository mendefinisikan kontrak operasi database untuk modem ONU pelanggan.
type ONURepository interface {
	Create(onu *domain.ONU) error
	GetByID(id uuid.UUID) (*domain.ONU, error)
	GetAll() ([]*domain.ONU, error)
	Update(onu *domain.ONU) error
	Delete(id uuid.UUID) error
}

type onuRepository struct {
	db *sql.DB
}

// NewONURepository membuat instance repositori ONU baru.
func NewONURepository(db *sql.DB) ONURepository {
	return &onuRepository{db: db}
}

// Create menyimpan data modem ONU baru ke database.
func (r *onuRepository) Create(onu *domain.ONU) error {
	if onu.ID == uuid.Nil {
		onu.ID = uuid.New()
	}

	query := `
		INSERT INTO onu (id, code, name, customer_id, remote_address, latitude, longitude, status, description, odp_id, odp_port, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`

	var odpIDVal any = nil
	if onu.ODPID != "" {
		odpIDVal = onu.ODPID
	}
	var odpPortVal any = nil
	if onu.ODPPort > 0 {
		odpPortVal = onu.ODPPort
	}

	_, err := r.db.Exec(query,
		onu.ID.String(),
		onu.Code,
		onu.Name,
		onu.CustomerID,
		onu.RemoteAddress,
		onu.Latitude,
		onu.Longitude,
		onu.Status,
		onu.Description,
		odpIDVal,
		odpPortVal,
	)

	return err
}

// GetByID mengambil data ONU berdasarkan ID unik.
func (r *onuRepository) GetByID(id uuid.UUID) (*domain.ONU, error) {
	query := `
		SELECT id, code, name, customer_id, remote_address, latitude, longitude, status, description, odp_id, odp_port, created_at, updated_at
		FROM onu
		WHERE id = ?
	`

	onu := &domain.ONU{}
	var customerID sql.NullString
	var remoteAddress sql.NullString
	var description sql.NullString
	var odpID sql.NullString
	var odpPort sql.NullInt64

	err := r.db.QueryRow(query, id.String()).Scan(
		&onu.ID,
		&onu.Code,
		&onu.Name,
		&customerID,
		&remoteAddress,
		&onu.Latitude,
		&onu.Longitude,
		&onu.Status,
		&description,
		&odpID,
		&odpPort,
		&onu.CreatedAt,
		&onu.UpdatedAt,
	)
	if err == nil {
		if customerID.Valid {
			onu.CustomerID = customerID.String
		}
		if remoteAddress.Valid {
			onu.RemoteAddress = remoteAddress.String
		}
		onu.Description = nullString(description)
		if odpID.Valid {
			onu.ODPID = odpID.String
		}
		if odpPort.Valid {
			onu.ODPPort = int(odpPort.Int64)
		}
	}

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("ONU not found")
	}

	return onu, err
}

// GetAll mengambil semua data ONU yang terdaftar.
func (r *onuRepository) GetAll() ([]*domain.ONU, error) {
	query := `
		SELECT id, code, name, customer_id, remote_address, latitude, longitude, status, description, odp_id, odp_port, created_at, updated_at
		FROM onu
		ORDER BY code
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var onus []*domain.ONU
	for rows.Next() {
		onu := &domain.ONU{}
		var customerID sql.NullString
		var remoteAddress sql.NullString
		var description sql.NullString
		var odpID sql.NullString
		var odpPort sql.NullInt64

		err := rows.Scan(
			&onu.ID,
			&onu.Code,
			&onu.Name,
			&customerID,
			&remoteAddress,
			&onu.Latitude,
			&onu.Longitude,
			&onu.Status,
			&description,
			&odpID,
			&odpPort,
			&onu.CreatedAt,
			&onu.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if customerID.Valid {
			onu.CustomerID = customerID.String
		}
		if remoteAddress.Valid {
			onu.RemoteAddress = remoteAddress.String
		}
		onu.Description = nullString(description)
		if odpID.Valid {
			onu.ODPID = odpID.String
		}
		if odpPort.Valid {
			onu.ODPPort = int(odpPort.Int64)
		}
		onus = append(onus, onu)
	}

	return onus, rows.Err()
}

// Update memperbarui data ONU yang sudah ada.
func (r *onuRepository) Update(onu *domain.ONU) error {
	query := `
		UPDATE onu
		SET code = ?, name = ?, customer_id = ?, remote_address = ?, latitude = ?, longitude = ?, status = ?, description = ?, odp_id = ?, odp_port = ?, updated_at = NOW()
		WHERE id = ?
	`

	var odpIDVal any = nil
	if onu.ODPID != "" {
		odpIDVal = onu.ODPID
	}
	var odpPortVal any = nil
	if onu.ODPPort > 0 {
		odpPortVal = onu.ODPPort
	}

	result, err := r.db.Exec(query,
		onu.Code,
		onu.Name,
		onu.CustomerID,
		onu.RemoteAddress,
		onu.Latitude,
		onu.Longitude,
		onu.Status,
		onu.Description,
		odpIDVal,
		odpPortVal,
		onu.ID.String(),
	)

	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("ONU not found")
	}

	return nil
}

// Delete menghapus data ONU berdasarkan ID.
func (r *onuRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM onu WHERE id = ?`

	result, err := r.db.Exec(query, id.String())
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("ONU not found")
	}

	return nil
}
