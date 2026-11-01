package service

import (
	"math"

	"ftth-network-mapper/backend/domain"
)

// LossCalculationService mendefinisikan interface kontrak untuk perhitungan redaman optik.
type LossCalculationService interface {
	CalculateLoss(cables []domain.FiberCable, splices []domain.SplicePoint, splitterLoss float64, txPower float64) domain.OpticalLossResult
}

type lossCalculationService struct{}

// NewLossCalculationService membuat instance baru dari service kalkulator redaman.
func NewLossCalculationService() LossCalculationService {
	return &lossCalculationService{}
}

// CalculateLoss melakukan kalkulasi anggaran daya redaman optik total (Link Power Budget)
// berdasarkan akumulasi redaman serat optik, redaman konektor, redaman sambungan (splice), dan pembagi pasif (splitter).
func (s *lossCalculationService) CalculateLoss(
	cables []domain.FiberCable, // Daftar segmen kabel yang dilalui
	splices []domain.SplicePoint, // Daftar titik sambungan optik yang dilalui
	splitterLoss float64, // Total kehilangan daya dari splitter (ODC + ODP)
	txPower float64, // Daya pancar awal (Tx Power) dari modul OLT SFP
) domain.OpticalLossResult {
	const (
		FiberLossPerKM    = 0.35 // Redaman serat optik standar per km pada panjang gelombang 1310nm/1490nm (dB/km)
		ConnectorLoss     = 0.50 // Redaman standar per konektor fisik (dB)
		DefaultFusionLoss = 0.03 // Redaman default untuk sambungan las / Fusion Splice (dB)
		DefaultMechLoss   = 0.20 // Redaman default untuk sambungan mekanis / Mechanical Splice (dB)
	)

	// 1. Menghitung akumulasi panjang kabel serat optik dan redaman serat optiknya
	var totalFiberLoss float64
	var totalCableLength float64
	for _, cable := range cables {
		totalFiberLoss += cable.LengthKM * FiberLossPerKM
		totalCableLength += cable.LengthKM
	}

	// 2. Menghitung akumulasi redaman dari semua titik sambungan (splice)
	var totalSpliceLoss float64
	for _, splice := range splices {
		if splice.LossDB > 0 {
			// Menggunakan nilai ukur redaman riil dari database jika ada
			totalSpliceLoss += splice.LossDB
		} else {
			// Menggunakan redaman standar jika data riil kosong berdasarkan metode penyambungan
			if splice.SpliceType == "Mechanical Splice" {
				totalSpliceLoss += DefaultMechLoss
			} else {
				totalSpliceLoss += DefaultFusionLoss
			}
		}
	}

	// 3. Menghitung redaman dari konektor (asumsi 2 konektor per segmen kabel sebagai terminasi ujung)
	connectorCount := float64(len(cables) * 2)
	totalConnectorLoss := connectorCount * ConnectorLoss

	// 4. Akumulasi total redaman link optik
	totalLoss := totalFiberLoss + totalSpliceLoss + totalConnectorLoss + math.Abs(splitterLoss)

	// Daya pancar optik yang diterima (Rx Power) = Daya pancar awal (Tx) - Redaman total
	estimatedRx := txPower - totalLoss

	// Mengembalikan model hasil kalkulasi dengan pembulatan presisi desimal untuk estetika UI
	return domain.OpticalLossResult{
		TotalFiberLossDB:     round(totalFiberLoss, 3),
		TotalSpliceLossDB:    round(totalSpliceLoss, 3),
		TotalConnectorLossDB: round(totalConnectorLoss, 2),
		TotalSplitterLossDB:  round(splitterLoss, 2),
		TotalRouteLossDB:     round(totalLoss, 3),
		EstimatedRxPowerDBm:  round(estimatedRx, 3),
		CableLengthKM:        round(totalCableLength, 3),
	}
}

// round membulatkan nilai bertipe float64 ke jumlah angka di belakang koma (presisi) tertentu.
func round(val float64, precision int) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}
