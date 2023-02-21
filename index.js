var fs = require('fs');
const { format, parse, differenceInSeconds,
    differenceInMonths, differenceInMinutes,
    differenceInHours, differenceInDays,
    differenceInWeeks } = require('date-fns');

// TODO CLEAN
// TODO SafelySet object props
class Wrinkle {
    #toFile;
    #logDir;
    #fileDateTimeFormat;
    #logDateTimeFormat;
    #level;
    #maxLogFileSizeBytes;
    #unsafeMode;
    #extension;
    #maxLogFileAge;
    #allowedLogFuncLevels;
    #lastLogFileName;
    #sizeVersion;
    #rolloverSize;
    #logFileStream;
    #lastWroteFileName;
    constructor(opts) {
        const { toFile, extension, logDir, maxLogFileAge, logLevel, fileDateTimeFormat,
            logDateTimeFormat, maxLogFileSizeBytes, unsafeMode } = opts || {};
        this.#toFile = !!toFile;
        this.#logDir = this.#setLogDir(logDir);
        this.#fileDateTimeFormat = fileDateTimeFormat || 'LL-dd-yyyy';
        this.#logDateTimeFormat = logDateTimeFormat || 'LL-dd-yyyy HH:mm:ss.SS';
        this.#level = logLevel || (process.env.NODE_ENV === 'production' ? 'error' : 'debug'); // test will be debug as well
        this.#maxLogFileSizeBytes = maxLogFileSizeBytes || null;
        this.#unsafeMode = !!unsafeMode;
        this.#extension = extension || '.log';
        this.#maxLogFileAge = maxLogFileAge && typeof maxLogFileAge === 'string' ? maxLogFileAge.trim().toLowerCase() : null;
        // set allowed log func levels
        this.#allowedLogFuncLevels = ['debug', 'info', 'warn', 'error'].reduce((accumulator, currentValue, index, array) => {
            if (array.indexOf(this.#level) <= index) {
                accumulator.push(currentValue);
            }
            return accumulator;
        }, []);
        this.#lastLogFileName = '';
        this.#sizeVersion = 1;
        this.#rolloverSize = 0;

        this.#logFileStream = null;

