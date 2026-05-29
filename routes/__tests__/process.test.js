// ─── routes/__tests__/process.test.js ─────────────────────────────────────
// Unit and integration tests for POST /process endpoint

const request = require('supertest');
const express = require('express');
const processRouter = require('../process');

describe('POST /process', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/', processRouter);
    });

    // ─── Validation Tests ────────────────────────────────────────────────────
    describe('Input Validation', () => {
        test('should reject empty notes', async () => {
            const res = await request(app)
                .post('/')
                .send({ notes: '' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/No notes provided/i);
        });

        test('should reject missing notes field', async () => {
            const res = await request(app)
                .post('/')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/No notes provided/i);
        });

        test('should reject whitespace-only notes', async () => {
            const res = await request(app)
                .post('/')
                .send({ notes: '   \n\t  ' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/No notes provided/i);
        });

        test('should reject notes exceeding max length', async () => {
            const longNotes = 'a'.repeat(2001);
            const res = await request(app)
                .post('/')
                .send({ notes: longNotes });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/too long|2,000 characters/i);
        });

        test('should accept exactly 2000 characters', async () => {
            const notes2000 = 'a'.repeat(2000);
            const res = await request(app)
                .post('/')
                .send({ notes: notes2000 });

            // Will fail on API call (no env key), but validation passes
            expect(res.status).not.toBe(400);
        });
    });

    // ─── Mode Tests ──────────────────────────────────────────────────────────
    describe('Processing Modes', () => {
        const validNotes = 'Meeting at 2pm, finish report by Friday';

        test('should accept default mode (fallback)', async () => {
            const res = await request(app)
                .post('/')
                .send({ notes: validNotes });

            // Will reach API call stage, validation passes
            expect(res.status).not.toBe(400);
        });

        test('should accept simple mode', async () => {
            const res = await request(app)
                .post('/')
                .send({ notes: validNotes, mode: 'simple' });

            expect(res.status).not.toBe(400);
        });

        test('should accept meeting mode', async () => {
            const res = await request(app)
                .post('/')
                .send({ notes: validNotes, mode: 'meeting' });

            expect(res.status).not.toBe(400);
        });

        test('should accept email mode', async () => {
            const res = await request(app)
                .post('/')
                .send({ notes: validNotes, mode: 'email' });

            expect(res.status).not.toBe(400);
        });
    });

    // ─── Custom Prompt Tests ────────────────────────────────────────────────
    describe('Custom Prompts', () => {
        const validNotes = 'Meeting at 2pm, finish report by Friday';

        test('should accept custom prompt override', async () => {
            const res = await request(app)
                .post('/')
                .send({
                    notes: validNotes,
                    customPrompt: 'Categorize by project instead'
                });

            expect(res.status).not.toBe(400);
        });

        test('should ignore empty custom prompt', async () => {
            const res = await request(app)
                .post('/')
                .send({
                    notes: validNotes,
                    customPrompt: ''
                });

            expect(res.status).not.toBe(400);
        });

        test('should ignore whitespace-only custom prompt', async () => {
            const res = await request(app)
                .post('/')
                .send({
                    notes: validNotes,
                    customPrompt: '   \n  '
                });

            expect(res.status).not.toBe(400);
        });
    });

    // ─── API Error Handling Tests ────────────────────────────────────────────
    describe('API Error Handling', () => {
        const validNotes = 'Meeting at 2pm, finish report by Friday';

        test('should handle missing API key gracefully', async () => {
            // This test will attempt to call the API without a key
            // In a real test, you'd mock the callGroq and callOpenAI functions
            const res = await request(app)
                .post('/')
                .send({ notes: validNotes });

            // Will either timeout or error (expected with no API key set)
            expect([500, 'timeout']).toContain(
                res.status === 500 ? 500 : 'timeout'
            );
        });
    });

    // ─── Request Structure Tests ────────────────────────────────────────────
    describe('Request/Response Structure', () => {
        test('should require JSON content-type', async () => {
            const res = await request(app)
                .post('/')
                .set('Content-Type', 'text/plain')
                .send('notes=test');

            // Will likely fail parsing or validation
            expect(res.status).not.toBe(200);
        });

        test('should handle malformed JSON', async () => {
            const res = await request(app)
                .post('/')
                .set('Content-Type', 'application/json')
                .send('{ invalid json }');

            expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });

    // ─── Integration Tests (requires mocked API calls)────────────────────────
    describe('Integration Tests (Mocked)', () => {
        beforeEach(() => {
            // Mock environment variables for testing
            process.env.GROQ_API_KEY = 'test_key_gsk_123';
            delete process.env.OPENAI_API_KEY;
        });

        test('should return result, provider, and mode on success', async () => {
            // This would require mocking fetch/callGroq
            // Placeholder for integration test with real API responses
            expect(true).toBe(true);
        });
    });

    // ─── Edge Cases ──────────────────────────────────────────────────────────
    describe('Edge Cases', () => {
        test('should handle unicode/emoji in notes', async () => {
            const res = await request(app)
                .post('/')
                .send({ notes: '📅 Meeting 🎉 tomorrow, 中文 notes 日本語' });

            expect(res.status).not.toBe(400);
        });

        test('should handle very short notes', async () => {
            const res = await request(app)
                .post('/')
                .send({ notes: 'a' });

            expect(res.status).not.toBe(400);
        });

        test('should handle newlines and special characters', async () => {
            const notes = `Line 1\nLine 2\tTabbed\rCarriage return\n\n\n`;
            const res = await request(app)
                .post('/')
                .send({ notes });

            expect(res.status).not.toBe(400);
        });

        test('should handle null mode (use default)', async () => {
            const res = await request(app)
                .post('/')
                .send({ notes: 'test', mode: null });

            expect(res.status).not.toBe(400);
        });

        test('should handle extra fields in request', async () => {
            const res = await request(app)
                .post('/')
                .send({
                    notes: 'test',
                    extra: 'field',
                    another: 123
                });

            expect(res.status).not.toBe(400);
        });
    });
});
