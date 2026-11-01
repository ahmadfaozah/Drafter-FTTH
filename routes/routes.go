package routes

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"ftth-network-mapper/backend/domain"
	"ftth-network-mapper/backend/repository"
	"ftth-network-mapper/backend/service"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func SetupRoutes(router *chi.Mux, db *sql.DB) {
	// Inisialisasi repositori
	sfpRepo := repository.NewSFPRepository(db)
	odcRepo := repository.NewODCRepository(db)
	odpRepo := repository.NewODPRepository(db)
	onuRepo := repository.NewONURepository(db)
	fiberCableRepo := repository.NewFiberCableRepository(db)
	fiberCoreRepo := repository.NewFiberCoreRepository(db)
	splicePointRepo := repository.NewSplicePointRepository(db)

	// Inisialisasi layanan (services)
	lossService := service.NewLossCalculationService()

	// Rute API
	router.Route("/api", func(r chi.Router) {
		// Rute SFP
		r.Get("/sfps", getSFPs(sfpRepo))
		r.Post("/sfps", createSFP(sfpRepo))
		r.Get("/sfps/{id}", getSFP(sfpRepo))
		r.Put("/sfps/{id}", updateSFP(sfpRepo))
		r.Delete("/sfps/{id}", deleteSFP(sfpRepo))

		// Rute ODC
		r.Get("/odcs", getODCs(odcRepo))
		r.Post("/odcs", createODC(odcRepo))
		r.Get("/odcs/{id}", getODC(odcRepo))
		r.Put("/odcs/{id}", updateODC(odcRepo))
		r.Delete("/odcs/{id}", deleteODC(odcRepo))

		// Rute ODP
		r.Get("/odps", getODPs(odpRepo))
		r.Post("/odps", createODP(odpRepo))
		r.Get("/odps/{id}", getODP(odpRepo))
		r.Put("/odps/{id}", updateODP(odpRepo))
		r.Delete("/odps/{id}", deleteODP(odpRepo))

		// Rute ONU
		r.Get("/onus", getONUs(onuRepo))
		r.Post("/onus", createONU(onuRepo))
		r.Get("/onus/{id}", getONU(onuRepo))
		r.Put("/onus/{id}", updateONU(onuRepo))
		r.Delete("/onus/{id}", deleteONU(onuRepo))

		// Rute Kabel Serat Optik (Fiber Cable)
		r.Get("/fiber-cables", getFiberCables(fiberCableRepo))
		r.Post("/fiber-cables", createFiberCable(fiberCableRepo))
		r.Get("/fiber-cables/{id}", getFiberCable(fiberCableRepo))
		r.Put("/fiber-cables/{id}", updateFiberCable(fiberCableRepo))
		r.Delete("/fiber-cables/{id}", deleteFiberCable(fiberCableRepo))

		// Rute Core Serat Optik (Fiber Core)
		r.Get("/fiber-cores", getFiberCores(fiberCoreRepo))
		r.Post("/fiber-cores", createFiberCore(fiberCoreRepo))
		r.Get("/fiber-cores/{id}", getFiberCore(fiberCoreRepo))
		r.Put("/fiber-cores/{id}", updateFiberCore(fiberCoreRepo))
		r.Patch("/fiber-cores/{id}", patchFiberCore(fiberCoreRepo))
		r.Delete("/fiber-cores/{id}", deleteFiberCore(fiberCoreRepo))
		r.Get("/fiber-cables/{cableID}/cores", getFiberCoresByCable(fiberCoreRepo))

		// Rute Titik Sambungan (Splice Point)
		r.Get("/splice-points", getSplicePoints(splicePointRepo))
		r.Post("/splice-points", createSplicePoint(splicePointRepo))
		r.Get("/splice-points/{id}", getSplicePoint(splicePointRepo))
		r.Put("/splice-points/{id}", updateSplicePoint(splicePointRepo))
		r.Delete("/splice-points/{id}", deleteSplicePoint(splicePointRepo))
		r.Get("/fiber-cables/{cableID}/splices", getSplicePointsByCable(splicePointRepo))

		// Rute Dasbor dan Penelusuran Jaringan (Trace)
		r.Get("/dashboard/stats", getDashboardStats(db))
		r.Get("/trace/onu/{id}", traceONU(db, onuRepo, fiberCableRepo, splicePointRepo, lossService))

		// Rute Kalkulasi Redaman Optik
		r.Post("/calculate-loss", calculateOpticalLoss(fiberCableRepo, splicePointRepo, lossService))
	})
}

