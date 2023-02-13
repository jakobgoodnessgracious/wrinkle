const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { format, sub } = require('date-fns');

const FILE_DATE_FORMAT = 'LL-dd-yyyy';
const FILE_DATE_FORMAT_MINUTES = 'LL-dd-yyyy_H-m';
const FILE_DATE_FORMAT_SECONDS = 'LL-dd-yyyy_H-m_s';
const TEST_LOG_DIR = './logs';
const POLL_MS = 25;

// examples for other testing, remove after used
// test('Logs the first line: \'[wrinkle] Created directory: \'./logs\' for logging.\'', () => {
//     const searchString = '[wrinkle] Created directory: \'./logs\' for logging.';
//     let hasline = fs.readFileSync(TEST_LOG_DIR + '/' + format(Date.now(), FILE_DATE_FORMAT) + '.log', { encoding: 'utf8', flag: 'r' }).includes(searchString);
//     expect(hasline).toBe(true);
// });

// TODO Mock
// TODO improve this with less setIntervals, clean logic, rm ticks
const runTestWrinkleRunner = (argz, opts) =>
    new Promise((resolve) => {
        let { ticksP = 0, fileVersion = 0 } = opts || {};

        let stdoutData = '';
        let stderrData = '';
        let ticks = 0;
        let waitForDir = !!(argz && argz.includes('-toFile'));
        let dirCreated = waitForDir ? false : true;
        let ticksDone = argz ? false : true;
        const normalizedArgs = [];
        let logLength = 0;
        let doVersion = !!(argz && argz.includes('-maxLogFileSizeBytes'));
        if (argz) {
            argz.forEach((arg, i) => {
                if (typeof arg !== 'string') {
                    if (i && argz[i - 1] === '-log') {
                        logLength = arg.length;
                    }
                    arg = JSON.stringify(arg);
                }
                normalizedArgs.push(arg);
            })
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
                if (fs.existsSync(TEST_LOG_DIR)) {
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
        });

        const getFileLogsMapOrArray = () => {
            if (!fileVersion && fs.readdirSync(TEST_LOG_DIR).length === 1) {
                return fs.readFileSync(TEST_LOG_DIR + '/' + format(Date.now(), FILE_DATE_FORMAT) + (doVersion ? `.${fileVersion}` : '') + '.log',
                    { encoding: 'utf8', flag: 'r' }).split('\n').filter(val => val)
            }

            return getFileNameLogsMap();
        }

        const getFileNameLogsMap = () => {
            const fileNameLogs = new Map();
            const fileNames = fs.readdirSync(TEST_LOG_DIR).sort();
            for (const fileName of fileNames) {
                // const fileVersion
                fileNameLogs.set(fileName, fs.readFileSync(TEST_LOG_DIR + '/' + fileName,
                    { encoding: 'utf8', flag: 'r' }).split('\n').filter(val => val));
            }
            return fileNameLogs;
        }

        const interval = setInterval(() => {
            if (ticksDone && dirCreated) {
                testApp.kill('SIGINT');
                // split on newline, rm empty vals after split
                const toReturn = [stdoutData.split('\n').filter(val => val), stderrData.split('\n').filter(val => val),
                waitForDir && logLength ? getFileLogsMapOrArray() : []];
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


            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            test('Creates no log files.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(0)
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            test('No logs occur in stdout', () => {
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

            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            test('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            test('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            test('Logs 4 lines: \'<level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                })
                expect(allOutStrings).toHaveLength(4);
            });

            test('Logs 4 lines: \'<level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
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

            test('Creates no log files.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(0)
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            test('No logs occur in stdout', () => {
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

            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            test('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            test('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            test('Logs 4 lines: \'<level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                })
                expect(allOutStrings).toHaveLength(4);
            });

            test('Logs 4 lines: \'<level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
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

            test('Logs nothing to the file.', () => {
                let fileLines = fs.readFileSync(TEST_LOG_DIR + '/' + format(Date.now(), FILE_DATE_FORMAT) + '.log', { encoding: 'utf8', flag: 'r' });
                expect(fileLines).toBe('');
            });

            test('Does not create a new log file.', () => {
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

            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            test('Does not create a new log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            test('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            test('Logs 4 lines: \'<level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                })
                expect(allOutStrings).toHaveLength(4);
            });

            test('Logs 4 lines: \'<level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
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

        test('Does not create a new log file.', () => {
            expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(2);
        });

        test('Logs 0 lines to file 1:', () => {
            const [firstFileValues] = allFileStrings.values();
            expect(firstFileValues).toHaveLength(0);
        });

        test('Logs 4 lines: \'<level>: Test <level>.\' in order to file 2:', () => {
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


            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            test('Creates no log files.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(0)
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            test('No logs occur in stdout', () => {
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

            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            test('Creates 1 log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1)
            });

            test('Names the log file with the \'LL-dd-yyyy\'.0.log format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.0.log';
                const [foundFirstFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            test('Logs 4 lines: \'<level>: Test <level>.\' in order to file:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                })
                expect(allOutStrings).toHaveLength(4);
            });

            test('Logs 4 lines: \'<level>: Test <level>.\' in order to stdout:', () => {
                allOutStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
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

            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
            });

            test('Creates 2 log files.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(2)
            });

            test('Names the log two files with the \'LL-dd-yyyy\'.<version>.log format.', () => {
                const testFileName = format(Date.now(), FILE_DATE_FORMAT) + '.0.log';
                const testFileName2 = format(Date.now(), FILE_DATE_FORMAT) + '.1.log';
                const [foundFirstFileName, foundSecondFileName] = fs.readdirSync(TEST_LOG_DIR);
                expect(foundFirstFileName).toBe(testFileName);
                expect(foundSecondFileName).toBe(testFileName2);
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings).toHaveLength(0);
            });

            test('Logs 8 lines: \'<level>: Test <level>.\' in order to file 1:', () => {
                const [firstFileValues] = allFileStrings.values()
                firstFileValues.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(twoFilesLogs[i].split(':').join(': '));
                })
                expect(allOutStrings).toHaveLength(16);
            });

            test('Logs 8 lines: \'<level>: Test <level>.\' in order to file 2:', () => {
                const [, secondFileValues] = allFileStrings.values()
                let base = 4;
                // start halfway through the initial array using base + i
                secondFileValues.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(twoFilesLogs[base + i].split(':').join(': '));
                })
                expect(allOutStrings).toHaveLength(16);
            });

            test('Logs 16 lines to stdout:', () => {
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

            test('Does not create a new log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(2);
            });

            test('Logs 0 lines to file 1:', () => {
                const [firstFileValues] = allFileStrings.values();
                expect(firstFileValues).toHaveLength(0);
            });

            test('Logs 4 lines: \'<level>: Test <level>.\' in order to file 2:', () => {
                const [, secondFileValues] = allFileStrings.values()
                secondFileValues.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
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

                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-fileDateTimeFormat', FILE_DATE_FORMAT, '-maxLogFileAge', '1:day']);
            });

            afterAll(() => {
                fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            });

            test('Cleans old log file.', () => {
                expect(fs.readdirSync(TEST_LOG_DIR)).toHaveLength(1);
            });

            test('Logs 4 lines: \'<level>: Test <level>.\' in order to file 1:', () => {
                allFileStrings.forEach((log, i) => {
                    // split the debug:Test debug. array to debug: Test debug
                    expect(log).toContain(toLog[i].split(':').join(': '));
                })
                expect(allFileStrings).toHaveLength(4);
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

        test('No errors occur in stderr', () => {
            expect(allErrStrings).toHaveLength(0);
        });

        test('Creates no \'./logs\' dir.', () => {
            expect(fs.existsSync(TEST_LOG_DIR)).toBe(false);
        });

        test('Logs nothing.', () => {
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

        test('No errors occur in stderr', () => {
            expect(allErrStrings).toHaveLength(0);
        });

        test('Logs 4 lines: \'<level>: Test <level>.\' in order to stdout:', () => {
            allOutStrings.forEach((log, i) => {
                // split the debug:Test debug. array to debug: Test debug
                expect(log).toContain(toLog[i].split(':').join(': '));
            });
            expect(allOutStrings).toHaveLength(4);
        });
    })

});

