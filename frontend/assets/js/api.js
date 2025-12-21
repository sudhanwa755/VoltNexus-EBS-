import { supabase } from './supabase.js';
import { Auth } from './auth.js';

export const API = {
    auth: Auth, // Re-export Auth for backward compatibility if needed, though direct usage is preferred

    user: {
        getBills: async (userId) => {
            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .eq('user_id', userId)
                .order('due_date', { ascending: false });

            if (error) throw error;
            return data;
        },
        getRecentBills: async (userId, limit = 3) => {
            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .eq('user_id', userId)
                .order('due_date', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        },
        getPendingBill: async (userId) => {
            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'Pending')
                .order('due_date', { ascending: true })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "The result contains 0 rows"
            return data;
        },
        getBill: async (id) => {
            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        },
        getConsumption: async (userId, limit = 12) => {
            let query = supabase
                .from('consumption')
                .select('*')
                .eq('user_id', userId)
                .order('month', { ascending: true });

            if (limit) {
                query = supabase
                    .from('consumption')
                    .select('*')
                    .eq('user_id', userId)
                    .order('month', { ascending: false })
                    .limit(limit);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (limit) {
                return data.reverse();
            }
            return data;
        },
        setConsumptionLimit: async (userId, limit, threshold, emailAlert = true) => {
            const { data, error } = await supabase
                .from('consumption_limits')
                .upsert({
                    user_id: userId,
                    monthly_limit: limit,
                    alert_threshold: threshold,
                    email_alert: emailAlert,
                    updated_at: new Date()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        getConsumptionLimit: async (userId) => {
            const { data, error } = await supabase
                .from('consumption_limits')
                .select('*')
                .eq('user_id', userId)
                .single();

            // Return null if no limit set (not an error)
            if (error && error.code === 'PGRST116') return null;
            if (error) throw error;
            return data;
        },
        deleteConsumptionLimit: async (userId) => {
            const { error } = await supabase
                .from('consumption_limits')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;
            return { success: true };
        },
        checkConsumptionExceeded: async (userId) => {
            try {
                const limit = await API.user.getConsumptionLimit(userId);
                if (!limit || !limit.monthly_limit) return null;

                // Get current month consumption
                const now = new Date();
                const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM format

                const { data: consumption, error } = await supabase
                    .from('consumption')
                    .select('units_consumed')
                    .eq('user_id', userId)
                    .eq('billing_month', currentMonth)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;
                if (!consumption) return null;

                const units = consumption.units_consumed || 0;
                const threshold = (limit.monthly_limit * limit.alert_threshold) / 100;

                if (units > limit.monthly_limit) {
                    return {
                        exceeded: true,
                        currentUsage: units,
                        limit: limit.monthly_limit,
                        percentage: Math.round((units / limit.monthly_limit) * 100)
                    };
                } else if (units > threshold) {
                    return {
                        exceeded: false,
                        warning: true,
                        currentUsage: units,
                        limit: limit.monthly_limit,
                        percentage: Math.round((units / limit.monthly_limit) * 100)
                    };
                }

                return null;
            } catch (err) {
                // Do not throw to avoid breaking dashboard load on auth/500 errors.
                // Log for debugging and return null so callers can handle absence of alert.
                console.error('API.user.checkConsumptionExceeded error for user', userId, err);
                return null;
            }
        },

        // ==================== CUSTOMER INFO CRUD ====================

        /**
         * Generate a unique meter number in format MTR-XXXXXX
         * @returns {Promise<string>} Unique meter number
         */
        generateUniqueMeterNumber: async () => {
            try {
                // Get the highest existing meter number
                const { data, error } = await supabase
                    .from('customer_info')
                    .select('meter_number')
                    .not('meter_number', 'is', null)
                    .order('meter_number', { ascending: false })
                    .limit(1);

                if (error) throw error;

                let nextNumber = 1;
                if (data && data.length > 0 && data[0].meter_number) {
                    // Extract number from format MTR-XXXXXX
                    const match = data[0].meter_number.match(/MTR-(\d+)/);
                    if (match) {
                        nextNumber = parseInt(match[1]) + 1;
                    }
                }

                // Format as MTR-XXXXXX with zero padding
                return `MTR-${String(nextNumber).padStart(6, '0')}`;
            } catch (error) {
                console.error('Error generating meter number:', error);
                // Fallback to timestamp-based if query fails
                return `MTR-${Date.now()}`;
            }
        },

        /**
         * Create customer information for a user
         * @param {string} userId - User ID
         * @param {Object} customerData - Customer information
         * @returns {Promise<Object>} Created customer info
         */
        createCustomerInfo: async (userId, customerData) => {
            // Check user role first to see if they should have a meter
            let userRole = 'USER';
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', userId)
                    .single();
                if (profile) userRole = profile.role;
            } catch (roleError) {
                console.warn('Could not fetch user role for meter assignment check, defaulting to USER', roleError);
            }

            // Auto-generate unique meter number only for USERs
            let meterNumber = null;
            if (userRole !== 'ADMIN') {
                meterNumber = await API.user.generateUniqueMeterNumber();
            } else {
                console.log('User is ADMIN, skipping meter number generation');
            }

            const { data, error } = await supabase
                .from('customer_info')
                .insert({
                    user_id: userId,
                    mobile_number: customerData.mobile_number || null,
                    phone_number: customerData.phone_number || null,
                    street_address: customerData.street_address || null,
                    city: customerData.city || null,
                    state_province: customerData.state_province || null,
                    postal_code: customerData.postal_code || null,
                    country: customerData.country || 'India',
                    meter_number: meterNumber
                })
                .select()
                .single();

            if (error) throw error;
            if (meterNumber) console.log('Created customer info with meter number:', meterNumber);
            return data;
        },

        /**
         * Get customer information for a user
         * @param {string} userId - User ID
         * @returns {Promise<Object|null>} Customer info or null if not found
         */
        getCustomerInfo: async (userId) => {
            const { data, error } = await supabase
                .from('customer_info')
                .select('*')
                .eq('user_id', userId)
                .single();

            // Return null if no customer info found (not an error for existing users)
            if (error && error.code === 'PGRST116') return null;
            if (error) throw error;
            return data;
        },

        /**
         * Update customer information for a user
         * @param {string} userId - User ID
         * @param {Object} customerData - Updated customer information
         * @returns {Promise<Object>} Updated customer info
         */
        updateCustomerInfo: async (userId, customerData) => {
            // First check if customer info exists
            const existing = await API.user.getCustomerInfo(userId);

            if (!existing) {
                // If no existing record, create one instead
                return await API.user.createCustomerInfo(userId, customerData);
            }

            // Update existing record
            const { data, error } = await supabase
                .from('customer_info')
                .update({
                    mobile_number: customerData.mobile_number || null,
                    phone_number: customerData.phone_number || null,
                    street_address: customerData.street_address || null,
                    city: customerData.city || null,
                    state_province: customerData.state_province || null,
                    postal_code: customerData.postal_code || null,
                    country: customerData.country || 'India',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        /**
         * Delete customer information for a user
         * @param {string} userId - User ID
         * @returns {Promise<Object>} Success response
         */
        deleteCustomerInfo: async (userId) => {
            const { error } = await supabase
                .from('customer_info')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;
            return { success: true };
        },

        getConsumptionData: async (userId, months = 3) => {
            const { data, error } = await supabase
                .from('consumption')
                .select('month, billing_month, units, units_consumed')
                .eq('user_id', userId)
                .order('month', { ascending: false })
                .limit(months);

            if (error) throw error;
            return data || [];
        }
    },
    admin: {
        getUsers: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*');
            // .order('created_at', { ascending: false }); // Commented out to prevent errors if column missing

            if (error) throw error;
            return data;
        },
        createUser: async (userData) => {
            // Note: Creating a user in auth.users usually requires service role or client-side signup.
            // For this implementation, we'll assume we are creating a profile record, 
            // but typically you'd use supabase.auth.signUp() for a new user.
            // Since we can't easily create auth users from here without a password, 
            // we might limit this to just updating profiles or use a specific edge function.
            // For now, we'll focus on updating existing users.
            console.warn("Create User not fully supported via client API without SignUp");
            throw new Error("To create a user, please use the Registration page.");
        },
        updateUser: async (id, updates) => {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // If user role was updated to ADMIN, clear their meter number as admins shouldn't have one
            // If user role was updated to ADMIN, clear their meter number as admins shouldn't have one
            if (updates.role === 'ADMIN') {
                console.log('User promoted to ADMIN, clearing meter number if exists');
                try {
                    const { error: clearError } = await supabase
                        .from('customer_info')
                        .update({ meter_number: null })
                        .eq('user_id', id);
                    if (clearError) throw clearError;
                    console.log('Successfully cleared meter for new admin');
                } catch (err) {
                    console.error('Failed to clear meter number for promoted admin:', err);
                }
            }

            // If user role was updated to USER, assign a meter number if they don't have one
            if (updates.role === 'USER') {
                console.log('User demoted to USER, checking if they need a meter number');
                try {
                    const { data: info, error: infoError } = await supabase
                        .from('customer_info')
                        .select('meter_number')
                        .eq('user_id', id)
                        .single();

                    // If error is not "not found", throw it
                    if (infoError && infoError.code !== 'PGRST116') throw infoError;

                    if (!info || !info.meter_number) {
                        const meterNumber = await API.user.generateUniqueMeterNumber();
                        console.log('Assigning new meter number on demotion:', meterNumber);

                        if (!info) {
                            // Create record if doesn't exist
                            const { error: insError } = await supabase.from('customer_info').insert({
                                user_id: id,
                                meter_number: meterNumber,
                                country: 'India'
                            });
                            if (insError) throw insError;
                            console.log('Successfully created customer_info and assigned meter for demoted user');
                        } else {
                            // Update existing record with the new meter
                            const { error: updError } = await supabase.from('customer_info')
                                .update({ meter_number: meterNumber })
                                .eq('user_id', id);
                            if (updError) throw updError;
                            console.log('Successfully updated meter_number for demoted user');
                        }
                    } else {
                        console.log('User already has a meter number:', info.meter_number);
                    }
                } catch (assignError) {
                    console.error('Failed to assign meter number for demoted user:', assignError);
                }
            }

            return data;
        },
        toggleUserStatus: async (id) => {
            // First get current status
            const { data: user, error: fetchError } = await supabase
                .from('profiles')
                .select('status')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // Toggle between 'active' and 'inactive'
            const newStatus = user.status === 'active' ? 'inactive' : 'active';
            const { data, error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        deleteUser: async (id) => {
            // Note: This only deletes from public.profiles. 
            // To delete from auth.users, you need a backend function or service role.
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        },

        // --- BILLS ---
        getAllBills: async () => {
            const { data, error } = await supabase
                .from('bills')
                .select('*, profiles(name, email)')
                .order('due_date', { ascending: false });

            if (error) throw error;
            return data;
        },
        updateBill: async (id, updates) => {
            const { data, error } = await supabase
                .from('bills')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        deleteBill: async (id) => {
            const { error } = await supabase
                .from('bills')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        },

        // --- READINGS ---
        getAllReadings: async () => {
            // Check if readings table exists, otherwise return empty or mock
            // Based on schema, we might not have a separate 'readings' table, 
            // it might be 'consumption'. Let's use consumption.
            const { data, error } = await supabase
                .from('consumption')
                .select('*, profiles(id, name, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        getReadingsByUser: async (userId) => {
            const { data, error } = await supabase
                .from('consumption')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        getAllConsumption: async () => {
            const { data, error } = await supabase
                .from('consumption')
                .select('*, profiles(id, name, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },

        // --- TARIFFS ---
        getTariffPlans: async () => {
            const { data, error } = await supabase
                .from('tariff_plans')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        createTariffPlan: async (planData) => {
            const { data, error } = await supabase
                .from('tariff_plans')
                .insert(planData)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        updateTariffPlan: async (id, updates) => {
            const { data, error } = await supabase
                .from('tariff_plans')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        deleteTariffPlan: async (id) => {
            const { error } = await supabase
                .from('tariff_plans')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        }
    }
};
