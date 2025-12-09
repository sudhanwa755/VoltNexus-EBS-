-- ============================================
-- ElectroBill - COMPLETE ENHANCED SETUP (FIXED)
-- ============================================
-- This version FIXES the infinite recursion RLS issue
-- Run this entire script at once in Supabase SQL Editor
-- ============================================

-- STEP 1: Drop existing triggers on auth.users (if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 2: Drop functions (if exist)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- STEP 3: Drop tables (if exist) - in correct dependency order
DROP TABLE IF EXISTS public.consumption_alerts CASCADE;
DROP TABLE IF EXISTS public.consumption_limits CASCADE;
DROP TABLE IF EXISTS public.customer_tariff_mapping CASCADE;
DROP TABLE IF EXISTS public.tariff_plans CASCADE;
DROP TABLE IF EXISTS public.customer_info CASCADE;
DROP TABLE IF EXISTS public.consumption CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- STEP 4: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BASE TABLES (Original Schema)
-- ============================================

-- STEP 5: Create PROFILES table (ENHANCED with new columns)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    
    -- NEW COLUMNS
    customer_category TEXT DEFAULT 'residential' CHECK (customer_category IN ('residential', 'commercial', 'industrial', 'agricultural')),
    kyc_verified BOOLEAN DEFAULT FALSE,
    account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended', 'closed')),
    last_login TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 6: Create BILLS table
CREATE TABLE public.bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    units NUMERIC(10, 2) NOT NULL CHECK (units >= 0),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- STEP 7: Create CONSUMPTION table
CREATE TABLE public.consumption (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    billing_month TEXT,  -- Made nullable to prevent NOT NULL constraint errors
    units NUMERIC(10, 2) NOT NULL CHECK (units >= 0),
    units_consumed NUMERIC(10, 2),  -- Made nullable, defaults to units if not provided
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- ============================================
-- NEW ENHANCEMENT TABLES
-- ============================================

-- STEP 8: Create CUSTOMER_INFO table
CREATE TABLE public.customer_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Contact Information
    mobile_number TEXT,
    phone_number TEXT,
    
    -- Address Details
    street_address TEXT,
    city TEXT,
    state_province TEXT,
    postal_code TEXT,
    country TEXT,
    
    -- Meter & Connection Details
    meter_number TEXT UNIQUE,
    connection_id TEXT UNIQUE,
    connection_date DATE,
    
    -- Account Preferences
    billing_frequency TEXT DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly', 'quarterly', 'annual')),
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'es', 'fr', 'hi')),
    notification_email BOOLEAN DEFAULT TRUE,
    notification_sms BOOLEAN DEFAULT FALSE,
    notification_push BOOLEAN DEFAULT FALSE,
    
    -- KYC & Verification
    id_type TEXT CHECK (id_type IN ('passport', 'driver_license', 'national_id', 'voter_id')),
    id_number TEXT,
    id_verified BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 9: Create TARIFF_PLANS table
CREATE TABLE public.tariff_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Tariff Structure
    category TEXT NOT NULL CHECK (category IN ('residential', 'commercial', 'industrial', 'agricultural')),
    base_fee NUMERIC(10, 2) NOT NULL CHECK (base_fee >= 0),
    
    -- Tiered Pricing
    tier1_units_up_to NUMERIC(10, 2),
    tier1_rate NUMERIC(10, 4) NOT NULL CHECK (tier1_rate >= 0),
    
    tier2_units_up_to NUMERIC(10, 2),
    tier2_rate NUMERIC(10, 4),
    
    tier3_units_up_to NUMERIC(10, 2),
    tier3_rate NUMERIC(10, 4),
    
    -- Taxes & Surcharges
    tax_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (tax_percentage >= 0),
    fuel_surcharge NUMERIC(10, 4) DEFAULT 0,
    
    -- Validity
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE NOT NULL,
    effective_until DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 10: Create CUSTOMER_TARIFF_MAPPING table
CREATE TABLE public.customer_tariff_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tariff_id UUID NOT NULL REFERENCES public.tariff_plans(id),
    
    -- Validity Period
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    changed_reason TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    superseded_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, assigned_date)
);

-- STEP 11: Create CONSUMPTION_LIMITS table
CREATE TABLE public.consumption_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Limit Configuration (Aligned with API)
    monthly_limit NUMERIC(10, 2) NOT NULL CHECK (monthly_limit > 0),
    alert_threshold NUMERIC(5, 2) NOT NULL 
        CHECK (alert_threshold BETWEEN 50 AND 100),
    
    -- Alert Preferences (Aligned with API)
    email_alert BOOLEAN DEFAULT TRUE,
    sms_alert_enabled BOOLEAN DEFAULT FALSE,
    push_notification_enabled BOOLEAN DEFAULT FALSE,
    
    -- Limit Validity
    is_active BOOLEAN DEFAULT TRUE,
    last_exceeded_month TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 12: Create CONSUMPTION_ALERTS table (Audit Trail)
