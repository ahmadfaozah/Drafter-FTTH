package repository

import "database/sql"

// nullString mengembalikan string kosong jika sql.NullString bernilai NULL atau tidak valid.
func nullString(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}