// Fungsi pembantu untuk membaca/menulis JSON
func readJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

func writeJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, code int, message string) {
	writeJSON(w, code, map[string]string{"error": message})
}

// Penangan (Handlers) SFP
func getSFPs(repo repository.SFPRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sfps, err := repo.GetAll()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if sfps == nil {
			sfps = []*domain.SFP{}
		}
		writeJSON(w, http.StatusOK, sfps)
	}
}

func createSFP(repo repository.SFPRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var sfp domain.SFP
		if err := readJSON(r, &sfp); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := repo.Create(&sfp); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, sfp)
	}
}

func getSFP(repo repository.SFPRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		sfp, err := repo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, sfp)
	}
}

func updateSFP(repo repository.SFPRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		var sfp domain.SFP
		if err := readJSON(r, &sfp); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		sfp.ID = id
		if err := repo.Update(&sfp); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, sfp)
	}
}

func deleteSFP(repo repository.SFPRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		if err := repo.Delete(id); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// Penangan (Handlers) ODC
func getODCs(repo repository.ODCRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		odcs, err := repo.GetAll()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if odcs == nil {
			odcs = []*domain.ODC{}
		}
		writeJSON(w, http.StatusOK, odcs)
	}
}

func createODC(repo repository.ODCRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var odc domain.ODC
		if err := readJSON(r, &odc); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := repo.Create(&odc); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, odc)
	}
}

func getODC(repo repository.ODCRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		odc, err := repo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, odc)
	}
}

func updateODC(repo repository.ODCRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		var odc domain.ODC
		if err := readJSON(r, &odc); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		odc.ID = id
		if err := repo.Update(&odc); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, odc)
	}
}

func deleteODC(repo repository.ODCRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		if err := repo.Delete(id); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// Penangan (Handlers) ODP
func getODPs(repo repository.ODPRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		odps, err := repo.GetAll()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if odps == nil {
			odps = []*domain.ODP{}
		}
		writeJSON(w, http.StatusOK, odps)
	}
}

func createODP(repo repository.ODPRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var odp domain.ODP
		if err := readJSON(r, &odp); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := repo.Create(&odp); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, odp)
	}
}

func getODP(repo repository.ODPRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		odp, err := repo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, odp)
	}
}

func updateODP(repo repository.ODPRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		var odp domain.ODP
		if err := readJSON(r, &odp); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		odp.ID = id
		if err := repo.Update(&odp); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, odp)
	}
}

func deleteODP(repo repository.ODPRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		if err := repo.Delete(id); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// Penangan (Handlers) ONU
func getONUs(repo repository.ONURepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		onus, err := repo.GetAll()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if onus == nil {
			onus = []*domain.ONU{}
		}
		writeJSON(w, http.StatusOK, onus)
	}
}

func createONU(repo repository.ONURepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var onu domain.ONU
		if err := readJSON(r, &onu); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := repo.Create(&onu); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, onu)
	}
}

func getONU(repo repository.ONURepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		onu, err := repo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, onu)
	}
}

func updateONU(repo repository.ONURepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		var onu domain.ONU
		if err := readJSON(r, &onu); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		onu.ID = id
		if err := repo.Update(&onu); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, onu)
	}
}

func deleteONU(repo repository.ONURepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		if err := repo.Delete(id); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// Penangan (Handlers) Kabel Serat Optik (Fiber Cable)
func getFiberCables(repo repository.FiberCableRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cables, err := repo.GetAll()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if cables == nil {
			cables = []*domain.FiberCable{}
		}
		writeJSON(w, http.StatusOK, cables)
	}
}

type fiberCableRequest struct {
	ID           string      `json:"id"`
	CableCode    string      `json:"cable_code"`
	CableName    string      `json:"cable_name"`
	FromNodeType string      `json:"from_node_type"`
	FromNodeID   string      `json:"from_node_id"`
	ToNodeType   string      `json:"to_node_type"`
	ToNodeID     string      `json:"to_node_id"`
	LengthKM     float64     `json:"length_km"`
	TotalCores   int         `json:"total_cores"`
	CableType    string      `json:"cable_type"`
	SpliceCount  int         `json:"splice_count"`
	GeometryLine [][]float64 `json:"geometry_line"`
	Lat1         *float64    `json:"lat1"`
	Lon1         *float64    `json:"lon1"`
	Lat2         *float64    `json:"lat2"`
	Lon2         *float64    `json:"lon2"`
	Description  string      `json:"description"`
}

