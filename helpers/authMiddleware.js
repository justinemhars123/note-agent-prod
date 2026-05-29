const { supabase } = require('./supabase');
const logger = require('./logger');

/**
 * Optional Authentication Middleware
 * Checks if an Authorization header is present with a Bearer token.
 * If present, it verifies the token with Supabase and attaches the user to req.user.
 * If not present (or invalid), it proceeds without req.user, allowing anonymous fallback.
 */
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];

    if (!supabase) {
        logger.warn('⚠️ Supabase client not initialized. Cannot verify auth token.');
        return next();
    }

    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
            logger.error('❌ Supabase Token Verification Error:', error?.message);
            // Optionally, we could reject the request here, but for smooth fallback we just proceed
            return next();
        }

        req.user = user;
        next();
    } catch (err) {
        logger.error('❌ Auth Middleware Error:', err);
        next();
    }
}

module.exports = { optionalAuth };
