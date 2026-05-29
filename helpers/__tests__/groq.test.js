const { callGroq } = require('../groq');

global.fetch = jest.fn();

describe('callGroq', () => {
    beforeEach(() => {
        fetch.mockClear();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('returns response on success', async () => {
        fetch.mockResolvedValue({ status: 200, headers: { get: () => null } });
        const res = await callGroq({ messages: [] }, 'gsk_test');
        expect(res.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('retries once on 429 rate limit', async () => {
        fetch
            .mockResolvedValueOnce({ status: 429, headers: { get: () => '1' } })
            .mockResolvedValueOnce({ status: 200, headers: { get: () => null } });

        const promise = callGroq({ messages: [] }, 'gsk_test', 1);

        // Fast-forward the timeout
        await Promise.resolve();
        jest.advanceTimersByTime(1000);

        const res = await promise;
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(res.status).toBe(200);
    });

    test('does not retry if retries exhausted', async () => {
        fetch.mockResolvedValue({ status: 429, headers: { get: () => '1' } });
        const res = await callGroq({ messages: [] }, 'gsk_test', 0);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(res.status).toBe(429);
    });
});