func createFiberCable(repo repository.FiberCableRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req fiberCableRequest
		if err := readJSON(r, &req); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		var geometry [][]float64
		if len(req.GeometryLine) > 0 {
			geometry = req.GeometryLine
		} else if req.Lat1 != nil && req.Lon1 != nil && req.Lat2 != nil && req.Lon2 != nil {
			geometry = [][]float64{{*req.Lat1, *req.Lon1}, {*req.Lat2, *req.Lon2}}
		}

		fromUUID, _ := uuid.Parse(req.FromNodeID)
		toUUID, _ := uuid.Parse(req.ToNodeID)

		cable := domain.FiberCable{
			CableCode:    req.CableCode,
			CableName:    req.CableName,
			FromNodeType: req.FromNodeType,
			FromNodeID:   fromUUID,
			ToNodeType:   req.ToNodeType,
			ToNodeID:     toUUID,
			LengthKM:     req.LengthKM,
			TotalCores:   req.TotalCores,
			CableType:    req.CableType,
			SpliceCount:  req.SpliceCount,
			GeometryLine: geometry,
			Description:  req.Description,
		}

		if err := repo.Create(&cable); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, cable)
	}
}

func getFiberCable(repo repository.FiberCableRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		cable, err := repo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, cable)
	}
}

func updateFiberCable(repo repository.FiberCableRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}

		var req fiberCableRequest
		if err := readJSON(r, &req); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		// Ambil data kabel yang ada untuk mencegah hilangnya data jika beberapa field kosong pada request payload
		existing, err := repo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, "Fiber Cable not found")
			return
		}

		var geometry [][]float64
		if len(req.GeometryLine) > 0 {
			geometry = req.GeometryLine
		} else if req.Lat1 != nil && req.Lon1 != nil && req.Lat2 != nil && req.Lon2 != nil {
			geometry = [][]float64{{*req.Lat1, *req.Lon1}, {*req.Lat2, *req.Lon2}}
		}

		// Gabungkan payload request dengan data yang sudah ada, mengamankan atribut struktural kabel
		if req.CableCode != "" {
			existing.CableCode = req.CableCode
		}
		if req.CableName != "" {
			existing.CableName = req.CableName
		}
		if req.FromNodeType != "" {
			existing.FromNodeType = req.FromNodeType
		}
		if req.FromNodeID != "" {
			if fromUUID, err := uuid.Parse(req.FromNodeID); err == nil && fromUUID != uuid.Nil {
				existing.FromNodeID = fromUUID
			}
		}
		if req.ToNodeType != "" {
			existing.ToNodeType = req.ToNodeType
		}
		if req.ToNodeID != "" {
			if toUUID, err := uuid.Parse(req.ToNodeID); err == nil && toUUID != uuid.Nil {
				existing.ToNodeID = toUUID
			}
		}
		if req.LengthKM > 0 {
			existing.LengthKM = req.LengthKM
		}
		if req.TotalCores > 0 {
			existing.TotalCores = req.TotalCores
		}
		if req.CableType != "" {
			existing.CableType = req.CableType
		}
		if req.SpliceCount > 0 {
			existing.SpliceCount = req.SpliceCount
		}
		if len(geometry) > 0 {
			existing.GeometryLine = geometry
		}
		// Perbolehkan deskripsi diperbarui ke string apa pun (termasuk string kosong)
		existing.Description = req.Description

		if err := repo.Update(existing); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, existing)
	}
}

func deleteFiberCable(repo repository.FiberCableRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		if err := repo.Delete(id); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// Penangan (Handlers) Core Serat Optik (Fiber Core)
func getFiberCores(repo repository.FiberCoreRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cores, err := repo.GetAll()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if cores == nil {
			cores = []*domain.FiberCore{}
		}
		writeJSON(w, http.StatusOK, cores)
	}
}

