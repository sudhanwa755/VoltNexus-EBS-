import { CONFIG } from './config.js';
import { supabase } from './supabase.js';

export const Auth = {
    login: async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            console.log('Auth successful, signIn returned:', data);
            if (!data?.session) {
                console.warn('Warning: signInWithPassword did not return a session - will try to read session from client SDK (getSession)');
                try {
                    if (supabase?.auth?.getSession) {
                        const getSess = await supabase.auth.getSession();
                        if (getSess?.data?.session?.access_token) {
                            console.log('Recovered session from supabase.auth.getSession()', getSess.data.session);
                            data.session = getSess.data.session;
                        }
                    }
                } catch (e) {
                    console.warn('getSession attempt failed:', e);
                }
                if (!data?.session) {
                    console.warn('No session could be established after sign-in. Some db calls may error with auth required.');
                }
            }
            console.log('Fetching profile for user id:', data.user?.id, 'email:', data.user?.email);

            // Get user profile for role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            let effectiveProfile = profile;
            if (profileError || !profile) {
                console.error('Profile fetch error or empty. Attempting fallback lookup by email. Error:', profileError);
                try {
                    const { data: byEmail, error: byEmailErr } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('email', data.user?.email)
                        .limit(1)
                        .single();

                    if (byEmailErr) {
                        console.warn('Fallback profile lookup failed:', byEmailErr);
                    } else {
                        console.log('Fallback profile fetched by email:', byEmail);
                        effectiveProfile = byEmail;
                    }
                } catch (e) {
                    console.warn('Error during fallback profile lookup', e);
                }

                if (!effectiveProfile) {
                    console.warn('No profile found for user; defaulting to USER role (this may be why admin redirect fails)');
                }
            } else {
                console.log('Profile fetched successfully:', profile);
            }

            const user = {
                id: data.user.id,
                email: data.user.email,
                // Normalize role to uppercase to avoid case mismatches
                role: (effectiveProfile?.role || 'USER').toString().trim().toUpperCase(),
                name: effectiveProfile?.name || email.split('@')[0]
            };

            console.log('User object created:', user);
            console.log('User role:', user.role);
            console.log('Role type:', typeof user.role);
            console.log('Role === ADMIN?', user.role === 'ADMIN');
            console.log('Role === USER?', user.role === 'USER');

            // store token only if present
            if (data?.session?.access_token) {
                sessionStorage.setItem(CONFIG.TOKEN_KEY, data.session.access_token);
            } else {
                console.warn('No access_token present in session (data.session):', data.session);
            }
            sessionStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
            return user;
        } catch (error) {
            // Provide user-friendly error messages
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('Invalid email or password');
            } else if (error.message.includes('Email not confirmed')) {
                throw new Error('Please confirm your email before logging in');
            } else if (error.message.includes('User already registered')) {
                throw new Error('Invalid email or password');
            } else {
                throw new Error(error.message || 'Login failed');
            }
        }
    },

    register: async (userData) => {
        try {
            // Sign up with Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        name: userData.name
                    }
                }
            });

            if (error) throw error;

            // Log full response for debugging when users don't appear in the dashboard
            console.log('Supabase signUp response:', data);

            // If no user object returned, fail with a clear message so callers can see the reason
            if (!data || !data.user || !data.user.id) {
                const resp = JSON.stringify(data || {});
                throw new Error('Registration incomplete: Supabase did not return a user object. Response: ' + resp);
            }

            console.log('User signed up successfully:', data.user.id);

            // We are now relying on the on_auth_user_created trigger to create the profile.

            return { success: true, user: data.user };
        } catch (error) {
            if (error.message.includes('User already registered') || error.message.includes('duplicate key value violates unique constraint')) {
                throw new Error('This email is already registered. Please login instead.');
            }
            throw error;
        }
    },

    logout: async () => {
        await supabase.auth.signOut();
        sessionStorage.removeItem(CONFIG.TOKEN_KEY);
        sessionStorage.removeItem(CONFIG.USER_KEY);
        // Use root-relative path which works if 'frontend' is the deployment root (standard Vercel setup)
        window.location.href = '/login.html';
    },

    getUser: () => {
        const userStr = sessionStorage.getItem(CONFIG.USER_KEY);
        if (!userStr) return null;
        try {
            const parsed = JSON.parse(userStr);
            // Ensure role is always uppercase (defensive) and trim whitespace
            parsed.role = (parsed.role || 'USER').toString().trim().toUpperCase();
            return parsed;
        } catch (e) {
            console.warn('Failed to parse stored user, clearing session user key', e);
            sessionStorage.removeItem(CONFIG.USER_KEY);
            return null;
        }
    },

    isAuthenticated: () => {
        return !!sessionStorage.getItem(CONFIG.TOKEN_KEY);
    },

    checkAuth: (requiredRole = null) => {
        const user = Auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return false;
        }

        if (requiredRole && user.role?.toString().trim().toUpperCase() !== requiredRole?.toString().trim().toUpperCase()) {
            console.log('Role mismatch. User role:', user.role, 'Required:', requiredRole);
            if (user.role?.toString().trim().toUpperCase() === 'ADMIN') {
                window.location.href = 'admin/dashboard.html';
            } else {
                window.location.href = 'dashboard.html';
            }
            return false;
        }
        return true;
    },

    redirectBasedOnRole: () => {
        const user = Auth.getUser();
        console.log('Redirecting based on role:', user?.role);
        if (user) {
            if (user.role?.toString().trim().toUpperCase() === 'ADMIN') {
                console.log('User is ADMIN, redirecting to admin dashboard');
                window.location.href = 'admin/dashboard.html';
            } else {
                console.log('User is not ADMIN, redirecting to user dashboard');
                window.location.href = 'dashboard.html';
            }
        }
    }
};
