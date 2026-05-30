const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

// Determine if we need to provide a custom WebSocket transport (Node < 22)
let wsTransport;
try {
    // `ws` may be CJS or ESM; normalize to the constructor function
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const _ws = require('ws');
    // support: ESM default, named WebSocket export, or the constructor itself
    wsTransport = _ws && (_ws.default || _ws.WebSocket || _ws);
} catch (err) {
    wsTransport = undefined;
}

const nodeMajor = parseInt(process.versions.node.split('.')[0], 10) || 0;
const needTransport = nodeMajor > 0 && nodeMajor < 22 && wsTransport;

const supabaseOptions = needTransport ? { realtime: { transport: wsTransport } } : {};

let supabase = null;

if (supabaseUrl && supabaseKey) {
    // Diagnostics for deploy logs: show node version, ws presence, and engines.node
    try {
        const pkg = require('../package.json');
        const enginesNode = (pkg && pkg.engines && pkg.engines.node) || '';
        logger.info('supabase: diagnostics', 'nodeVersion=' + process.version, 'needTransport=' + needTransport, 'wsLoaded=' + Boolean(wsTransport), 'engines.node=' + enginesNode);
    } catch (err) {
        logger.info('supabase: diagnostics', 'nodeVersion=' + process.version, 'needTransport=' + needTransport, 'wsLoaded=' + Boolean(wsTransport));
    }

    supabase = createClient(supabaseUrl, supabaseKey, supabaseOptions);
    logger.info('📦 Supabase client initialized');
} else {
    logger.warn('⚠️  Supabase credentials missing. Database history will be disabled.');
}

async function saveNote(userId, originalText, aiResult, provider, mode, token) {
    if (!supabaseUrl || !supabaseKey) return null;

    try {
        const client = token
            ? createClient(supabaseUrl, supabaseKey, {
                  ...supabaseOptions,
                  global: { headers: { Authorization: token } },
              })
            : supabase;

        const { data, error } = await client
            .from('notes')
            .insert([{ user_id: userId, original_text: originalText, ai_result: aiResult, provider, mode }])
            .select();

        if (error) { logger.error('❌ Supabase Insert Error:', error); return null; }
        return data[0];
    } catch (err) {
        logger.error('❌ Supabase Save Failed:', err);
        return null;
    }
}

async function getUserNotes(userId, token, limit = 20) {
    if (!supabaseUrl || !supabaseKey) return [];

    try {
        const client = token
            ? createClient(supabaseUrl, supabaseKey, {
                  ...supabaseOptions,
                  global: { headers: { Authorization: token } },
              })
            : supabase;

        const { data, error } = await client
            .from('notes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) { logger.error('❌ Supabase Fetch Error:', error); return []; }
        return data;
    } catch (err) {
        logger.error('❌ Supabase Fetch Failed:', err);
        return [];
    }
}

async function deleteNote(userId, noteId, token) {
    if (!supabaseUrl || !supabaseKey) return false;

    try {
        const client = token
            ? createClient(supabaseUrl, supabaseKey, {
                  ...supabaseOptions,
                  global: { headers: { Authorization: token } },
              })
            : supabase;

        const { error } = await client
            .from('notes')
            .delete()
            .eq('id', noteId)
            .eq('user_id', userId);

        if (error) { logger.error('❌ Supabase Delete Error:', error); return false; }
        return true;
    } catch (err) {
        logger.error('❌ Supabase Delete Failed:', err);
        return false;
    }
}

module.exports = { saveNote, getUserNotes, deleteNote, supabase };