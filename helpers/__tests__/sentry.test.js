describe('helpers/sentry', () => {
    afterEach(() => {
        delete process.env.SENTRY_DSN;
        jest.resetModules();
    });

    test('initSentry returns false when no SENTRY_DSN', () => {
        jest.resetModules();
        const { initSentry } = require('../sentry');
        expect(initSentry()).toBe(false);
    });

    test('initSentry returns true when SENTRY_DSN is present', () => {
        process.env.SENTRY_DSN = 'https://example@sentry.io/1';
        jest.resetModules();
        const { initSentry } = require('../sentry');
        expect(initSentry()).toBe(true);
    });
});
