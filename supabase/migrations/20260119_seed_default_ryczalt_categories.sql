-- Seed default ryczałt revenue categories
-- These are global categories (business_profile_id IS NULL) available to all JDG profiles

-- First, check if we already have default categories
DO $$
BEGIN
  -- Only insert if no default categories exist
  IF NOT EXISTS (SELECT 1 FROM ryczalt_revenue_categories WHERE is_default = true LIMIT 1) THEN
    
    -- Insert default ryczałt categories based on Polish tax law
    INSERT INTO ryczalt_revenue_categories (
      id,
      name,
      rate,
      description,
      pkd_hint,
      is_default,
      is_active,
      created_at,
      updated_at
    ) VALUES
    -- 3% rate categories
    (
      gen_random_uuid(),
      'Handel detaliczny i hurtowy',
      3.00,
      'Sprzedaż towarów i produktów (handel)',
      '45, 46, 47',
      true,
      true,
      NOW(),
      NOW()
    ),
    -- 5.5% rate categories
    (
      gen_random_uuid(),
      'Usługi gastronomiczne',
      5.50,
      'Restauracje, bary, catering',
      '56',
      true,
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'Usługi budowlane',
      5.50,
      'Roboty budowlane, remontowe, wykończeniowe',
      '41, 42, 43',
      true,
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'Usługi transportowe',
      5.50,
      'Transport towarów i osób',
      '49, 50, 51',
      true,
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'Usługi medyczne',
      5.50,
      'Usługi medyczne, pielęgniarskie, fizjoterapia',
      '86',
      true,
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'Usługi inne',
      5.50,
      'Pozostałe usługi niemieszczące się w innych kategoriach',
      NULL,
      true,
      true,
      NOW(),
      NOW()
    ),
    -- 8.5% rate categories
    (
      gen_random_uuid(),
      'Usługi doradcze i konsultingowe',
      8.50,
      'Doradztwo biznesowe, konsulting, szkolenia',
      '70, 85',
      true,
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'Usługi prawnicze i księgowe',
      8.50,
      'Usługi prawne, księgowe, audytorskie',
      '69',
      true,
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'Usługi marketingowe i reklamowe',
      8.50,
      'Marketing, reklama, public relations',
      '73',
      true,
      true,
      NOW(),
      NOW()
    ),
    -- 12% rate categories
    (
      gen_random_uuid(),
      'Usługi IT i programowanie',
      12.00,
      'Działalność IT, programowanie, konsulting techniczny',
      '62, 63',
      true,
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      'Usługi projektowe i architektoniczne',
      12.00,
      'Projektowanie, architektura, inżynieria',
      '71',
      true,
      true,
      NOW(),
      NOW()
    ),
    -- 15% rate categories
    (
      gen_random_uuid(),
      'Wolne zawody - lekarze, prawnicy',
      15.00,
      'Działalność lekarska, prawnicza, notarialna',
      '86, 69',
      true,
      true,
      NOW(),
      NOW()
    ),
    -- 17% rate categories
    (
      gen_random_uuid(),
      'Działalność artystyczna i rozrywkowa',
      17.00,
      'Działalność twórcza, artystyczna, rozrywkowa',
      '90, 91, 93',
      true,
      true,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Default ryczałt categories seeded successfully';
  ELSE
    RAISE NOTICE 'Default ryczałt categories already exist, skipping seed';
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ryczalt_categories_default 
  ON ryczalt_revenue_categories(is_default) 
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_ryczalt_categories_active 
  ON ryczalt_revenue_categories(is_active) 
  WHERE is_active = true;

-- Add helpful comment
COMMENT ON TABLE ryczalt_revenue_categories IS 'Ryczałt revenue categories for JDG taxation. Global categories (business_profile_id IS NULL) are system defaults, profile-specific categories are custom.';
