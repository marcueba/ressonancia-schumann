-- ETAPA 5: BANCO DE DADOS (SUPABASE SCHEMA)
-- Execute este script no SQL Editor do Supabase

CREATE TABLE data_sources (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(255),
    api_endpoint VARCHAR(255),
    license VARCHAR(100),
    commercial_use BOOLEAN DEFAULT false,
    requires_attribution BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

CREATE TABLE stations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100),
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    data_source_id VARCHAR(50) REFERENCES data_sources(id),
    status VARCHAR(20) DEFAULT 'offline',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

CREATE TABLE measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id VARCHAR(50) REFERENCES stations(id),
    timestamp TIMESTAMPTZ NOT NULL, -- Horário da ocorrência em UTC
    collected_at TIMESTAMPTZ DEFAULT NOW(), -- Horário da coleta no servidor
    quality VARCHAR(20) DEFAULT 'Média',
    UNIQUE(station_id, timestamp)
);
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

CREATE TABLE schumann_modes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    measurement_id UUID REFERENCES measurements(id) ON DELETE CASCADE,
    mode_number INTEGER NOT NULL, -- 1 = Fundamental, 2 = 2º Modo, etc
    frequency DECIMAL(6,3),
    amplitude DECIMAL(6,3),
    bandwidth DECIMAL(6,3),
    UNIQUE(measurement_id, mode_number)
);
ALTER TABLE schumann_modes ENABLE ROW LEVEL SECURITY;

CREATE TABLE geomagnetic_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    kp_index DECIMAL(4,2),
    source_id VARCHAR(50) REFERENCES data_sources(id),
    UNIQUE(timestamp)
);
ALTER TABLE geomagnetic_data ENABLE ROW LEVEL SECURITY;

CREATE TABLE solar_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    solar_flux DECIMAL(8,2),
    sunspots INTEGER,
    flares VARCHAR(50),
    source_id VARCHAR(50) REFERENCES data_sources(id),
    UNIQUE(timestamp)
);
ALTER TABLE solar_data ENABLE ROW LEVEL SECURITY;

CREATE TABLE eri_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    score DECIMAL(5,2) NOT NULL,
    version VARCHAR(20) NOT NULL,
    inputs JSONB, -- Guarda os dados brutos usados no cálculo para auditoria
    UNIQUE(timestamp, version)
);
ALTER TABLE eri_scores ENABLE ROW LEVEL SECURITY;
