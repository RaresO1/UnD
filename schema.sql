
CREATE DATABASE IF NOT EXISTS somaj_ro
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE somaj_ro;

CREATE TABLE IF NOT EXISTS judete (
    cod       CHAR(2)      NOT NULL PRIMARY KEY,  
    nume      VARCHAR(60)  NOT NULL,
    regiune   VARCHAR(60)  NOT NULL DEFAULT '',
    lat       DECIMAL(7,4) NOT NULL,
    lon       DECIMAL(7,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rata (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    judet_cod     CHAR(2)         NOT NULL,
    an            SMALLINT        NOT NULL,
    rata          DECIMAL(5,2)    NOT NULL DEFAULT 0,
    FOREIGN KEY (judet_cod) REFERENCES judete(cod) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_judet_an (judet_cod, an)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS educatie (
    id                          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    judet_cod                   CHAR(2)         NOT NULL DEFAULT 0,
    an                          SMALLINT        NOT NULL DEFAULT 0,
    fara_studii                 INT             NOT NULL DEFAULT 0,
    primar                      INT             NOT NULL DEFAULT 0,
    gimnazial                   INT             NOT NULL DEFAULT 0,
    liceal                      INT             NOT NULL DEFAULT 0,
    postliceal                  INT             NOT NULL DEFAULT 0,
    profesional_arte_meserii    INT             NOT NULL DEFAULT 0,
    universitar                 INT             NOT NULL DEFAULT 0,
    FOREIGN KEY (judet_cod) REFERENCES judete(cod) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_judet_an (judet_cod, an)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS varsta (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    judet_cod     CHAR(2)         NOT NULL,
    an            SMALLINT        NOT NULL, 
    varsta_25m    INT             NOT NULL DEFAULT 0,
    varsta_25_29  INT             NOT NULL DEFAULT 0,
    varsta_30_39  INT             NOT NULL DEFAULT 0,
    varsta_40_49  INT             NOT NULL DEFAULT 0,
    varsta_50_55  INT             NOT NULL DEFAULT 0,
    varsta_55p    INT             NOT NULL DEFAULT 0,
    FOREIGN KEY (judet_cod) REFERENCES judete(cod) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_judet_an (judet_cod, an)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS medii_sex (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    judet_cod     CHAR(2)         NOT NULL,
    an            SMALLINT        NOT NULL,
    total         INT             NOT NULL DEFAULT 0,
    masculin      INT             NOT NULL DEFAULT 0,
    feminin       INT             NOT NULL DEFAULT 0,
    urban         INT             NOT NULL DEFAULT 0,
    rural         INT             NOT NULL DEFAULT 0,
    FOREIGN KEY (judet_cod) REFERENCES judete(cod) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_judet_an (judet_cod, an)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


INSERT IGNORE INTO judete (cod, nume, regiune, lat, lon) VALUES
('AB','Alba','Centru',46.0700,23.5800),
('AR','Arad','Vest',46.1700,21.3200),
('AG','Argeș','Muntenia',44.8500,24.8700),
('BC','Bacău','Moldova',46.5700,26.9000),
('BH','Bihor','Nord-Vest',47.0500,21.9400),
('BN','Bistrița-Năsăud','Nord-Vest',47.1400,24.4900),
('BT','Botoșani','Moldova',47.7300,26.6700),
('BR','Brăila','Muntenia',45.2700,27.9600),
('BV','Brașov','Centru',45.6500,25.6100),
('BZ','Buzău','Muntenia',45.1500,26.8200),
('CS','Caraș-Severin','Centru',44.2000,27.3300),
('CL','Călărași','Muntenia',44.2000,27.3300),
('CJ','Cluj','Nord-Vest',46.7700,23.5900),
('CT','Constanța','Dobrogea',44.1800,28.6300),
('CV','Covasna','Centru',45.8500,26.1800),
('DB','Dâmbovița','Muntenia',44.9300,25.4500),
('DJ','Dolj','Oltenia',44.3100,23.8000),
('GL','Galați','Moldova',45.4300,28.0400),
('GR','Giurgiu','Muntenia',43.9000,25.9700),
('GJ','Gorj','Oltenia',44.9500,23.3400),
('HR','Harghita','Centru',46.3500,25.8000),
('HD','Hunedoara','Vest',45.7200,22.9000),
('IL','Ialomița','Muntenia',44.6100,27.4000),
('IS','Iași','Moldova',47.1600,27.5900),
('IF','Ilfov','Muntenia',44.5600,26.2100),
('MM','Maramureș','Nord-Vest',47.6600,24.1000),
('MH','Mehedinți','Oltenia',44.6400,22.9000),
('MS','Mureș','Centru',46.5400,24.5600),
('NT','Neamț','Moldova',46.9700,26.3800),
('OT','Olt','Oltenia',44.4400,24.3700),
('PH','Prahova','Muntenia',44.9400,26.0200),
('SM','Satu Mare','Nord-Vest',47.7800,22.8800),
('SJ','Sălaj','Nord-Vest',47.1900,23.0600),
('SB','Sibiu','Centru',45.8000,24.1500),
('SV','Suceava','Moldova',47.6400,25.7000),
('TR','Teleorman','Muntenia',43.9800,25.3800),
('TM','Timiș','Vest',45.7500,21.2300),
('TL','Tulcea','Dobrogea',45.1800,29.0000),
('VS','Vaslui','Moldova',46.6400,27.7300),
('VL','Vâlcea','Oltenia',45.1000,24.3700),
('VN','Vrancea','Moldova',45.7100,26.9100),
('B', 'București','București',44.4300,26.1000);
