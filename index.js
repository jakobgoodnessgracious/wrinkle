var fs = require('fs');
const { format } = require('date-fns');

class Wrinkle {
    constructor(opts) {
        const { toFile, logDir, logLevel, fileDateTimeFormat, logDateTimeFormat, maxLogFileSizeBytes, unsafeMode } = opts || {};
        this._toFile = !!toFile || !!logDir;
        this._logDir = logDir || './logs';
        this._fileDateTimeFormat = fileDateTimeFormat || 'LL-dd-yyyy';
        this._logDateTimeFormat = logDateTimeFormat || 'LL-dd-yyyy HH:mm:ss.SS';
        this._level = logLevel || process.env.NODE_ENV === 'production' ? 'error' : 'debug';
        this._maxLogFileSizeBytes = maxLogFileSizeBytes || null;
        this._unsafeMode = !!unsafeMode;
        // set allowed log func levels
        this._allowedLogFuncLevels = ['debug', 'info', 'warn', 'error'].reduce((accumulator, currentValue, index, array) => {
            if (array.indexOf(this._level) >= index) {
                accumulator.push(currentValue);
            }
            return accumulator;
        }, []);
        this._lastLogFileName = '';
        this._sizeVersion = 1;
        // this._lastLogFileName = fs.existsSync(this._logDir) && fs.readdir(this._logDir).sort


        this._logFileStream = fs.createWriteStream(this._getCurrentLogPath() + '.log', { flags: 'a' });
        this._makeLogDir();
        this._setLastWroteFileName();
    }
    _setLastWroteFileName() {
        // tODO simplify
        const [nonSizeVersioned = '', sizeVersioned = ''] = fs.readdirSync(this._logDir).sort().reverse();
        console.log('nonSizeVersioned, sizeVersioned', nonSizeVersioned, sizeVersioned);
        const [nonSizeVersionedCleaned = ''] = nonSizeVersioned ? nonSizeVersioned.split('.log') : [];
        const [sizeVersionedCleaned = ''] = sizeVersioned ? sizeVersioned.split('.log') : [];
        console.log('sizeVersionedCleaned', sizeVersionedCleaned);
        console.log('nonSizeVersionedCleaned', nonSizeVersionedCleaned);
        if (sizeVersionedCleaned.includes(nonSizeVersionedCleaned)) {
            this._lastWroteFileName = sizeVersioned;
        } else {
            this._lastWroteFileName = nonSizeVersioned || '';
        }
        console.log('setting initial last file name to', this._lastWroteFileName);
    }

    _formatLog(logLevel) {
        return `${format(Date.now(), this._logDateTimeFormat)} ${logLevel}:`;
    }

    _getCurrentLogPath = () => {
        return `${this._logDir}/${format(Date.now(), this._fileDateTimeFormat)}`;
    }

    _guardLevel(logFuncLevel) {
        return this._allowedLogFuncLevels.includes(logFuncLevel);
    }

    _makeLogDir() {
        if (!this._unsafeMode && (this._logDir.startsWith('/') || this._logDir.includes('..'))) {
            this.error(`[wrinkle] LOG_DIR=${this._logDir} is not a safe path. Exiting...`);
            process.exitCode = 1;
            return;
        }

        if (!fs.existsSync(this._logDir)) {
            try {
                fs.mkdirSync(this._logDir);
                this.debug('[wrinkle] Created directory:', `'${this._logDir}'`, 'for logging.');
            } catch (err) {
                this.error('[wrinkle] Encountered an error while attempting to create directory:', `'${this._logDir}'`);
                process.exitCode = 1;
            }
        } else {
            this.debug('[wrinkle] Directory', `'${this._logDir}'`, 'already exists, not creating a new one.');
        }
    }

    _getFilesizeInBytes(filename) {
        var stats = fs.statSync(filename);
        var fileSizeInBytes = stats.size;
        return fileSizeInBytes;
    }


    _writeToFile(text) {
        let currentLogFileName = this._getCurrentLogPath();

        if (this._maxLogFileSizeBytes) {

            if (!fs.existsSync(currentLogFileName + '.log')) {
                this._sizeVersion = 1;
            } else {
                // todo simplify how the logic for setting this works the || 
                const fileSizeBytes = this._getFilesizeInBytes(this._lastWroteFileName || currentLogFileName + '.log');
                const textSizeBytes = Buffer.byteLength(text, 'utf8');
                if (fileSizeBytes + textSizeBytes > this._maxLogFileSizeBytes) {
                    currentLogFileName = currentLogFileName + '--' + this._sizeVersion;
                    this._sizeVersion += 1;
                } else {
                    [currentLogFileName] = this._lastWroteFileName.split('.log');
                }
            }

        }
        currentLogFileName += '.log';
        if (this._lastLogFileName !== currentLogFileName) {
            this._logFileStream.destroy();
            this._logFileStream = fs.createWriteStream(currentLogFileName, { flags: 'a' });
            this._lastLogFileName = currentLogFileName;
        }

        this._logFileStream.write(text, () => {
            // console.log('lastwrotefilename', this._logFileStream.path);
            this._lastWroteFileName = this._logFileStream.path;
        });

    }

    _handleLog(level, ...textAsParams) {
        if (!this._guardLevel(level)) return;

        const toWrite = `${this._formatLog(level)} ${textAsParams.join(' ')}\n`;

        process.stdout.write(toWrite);

        if (this._toFile) {
            this._writeToFile(toWrite);
        }
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