CREATE TABLE public.consumption_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    consumption_limit_id UUID NOT NULL REFERENCES public.consumption_limits(id) ON DELETE CASCADE,
    
    -- Alert Details
    alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'exceeded')),
    month TEXT NOT NULL,
    current_consumption NUMERIC(10, 2) NOT NULL,
    limit_units NUMERIC(10, 2) NOT NULL,
    percentage_used NUMERIC(5, 2) NOT NULL,
    
    -- Notification Status
    email_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    
    -- Resolution
    acknowledged_at TIMESTAMPTZ,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES (Performance Optimization)
-- ============================================

-- STEP 13: Base table indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_bills_user_id ON public.bills(user_id);
CREATE INDEX idx_bills_status ON public.bills(status);
CREATE INDEX idx_bills_due_date ON public.bills(due_date);
CREATE INDEX idx_bills_month ON public.bills(month);
CREATE INDEX idx_consumption_user_id ON public.consumption(user_id);
CREATE INDEX idx_consumption_month ON public.consumption(month);

-- STEP 14: New table indexes
CREATE INDEX idx_customer_info_user_id ON public.customer_info(user_id);
CREATE INDEX idx_customer_info_meter_number ON public.customer_info(meter_number);
CREATE INDEX idx_customer_info_city ON public.customer_info(city);

CREATE INDEX idx_tariff_plans_active ON public.tariff_plans(is_active);
CREATE INDEX idx_tariff_plans_category ON public.tariff_plans(category);

CREATE INDEX idx_customer_tariff_user_id ON public.customer_tariff_mapping(user_id);
CREATE INDEX idx_customer_tariff_tariff_id ON public.customer_tariff_mapping(tariff_id);
CREATE INDEX idx_customer_tariff_is_active ON public.customer_tariff_mapping(is_active);

CREATE INDEX idx_consumption_limits_user_id ON public.consumption_limits(user_id);

CREATE INDEX idx_consumption_alerts_user_id ON public.consumption_alerts(user_id);
CREATE INDEX idx_consumption_alerts_month ON public.consumption_alerts(month);
CREATE INDEX idx_consumption_alerts_type ON public.consumption_alerts(alert_type);
CREATE INDEX idx_consumption_alerts_created_at ON public.consumption_alerts(created_at);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

-- STEP 15: Enable RLS on base tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption ENABLE ROW LEVEL SECURITY;

-- STEP 16: Enable RLS on new tables
ALTER TABLE public.customer_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariff_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tariff_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CRITICAL FIX: SECURITY DEFINER FUNCTION
-- ============================================
-- This function prevents infinite recursion in RLS policies
-- by bypassing RLS when checking admin role

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================
-- ROW LEVEL SECURITY POLICIES (FIXED)
-- ============================================
-- Using is_admin() function instead of direct EXISTS queries
-- This prevents infinite recursion!

-- STEP 17: PROFILES policies
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
    ON public.profiles FOR SELECT 
    USING (public.is_admin());

CREATE POLICY "Admins can update profiles" 
    ON public.profiles FOR UPDATE 
    USING (public.is_admin());

CREATE POLICY "Admins can delete profiles" 
    ON public.profiles FOR DELETE 
    USING (public.is_admin());

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- STEP 18: BILLS policies
CREATE POLICY "Users can view own bills" 
    ON public.bills FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own bills" 
    ON public.bills FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bills" 
    ON public.bills FOR SELECT 
    USING (public.is_admin());

CREATE POLICY "Admins can insert bills" 
    ON public.bills FOR INSERT 
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update bills" 
    ON public.bills FOR UPDATE 
    USING (public.is_admin());

CREATE POLICY "Admins can delete bills" 
    ON public.bills FOR DELETE 
    USING (public.is_admin());

-- STEP 19: CONSUMPTION policies
CREATE POLICY "Users can view own consumption" 
    ON public.consumption FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all consumption" 
    ON public.consumption FOR SELECT 
    USING (public.is_admin());

CREATE POLICY "Admins can insert consumption" 
    ON public.consumption FOR INSERT 
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update consumption" 
    ON public.consumption FOR UPDATE 
    USING (public.is_admin());

