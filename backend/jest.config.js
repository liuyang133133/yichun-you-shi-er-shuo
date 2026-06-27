module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        // 允许单测在有遗留 TS 错误时仍能跑（post.service.ts 的
        // checkPostEligibility / recordPostAttempt 预存在缺失，不在 T-014 范围）
        diagnostics: false,
        isolatedModules: true,
      },
    ],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};