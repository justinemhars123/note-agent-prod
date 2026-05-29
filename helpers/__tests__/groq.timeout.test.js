const { callGroq } = require('../groq');

global.fetch = jest.fn();

describe('callGroq timeout', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    test('throws friendly timeout error on AbortError', async () => {
        fetch.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        await expect(callGroq({ messages: [] }, 'gsk_test')).rejects.toThrow(
            'AI request timed out after 30 seconds. Please try with shorter notes.'
        );
    });
});