CREATE POLICY "Admins can delete consumption" 
    ON public.consumption FOR DELETE 
    USING (public.is_admin());

-- STEP 20: CUSTOMER_INFO policies
CREATE POLICY "Users can view own info" 
    ON public.customer_info FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own info" 
    ON public.customer_info FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own info" 
    ON public.customer_info FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all info" 
    ON public.customer_info FOR SELECT 
    USING (public.is_admin());

CREATE POLICY "Admins can update all info" 
    ON public.customer_info FOR UPDATE 
    USING (public.is_admin());

CREATE POLICY "Admins can delete all info" 
    ON public.customer_info FOR DELETE 
    USING (public.is_admin());

-- STEP 21: TARIFF_PLANS policies
CREATE POLICY "Everyone can view active tariffs" 
    ON public.tariff_plans FOR SELECT 
    USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins can manage tariffs" 
    ON public.tariff_plans FOR ALL 
    USING (public.is_admin());

-- STEP 22: CUSTOMER_TARIFF_MAPPING policies
CREATE POLICY "Users can view own tariff" 
    ON public.customer_tariff_mapping FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all tariffs" 
    ON public.customer_tariff_mapping FOR ALL 
    USING (public.is_admin());

-- STEP 23: CONSUMPTION_LIMITS policies
CREATE POLICY "Users can view own limit" 
    ON public.consumption_limits FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own limit" 
    ON public.consumption_limits FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own limit" 
    ON public.consumption_limits FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own limit" 
    ON public.consumption_limits FOR DELETE 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage limits" 
    ON public.consumption_limits FOR ALL 
    USING (public.is_admin());

-- STEP 24: CONSUMPTION_ALERTS policies
CREATE POLICY "Users can view own alerts" 
    ON public.consumption_alerts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can acknowledge alerts" 
    ON public.consumption_alerts FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all alerts" 
    ON public.consumption_alerts FOR SELECT 
    USING (public.is_admin());

CREATE POLICY "Admins can insert alerts" 
    ON public.consumption_alerts FOR INSERT 
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage alerts" 
    ON public.consumption_alerts FOR ALL 
    USING (public.is_admin());

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

-- STEP 25: Create trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'USER',
        'active'
    );
    RETURN NEW;
END;
$$;

-- STEP 26: Create updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- STEP 27: Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 28: Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
    BEFORE UPDATE ON public.bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_info_updated_at
    BEFORE UPDATE ON public.customer_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tariff_plans_updated_at
    BEFORE UPDATE ON public.tariff_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_tariff_mapping_updated_at
    BEFORE UPDATE ON public.customer_tariff_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consumption_limits_updated_at
    BEFORE UPDATE ON public.consumption_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION
-- ============================================

-- STEP 29: Verify is_admin() function
SELECT 
    'is_admin() function' as component,
    CASE WHEN COUNT(*) > 0 THEN '✅ Created' ELSE '❌ Missing' END as status
FROM pg_proc 
WHERE proname = 'is_admin' AND prosecdef = true;

-- STEP 30: Verify tables
SELECT 
    'Tables' as component,
    COUNT(*) || ' of 8 created' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'bills', 'consumption', 'customer_info', 'tariff_plans', 'customer_tariff_mapping', 'consumption_limits', 'consumption_alerts');

-- STEP 31: Verify RLS enabled
SELECT 
    'RLS Enabled' as component,
    COUNT(*) || ' of 8 tables' as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
AND tablename IN ('profiles', 'bills', 'consumption', 'customer_info', 'tariff_plans', 'customer_tariff_mapping', 'consumption_limits', 'consumption_alerts');

-- STEP 32: Show policies using is_admin()
SELECT 
    'Policies using is_admin()' as component,
    COUNT(*) || ' policies' as status
FROM pg_policies 
WHERE schemaname = 'public'
AND qual::text LIKE '%is_admin()%';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ✅ SETUP COMPLETE - RLS INFINITE RECURSION FIXED!    ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All 8 tables created with proper schema';
    RAISE NOTICE '✅ is_admin() SECURITY DEFINER function created';
    RAISE NOTICE '✅ All RLS policies use is_admin() - NO MORE 500 ERRORS!';
    RAISE NOTICE '✅ Triggers configured for auto-profile creation';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '1. Test admin login - should work without 500 errors';
    RAISE NOTICE '2. Verify dashboard loads data correctly';
    RAISE NOTICE '3. To make a user admin, run:';
    RAISE NOTICE '   UPDATE profiles SET role = ''ADMIN'' WHERE email = ''your-email@example.com'';';
    RAISE NOTICE '';
END $$;
