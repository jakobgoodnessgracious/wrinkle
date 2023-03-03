import {
  createWriteStream,
  writeFileSync,
  rmSync,
  mkdirSync,
  readdirSync,
  existsSync,
  statSync,
  WriteStream,
} from 'fs';
import {
  format,
  parse,
  differenceInSeconds,
  differenceInMonths,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
} from 'date-fns';
import { WrinkleOptions } from './types';

type SafeDefaultValue = boolean | string | number;

type SafeOptionConfig = {
  [key: string]: {
    type: string;
    oneOf?: string[];
    toLowerCase?: boolean;
    defaultValue?: SafeDefaultValue;
    endsWith?: string;
  };
};
const safeOptionsConfig: SafeOptionConfig = {
  toFile: { type: 'boolean', defaultValue: false },
  extension: { type: 'string', defaultValue: '.log' },
  logDir: { type: 'string', defaultValue: './logs/', endsWith: '/' },
  // TODO must end with :minute/s, :second/s, etc or error
  maxLogFileAge: { type: 'string', toLowerCase: true },
  logLevel: { type: 'string', oneOf: ['debug', 'info', 'warn', 'error'] },
  fileDateTimeFormat: { type: 'string', defaultValue: 'LL-dd-yyyy' },
  logDateTimeFormat: { type: 'string', defaultValue: 'LL-dd-yyyy HH:mm:ss.SS' },
  maxLogFileSizeBytes: { type: 'number', defaultValue: 0 },
  unsafeMode: { type: 'boolean', defaultValue: false },
};

// TODO CLEAN
// TODO SafelySet object props
class Wrinkle {
  #toFile: boolean;
  #logDir: string;
  #fileDateTimeFormat: string;
  #logDateTimeFormat: string;
  #level: 'debug' | 'info' | 'warn' | 'error';
  #maxLogFileSizeBytes: number;
  #unsafeMode: boolean;
  #extension: string;
  #maxLogFileAge: string;
  #allowedLogFuncLevels: string[];
  #lastLogFileName = '';
  #sizeVersion = 1;
  #rolloverSize = 0;
  #logFileStream: WriteStream | null = null;
  #lastWroteFileName = '';