        if (this.#toFile) {
            this.#setLastWroteFileName();
            // create the log directory up front. I'd rather fail creating this immediately, 
            // than further into application runtime
            this.#makeLogDir();
            this.#cleanOutOfDateLogFiles();
        }
    }

    #setLogDir(logDir) {
        if (logDir) {
            return logDir.endsWith('/') ? logDir : logDir + '/';
        }
        return './logs/';
    }

    #setLastWroteFileName() {
        // TODO simplify
        let topVersioned = '';
        try {
            [topVersioned] = fs.readdirSync(this.#logDir).sort().reverse();
        } catch (e) {
            // handle
        }
        this.#lastWroteFileName = topVersioned ? `${this.#logDir}${topVersioned}` : '';
        if (this.#lastWroteFileName) {
            this.#rolloverSize = this.#getFilesizeInBytes(this.#lastWroteFileName);
        }
    }

    #formatLog(logLevel) {
        return `${format(Date.now(), this.#logDateTimeFormat)} ${logLevel}:`;
    }

    #getCurrentLogPath = () => {
        return `${this.#logDir}${format(Date.now(), this.#fileDateTimeFormat)}`;
    }

    #guardLevel(logFuncLevel) {
        return this.#allowedLogFuncLevels.includes(logFuncLevel);
    }

    #isValidDate(d) {
        return d instanceof Date && !isNaN(d);
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
        const recentOrderedLogFiles = fs.readdirSync(this.#logDir).sort().reverse();
        const currentLogfileDate = parse(currentLogFileName, this.#fileDateTimeFormat, new Date());
        for (const fileName of recentOrderedLogFiles) {
            const fileNameDate = this.#parseFileNameDate(fileName);

            const difference = differenceFunc(currentLogfileDate, fileNameDate);
            if (difference >= numberOf) {
                try {
                    fs.rmSync(this.#logDir + fileName);
                } catch (e) {
                    // error
                    this.#writeError(`Could not remove out of date log file: ${fileName}`);
                }
            }
        }
    }

    #parseFileNameDate(fileName) {
        let subStringedFileName = fileName.substring(0, fileName.length - this.#extension.length - (this.#maxLogFileSizeBytes ? ('.' + this.#sizeVersion).length : 0));
        let fileNameDate = parse(subStringedFileName, this.#fileDateTimeFormat, new Date());

        // try default format, otherwise we don't know the previous format used, so be safe and don't remove
        if (!this.#isValidDate(fileNameDate)) {
            subStringedFileName = fileName.substring(0, fileName.length - this.#extension.length);
            fileNameDate = parse(subStringedFileName, 'LL-dd-yyyy', new Date());
        }

        return fileNameDate;
    }

    #writeError(text) {
        // TODO write the error (text, error)...
        process.stderr.write(`${format(Date.now(), this.#logDateTimeFormat)} [wrinkle]: ${text}\n`);
    }

    #makeLogDir() {
        if (!this.#unsafeMode && (this.#logDir.startsWith('/') || this.#logDir.includes('..'))) {
            this.#writeError(`logDir: \'${this.#logDir}\' is not a safe path. Set option \'unsafeMode: true\' to ignore this check. Exiting...`);
            process.exitCode = 1;
            return;
        }

        if (!fs.existsSync(this.#logDir)) {
            try {
                fs.mkdirSync(this.#logDir);
            } catch (err) {
                this.#writeError(`Encountered an error while attempting to create directory: '${this.#logDir}'`);
                process.exitCode = 1;
            }
        }
    }

    #getFilesizeInBytes(filename) {
        if (!fs.existsSync(filename)) return 0;
        const stats = fs.statSync(filename);
        const fileSizeInBytes = stats.size;
        return fileSizeInBytes;
    }

    #writeToFile(text) {
        let currentLogFileName = this.#getCurrentLogPath();

        if (this.#maxLogFileSizeBytes) {
            // current date + .log
            if (!fs.existsSync(currentLogFileName + '.0' + this.#extension)) {
                currentLogFileName += '.0';
                this.#sizeVersion = 1;
                this.#rolloverSize = 0;
            } else {
                // TODO simplify how the logic for setting this works the || 
                const textSizeBytes = Buffer.byteLength(text, 'utf8');
                this.#rolloverSize += textSizeBytes;
                if ((this.#rolloverSize && (this.#rolloverSize + textSizeBytes > this.#maxLogFileSizeBytes))) {
                    this.#rolloverSize = 0;
                    currentLogFileName = currentLogFileName + '.' + this.#sizeVersion;
                    this.#sizeVersion += 1;
                } else {
                    // TODO double check the || statement makes sense
                    [currentLogFileName] = (this.#lastLogFileName || this.#lastWroteFileName).split(this.#extension);
                }
            }
        }
        currentLogFileName += this.#extension;
        // new file being made
        if (this.#lastLogFileName !== currentLogFileName) {
            if (this.#logFileStream) {
                this.#logFileStream.end();
            }
            if (!fs.existsSync(currentLogFileName)) fs.writeFileSync(currentLogFileName, '');
            this.#logFileStream = fs.createWriteStream(currentLogFileName, { flags: 'a' });
            this.#lastLogFileName = currentLogFileName;
            this.#cleanOutOfDateLogFiles();
        }

        this.#logFileStream.write(text, () => {
            // in case out of sync
            this.#lastWroteFileName = this.#logFileStream.path;
        });

    }

    #handleLog(level, ...textAsParams) {
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
        this.#logFileStream = fs.createWriteStream(this.#lastLogFileName || this.#lastWroteFileName || this.#getCurrentLogPath() + this.#extension, { flags: 'a' });
    }

    destroy() {
        if (this.#logFileStream) this.#logFileStream.destroy();
    }

    end() {
        this.#logFileStream.end();
    }

    debug(...textAsParams) {
        this.#handleLog('debug', ...textAsParams);
    }

    info(...textAsParams) {
        this.#handleLog('info', ...textAsParams);
    }

    warn(...textAsParams) {
        this.#handleLog('warn', ...textAsParams);
    }

    error(...textAsParams) {
        this.#handleLog('error', ...textAsParams);
    }
}

module.exports = Wrinkle;
