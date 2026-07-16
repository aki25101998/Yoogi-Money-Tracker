import { useState, useEffect } from 'react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase } from '../config/supabase';

const isMobileOrWebView = () => {
    return /Android|webOS|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth <= 768
        || 'ontouchstart' in window;
};

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        if (window.Capacitor || navigator.userAgent.includes('Capacitor')) {
            GoogleAuth.initialize({
                clientId: '634476807825-pa9k25klhpspqupgdgs2b9q3utjdk663.apps.googleusercontent.com',
                scopes: ['profile', 'email'],
                grantOfflineAccess: true,
            });
        }

        const processUser = (u) => {
            if (!u) return null;
            const photoURL = u.user_metadata?.avatar_url || u.user_metadata?.picture || u.photoURL || null;
            const displayName = u.user_metadata?.full_name || u.user_metadata?.name || u.displayName || null;
            return {
                ...u,
                uid: u.id,
                photoURL,
                displayName
            };
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(processUser(session?.user));
            setIsAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(processUser(session?.user));
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleGoogleLogin = async () => {
        try {
            if (isMobileOrWebView()) {
                const googleUser = await GoogleAuth.signIn();
                if (googleUser && googleUser.authentication) {
                    await supabase.auth.signInWithIdToken({
                        provider: 'google',
                        token: googleUser.authentication.idToken,
                    });
                } else {
                    throw new Error("Không lấy được token xác thực từ Google.");
                }
            } else {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google'
                });
                if (error) throw error;
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert("Đăng nhập thất bại: " + error.message);
        }
    };

    const handleLogout = async () => {
        try { await supabase.auth.signOut(); } catch (error) { console.error("Logout Error:", error); }
    };

    return { user, isAuthLoading, handleGoogleLogin, handleLogout };
};
