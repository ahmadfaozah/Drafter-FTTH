package domain

import "github.com/google/uuid"

// Interface repositori untuk kabel serat optik (fiber cables) dan titik sambungan (splices)
type FiberCableRepository interface {
	Create(cable *FiberCable) error
	GetByID(id uuid.UUID) (*FiberCable, error)
	GetAll() ([]*FiberCable, error)
	Update(cable *FiberCable) error
	Delete(id uuid.UUID) error
}

type FiberCoreRepository interface {
	Create(core *FiberCore) error
	GetByID(id uuid.UUID) (*FiberCore, error)
	GetByCableID(cableID uuid.UUID) ([]*FiberCore, error)
	Update(core *FiberCore) error
	Delete(id uuid.UUID) error
}

type SplicePointRepository interface {
	Create(splice *SplicePoint) error
	GetByID(id uuid.UUID) (*SplicePoint, error)
	GetByCableID(cableID uuid.UUID) ([]*SplicePoint, error)
	Update(splice *SplicePoint) error
	Delete(id uuid.UUID) error
}
