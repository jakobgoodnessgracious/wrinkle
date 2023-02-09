var fs = require('fs');
const { format } = require('date-fns');

class Wrinkle {
    constructor(opts) {
        const { toFile, logDir, logLevel, fileDateTimeFormat, logDateTimeFormat, maxLogFileSizeBytes, unsafeMode } = opts || {};
        this._toFile = !!toFile;
        this._logDir = this._setLogDir(logDir);
        this._fileDateTimeFormat = fileDateTimeFormat || 'LL-dd-yyyy';
        this._logDateTimeFormat = logDateTimeFormat || 'LL-dd-yyyy HH:mm:ss.SS';
        this._level = logLevel || (process.env.NODE_ENV === 'production' ? 'error' : 'debug'); // test will be debug as well
        this._maxLogFileSizeBytes = maxLogFileSizeBytes || null;
        this._unsafeMode = !!unsafeMode;
        // set allowed log func levels
        this._allowedLogFuncLevels = ['debug', 'info', 'warn', 'error'].reduce((accumulator, currentValue, index, array) => {
            if (array.indexOf(this._level) <= index) {
                accumulator.push(currentValue);
            }
            return accumulator;
        }, []);
        this._lastLogFileName = '';
        this._sizeVersion = 1;

        this._logFileStream = null;

        if (this._toFile) {
            this._setLastWroteFileName();
            // create the log directory up front. I'd rather fail creating this immediately, 
            // than farther into application runtime
            this._makeLogDir();
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

    _makeLogDir() {
        if (!this._unsafeMode && (this._logDir.startsWith('/') || this._logDir.includes('..'))) {
            process.stderr(`[wrinkle] LOG_DIR=${this._logDir} is not a safe path. Exiting...`);
            process.exitCode = 1;
            return;
        }

        if (!fs.existsSync(this._logDir)) {
            try {
                fs.mkdirSync(this._logDir);
            } catch (err) {
                process.stderr('[wrinkle] Encountered an error while attempting to create directory:', `'${this._logDir}'`);
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
            if (!fs.existsSync(currentLogFileName + '.0' + '.log')) {
                currentLogFileName += '.0';
                this._sizeVersion = 1;
            } else {
                // TODO simplify how the logic for setting this works the || 
                const fileSizeBytes = this._getFilesizeInBytes(this._lastWroteFileName || currentLogFileName + '.0' + '.log');
                const textSizeBytes = Buffer.byteLength(text, 'utf8');
                if (fileSizeBytes && (fileSizeBytes + textSizeBytes > this._maxLogFileSizeBytes)) {
                    currentLogFileName = currentLogFileName + '.' + this._sizeVersion;
                    this._sizeVersion += 1;
                } else {
                    [currentLogFileName] = this._lastWroteFileName.split('.log');
                }
            }

        }
        currentLogFileName += '.log';
        if (this._lastLogFileName !== currentLogFileName) {
            if (this._logFileStream) {
                this._logFileStream.end();
            }
            this._logFileStream = fs.createWriteStream(currentLogFileName, { flags: 'a' });
            this._lastLogFileName = currentLogFileName;
            // lazy create stream
        } else if (!this._logFileStream) {
            this._logFileStream = fs.createWriteStream(currentLogFileName, { flags: 'a' });
        }

        this._logFileStream.write(text, () => {
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
        if (this._logFileStream.writableEnded) {
            this._logFileStream = fs.createWriteStream(this._lastWroteFileName || this._getCurrentLogPath() + '.log', { flags: 'a' });
        }

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
