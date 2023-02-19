const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { format, sub, parse } = require('date-fns');

const FILE_DATE_FORMAT = 'LL-dd-yyyy';
const FILE_DATE_FORMAT_MINUTES = 'LL-dd-yyyy_H-m';
const FILE_DATE_FORMAT_SECONDS = 'LL-dd-yyyy-HH-mm-ss';
const LOG_DATE_TIME_FORMAT = 'LL-dd-yyyy HH:mm:ss.SS';
const CUSTOM_LOG_DATE_TIME_FORMAT = 'd+yy+LL+HH+mm+ss+SS'
const TEST_LOG_DIR = './logs';
const POLL_MS = 25;

// examples for other testing, remove after used
// it('Logs the first line: \'[wrinkle] Created directory: \'./logs\' for logging.\'', () => {
//     const searchString = '[wrinkle] Created directory: \'./logs\' for logging.';
//     let hasline = fs.readFileSync(TEST_LOG_DIR + '/' + format(Date.now(), FILE_DATE_FORMAT) + '.log', { encoding: 'utf8', flag: 'r' }).includes(searchString);
//     expect(hasline).toBe(true);
// });

isValidParseFormat = (log, customFormat) => {
    const isValidDate = (d) => {
        return d instanceof Date && !isNaN(d);
    }

    let logDateTimeFormat = '';
    if (log.includes(' debug:')) {
        logDateTimeFormat = log.split(' debug:')[0];
    } else if (log.includes(' info:')) {
        logDateTimeFormat = log.split(' info:')[0];
    } else if (log.includes(' warn:')) {
        logDateTimeFormat = log.split(' warn:')[0];
    } else if (log.includes(' error:')) {
        logDateTimeFormat = log.split(' error:')[0];
    }
    const parsed = parse(logDateTimeFormat, customFormat || LOG_DATE_TIME_FORMAT, new Date());
    return isValidDate(parsed);
}

