# FTTH Network Mapper - Go Backend Setup Guide

## Overview

Aplikasi ini telah dimigrasikan dari Express.js (TypeScript) menjadi **Go** dengan framework **Gin**, menggunakan **MySQL** sebagai database.

### Komponen

- **Backend**: Go + Gin Framework
- **Database**: MySQL (local atau remote)
- **Frontend**: React (dijalankan oleh backend)
- **Port**: 3000

---

## Prerequisites

### 1. Install Go
- Download dari: https://golang.org/dl/
- Minimal version: Go 1.21+
- Verify installation:
  ```bash
  go version
  ```

### 2. Install MySQL
- Download dari: https://www.mysql.com/downloads/
- Default port: 3306
- Verify installation:
  ```bash
  mysql --version
  ```

### 3. Node.js (untuk React frontend)
- Download dari: https://nodejs.org/
- Version: 16+ atau 18+
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

---

## Setup Instructions

### Step 1: Setup MySQL Database

1. **Create Database**
   ```bash
   mysql -u root -p < database/schema_mysql.sql
   ```
   - Jika MySQL tanpa password:
     ```bash
     mysql -u root < database/schema_mysql.sql
     ```

2. **Verify Database Created**
   ```bash
   mysql -u root -p -e "USE ftth_network; SHOW TABLES;"
   ```

### Step 2: Configure Environment

1. **Update `.env` file** dengan MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASS=your_password  # jika ada
   DB_NAME=ftth_network
   
   PORT=3000
   GIN_MODE=debug
   ```

2. **Contoh untuk development** (tanpa password):
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASS=
   DB_NAME=ftth_network
   PORT=3000
   GIN_MODE=debug
   ```

### Step 3: Download Go Dependencies

```bash
go mod download
go mod tidy
```

### Step 4: Install Frontend Dependencies

```bash
npm install
```

---

## Running the Application

### Development Mode

**Option 1: Combined (Frontend + Backend)**
```bash
npm run dev
```
- Ini akan:
  1. Build React frontend ke `dist/`
  2. Menjalankan Go server di port 3000
  3. Akses di: http://localhost:3000

**Option 2: Separate (terpisah)**

Terminal 1 - Frontend (Vite dev server):
```bash
npm run dev:frontend
```
Akses di: http://localhost:5173

Terminal 2 - Backend (Go server):
```bash
go run main.go
```
Akses API di: http://localhost:3000/api/...

### Production Build

```bash
npm run build
./dist/server
```

Atau untuk Windows:
```bash
npm run build
dist\server.exe
```

---

## Project Structure

```
.
├── main.go                  # Entry point server Go
├── config/
│   └── database.go         # MySQL connection config
├── backend/
│   ├── domain/
│   │   └── models.go       # Data models
│   ├── repository/
│   │   ├── sfp_repo.go
│   │   ├── odc_repo.go
│   │   ├── odp_repo.go
│   │   ├── onu_repo.go
│   │   ├── fiber_cable_repo.go
│   │   ├── fiber_core_repo.go
│   │   └── splice_point_repo.go
│   └── service/
│       └── loss_calculation.go
├── routes/
│   └── routes.go           # API routes & handlers
├── src/
│   ├── App.tsx
│   ├── components/
│   └── main.tsx
├── dist/                   # Build output
├── go.mod                  # Go module definition
├── package.json            # NPM dependencies
├── vite.config.ts          # Vite config (frontend)
├── tsconfig.json           # TypeScript config
├── .env                    # Environment variables
└── database/
    ├── schema_mysql.sql    # MySQL schema
    └── ERD.md
```

---

## API Endpoints

### SFP (Transceiver)
- `GET /api/sfps` - Get all SFPs
- `POST /api/sfps` - Create new SFP
- `GET /api/sfps/:id` - Get SFP by ID
- `PUT /api/sfps/:id` - Update SFP
- `DELETE /api/sfps/:id` - Delete SFP

### ODC (Distribution Cabinet)
- `GET /api/odcs` - Get all ODCs
- `POST /api/odcs` - Create new ODC
- `GET /api/odcs/:id` - Get ODC by ID
- `PUT /api/odcs/:id` - Update ODC
- `DELETE /api/odcs/:id` - Delete ODC

