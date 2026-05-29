const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('📦 Supabase client initialized');
} else {
    console.warn('⚠️  Supabase credentials missing. Database history will be disabled.');
}

/**
 * Save a note to the database. Fails silently if Supabase is not configured.
 */
async function saveNote(userId, originalText, aiResult, provider, mode) {
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from('notes')
            .insert([
                {
                    user_id: userId,
                    original_text: originalText,
                    ai_result: aiResult,
                    provider: provider,
                    mode: mode
                }
            ])
            .select();

        if (error) {
            console.error('❌ Supabase Insert Error:', error);
            return null;
        }

        return data[0];
    } catch (err) {
        console.error('❌ Supabase Save Failed:', err);
        return null;
    }
}

/**
 * Fetch a user's recent notes.
 */
async function getUserNotes(userId, limit = 20) {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('❌ Supabase Fetch Error:', error);
            return [];
        }

        return data;
    } catch (err) {
        console.error('❌ Supabase Fetch Failed:', err);
        return [];
    }
}

module.exports = { saveNote, getUserNotes, supabase };