// TODO Mock
// TODO improve this with less setIntervals, clean logic, rm ticks
const runTestWrinkleRunner = (argz, opts) =>
    new Promise((resolve, reject) => {
        let { ticks: ticksP = 0, fileVersion = 0, expectError = false, errTicks: errTicksP = 0 } = opts || {};

        let stdoutData = '';
        let stderrData = '';
        let ticks = 0;
        let errTicks = 0;
        let waitForDir = expectError ? false : !!(argz && argz.includes('-toFile'));
        let dirCreated = waitForDir && !expectError ? false : true;
        let ticksDone = argz ? false : true;
        const normalizedArgs = [];
        let logLength = 0;
        let doVersion = !!(argz && argz.includes('-maxLogFileSizeBytes'));
        let logDir = TEST_LOG_DIR;
        let fileDateTimeFormat = FILE_DATE_FORMAT;
        let logs = [];
        let level;
        let extension = '.log';
        if (argz) {
            argz.forEach((arg, i) => {
                if (typeof arg !== 'string') {
                    if (i && argz[i - 1] === '-log') {
                        if (!(argz && argz.includes('-logLevel'))) {
                            logLength = arg.length;
                        }
                        logs = arg;
                    }

                    arg = JSON.stringify(arg);
                } else {
                    if (i && argz[i - 1] === '-logDir') {
                        logDir = arg;
                    } else if (i && argz[i - 1] === '-fileDateTimeFormat') {
                        fileDateTimeFormat = arg;
                    } else if (i && argz[i - 1] === '-logLevel') {
                        level = arg;
                    } else if (i && argz[i - 1] === '-extension') {
                        extension = arg;
                    }
                }
                normalizedArgs.push(arg);
            })
        }

        // const flags = {};
        // if (argz) {
        //     argz.forEach((arg, i) => {
        //         if (typeof arg !== 'string') {
        //             if (i && argz[i - 1] === '-log') {
        //                 if (!(argz && argz.includes('-logLevel'))) {
        //                     logLength = arg.length;
        //                 }
        //                 logs = arg;
        //             }

        //             arg = JSON.stringify(arg);
        //         } else {
        //             if (i && argz[i - 1].includes('-') && !argz[i].includes('-')) {
        //                 const key = argz[i - 1].split('-')[1];
        //                 // console.log('key', key);
        //                 if (key) flags[key] = arg;
        //             }
        //             // if (i && argz[i - 1] === '-logDir') {
        //             //     logDir = arg;
        //             // } else if (i && argz[i - 1] === '-fileDateTimeFormat') {
        //             //     fileDateTimeFormat = arg;
        //             // } else if (i && argz[i - 1] === '-logLevel') {
        //             //     level = arg;
        //             // }
        //         }
        //         normalizedArgs.push(arg);
        //     })
        // }
        // let { logDir = TEST_LOG_DIR, fileDateTimeFormat = FILE_DATE_FORMAT, level } = flags;
        // // console.log('flags', flags);

        if (level) {
            let counter = 0;
            const allowedLogFuncLevels = ['debug', 'info', 'warn', 'error'].reduce((accumulator, currentValue, index, array) => {
                if (array.indexOf(level) <= index) {
                    accumulator.push(currentValue);
                }
                return accumulator;
            }, []);
            logs.forEach(log => {
                const [currentLogsLevel] = log.split(':');
                if (allowedLogFuncLevels.includes(currentLogsLevel)) {
                    counter += 1;
                }
            });
            logLength = counter;
        }

        if (!ticksP) {
            ticksP = logLength;
            if (ticksP === ticks) {
                ticksDone = true;
            }
        }

        const testAppFilePath = path.join(
            __dirname,
            'testWrinkleRunner.js',
        );

        if (waitForDir) {
            const interval = setInterval(() => {
                if (fs.existsSync(logDir)) {
                    dirCreated = true;
                    clearInterval(interval);
                }
            }, POLL_MS);
        }

        const testApp = spawn('node', [testAppFilePath, ...normalizedArgs]);

        testApp.stdout.on('data', data => {
            stdoutData += data.toString();
            ticks += 1;
            if (stdoutData.split('\n').filter(val => val).length === logLength) {
                ticksDone = true;
            }
        });

        testApp.stderr.on('data', err => {
            stderrData += err.toString();
            errTicks += 1;
            if (errTicks === errTicksP) ticksDone = true;
        });

        const getFileLogsMapOrArray = () => {
            if (!fileVersion && fs.readdirSync(logDir).length === 1) {
                return fs.readFileSync(logDir + '/' + format(Date.now(), fileDateTimeFormat) + (doVersion ? `.${fileVersion}` : '') + extension,
                    { encoding: 'utf8', flag: 'r' }).split('\n').filter(val => val)
            }

            return getFileNameLogsMap();
        }

        const getFileNameLogsMap = () => {
            const fileNameLogs = new Map();
            const fileNames = fs.readdirSync(logDir).sort();
            for (const fileName of fileNames) {
                // const fileVersion
                fileNameLogs.set(fileName, fs.readFileSync(logDir + '/' + fileName,
                    { encoding: 'utf8', flag: 'r' }).split('\n').filter(val => val));
            }
            return fileNameLogs;
        }

        const interval = setInterval(() => {
            if (ticksDone && dirCreated) {
                testApp.kill('SIGINT');
                // split on newline, rm empty vals after split
                const toReturn = [stdoutData.split('\n').filter(val => val), stderrData.split('\n').filter(val => val),
                waitForDir && logLength && !expectError ? getFileLogsMapOrArray() : []];
                resolve(toReturn);
                clearInterval(interval);
            }
        }, POLL_MS);
    });


