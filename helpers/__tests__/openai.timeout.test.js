const { callOpenAI } = require('../openai');

global.fetch = jest.fn();

describe('callOpenAI timeout', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    test('throws friendly timeout error on AbortError', async () => {
        fetch.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        await expect(callOpenAI({ messages: [] }, 'sk_test')).rejects.toThrow(
            'OpenAI request timed out. Please try again.'
        );
    });
});