func createFiberCore(repo repository.FiberCoreRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var core domain.FiberCore
		if err := readJSON(r, &core); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := repo.Create(&core); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, core)
	}
}

func getFiberCore(repo repository.FiberCoreRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		core, err := repo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, core)
	}
}

func updateFiberCore(repo repository.FiberCoreRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		var core domain.FiberCore
		if err := readJSON(r, &core); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		core.ID = id
		if err := repo.Update(&core); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, core)
	}
}

func deleteFiberCore(repo repository.FiberCoreRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		if err := repo.Delete(id); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

func getFiberCoresByCable(repo repository.FiberCoreRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cableID, err := uuid.Parse(chi.URLParam(r, "cableID"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid Cable ID")
			return
		}
		cores, err := repo.GetByCableID(cableID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if cores == nil {
			cores = []*domain.FiberCore{}
		}
		writeJSON(w, http.StatusOK, cores)
	}
}

// Penangan (Handlers) Titik Sambungan (Splice Point)
func getSplicePoints(repo repository.SplicePointRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		splices, err := repo.GetAll()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if splices == nil {
			splices = []*domain.SplicePoint{}
		}
		writeJSON(w, http.StatusOK, splices)
	}
}

func createSplicePoint(repo repository.SplicePointRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var splice domain.SplicePoint
		if err := readJSON(r, &splice); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := repo.Create(&splice); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, splice)
	}
}

func getSplicePoint(repo repository.SplicePointRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		splice, err := repo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, splice)
	}
}

func updateSplicePoint(repo repository.SplicePointRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		var splice domain.SplicePoint
		if err := readJSON(r, &splice); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		splice.ID = id
		if err := repo.Update(&splice); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, splice)
	}
}

func deleteSplicePoint(repo repository.SplicePointRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}
		if err := repo.Delete(id); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

func getSplicePointsByCable(repo repository.SplicePointRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cableID, err := uuid.Parse(chi.URLParam(r, "cableID"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid Cable ID")
			return
		}
		splices, err := repo.GetByCableID(cableID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if splices == nil {
			splices = []*domain.SplicePoint{}
		}
		writeJSON(w, http.StatusOK, splices)
	}
}

func patchFiberCore(repo repository.FiberCoreRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ID")
			return
		}

		var payload struct {
			Status string `json:"status"`
		}
		if err := readJSON(r, &payload); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		core, err := repo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}

		core.Status = payload.Status
		if err := repo.Update(core); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, core)
	}
}

func getDashboardStats(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		counters := map[string]int{}
		queries := map[string]string{
			"totalSfp":     "SELECT COUNT(*) FROM sfp",
			"totalOdc":     "SELECT COUNT(*) FROM odc",
			"totalOdp":     "SELECT COUNT(*) FROM odp",
			"totalOnu":     "SELECT COUNT(*) FROM onu",
			"totalCables":  "SELECT COUNT(*) FROM fiber_cable",
			"totalSplices": "SELECT COUNT(*) FROM splice_point",
		}

		for key, query := range queries {
			var count int
			if err := db.QueryRow(query).Scan(&count); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			counters[key] = count
		}

		odcs := []map[string]any{}
		rows, err := db.Query("SELECT id, code, name, total_ports FROM odc ORDER BY code")
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id, code, name string
			var totalPorts int
			if err := rows.Scan(&id, &code, &name, &totalPorts); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}

			// Hitung port ODC terpakai: jumlah ODP yang terhubung langsung
			var usedPorts int
			_ = db.QueryRow("SELECT COUNT(*) FROM odp WHERE odc_id = ?", id).Scan(&usedPorts)

			odcs = append(odcs, map[string]any{
				"id":          id,
				"code":        code,
				"name":        name,
				"total_ports": totalPorts,
				"used_ports":  usedPorts,
			})
		}

		odps := []map[string]any{}
		rows2, err := db.Query("SELECT id, code, name, total_ports FROM odp ORDER BY code")
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		defer rows2.Close()
		for rows2.Next() {
			var id, code, name string
			var totalPorts int
			if err := rows2.Scan(&id, &code, &name, &totalPorts); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}

			// Hitung port ODP terpakai: jumlah ONU terhubung + child ODP terhubung cascading
			var linkedOnus int
			_ = db.QueryRow("SELECT COUNT(*) FROM onu WHERE odp_id = ?", id).Scan(&linkedOnus)
			var linkedChildOdps int
			_ = db.QueryRow("SELECT COUNT(*) FROM odp WHERE odc_id = ?", id).Scan(&linkedChildOdps)
			usedPorts := linkedOnus + linkedChildOdps

			odps = append(odps, map[string]any{
				"id":          id,
				"code":        code,
				"name":        name,
				"total_ports": totalPorts,
				"used_ports":  usedPorts,
			})
		}

		stats := map[string]any{
			"counters": counters,
			"capacity": map[string]any{"odcs": odcs, "odps": odps},
			"losses":   []float64{14.2, 18.5, 21.4},
			"routes":   map[string]int{"valid": counters["totalCables"], "warning": counters["totalSplices"], "error": 0},
		}

		writeJSON(w, http.StatusOK, stats)
	}
}

