const { callOpenAI } = require('../openai');

global.fetch = jest.fn();

describe('callOpenAI', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    test('returns response on success', async () => {
        fetch.mockResolvedValue({ status: 200, headers: { get: () => null } });
        const res = await callOpenAI({ messages: [] }, 'sk_test');
        expect(res.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
