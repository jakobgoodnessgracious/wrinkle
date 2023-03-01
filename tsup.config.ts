import type { Options } from 'tsup';

const config: Options = {
  footer: {
    js: 'module.exports = module.exports.default;',
  },
};

export default config;
