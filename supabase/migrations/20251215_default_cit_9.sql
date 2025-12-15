-- Set default CIT rate to 9% (mały podatnik) across CIT tables

ALTER TABLE IF EXISTS cit_advances
  ALTER COLUMN cit_rate SET DEFAULT 9;

ALTER TABLE IF EXISTS cit_annual_declarations
  ALTER COLUMN cit_rate SET DEFAULT 9;
