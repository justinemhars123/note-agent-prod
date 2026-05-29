const { optionalAuth } = require('../authMiddleware');
const supabaseModule = require('../supabase');

// Mock supabase client auth
jest.mock('../supabase', () => ({
    supabase: {
        auth: {
            getUser: jest.fn(),
        },
    },
}));

describe('optionalAuth Middleware', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = {
            headers: {},
        };
        res = {};
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('should proceed to next() if no authorization header is provided', async () => {
        await optionalAuth(req, res, next);

        expect(req.user).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('should proceed to next() if authorization header is not Bearer token', async () => {
        req.headers.authorization = 'Basic dXNlcjpwYXNz';

        await optionalAuth(req, res, next);

        expect(req.user).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('should set req.user and call next() on successful Supabase verification', async () => {
        const mockUser = { id: 'uuid-1234', email: 'test@example.com' };
        req.headers.authorization = 'Bearer valid-jwt-token';

        supabaseModule.supabase.auth.getUser.mockResolvedValue({
            data: { user: mockUser },
            error: null,
        });

        await optionalAuth(req, res, next);

        expect(supabaseModule.supabase.auth.getUser).toHaveBeenCalledWith('valid-jwt-token');
        expect(req.user).toBe(mockUser);
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('should proceed to next() without req.user if Supabase auth verification fails', async () => {
        req.headers.authorization = 'Bearer invalid-jwt-token';

        supabaseModule.supabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error('Invalid token'),
        });

        await optionalAuth(req, res, next);

        expect(req.user).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('should proceed to next() without req.user if Supabase throws an exception', async () => {
        req.headers.authorization = 'Bearer buggy-jwt-token';

        supabaseModule.supabase.auth.getUser.mockRejectedValue(new Error('Network failure'));

        await optionalAuth(req, res, next);

        expect(req.user).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
    });
});