describe('toFile: true', () => {
    afterAll(() => {
        fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
    });

    describe('And no log directory', () => {
        describe('On logging nothing', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile']);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });


            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates no log files.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(0)
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('No logs occur in stdout', () => {
                expect(allOutStrings).toHaveLength(0);
            });
        });


        describe('On logging a debug, info, warn, error message:', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];
            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog]);
            });
            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });
    })


    describe('And log directory but no log files:', () => {
        describe('On logging nothing', () => {
            // setup dir
            fs.mkdirSync(TEST_LOG_DIR);
            let allOutStrings, allErrStrings, allFileStrings;
            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile']);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates no log files.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(0)
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('No logs occur in stdout', () => {
                expect(allOutStrings).toHaveLength(0);
            });
        });
        describe('On logging a debug, info, warn, error message:', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];
            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog]);
            });
            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });
    });

    describe('And log directory and existing log file:', () => {
        beforeAll(async () => {
            // setup dir and single log file
            fs.mkdirSync(TEST_LOG_DIR);
            fs.writeFileSync(TEST_LOG_DIR + '/' + format(Date.now(), FILE_DATE_FORMAT) + '.log', '');
        });
        afterAll(() => {
            fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
        });
        describe('On logging nothing', () => {
            beforeAll(async () => {
                await runTestWrinkleRunner(['-toFile']);
            });

            it('Logs nothing to the file.', () => {
                let fileLines = fs.readFileSync(TEST_LOG_DIR + '/' + format(Date.now(), FILE_DATE_FORMAT) + '.log', { encoding: 'utf8', flag: 'r' });
                expect(fileLines).toBe('');
            });

            it('Does not create a new log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });
        });

        describe('On logging a debug, info, warn, error message:', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];
            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog]);
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Does not create a new log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });
    });

    describe('And log directory and one current and one dated existing log files:', () => {
        let allOutStrings, allErrStrings, allFileStrings;
        const toLog =
            ['debug:Test debug.',
                'info:Test info.',
                'warn:Test warn.',
                'error:Test error.'];

        beforeAll(async () => {
            fs.mkdirSync('./logs');
            let iterations = 0;
            while (iterations !== 2) {
                fs.writeFileSync(TEST_LOG_DIR + '/' + format(sub(Date.now(), { days: iterations }), FILE_DATE_FORMAT) + '.log', '')
                iterations += 1;
            }
            [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog]);
        });

        afterAll(() => {
            fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
        });

        it('Does not create a new log file.', () => {
            expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(2);
        });

        it('Logs 0 lines to file 1:', () => {
            const [firstFileValues] = allFileStrings.values();
            expect(firstFileValues).toHaveLength(0);
        });

        it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file 2:', () => {
            const [, secondFileValues] = allFileStrings.values()
            secondFileValues.forEach((log, i) => {
                // split the debug:Test debug. array to debug: Test debug
                expect(log).toContain(toLog[+ i].split(':').join(': '));
            })
            expect(allOutStrings).toHaveLength(4);
        });
    });

    describe('maxLogFileSizeBytes: 360', () => {
        describe('On logging nothing', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-maxLogFileSizeBytes', 360]);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });


            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates no log files.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(0)
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('No logs occur in stdout', () => {
                expect(allOutStrings).toHaveLength(0);
            });
        });

        describe('On logging a debug, info, warn, error message:', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-maxLogFileSizeBytes', 360]);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\'.0.log format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.0.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });

        describe('On logging 720 bytes (double 360 max) worth of debug, info, warn, error messages:', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];
            const twoFilesLogs = [...toLog, ...toLog, ...toLog, ...toLog];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', twoFilesLogs, '-maxLogFileSizeBytes', 360]);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates 2 log files.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(2)
            });

            it('Names the log two files with the \'LL-dd-yyyy\'.<version>.log format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.0.log';
                const testFileName2 = format(Date.now(), FILE_DATE_FORMAT) + '.1.log';
                const [foundFirstFileName, foundSecondFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
                expect(foundSecondFileName).toBe(testFileName2);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 8 lines: \'<level>: Test <level>.\' in order to file 1:', () => {
                const [firstFileValues] = allFileStrings.values()
                firstFileValues.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(twoFilesLogs[i].split(':').join(': '));
                })
                expect(allOutStrings).toHaveLength(16);
            });

            it('Logs 8 lines: \'<level>: Test <level>.\' in order to file 2:', () => {
                const [, secondFileValues] = allFileStrings.values()
                let base = 4;
                // start halfway through the initial array using base + i
                secondFileValues.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(twoFilesLogs[base + i].split(':').join(': '));
                })
                expect(allOutStrings).toHaveLength(16);
            });

            it('Logs 16 lines to stdout:', () => {
                expect(allOutStrings).toHaveLength(16);
            });
        });

        describe('And log directory and two existing max size versioned log files:', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                fs.mkdirSync('./logs');
                let iterations = 0;
                while (iterations !== 2) {
                    fs.writeFileSync('./logs' + '/' + format(Date.now(), FILE_DATE_FORMAT) + '.' + iterations + '.log', '')
                    iterations += 1;
                }
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-maxLogFileSizeBytes', 360]);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Does not create a new log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(2);
            });

            it('Logs 0 lines to file 1:', () => {
                const [firstFileValues] = allFileStrings.values();
                expect(firstFileValues).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file 2:', () => {
                const [, secondFileValues] = allFileStrings.values()
                secondFileValues.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });
        });

    });

    describe('maxLogFileAge', () => {
        describe('1:day and log directory and one current and one dated existing log files:', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                if (!fs.existsSync('./logs')) fs.mkdirSync('./logs');
                let iterations = 0;
                while (iterations !== 2) {
                    fs.writeFileSync(TEST_LOG_DIR + '/' + format(sub(Date.now(), { days: iterations }), FILE_DATE_FORMAT) + '.log', '')
                    iterations += 1;
                }

                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-maxLogFileAge', '1:day']);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Cleans old log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file 1:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allFileStrings).toHaveLength(4);
            });
        });
    });

    describe('logDir', () => {
        describe('./LOG_test', () => {
            const customLogDirName = './LOG_test';
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logDir', customLogDirName]);
            });

            afterAll(() => {
                fs.rmSync(customLogDirName, { recursive: true, force: true });
            });

            it('Creates the \'./LOG_test\' dir.', () => {
                expect(fs.existsSync(customLogDirName)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(customLogDirName)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(customLogDirName);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });
    });

    describe('fileDateTimeFormat', () => {
        describe('LL-dd-yyyy-HH-mm-ss', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-fileDateTimeFormat', FILE_DATE_FORMAT_SECONDS]);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy-HH-mm-ss\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });
    });

    describe('level', () => {
        describe('debug', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logLevel', 'debug']);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy-HH\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });

        describe('info', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logLevel', 'info']);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 3 lines: \'<level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    const base = 1;
                    expect(log).toContain(toLog[base + i].split(':').join(': '));
                })
                expect(allOutStrings).toHaveLength(3);
            });

            it('Logs 3 lines: \'<level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    const base = 1;
                    expect(log).toContain(toLog[base + i].split(':').join(': '));
                });
                expect(allOutStrings).toHaveLength(3);
            });
        });

        describe('warn', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logLevel', 'warn']);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 2 lines: \'<level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    const base = 2;
                    expect(log).toContain(toLog[base + i].split(':').join(': '));
                })
                expect(allOutStrings).toHaveLength(2);
            });

            it('Logs 2 lines: \'<level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    const base = 2;
                    expect(log).toContain(toLog[base + i].split(':').join(': '));
                });
                expect(allOutStrings).toHaveLength(2);
            });
        });

        describe('error', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logLevel', 'error']);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 1 line: \'<level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    const base = 3;
                    expect(log).toContain(toLog[base + i].split(':').join(': '));
                })
                expect(allOutStrings).toHaveLength(1);
            });

            it('Logs 1 line: \'<level>: Test <level>.\' to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    const base = 3;
                    expect(log).toContain(toLog[base + i].split(':').join(': '));
                });
                expect(allOutStrings).toHaveLength(1);
            });
        });
    });

    describe('extension', () => {
        describe('.txt', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logLevel', 'debug', '-extension', '.txt']);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy-HH\' format and .txt extension', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.txt';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });
    });

    describe('unsafeMode', () => {
        describe('unset and logDir \'../logs\' and attempting to log a debug, info, warn, error message:', () => {
            const logDir = '../logs';
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logDir', logDir], { expectError: true, errTicks: 1 });
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates no \'../logs\' dir.', () => {
                expect(fs.existsSync(logDir)).toBe(false);
            });

            it('One error occurs in stderr.', () => {
                expect(allErrStrings).toHaveLength(1);
            });

            it('Logs \'[wrinkle]: logDir: \'../logs\' is not a safe path. Set option \'unsafeMode: true\' to ignore this check. Exiting...\'  stderr', () => {
                expect(allErrStrings[0]).toContain('[wrinkle]: logDir: \'../logs/\' is not a safe path. Set option \'unsafeMode: true\' to ignore this check. Exiting...');
            });

            it('Logs 0 lines: \'<level>: Test <level>.\' to stdout:', () => {
                expect(allOutStrings).toHaveLength(0);
            });
        });

        describe('unset and logDir \'../../logs\' and attempting to log a debug, info, warn, error message:', () => {
            const logDir = '../../logslogs/';
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logDir', logDir], { expectError: true, errTicks: 1 });
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates no \'../../logs\' dir.', () => {
                expect(fs.existsSync(logDir)).toBe(false);
            });

            it('One error occurs in stderr.', () => {
                expect(allErrStrings).toHaveLength(1);
            });

            it('Logs \'[wrinkle]: logDir: \'../../logs\' is not a safe path. Set option \'unsafeMode: true\' to ignore this check. Exiting...\'  stderr', () => {
                expect(allErrStrings[0]).toContain(`[wrinkle]: logDir: \'${logDir}\' is not a safe path. Set option \'unsafeMode: true\' to ignore this check. Exiting...`);
            });

            it('Logs 0 lines: \'<level>: Test <level>.\' to stdout:', () => {
                expect(allOutStrings).toHaveLength(0);
            });
        });

        describe('unset and logDir \'/logs\' and attempting to log a debug, info, warn, error message:', () => {
            const logDir = '/logs';
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logDir', logDir], { expectError: true, errTicks: 1 });
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates no \'/logs\' dir.', () => {
                expect(fs.existsSync(logDir)).toBe(false);
            });

            it('One error occurs in stderr.', () => {
                expect(allErrStrings).toHaveLength(1);
            });

            it('Logs \'[wrinkle]: logDir: \'/logs/\' is not a safe path. Set option \'unsafeMode: true\' to ignore this check. Exiting...\'  stderr', () => {
                expect(allErrStrings[0]).toContain(`[wrinkle]: logDir: \'${logDir}/\' is not a safe path. Set option \'unsafeMode: true\' to ignore this check. Exiting...`);
            });

            it('Logs 0 lines: \'<level>: Test <level>.\' to stdout:', () => {
                expect(allOutStrings).toHaveLength(0);
            });
        });

        describe('true and logDir \'../logs\' and attempting to log a debug, info, warn, error message:', () => {
            const logDir = '../logs';
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logDir', logDir, '-unsafeMode', true]);
            });

            afterAll(() => {
                fs.rmSync(logDir, { recursive: true, force: true });
            });

            it('Creates the \'../logs\' dir.', () => {
                expect(fs.existsSync(logDir)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(logDir)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(logDir);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });

        describe('true and logDir \'../../logs\' and attempting to log a debug, info, warn, error message:', () => {
            const logDir = '../../logs';
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logDir', logDir, '-unsafeMode', true]);
            });

            afterAll(() => {
                fs.rmSync(logDir, { recursive: true, force: true });
            });

            it('Creates the \'../../logs\' dir.', () => {
                expect(fs.existsSync(logDir)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(logDir)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(logDir);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });


        describe('true and logDir \'/logs\' and attempting to log a debug, info, warn, error message:', () => {
            const logDir = '/logs';
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logDir', logDir, '-unsafeMode', true]);
            });

            afterAll(() => {
                fs.rmSync(logDir, { recursive: true, force: true });
            });

            it('Creates the \'/logs\' dir.', () => {
                expect(fs.existsSync(logDir)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(logDir)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(logDir);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });
    });

    describe('logDateTimeFormat d+yy+LL+HH+mm+ss+SS', () => {
        describe('On logging a debug, info, warn, error message:', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-logDateTimeFormat', CUSTOM_LOG_DATE_TIME_FORMAT]);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            it('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            it('Names the log file with the \'LL-dd-yyyy\'.log format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log, CUSTOM_LOG_DATE_TIME_FORMAT)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log, CUSTOM_LOG_DATE_TIME_FORMAT)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });
    });
});

describe('When not writing to file, wrinkle:', () => {
    describe('On initializing:', () => {
        let allOutStrings, allErrStrings;
        beforeAll(async () => {
            [allOutStrings, allErrStrings] = await runTestWrinkleRunner();
        });

        it('No errors occur in stderr', () => {
            expect(allErrStrings).toHaveLength(0);
        });

        it('Creates no \'./logs\' dir.', () => {
            expect(fs.existsSync(TEST_LOG_DIR)).toBe(false);
        });

        it('Logs nothing.', () => {
            expect(allOutStrings).toHaveLength(0);
        });
    });

    describe('On logging without any log level set: ', () => {
        let allOutStrings, allErrStrings;
        const toLog =
            ['debug:Test debug.',
                'info:Test info.',
                'warn:Test warn.',
                'error:Test error.'];

        beforeAll(async () => {
            [allOutStrings, allErrStrings] = await runTestWrinkleRunner(['-log', toLog]);
        });

        it('No errors occur in stderr', () => {
            expect(allErrStrings).toHaveLength(0);
        });

        it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
            allOutStrings.forEach((log, i) => {
                // split the debug:Test debug. array to debug: Test debug
                expect(log).toContain(toLog[i].split(':').join(': '));
            });
            expect(allOutStrings).toHaveLength(4);
        });
    });

    describe('level', () => {
        describe('debug', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-log', toLog, '-logLevel', 'debug']);
            });

            it('Creates no logs dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(false);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });

        describe('info', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-log', toLog, '-logLevel', 'info']);
            });

            it('Creates no logs dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(false);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 3 lines: \'<level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    const base = 1;
                    expect(log).toContain(toLog[base + i].split(':').join(': '));
                });
                expect(allOutStrings).toHaveLength(3);
            });
        });

        describe('warn', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-log', toLog, '-logLevel', 'warn']);
            });

            it('Creates no logs dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(false);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 2 lines: \'<level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    const base = 2;
                    expect(log).toContain(toLog[base + i].split(':').join(': '));
                });
                expect(allOutStrings).toHaveLength(2);
            });
        });

        describe('error', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-log', toLog, '-logLevel', 'error']);
            });

            it('Creates no logs dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(false);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 1 line: \'<level>: Test <level>.\' to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    const base = 3;
                    expect(log).toContain(toLog[base + i].split(':').join(': '));
                });
                expect(allOutStrings).toHaveLength(1);
            });
        });
    });

    describe('logDateTimeFormat d+yy+LL+HH+mm+ss+SS', () => {
        describe('On logging a debug, info, warn, error message:', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-log', toLog, '-logDateTimeFormat', CUSTOM_LOG_DATE_TIME_FORMAT]);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates no logs dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(false);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log, CUSTOM_LOG_DATE_TIME_FORMAT)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log, CUSTOM_LOG_DATE_TIME_FORMAT)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });
    })

    describe('extension', () => {
        describe('.txt', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            const toLog =
                ['debug:Test debug.',
                    'info:Test info.',
                    'warn:Test warn.',
                    'error:Test error.'];

            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-log', toLog, '-extension', '.txt']);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            it('Creates no logs dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(false);
            });

            it('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                })
                expect(allOutStrings).toHaveLength(4);
            });

            it('Logs 4 lines: \'<properDateTimeFormat> <level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                    expect(isValidParseFormat(log)).toBe(true);
                });
                expect(allOutStrings).toHaveLength(4);
            });
        });
    });
});

