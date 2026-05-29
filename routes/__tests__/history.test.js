const request = require('supertest');
const express = require('express');
const historyRouter = require('../history');
const { getUserNotes } = require('../../helpers/supabase');

// Mock supabase helper
jest.mock('../../helpers/supabase', () => ({
    getUserNotes: jest.fn(),
}));

describe('GET /history', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());

        // Define simple optional middleware stub so we can control req.user in tests
        app.use((req, res, next) => {
            if (req.headers['test-user-id']) {
                req.user = { id: req.headers['test-user-id'] };
            }
            next();
        });

        app.use('/', historyRouter);
        jest.clearAllMocks();
    });

    test('should instantly return empty notes array if user is unauthenticated', async () => {
        const res = await request(app).get('/');

        expect(res.status).toBe(200);
        expect(res.body.notes).toEqual([]);
        expect(getUserNotes).not.toHaveBeenCalled();
    });

    test('should query Supabase history if user is authenticated', async () => {
        const mockNotes = [{ id: '1', ai_result: 'Buy milk' }];
        getUserNotes.mockResolvedValue(mockNotes);

        const res = await request(app)
            .get('/')
            .set('test-user-id', 'uid-1234')
            .set('Authorization', 'Bearer jwt-token');

        expect(res.status).toBe(200);
        expect(res.body.notes).toEqual(mockNotes);
        expect(getUserNotes).toHaveBeenCalledWith('uid-1234', 'Bearer jwt-token');
    });

    test('should return 500 status on database failure', async () => {
        getUserNotes.mockRejectedValue(new Error('DB failure'));

        const res = await request(app)
            .get('/')
            .set('test-user-id', 'uid-1234')
            .set('Authorization', 'Bearer jwt-token');

        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/fetch history/i);
    });
});