  constructor(opts?: WrinkleOptions) {
    this.#toFile = this.#safelySet('toFile', opts);
    this.#logDir = this.#safelySet('logDir', opts);
    this.#fileDateTimeFormat = this.#safelySet('fileDateTimeFormat', opts);
    this.#logDateTimeFormat = this.#safelySet('logDateTimeFormat', opts);
    (this.#level = this.#safelySet(
      'logLevel',
      opts,
      process.env.NODE_ENV === 'production' ? 'error' : 'debug'
    )), // test will be debug as well);
      (this.#maxLogFileSizeBytes = this.#safelySet(
        'maxLogFileSizeBytes',
        opts
      ));
    this.#unsafeMode = this.#safelySet('unsafeMode', opts);
    this.#extension = this.#safelySet('extension', opts);
    this.#maxLogFileAge = this.#safelySet('maxLogFileAge', opts);

    // set allowed log func levels
    this.#allowedLogFuncLevels = ['debug', 'info', 'warn', 'error'].reduce(
      (
        accumulator: string[],
        currentValue: string,
        index: number,
        array: string[]
      ) => {
        if (array.indexOf(this.#level) <= index) {
          accumulator.push(currentValue);
        }
        return accumulator;
      },
      []
    );

    if (this.#toFile) {
      // create the log directory up front. I'd rather fail creating this immediately,
      // than further into application runtime
      this.#makeLogDir();
      this.#cleanOutOfDateLogFiles();
      this.#setLastWroteFileName();
    }
  }

  #safelySet(
    key: string,
    opts?: WrinkleOptions,
    dynamicDefault?: SafeDefaultValue
  ) {
    const {
      type,
      oneOf = [],
      toLowerCase = false,
      defaultValue = dynamicDefault,
      endsWith,
    } = safeOptionsConfig[key];
    if (!opts) return defaultValue;
    const optsValue = opts[key];
    if (!optsValue) return defaultValue;
    let cleanedValue;
    if (type === 'string') {
      if (typeof optsValue === type) {
        let malleableValue = optsValue.trim();
        if (toLowerCase) {
          malleableValue = malleableValue.toLowerCase();
        }
        if (endsWith) {
          malleableValue = malleableValue.endsWith('/')
            ? malleableValue
            : `${malleableValue}/`;
        }
        if (oneOf.length) {
          if (!oneOf.includes(malleableValue)) {
            this.#writeAndExit(
              `Error: WrinkleOption: '${key}', Value: '${optsValue}' must be one of: '${oneOf.toString()}'. Exiting . . .`
            );
          }
        }

        cleanedValue = malleableValue;
      } else {
        this.#writeAndExit(
          `Error: WrinkleOption: '${key}', Value: '${optsValue}' must be of type: '${type}'. Exiting . . .`
        );
      }
    } else {
      if (typeof optsValue === type) {
        cleanedValue = optsValue;
      } else {
        this.#writeAndExit(
          `Error: WrinkleOption: '${key}', Value: '${optsValue}' must be of type: '${type}'. Exiting . . .`
        );
      }
    }

    return !cleanedValue && defaultValue !== undefined
      ? defaultValue
      : cleanedValue;
  }

  #setLastWroteFileName() {
    // TODO simplify
    let topVersioned = '';
    try {
      [topVersioned] = readdirSync(this.#logDir)
        .map((v) => ({
          name: v,
          time: statSync(this.#logDir + v).mtime.getTime(),
        }))
        .sort()
        .reverse() // get an order off names first (in case mtime exact same)
        .sort((a, b) => b.time - a.time)
        .map((v) => v.name);
    } catch (e) {
      // handle
    }
    this.#lastWroteFileName = topVersioned
      ? `${this.#logDir}${topVersioned}`
      : '';
    if (this.#lastWroteFileName) {
      this.#rolloverSize = this.#getFilesizeInBytes(this.#lastWroteFileName);
    }
  }

  #formatLog(logLevel: string) {
    return `${format(Date.now(), this.#logDateTimeFormat)} ${logLevel}:`;
  }

  #getCurrentLogPath = () => {
    return `${this.#logDir}${format(Date.now(), this.#fileDateTimeFormat)}`;
  };

  #guardLevel(logFuncLevel: string) {
    return this.#allowedLogFuncLevels.includes(logFuncLevel);
  }

  #isValidDate(d: Date) {
    return d instanceof Date && !isNaN(+d);
  }

  #cleanOutOfDateLogFiles() {
    if (!this.#maxLogFileAge || !this.#toFile) return;
    const [numberOfString, timeType] = this.#maxLogFileAge.split(':');
    const numberOf = parseInt(numberOfString, 10);
    let differenceFunc;
    if (timeType.includes('month')) {
      differenceFunc = differenceInMonths;
    } else if (timeType.includes('week')) {
      differenceFunc = differenceInWeeks;
    } else if (timeType.includes('day')) {
      differenceFunc = differenceInDays;
    } else if (timeType.includes('hour')) {
      differenceFunc = differenceInHours;
    } else if (timeType.includes('minute')) {
      differenceFunc = differenceInMinutes;
    } else if (timeType.includes('second')) {
      differenceFunc = differenceInSeconds;
    } else {
      // handle
      return;
    }
    const currentLogFileName = this.#getCurrentLogPath().split(this.#logDir)[1];
    const recentOrderedLogFiles = readdirSync(this.#logDir).sort().reverse();
    const currentLogfileDate = parse(
      currentLogFileName,
      this.#fileDateTimeFormat,
      new Date()
    );
    for (const fileName of recentOrderedLogFiles) {
      const fileNameDate = this.#parseFileNameDate(fileName);

      const difference = differenceFunc(currentLogfileDate, fileNameDate);
      if (difference >= numberOf) {
        try {
          rmSync(this.#logDir + fileName);
        } catch (e) {
          // error
          this.#writeError(
            `Could not remove out of date log file: ${fileName}`
          );
        }
      }
    }
  }

  #parseFileNameDate(fileName: string) {
    let subStringedFileName = fileName.substring(
      0,
      fileName.length -
        this.#extension.length -
        (this.#maxLogFileSizeBytes ? ('.' + this.#sizeVersion).length : 0)
    );
    let fileNameDate = parse(
      subStringedFileName,
      this.#fileDateTimeFormat,
      new Date()
    );

    // try default format, otherwise we don't know the previous format used, so be safe and don't remove
    if (!this.#isValidDate(fileNameDate)) {
      subStringedFileName = fileName.substring(
        0,
        fileName.length - this.#extension.length
      );
      fileNameDate = parse(subStringedFileName, 'LL-dd-yyyy', new Date());
    }

    return fileNameDate;
  }

  #writeError(text: string, exit?: boolean) {
    process.stderr.write(
      `${format(Date.now(), this.#logDateTimeFormat)} [wrinkle]: ${text}\n`,
      () => {
        if (exit) process.exit(1);
      }
    );
  }

  #writeAndExit(errorText: string) {
    process.exitCode = 1;
    this.#writeError(errorText, true);
  }

  #makeLogDir() {
    if (
      !this.#unsafeMode &&
      (this.#logDir.startsWith('/') || this.#logDir.includes('..'))
    ) {
      this.#writeAndExit(
        `logDir: '${
          this.#logDir
        }' is not a safe path. Set option 'unsafeMode: true' to ignore this check. Exiting...`
      );
      return;
    }

    if (!existsSync(this.#logDir)) {
      try {
        mkdirSync(this.#logDir);
      } catch (err) {
        this.#writeAndExit(
          `Encountered an error while attempting to create directory: '${
            this.#logDir
          }'. Exiting...`
        );
      }
    }
  }

  #getFilesizeInBytes(filename: string) {
    if (!existsSync(filename)) return 0;
    const stats = statSync(filename);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
  }

  #writeToFile(text: string) {
    let currentLogFileName = this.#getCurrentLogPath();

    if (this.#maxLogFileSizeBytes) {
      // current date + .log
      if (!existsSync(currentLogFileName + '.0' + this.#extension)) {
        currentLogFileName += '.0';
        this.#sizeVersion = 1;
        this.#rolloverSize = 0;
      } else {
        // TODO simplify how the logic for setting this works the ||
        const textSizeBytes = Buffer.byteLength(text, 'utf8');
        this.#rolloverSize += textSizeBytes;
        if (
          this.#rolloverSize &&
          this.#rolloverSize + textSizeBytes > this.#maxLogFileSizeBytes
        ) {
          this.#rolloverSize = 0;
          currentLogFileName = currentLogFileName + '.' + this.#sizeVersion;
          this.#sizeVersion += 1;
        } else {
          // TODO double check the || statement makes sense
          [currentLogFileName] = (
            this.#lastLogFileName || this.#lastWroteFileName
          ).split(this.#extension);
        }
      }
    }
    currentLogFileName += this.#extension;
    // new file being made
    if (this.#lastLogFileName !== currentLogFileName) {
      if (this.#logFileStream) {
        this.#logFileStream.end();
      }
      if (!existsSync(currentLogFileName))
        writeFileSync(currentLogFileName, '');
      this.#logFileStream = createWriteStream(currentLogFileName, {
        flags: 'a',
      });
      this.#lastLogFileName = currentLogFileName;
      this.#cleanOutOfDateLogFiles();
    }

    if (this.#logFileStream) {
      this.#logFileStream.write(text, () => {
        // in case out of sync
        if (this.#logFileStream)
          this.#lastWroteFileName = this.#logFileStream.path as string;
      });
    }
  }

  #handleLog(level: string, ...textAsParams: string[]) {
    if (process.exitCode) return;
    if (!this.#guardLevel(level)) return;

    const toWrite = `${this.#formatLog(level)} ${textAsParams.join(' ')}\n`;

    // dont use stderr for error level, since the stderr stream write time may be out of sync with stdout
    process.stdout.write(toWrite);

    if (this.#toFile) {
      this.#writeToFile(toWrite);
    }
  }

  create() {
    this.#logFileStream = createWriteStream(
      this.#lastLogFileName ||
        this.#lastWroteFileName ||
        this.#getCurrentLogPath() + this.#extension,
      { flags: 'a' }
    );
  }

  destroy() {
    if (this.#logFileStream) this.#logFileStream.destroy();
  }

  end() {
    if (this.#logFileStream) this.#logFileStream.end();
  }

  debug(...textAsParams: string[]) {
    this.#handleLog('debug', ...textAsParams);
  }

  info(...textAsParams: string[]) {
    this.#handleLog('info', ...textAsParams);
  }

  warn(...textAsParams: string[]) {
    this.#handleLog('warn', ...textAsParams);
  }

  error(...textAsParams: string[]) {
    this.#handleLog('error', ...textAsParams);
  }
}
export type { WrinkleOptions };
export default Wrinkle;
