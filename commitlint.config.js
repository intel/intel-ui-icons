module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'body-max-line-length': [
            process.env.RELEASE_PROCESS === 'true' ? 0 : 2, // Disable during release
            'always',
            120
        ],
        'footer-max-line-length': [2, 'always', 120],
        'header-max-length': [2, 'always', 72]
    }
}