type pathStep struct {
	nodeID   uuid.UUID
	nodeType string
	cable    *domain.FiberCable
}

type queueItem struct {
	path []pathStep
}

func getNodeDetails(db *sql.DB, nodeType string, nodeID uuid.UUID) (map[string]any, error) {
	var code, name string
	var lat, lon float64
	var query string

	switch nodeType {
	case "ONU":
		query = "SELECT code, name, latitude, longitude FROM onu WHERE id = ?"
	case "ODP":
		query = "SELECT code, name, latitude, longitude FROM odp WHERE id = ?"
	case "ODC":
		query = "SELECT code, name, latitude, longitude FROM odc WHERE id = ?"
	case "SFP":
		query = "SELECT code, name, latitude, longitude, tx_power_dbm FROM sfp WHERE id = ?"
	default:
		return nil, fmt.Errorf("unknown node type: %s", nodeType)
	}

	if nodeType == "SFP" {
		var txPower float64
		err := db.QueryRow(query, nodeID.String()).Scan(&code, &name, &lat, &lon, &txPower)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"type":         nodeType,
			"id":           nodeID.String(),
			"code":         code,
			"name":         name,
			"latitude":     lat,
			"longitude":    lon,
			"tx_power_dbm": txPower,
		}, nil
	}

	err := db.QueryRow(query, nodeID.String()).Scan(&code, &name, &lat, &lon)
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"type":      nodeType,
		"id":        nodeID.String(),
		"code":      code,
		"name":      name,
		"latitude":  lat,
		"longitude": lon,
	}, nil
}

func getODPSplitterLoss(ports int) float64 {
	switch ports {
	case 2:
		return 3.5
	case 4:
		return 7.2
	case 8:
		return 10.3
	case 16:
		return 13.8
	case 32:
		return 17.0
	default:
		if ports <= 0 {
			return 0.0
		}
		// Antisipasi untuk kapasitas port non-standar: default ke 10.3 dB (splitter 1:8)
		return 10.3
	}
}

