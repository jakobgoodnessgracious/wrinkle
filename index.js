var fs = require('fs');
const { format, parse, differenceInSeconds,
    differenceInMonths, differenceInMinutes,
    differenceInHours, differenceInDays,
    differenceInWeeks } = require('date-fns');

class Wrinkle {
    constructor(opts) {
        const { toFile, extension, logDir, maxLogFileAge, logLevel, fileDateTimeFormat,
            logDateTimeFormat, maxLogFileSizeBytes, unsafeMode } = opts || {};
        this._toFile = !!toFile;
        this._logDir = this._setLogDir(logDir);
        this._fileDateTimeFormat = fileDateTimeFormat || 'LL-dd-yyyy';
        this._logDateTimeFormat = logDateTimeFormat || 'LL-dd-yyyy HH:mm:ss.SS';
        this._level = logLevel || (process.env.NODE_ENV === 'production' ? 'error' : 'debug'); // test will be debug as well
        this._maxLogFileSizeBytes = maxLogFileSizeBytes || null;
        this._unsafeMode = !!unsafeMode;
        this._extension = extension || '.log';
        this._maxLogFileAge = maxLogFileAge && typeof maxLogFileAge === 'string' ? maxLogFileAge.trim().toLowerCase() : null;
        // set allowed log func levels
        this._allowedLogFuncLevels = ['debug', 'info', 'warn', 'error'].reduce((accumulator, currentValue, index, array) => {
            if (array.indexOf(this._level) <= index) {
                accumulator.push(currentValue);
            }
            return accumulator;
        }, []);
        this._lastLogFileName = '';
        this._sizeVersion = 1;
        this._rolloverSize = 0;

        this._logFileStream = null;

        if (this._toFile) {
            this._setLastWroteFileName();
            // create the log directory up front. I'd rather fail creating this immediately, 
            // than farther into application runtime
            this._makeLogDir();
            this._cleanOutOfDateLogFiles();
        }
    }

    _setLogDir(logDir) {
        if (logDir) {
            return logDir.endsWith('/') ? logDir : logDir + '/';
        }
        return './logs/';
    }

    _setLastWroteFileName() {
        // TODO simplify
        let topVersioned = '';
        try {
            [topVersioned] = fs.readdirSync(this._logDir).sort().reverse();
        } catch (e) {
            // handle
        }
        this._lastWroteFileName = topVersioned ? `${this._logDir}${topVersioned}` : '';
        if (this._lastWroteFileName) {
            this._rolloverSize = this._getFilesizeInBytes(this._lastWroteFileName);
        }
    }

    _formatLog(logLevel) {
        return `${format(Date.now(), this._logDateTimeFormat)} ${logLevel}:`;
    }

    _getCurrentLogPath = () => {
        return `${this._logDir}${format(Date.now(), this._fileDateTimeFormat)}`;
    }

    _guardLevel(logFuncLevel) {
        return this._allowedLogFuncLevels.includes(logFuncLevel);
    }

    _cleanOutOfDateLogFiles() {
        if (!this._maxLogFileAge || !this._toFile) return;
        const [numberOf, timeType] = this._maxLogFileAge.split(':');
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
        const currentLogFileName = this._getCurrentLogPath().split(this._logDir)[1];
        const recentOrderedLogFiles = fs.readdirSync(this._logDir).sort().reverse();
        const currentLogfileDate = parse(currentLogFileName, this._fileDateTimeFormat, new Date());
        for (const fileName of recentOrderedLogFiles) {
            const subStringedFileName = fileName.substring(0, fileName.length - this._extension.length - (this._maxLogFileSizeBytes ? ('.' + this._sizeVersion).length : 0));
            const fileNameDate = parse(subStringedFileName, this._fileDateTimeFormat, new Date());
            const difference = differenceFunc(currentLogfileDate, fileNameDate);
            if (difference >= numberOf) {
                try {
                    fs.rmSync(this._logDir + fileName);
                } catch (e) {
                    // error
                    this._writeError(`Could not remove out of date log file: ${fileName}`);
                }
            }
        }
    }

