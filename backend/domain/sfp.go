package domain

import "github.com/google/uuid"

// Interface repositori perangkat
type SFPRepository interface {
	Create(sfp *SFP) error
	GetByID(id uuid.UUID) (*SFP, error)
	GetAll() ([]*SFP, error)
	Update(sfp *SFP) error
	Delete(id uuid.UUID) error
}

type ODCRepository interface {
	Create(odc *ODC) error
	GetByID(id uuid.UUID) (*ODC, error)
	GetAll() ([]*ODC, error)
	Update(odc *ODC) error
	Delete(id uuid.UUID) error
}

type ODPRepository interface {
	Create(odp *ODP) error
	GetByID(id uuid.UUID) (*ODP, error)
	GetAll() ([]*ODP, error)
	Update(odp *ODP) error
	Delete(id uuid.UUID) error
}

type ONURepository interface {
	Create(onu *ONU) error
	GetByID(id uuid.UUID) (*ONU, error)
	GetAll() ([]*ONU, error)
	Update(onu *ONU) error
	Delete(id uuid.UUID) error
}
