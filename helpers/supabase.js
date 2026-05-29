const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

const supabaseUrl = process.env.SUPABASE_URL;
// Prefer an explicit anon key for browser-safe use; fall back to SUPABASE_KEY for existing installs.
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('📦 Supabase client initialized');
} else {
    logger.warn('⚠️  Supabase credentials missing. Database history will be disabled.');
}

/**
 * Save a note to the database. Fails silently if Supabase is not configured.
 */
async function saveNote(userId, originalText, aiResult, provider, mode, token) {
    if (!supabaseUrl || !supabaseKey) {
        return null;
    }

    try {
        // Create an auth-scoped client for this specific request using the user's token
        // so that Supabase Row Level Security (RLS) policies pass.
        const client = token
            ? createClient(supabaseUrl, supabaseKey, {
                  global: { headers: { Authorization: token } },
              })
            : supabase;

        const { data, error } = await client
            .from('notes')
            .insert([
                {
                    user_id: userId,
                    original_text: originalText,
                    ai_result: aiResult,
                    provider: provider,
                    mode: mode,
                },
            ])
            .select();

        if (error) {
            logger.error('❌ Supabase Insert Error:', error);
            return null;
        }

        return data[0];
    } catch (err) {
        logger.error('❌ Supabase Save Failed:', err);
        return null;
    }
}

/**
 * Fetch a user's recent notes.
 */
async function getUserNotes(userId, token, limit = 20) {
    if (!supabaseUrl || !supabaseKey) {
        return [];
    }

    try {
        const client = token
            ? createClient(supabaseUrl, supabaseKey, {
                  global: { headers: { Authorization: token } },
              })
            : supabase;

        const { data, error } = await client
            .from('notes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            logger.error('❌ Supabase Fetch Error:', error);
            return [];
        }

        return data;
    } catch (err) {
        logger.error('❌ Supabase Fetch Failed:', err);
        return [];
    }
}

module.exports = { saveNote, getUserNotes, supabase };