    _writeError(text) {
        // TODO write the error (text, error)...
        process.stderr.write(`${format(Date.now(), this._logDateTimeFormat)} [wrinkle]: ${text}\n`);
    }

    _makeLogDir() {
        if (!this._unsafeMode && (this._logDir.startsWith('/') || this._logDir.includes('..'))) {
            this._writeError(`[wrinkle] LOG_DIR=${this._logDir} is not a safe path. Exiting...`);
            process.exitCode = 1;
            return;
        }

        if (!fs.existsSync(this._logDir)) {
            try {
                fs.mkdirSync(this._logDir);
            } catch (err) {
                this._writeError(`[wrinkle] Encountered an error while attempting to create directory: '${this._logDir}'`);
                process.exitCode = 1;
            }
        }
    }

    _getFilesizeInBytes(filename) {
        if (!fs.existsSync(filename)) return 0;
        const stats = fs.statSync(filename);
        const fileSizeInBytes = stats.size;
        return fileSizeInBytes;
    }

    _writeToFile(text) {
        let currentLogFileName = this._getCurrentLogPath();

        if (this._maxLogFileSizeBytes) {
            // current date + .log
            if (!fs.existsSync(currentLogFileName + '.0' + this._extension)) {
                currentLogFileName += '.0';
                this._sizeVersion = 1;
                this._rolloverSize = 0;
            } else {
                // TODO simplify how the logic for setting this works the || 
                const textSizeBytes = Buffer.byteLength(text, 'utf8');
                this._rolloverSize += textSizeBytes;
                if ((this._rolloverSize && (this._rolloverSize + textSizeBytes > this._maxLogFileSizeBytes))) {
                    this._rolloverSize = 0;
                    currentLogFileName = currentLogFileName + '.' + this._sizeVersion;
                    this._sizeVersion += 1;
                } else {
                    // TODO double check the || statement makes sense
                    [currentLogFileName] = (this._lastLogFileName || this._lastWroteFileName).split(this._extension);
                }
            }

        }
        currentLogFileName += this._extension;
        // new file being made
        if (this._lastLogFileName !== currentLogFileName) {
            if (this._logFileStream) {
                this._logFileStream.end();
            }
            if (!fs.existsSync(currentLogFileName)) fs.writeFileSync(currentLogFileName, '');
            this._logFileStream = fs.createWriteStream(currentLogFileName, { flags: 'a' });
            this._lastLogFileName = currentLogFileName;
            this._cleanOutOfDateLogFiles();
            // lazy create stream
        } else if (!this._logFileStream) {
            if (!fs.existsSync(currentLogFileName)) fs.writeFileSync(currentLogFileName, '');
            this._logFileStream = fs.createWriteStream(currentLogFileName, { flags: 'a' });
        }

        this._logFileStream.write(text, () => {
            // in case out of sync
            this._lastWroteFileName = this._logFileStream.path;
        });

    }

    _handleLog(level, ...textAsParams) {
        if (!this._guardLevel(level)) return;

        const toWrite = `${this._formatLog(level)} ${textAsParams.join(' ')}\n`;

        // dont use stderr for error level, since the stderr stream write time may be out of sync with stdout
        process.stdout.write(toWrite);

        if (this._toFile) {
            this._writeToFile(toWrite);
        }
    }

    create() {
        this._logFileStream = fs.createWriteStream(this._lastLogFileName || this._lastWroteFileName || this._getCurrentLogPath() + this._extension, { flags: 'a' });
    }

    destroy() {
        this._logFileStream.destroy();
    }

    end() {
        this._logFileStream.end();
    }

    debug(...textAsParams) {
        this._handleLog('debug', ...textAsParams);
    }

    info(...textAsParams) {
        this._handleLog('info', ...textAsParams);
    }

    warn(...textAsParams) {
        this._handleLog('warn', ...textAsParams);
    }

    error(...textAsParams) {
        this._handleLog('error', ...textAsParams);
    }
}

module.exports = Wrinkle;