### ODP (Distribution Point)
- `GET /api/odps` - Get all ODPs
- `POST /api/odps` - Create new ODP
- `GET /api/odps/:id` - Get ODP by ID
- `PUT /api/odps/:id` - Update ODP
- `DELETE /api/odps/:id` - Delete ODP

### ONU (Network Unit)
- `GET /api/onus` - Get all ONUs
- `POST /api/onus` - Create new ONU
- `GET /api/onus/:id` - Get ONU by ID
- `PUT /api/onus/:id` - Update ONU
- `DELETE /api/onus/:id` - Delete ONU

### Fiber Cables
- `GET /api/fiber-cables` - Get all cables
- `POST /api/fiber-cables` - Create new cable
- `GET /api/fiber-cables/:id` - Get cable by ID
- `PUT /api/fiber-cables/:id` - Update cable
- `DELETE /api/fiber-cables/:id` - Delete cable

### Fiber Cores
- `GET /api/fiber-cores` - Get all cores
- `POST /api/fiber-cores` - Create new core
- `GET /api/fiber-cables/:cableID/cores` - Get cores by cable
- `PUT /api/fiber-cores/:id` - Update core
- `DELETE /api/fiber-cores/:id` - Delete core

### Splice Points
- `GET /api/splice-points` - Get all splice points
- `POST /api/splice-points` - Create new splice
- `GET /api/fiber-cables/:cableID/splices` - Get splices by cable
- `PUT /api/splice-points/:id` - Update splice
- `DELETE /api/splice-points/:id` - Delete splice

### Loss Calculation
- `POST /api/calculate-loss` - Calculate optical loss
  ```json
  {
    "cable_ids": ["uuid1", "uuid2"],
    "splice_ids": ["uuid1", "uuid2"],
    "splitter_loss": 13.8,
    "tx_power": 3.0
  }
  ```

---

## Troubleshooting

### Error: "Connection refused"
- **Problem**: Database connection failed
- **Solution**: 
  - Pastikan MySQL running: `mysql -u root -p`
  - Verify `.env` credentials
  - Check database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### Error: "Port 3000 already in use"
- **Solution**: 
  ```bash
  # Change PORT in .env
  # Or kill existing process
  # macOS/Linux:
  lsof -ti:3000 | xargs kill -9
  ```

### Error: "Frontend files not found"
- **Solution**: Rebuild frontend
  ```bash
  npm install
  npm run build:frontend
  ```

### Error: "Go dependencies missing"
- **Solution**: 
  ```bash
  go mod download
  go mod tidy
  ```

---

## Development Tips

### Hot Reload (Frontend only)
```bash
# Terminal 1: Frontend dev server
npm run dev:frontend

# Terminal 2: Go backend
go run main.go
```

### Database Debugging
```bash
# Connect to MySQL
mysql -u root -p ftth_network

# View tables
SHOW TABLES;

# View data
SELECT * FROM sfp;
SELECT * FROM odc;
```

### Go Build & Test
```bash
# Format code
go fmt ./...

# Lint code
go vet ./...

# Run tests (if any)
go test ./...

# Build binary
go build -o dist/server

# Build for Linux/Mac from Windows
GOOS=linux GOARCH=amd64 go build -o dist/server
```

---

## Next Steps

1. ✅ Setup MySQL database
2. ✅ Configure `.env`
3. ✅ Download dependencies (`npm install`, `go mod download`)
4. ✅ Start application (`npm run dev`)
5. ✅ Test API endpoints using Postman or curl
6. ✅ Integrate Gemini AI API (update GEMINI_API_KEY in .env)

---

## Additional Notes

- **Database**: Menggunakan UUID untuk semua primary keys (CHAR(36))
- **CORS**: Enabled untuk semua origins (dapat dikonfigurasi di `main.go`)
- **Frontend**: React app diload sebagai static files dari backend
- **Migrations**: Manual SQL script di `database/schema_mysql.sql`

---

## Support

Untuk pertanyaan lebih lanjut, check:
- Go Docs: https://golang.org/doc/
- Gin Framework: https://gin-gonic.com/
- MySQL Docs: https://dev.mysql.com/doc/
