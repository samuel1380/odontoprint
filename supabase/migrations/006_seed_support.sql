-- ====================================================================
-- MIGRATION 006: SEED SUPPORT & DEFAULT SETTINGS - ODONTOPRINT
-- ====================================================================

-- Insert default system settings if table is empty
INSERT INTO public.system_settings (
    maintenance_interval_days,
    calibration_hexagon_min,
    calibration_hexagon_max,
    normal_print_prefix,
    retry_print_prefix
)
SELECT 7, 9.99, 10.01, 'A', '00A'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

-- Function to safely bootstrap demo profiles without breaking foreign keys
CREATE OR REPLACE FUNCTION public.create_demo_profile_if_not_exists(
    p_id UUID,
    p_full_name TEXT,
    p_role user_role
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, active)
    VALUES (p_id, p_full_name, p_role, true)
    ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
