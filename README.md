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

logger.debug('Entered spinCogs().');
logger.info('All cogs started successfully.');
logger.warn('Something is burning, somewhere. . .');
logger.error('Boom.');
```

## Other Usage
```js
// ...

// will create the write stream, if the stream has ended.
logger.create();

// destroy the write stream
logger.destroy();

// end the write stream
logger.end();
```

## Configuration
| Name          | Default                     |  Description    |
| ------------- | --------------------------- | --------------- |
| `logLevel`       | `production: 'error', development: 'debug'` | Logs this level and 'up.' One of: 'debug', 'info', 'warn', 'error'. |
| `toFile` | `boolean` | Whether or not to write logs to a file. |
| `logDir`      | `./logs` | Log directory location. |
| `fileDateTimeFormat`  | `LL-dd-yyyy` _(daily)_ | Uses date-fns format(). |
| `logDateTimeFormat` | `LL-dd-yyyy HH:mm:ss.SS` _(02-03-2043 01:07:33.49)_ | Uses date-fns format(). |
| `maxLogFileSizeBytes` | No max size | Max log file size in bytes. e.g. 5000000 _(5mb)_ |
| `unsafeMode` | `boolean` | True if you would like to set a log directory location 'above' the current directory. |
