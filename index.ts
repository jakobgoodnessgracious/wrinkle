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
import util, { InspectOptions } from 'util';

type SafeDefaultValue = boolean | string | number | object;;

type SafeOptionConfig = {
  [key: string]: {
    type: string;
    oneOf?: string[];
    toLowerCase?: boolean;
    defaultValue?: SafeDefaultValue;
    endsWith?: string;
    utilInspectConfig?: InspectOptions;
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
  utilInspectConfig: { type: 'object' },
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
  #utilInspectConfig: InspectOptions;

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
    this.#utilInspectConfig = this.#safelySet('utilInspectConfig', opts, {
      depth: 2,         // match console.log default
      colors: true,
      compact: true,    // use single line if short enough
      breakLength: 60,  // max length before wrapping
      maxArrayLength: null
    });

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

    const optsValue = opts?.[key];

    // No user value? Return default
    if (optsValue === undefined || optsValue === null) {
      return defaultValue;
    }

    let cleanedValue;

    if (type === 'string') {
      if (typeof optsValue !== 'string') {
        this.#writeAndExit(
          `Error: WrinkleOption: '${key}', Value: '${optsValue}' must be of type string. Exiting...`
        );
      }
      let val = optsValue.trim();
      if (toLowerCase) val = val.toLowerCase();
      if (endsWith) val = val.endsWith('/') ? val : val + '/';
      if (oneOf.length && !oneOf.includes(val)) {
        this.#writeAndExit(
          `Error: WrinkleOption: '${key}', Value: '${optsValue}' must be one of: '${oneOf.join(
            ', '
          )}'. Exiting...`
        );
      }
      cleanedValue = val;
    } else if (type === 'number' || type === 'boolean') {
      if (typeof optsValue !== type) {
        this.#writeAndExit(
          `Error: WrinkleOption: '${key}', Value: '${optsValue}' must be of type ${type}. Exiting...`
        );
      }
      cleanedValue = optsValue;
    } else if (type === 'object') {
      if (typeof optsValue !== 'object' || Array.isArray(optsValue)) {
        this.#writeAndExit(
          `Error: WrinkleOption: '${key}', Value must be an object. Exiting...`
        );
      }
      // Merge user object with default
      cleanedValue = { ...(defaultValue as object), ...optsValue };
    } else {
      // unsupported type
      this.#writeAndExit(
        `Error: WrinkleOption: '${key}' has unsupported type '${type}'. Exiting...`
      );
    }

    return cleanedValue;
  }


  #setLastWroteFileName() {
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
      // Get actual file size instead of relying on incremental tracking
      this.#rolloverSize = this.#getFilesizeInBytes(this.#lastWroteFileName);

      // Parse and restore version number from existing file
      // Example: "01-09-2025.2.log" -> extract version 2, set #sizeVersion to 3 (next version)
      if (this.#maxLogFileSizeBytes) {
        const versionMatch = topVersioned.match(/\.(\d+)\.log$/);
        if (versionMatch) {
          const currentVersion = parseInt(versionMatch[1], 10);
          this.#sizeVersion = currentVersion + 1;
        }
      }
    }
  }

  #inspectDual(obj: any) {
    // console version with colors
    const colorOutput = util.inspect(obj, this.#utilInspectConfig);

    // file version: strip ANSI codes from colorOutput
    const rawOutput = colorOutput.replace(/\u001b\[[0-9;]*m/g, '');

    return { color: colorOutput, raw: rawOutput };
  }

  #formatLogPrefix(logLevel: string) {
    return `${format(Date.now(), this.#logDateTimeFormat)} ${logLevel}:`;
  }

  #formatLog(prefix: string, args: any[]) {
    const consoleParts: string[] = [];
    const fileParts: string[] = [];

    for (const arg of args) {
      if (typeof arg === 'string') {
        consoleParts.push(arg);
        fileParts.push(arg);
      } else {
        const { color, raw } = this.#inspectDual(arg);
        consoleParts.push(color);
        fileParts.push(raw);
      }
    }

    const consoleOutput = prefix + ' ' + consoleParts.join(' ') + '\n';
    const rawOutput = prefix + ' ' + fileParts.join(' ') + '\n';

    return { color: consoleOutput, raw: rawOutput };
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
        `logDir: '${this.#logDir
        }' is not a safe path. Set option 'unsafeMode: true' to ignore this check. Exiting...`
      );
      return;
    }

    if (!existsSync(this.#logDir)) {
      try {
        mkdirSync(this.#logDir);
      } catch (err) {
        this.#writeAndExit(
          `Encountered an error while attempting to create directory: '${this.#logDir
          }'. Exiting...`
        );
      }
    }
  }

  #getFilesizeInBytes(filename: string) {
    if (!existsSync(filename)) return 0;
    try {
      const stats = statSync(filename);
      // Convert BigInt to Number to avoid type mixing issues
      const fileSizeInBytes = Number(stats.size);
      return fileSizeInBytes;
    } catch (e) {
      return 0;
    }
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

  #handleLog(level: string, ...args: any[]) {
    if (process.exitCode) return;
    if (!this.#guardLevel(level)) return;

    const prefix = this.#formatLogPrefix(level);
    const { color, raw } = this.#formatLog(prefix, args);

    // dont use stderr for error level, since the stderr stream write time may be out of sync with stdout
    process.stdout.write(color);

    if (this.#toFile) {
      this.#writeToFile(raw);
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

  debug(...args: any[]) {
    this.#handleLog('debug', ...args);
  }

  info(...args: any[]) {
    this.#handleLog('info', ...args);
  }

  warn(...args: any[]) {
    this.#handleLog('warn', ...args);
  }

  error(...args: any[]) {
    this.#handleLog('error', ...args);
  }
}
export type { WrinkleOptions };
export default Wrinkle;