func traceONU(db *sql.DB, onuRepo repository.ONURepository, cableRepo repository.FiberCableRepository, spliceRepo repository.SplicePointRepository, lossService service.LossCalculationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid ONU ID")
			return
		}

		onu, err := onuRepo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}

		allCables, err := cableRepo.GetAll()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		// 1. Pencarian jalur terpendek menggunakan BFS dari ONU ke pemancar SFP (Central Office)
		var foundPath []pathStep
		queue := []queueItem{{path: []pathStep{{nodeID: onu.ID, nodeType: "ONU", cable: nil}}}}
		visited := map[uuid.UUID]bool{onu.ID: true}

		for len(queue) > 0 {
			currItem := queue[0]
			queue = queue[1:]

			currPath := currItem.path
			lastStep := currPath[len(currPath)-1]

			if lastStep.nodeType == "SFP" {
				foundPath = currPath
				break
			}

			// Cari tetangga (neighbor) node yang terhubung langsung
			for _, cable := range allCables {
				var neighborID uuid.UUID
				var neighborType string

				if cable.FromNodeType == lastStep.nodeType && cable.FromNodeID == lastStep.nodeID {
					neighborID = cable.ToNodeID
					neighborType = cable.ToNodeType
				} else if cable.ToNodeType == lastStep.nodeType && cable.ToNodeID == lastStep.nodeID {
					neighborID = cable.FromNodeID
					neighborType = cable.FromNodeType
				} else {
					continue
				}

				if !visited[neighborID] {
					visited[neighborID] = true
					newPath := make([]pathStep, len(currPath)+1)
					copy(newPath, currPath)
					newPath[len(currPath)] = pathStep{
						nodeID:   neighborID,
						nodeType: neighborType,
						cable:    cable,
					}
					queue = append(queue, queueItem{path: newPath})
				}
			}
		}

		var pathNodes []map[string]any
		var pathCables []domain.FiberCable

		if len(foundPath) > 0 {
			// Isi data pathNodes dan pathCables sesuai urutan maju (SFP -> ... -> ONU)
			for i := len(foundPath) - 1; i >= 0; i-- {
				nodeDetails, err := getNodeDetails(db, foundPath[i].nodeType, foundPath[i].nodeID)
				if err != nil {
					nodeDetails = map[string]any{
						"type":      foundPath[i].nodeType,
						"id":        foundPath[i].nodeID.String(),
						"code":      "UNKNOWN",
						"name":      "Unknown Node",
						"latitude":  0.0,
						"longitude": 0.0,
					}
				}
				pathNodes = append(pathNodes, nodeDetails)
			}

			for i := len(foundPath) - 1; i >= 1; i-- {
				if foundPath[i].cable != nil {
					pathCables = append(pathCables, *foundPath[i].cable)
				}
			}
		} else {
			nodeDetails, _ := getNodeDetails(db, "ONU", onu.ID)
			pathNodes = append(pathNodes, nodeDetails)
		}

		// Dapatkan semua titik sambungan (splice points) di sepanjang rute kabel terpilih
		var traceSplices []domain.SplicePoint
		for _, cable := range pathCables {
			splices, err := spliceRepo.GetByCableID(cable.ID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			for _, splice := range splices {
				traceSplices = append(traceSplices, *splice)
			}
		}

		// Daya pancar SFP utama dan akumulasi redaman splitter secara dinamis
		var totalSplitterLoss float64
		var odcCount int
		var odpCount int
		var txPower float64 = 3.0 // default OLT SFP transmitter power

		for _, step := range foundPath {
			switch step.nodeType {
			case "ODC":
				var loss float64
				err := db.QueryRow("SELECT splitter_loss_db FROM odc WHERE id = ?", step.nodeID.String()).Scan(&loss)
				if err == nil {
					totalSplitterLoss += loss
					odcCount++
				}
			case "ODP":
				var loss float64
				err := db.QueryRow("SELECT splitter_loss_db FROM odp WHERE id = ?", step.nodeID.String()).Scan(&loss)
				if err == nil {
					totalSplitterLoss += loss
					odpCount++
				}
			case "SFP":
				var pwr float64
				err := db.QueryRow("SELECT tx_power_dbm FROM sfp WHERE id = ?", step.nodeID.String()).Scan(&pwr)
				if err == nil {
					txPower = pwr
				}
			}
		}

		if odcCount == 0 && odpCount == 0 {
			totalSplitterLoss = 13.80 // Fallback to 1:16 splitter default loss
		}

		lossResult := lossService.CalculateLoss(pathCables, traceSplices, totalSplitterLoss, txPower)

		// Validasi Jalur Jaringan (Routing Validations)
		validationMessages := []string{}
		validationStatus := "VALID"

		hasSFP := false
		for _, step := range foundPath {
			if step.nodeType == "SFP" {
				hasSFP = true
				break
			}
		}

		if !hasSFP {
			validationMessages = append(validationMessages, "Rute terisolasi: Jalur tidak terhubung ke pemancar SFP (Central Office). Pelanggan tidak akan menerima layanan.")
			validationStatus = "ERROR"
		}

		hasODC := false
		for _, step := range foundPath {
			if step.nodeType == "ODC" {
				hasODC = true
				break
			}
		}
		if !hasODC && hasSFP {
			validationMessages = append(validationMessages, "Peringatan Hub: Rute tidak melewati Kabinet ODC (Optical Distribution Cabinet).")
			if validationStatus != "ERROR" {
				validationStatus = "WARNING"
			}
		}

		hasODP := false
		for _, step := range foundPath {
			if step.nodeType == "ODP" {
				hasODP = true
				break
			}
		}
		if !hasODP && hasSFP {
			validationMessages = append(validationMessages, "Peringatan Tiang: Rute tidak melewati terminal ODP (Optical Distribution Point).")
			if validationStatus != "ERROR" {
				validationStatus = "WARNING"
			}
		}

		if lossResult.EstimatedRxPowerDBm < -28.0 {
			validationMessages = append(validationMessages, fmt.Sprintf("Daya terima kritis: Sinyal Rx (%.2f dBm) berada di bawah batas minimum GPON (-28.0 dBm).", lossResult.EstimatedRxPowerDBm))
			validationStatus = "ERROR"
		} else if lossResult.EstimatedRxPowerDBm < -24.0 {
			validationMessages = append(validationMessages, fmt.Sprintf("Redaman tinggi: Sinyal Rx (%.2f dBm) marginal / lemah. Disarankan memeriksa sambungan splice.", lossResult.EstimatedRxPowerDBm))
			if validationStatus != "ERROR" {
				validationStatus = "WARNING"
			}
		}

		for _, cable := range pathCables {
			var brokenCount int
			err := db.QueryRow("SELECT COUNT(*) FROM fiber_core WHERE cable_id = ? AND status = 'BROKEN'", cable.ID.String()).Scan(&brokenCount)
			if err == nil && brokenCount > 0 {
				validationMessages = append(validationMessages, fmt.Sprintf("Kabel %s memiliki %d core yang terdeteksi rusak/terputus.", cable.CableCode, brokenCount))
				if validationStatus != "ERROR" {
					validationStatus = "WARNING"
				}
			}
		}

		if len(validationMessages) == 0 {
			validationMessages = append(validationMessages, "Rute serat optik normal dan memenuhi spesifikasi redaman standar.")
		}

		response := map[string]any{
			"onu":                    onu,
			"path":                   pathNodes,
			"cables":                 pathCables,
			"splices":                traceSplices,
			"meters_length":          lossResult.CableLengthKM * 1000,
			"total_loss_calculation": lossResult,
			"validation_status":      validationStatus,
			"validation_messages":    validationMessages,
		}

		writeJSON(w, http.StatusOK, response)
	}
}

