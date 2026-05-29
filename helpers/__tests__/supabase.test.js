// Set env variables BEFORE requiring helpers/supabase so it boots correctly
process.env.SUPABASE_URL = 'https://project.supabase.co';
process.env.SUPABASE_KEY = 'anon-public-key';

const { createClient } = require('@supabase/supabase-js');

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockEq = jest.fn();

const mockClient = {
    from: jest.fn().mockReturnThis(),
    insert: mockInsert,
    select: mockSelect,
    order: mockOrder,
    limit: mockLimit,
    eq: mockEq,
};

// Mock the supabase-js module
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => mockClient),
}));

// Require module after mock and env variables are defined
const { saveNote, getUserNotes } = require('../supabase');

describe('Supabase Database Helper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('saveNote', () => {
        test('should insert note successfully with JWT token', async () => {
            const mockNote = { id: 'note-123', user_id: 'uid' };
            mockInsert.mockReturnThis();
            mockSelect.mockResolvedValue({
                data: [mockNote],
                error: null,
            });

            const res = await saveNote(
                'uid',
                'original',
                'ai_res',
                'groq',
                'default',
                'Bearer token'
            );

            expect(createClient).toHaveBeenCalled();
            expect(mockClient.from).toHaveBeenCalledWith('notes');
            expect(mockInsert).toHaveBeenCalledWith([
                {
                    user_id: 'uid',
                    original_text: 'original',
                    ai_result: 'ai_res',
                    provider: 'groq',
                    mode: 'default',
                },
            ]);
            expect(res).toEqual(mockNote);
        });

        test('should return null and log console error on insertion failure', async () => {
            mockInsert.mockReturnThis();
            mockSelect.mockResolvedValue({
                data: null,
                error: { message: 'RLS policy violation' },
            });

            const res = await saveNote(
                'uid',
                'original',
                'ai_res',
                'groq',
                'default',
                'Bearer token'
            );
            expect(res).toBeNull();
        });
    });

    describe('getUserNotes', () => {
        test('should query user notes successfully', async () => {
            const mockNotes = [{ id: '1' }, { id: '2' }];
            mockSelect.mockReturnThis();
            mockEq.mockReturnThis();
            mockOrder.mockReturnThis();
            mockLimit.mockResolvedValue({
                data: mockNotes,
                error: null,
            });

            const res = await getUserNotes('uid', 'Bearer token', 5);

            expect(mockClient.from).toHaveBeenCalledWith('notes');
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockEq).toHaveBeenCalledWith('user_id', 'uid');
            expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
            expect(mockLimit).toHaveBeenCalledWith(5);
            expect(res).toEqual(mockNotes);
        });

        test('should return empty array and log error on query failure', async () => {
            mockSelect.mockReturnThis();
            mockEq.mockReturnThis();
            mockOrder.mockReturnThis();
            mockLimit.mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' },
            });

            const res = await getUserNotes('uid', 'Bearer token', 5);
            expect(res).toEqual([]);
        });
    });
});
