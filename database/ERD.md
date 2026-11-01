# Entity Relationship Diagram (ERD)

This directory documents the database architecture for **FTTH Network Mapper & Optical Loss Analysis**. 

```mermaid
erDiagram
    sfp {
        uuid id PK
        varchar code UK
        varchar name
        int slot
        int port
        decimal tx_power_dbm
        decimal latitude
        decimal longitude
        geometry geom "Point, 4326"
        text description
        timestamp created_at
        timestamp updated_at
    }

    odc {
        uuid id PK
        varchar code UK
        varchar name
        decimal latitude
        decimal longitude
        geometry geom "Point, 4326"
        int total_ports
        varchar splitter_type
        decimal splitter_loss_db
        text description
        timestamp created_at
        timestamp updated_at
    }

    odp {
        uuid id PK
        varchar code UK
        varchar name
        decimal latitude
        decimal longitude
        geometry geom "Point, 4326"
        uuid odc_id FK
        int total_ports
        text description
        timestamp created_at
        timestamp updated_at
    }

    onu {
        uuid id PK
        varchar code UK
        varchar name
        varchar serial_number UK
        decimal latitude
        decimal longitude
        geometry geom "Point, 4326"
        uuid odp_id FK
        text description
        timestamp created_at
        timestamp updated_at
    }

    fiber_cables {
        uuid id PK
        varchar cable_code UK
        varchar cable_name
        varchar from_node_type "SFP, ODC, ODP, ONU, SPLICE"
        uuid from_node_id
        varchar to_node_type "SFP, ODC, ODP, ONU, SPLICE"
        uuid to_node_id
        decimal length_km
        int total_cores
        varchar cable_type
        geometry geometry_line "LineString, 4326"
        text description
        timestamp created_at
        timestamp updated_at
    }

    fiber_cores {
        uuid id PK
        uuid cable_id FK
        int core_number
        varchar status "USED, SPARE, RESERVED, BROKEN"
    }

    splice_points {
        uuid id PK
        varchar splice_code UK
        varchar splice_name
        decimal latitude
        decimal longitude
        geometry geom "Point, 4326"
        varchar splice_type "Fusion, Mechanical"
        decimal loss_db
        text description
    }

    cable_splices {
        uuid id PK
        uuid cable_id FK
        uuid splice_id FK
    }

    sfp ||--o{ fiber_cables : "origin node"
    odc ||--o{ odp : "serves"
    odc ||--o{ fiber_cables : "origin or destination node"
    odp ||--o{ onu : "allocates"
    odp ||--o{ fiber_cables : "origin or destination node"
    onu ||--o{ fiber_cables : "destination node"
    
    fiber_cables ||--|{ fiber_cores : "contains"
    
    fiber_cables ||--o{ cable_splices : "mapped to"
    splice_points ||--o{ cable_splices : "hosts"
```

## Relational Rules

1. **Logical Hierarchy**: 
   - SFPs are OLT laser ports that initiate GPON logical loops.
   - ODC cabinets host the main Splitters (e.g., `1:16` or `1:32` splitting ratios), generating a large insertion loss of `10dB` to `17dB`.
   - ODP cabinet enclosures act as drop-wire hubs servicing individual blocks. Each ODP maps back upstream to a specific ODC via `odp.odc_id`.
   - ONUs represent final subscriber receivers, linked back to an ODP port via `onu.odp_id`.

2. **Physical Geography (PostGIS Integration)**:
   - SFPs, ODCs, ODPs, ONUs, and Splices are localized via `latitude` and `longitude`. The system automatically maintains spatial geometry point columns (`geom`) via database triggers.
   - Cables representing route guidelines are stored as Polylines (`GEOMETRY(LineString, 4326)`) tracking intermediate wire turns.

3. **Core Splicing Joint**:
   - `cable_splices` is a many-to-many lookup connecting cables passing through particular joint points (`splice_points`). Splicing loss values dynamically add up to the fiber core signal budget.