// Penangan (Handlers) Kalkulasi Redaman Optik (Optical Loss)
type lossRequest struct {
	CableIDs     []string `json:"cable_ids"`
	SpliceIDs    []string `json:"splice_ids"`
	SplitterLoss float64  `json:"splitter_loss"`
	TxPower      float64  `json:"tx_power"`
}

func calculateOpticalLoss(cableRepo repository.FiberCableRepository, spliceRepo repository.SplicePointRepository, lossService service.LossCalculationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req lossRequest
		if err := readJSON(r, &req); err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		// Ambil data ruas-ruas kabel
		var cables []domain.FiberCable
		for _, idStr := range req.CableIDs {
			id, err := uuid.Parse(idStr)
			if err != nil {
				writeError(w, http.StatusBadRequest, "Invalid cable ID")
				return
			}
			cable, err := cableRepo.GetByID(id)
			if err != nil {
				writeError(w, http.StatusNotFound, "Cable not found")
				return
			}
			cables = append(cables, *cable)
		}

		// Ambil data titik sambungan
		var splices []domain.SplicePoint
		for _, idStr := range req.SpliceIDs {
			id, err := uuid.Parse(idStr)
			if err != nil {
				writeError(w, http.StatusBadRequest, "Invalid splice ID")
				return
			}
			splice, err := spliceRepo.GetByID(id)
			if err != nil {
				writeError(w, http.StatusNotFound, "Splice point not found")
				return
			}
			splices = append(splices, *splice)
		}

		// Jalankan perhitungan kalkulasi redaman optik
		result := lossService.CalculateLoss(cables, splices, req.SplitterLoss, req.TxPower)
		writeJSON(w, http.StatusOK, result)
	}
}

// TestTraceONU adalah pembungkus (wrapper) fungsi traceONU yang diekspor untuk kebutuhan pengujian unit test.
func TestTraceONU(db *sql.DB, onuRepo repository.ONURepository, cableRepo repository.FiberCableRepository, spliceRepo repository.SplicePointRepository, lossService service.LossCalculationService) http.HandlerFunc {
	return traceONU(db, onuRepo, cableRepo, spliceRepo, lossService)
}
