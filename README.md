# wrinkle
Simple console and file logging utility.

## Install
```js
npm install wrinkle --save
// or with yarn
yarn add wrinkle
```

## Usage
```js
const Wrinkle = require('wrinkle');

const logger = new Wrinkle({ toFile: true, logLevel: 'debug' });

logger.debug('Hello world');
```

## Configuration
| Name          | Default                     |  Description    |
| ------------- | --------------------------- | --------------- |
| `logLevel`       | `production: 'error', development: 'debug'` | Logs this level and 'up.' |
| `toFile` | `boolean` | Whether or not to write logs to a file. |
| `logDir`      | `./logs` | Log directory location. |
| `fileDateFormat`  | `LL-dd-yyyy` | Uses date-fns format. |
| `logDateFormat` | `LL-dd-yyyy H:m:ss.SS` | Uses date-fns format. |
