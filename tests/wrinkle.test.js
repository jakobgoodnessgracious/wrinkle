const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const fileDateTimeFormat = 'LL-dd-yyyy';
const testLogDir = './logs';

const POLL_MS = 25;
// examples for other testing, remove after used
// test('Names the log file with the \'LL-dd-yyyy\' format.', () => {
//     const testFileName = format(Date.now(), fileDateTimeFormat) + '.log';
//     const [foundFirstFileName] = fs.readdirSync(testLogDir);
//     expect(foundFirstFileName).toBe(testFileName);
// });

// test('Logs the first line: \'[wrinkle] Created directory: \'./logs\' for logging.\'', () => {
//     const searchString = '[wrinkle] Created directory: \'./logs\' for logging.';
//     let hasline = fs.readFileSync(testLogDir + '/' + format(Date.now(), fileDateTimeFormat) + '.log', { encoding: 'utf8', flag: 'r' }).includes(searchString);
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
                if (fs.existsSync(testLogDir)) {
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
            if (!fileVersion && fs.readdirSync(testLogDir).length) {
                return fs.readFileSync(testLogDir + '/' + format(Date.now(), fileDateTimeFormat) + (doVersion ? `.${fileVersion}` : '') + '.log',
                    { encoding: 'utf8', flag: 'r' }).split('\n').filter(val => val)
            }

            return getFileNameLogsMap();
        }

        const getFileNameLogsMap = () => {
            const fileNameLogs = new Map();
            const fileNames = fs.readdirSync(testLogDir).sort();
            for (const fileName in fileNames) {
                // const fileVersion
                fileNameLogs.set(fileName, fs.readFileSync(testLogDir + '/' + fileName,
                    { encoding: 'utf8', flag: 'r' }).split('\n').filter(val => val));
            }
        }

        const interval = setInterval(() => {
            if (ticksDone && dirCreated) {
                testApp.kill('SIGINT');
                // split on newline, rm empty vals after split
                resolve([stdoutData.split('\n').filter(val => val), stderrData.split('\n').filter(val => val),
                waitForDir && logLength ? getFileLogsMapOrArray() : []]);
                clearInterval(interval);
            }
        }, POLL_MS);
    });


describe('toFile: true', () => {
    afterAll(() => {
        fs.rmSync(testLogDir, { recursive: true, force: true });
    });

    describe('And no log directory', () => {
        describe('On logging nothing', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile']);
            });

            afterAll(() => {
                fs.rmSync(testLogDir, { recursive: true, force: true });
            });


            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(testLogDir)).toBe(true);
            });

            test('Creates no log files.', () => {
                expect(fs.readdirSync(testLogDir).length).toBe(0)
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings.length).toBe(0);
            });

            test('No logs occur in stdout', () => {
                expect(allOutStrings.length).toBe(0);
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
                fs.rmSync(testLogDir, { recursive: true, force: true });
            });

            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(testLogDir)).toBe(true);
            });

            test('Creates 1 log file.', () => {
                expect(fs.readdirSync(testLogDir).length).toBe(1)
            });

            test('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), fileDateTimeFormat) + '.log';
                const [foundFirstFileName] = fs.readdirSync(testLogDir);
                expect(foundFirstFileName).toBe(testFileName);
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings.length).toBe(0);
            });

            describe('Logs to file:', () => {
                test('\'debug: Test debug.\'', () => {
                    expect(allFileStrings[0].includes('debug: Test debug.')).toBe(true);
                });

                test('\'info: Test info.\'', () => {
                    expect(allFileStrings[1].includes('info: Test info.')).toBe(true);
                });

                test('\'warn: Test warn.\'', () => {
                    expect(allFileStrings[2].includes('warn: Test warn.')).toBe(true);
                });

                test('\'error: Test error.\'', () => {
                    expect(allFileStrings[3].includes('error: Test error.')).toBe(true);
                });
            });

            describe('Logs to stdout:', () => {
                test('\'debug: Test debug.\'', () => {
                    expect(allOutStrings[0].includes('debug: Test debug.')).toBe(true);
                });

                test('\'info: Test info.\'', () => {
                    expect(allOutStrings[1].includes('info: Test info.')).toBe(true);
                });

                test('\'warn: Test warn.\'', () => {
                    expect(allOutStrings[2].includes('warn: Test warn.')).toBe(true);
                });

                test('\'error: Test error.\'', () => {
                    expect(allOutStrings[3].includes('error: Test error.')).toBe(true);
                });
            });
        });
    })


    describe('And log directory but no log files:', () => {
        describe('On logging nothing', () => {
            // setup dir
            fs.mkdirSync(testLogDir);
            let allOutStrings, allErrStrings, allFileStrings;
            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile']);
            });

            afterAll(() => {
                fs.rmSync(testLogDir, { recursive: true, force: true });
            });

            test('Creates no log files.', () => {
                expect(fs.readdirSync(testLogDir).length).toBe(0)
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings.length).toBe(0);
            });

            test('No logs occur in stdout', () => {
                expect(allOutStrings.length).toBe(0);
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
                fs.rmSync(testLogDir, { recursive: true, force: true });
            });

            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(testLogDir)).toBe(true);
            });

            test('Creates 1 log file.', () => {
                expect(fs.readdirSync(testLogDir).length).toBe(1)
            });

            test('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), fileDateTimeFormat) + '.log';
                const [foundFirstFileName] = fs.readdirSync(testLogDir);
                expect(foundFirstFileName).toBe(testFileName);
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings.length).toBe(0);
            });

            describe('Logs to file:', () => {
                test('\'debug: Test debug.\'', () => {
                    expect(allFileStrings[0].includes('debug: Test debug.')).toBe(true);
                });

                test('\'info: Test info.\'', () => {
                    expect(allFileStrings[1].includes('info: Test info.')).toBe(true);
                });

                test('\'warn: Test warn.\'', () => {
                    expect(allFileStrings[2].includes('warn: Test warn.')).toBe(true);
                });

                test('\'error: Test error.\'', () => {
                    expect(allFileStrings[3].includes('error: Test error.')).toBe(true);
                });
            });

            describe('Logs to stdout:', () => {
                test('\'debug: Test debug.\'', () => {
                    expect(allOutStrings[0].includes('debug: Test debug.')).toBe(true);
                });

                test('\'info: Test info.\'', () => {
                    expect(allOutStrings[1].includes('info: Test info.')).toBe(true);
                });

                test('\'warn: Test warn.\'', () => {
                    expect(allOutStrings[2].includes('warn: Test warn.')).toBe(true);
                });

                test('\'error: Test error.\'', () => {
                    expect(allOutStrings[3].includes('error: Test error.')).toBe(true);
                });
            });
        });
    });

    describe('And log directory and existing log file:', () => {
        beforeAll(async () => {
            // setup dir and single log file
            fs.mkdirSync(testLogDir);
            fs.writeFileSync(testLogDir + '/' + format(Date.now(), fileDateTimeFormat) + '.log', '');
        });
        afterAll(() => {
            fs.rmSync(testLogDir, { recursive: true, force: true });
        });
        describe('On logging nothing', () => {
            beforeAll(async () => {
                await runTestWrinkleRunner(['-toFile']);
            });

            test('Logs nothing to the file.', () => {
                // const searchString = '[wrinkle] Directory \'./logs\' already exists, not creating a new one.';
                let fileLines = fs.readFileSync(testLogDir + '/' + format(Date.now(), fileDateTimeFormat) + '.log', { encoding: 'utf8', flag: 'r' });
                expect(fileLines).toBe('');
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
                expect(fs.existsSync(testLogDir)).toBe(true);
            });

            test('Creates 1 log file.', () => {
                expect(fs.readdirSync(testLogDir).length).toBe(1)
            });

            test('Names the log file with the \'LL-dd-yyyy\' format.', () => {
                const testFileName = format(Date.now(), fileDateTimeFormat) + '.log';
                const [foundFirstFileName] = fs.readdirSync(testLogDir);
                expect(foundFirstFileName).toBe(testFileName);
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings.length).toBe(0);
            });

            describe('Logs to file:', () => {
                test('\'debug: Test debug.\'', () => {
                    expect(allFileStrings[0].includes('debug: Test debug.')).toBe(true);
                });

                test('\'info: Test info.\'', () => {
                    expect(allFileStrings[1].includes('info: Test info.')).toBe(true);
                });

                test('\'warn: Test warn.\'', () => {
                    expect(allFileStrings[2].includes('warn: Test warn.')).toBe(true);
                });

                test('\'error: Test error.\'', () => {
                    expect(allFileStrings[3].includes('error: Test error.')).toBe(true);
                });
            });

            describe('Logs to stdout:', () => {
                test('\'debug: Test debug.\'', () => {
                    expect(allOutStrings[0].includes('debug: Test debug.')).toBe(true);
                });

                test('\'info: Test info.\'', () => {
                    expect(allOutStrings[1].includes('info: Test info.')).toBe(true);
                });

                test('\'warn: Test warn.\'', () => {
                    expect(allOutStrings[2].includes('warn: Test warn.')).toBe(true);
                });

                test('\'error: Test error.\'', () => {
                    expect(allOutStrings[3].includes('error: Test error.')).toBe(true);
                });
            });
        });
    });

    describe('maxLogFileSizeBytes: 1000', () => {
        describe('On logging nothing', () => {
            let allOutStrings, allErrStrings, allFileStrings;
            beforeAll(async () => {
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-maxLogFileSizeBytes', 1000]);
            });

            afterAll(() => {
                fs.rmSync(testLogDir, { recursive: true, force: true });
            });


            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(testLogDir)).toBe(true);
            });

            test('Creates no log files.', () => {
                expect(fs.readdirSync(testLogDir).length).toBe(0)
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings.length).toBe(0);
            });

            test('No logs occur in stdout', () => {
                expect(allOutStrings.length).toBe(0);
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
                [allOutStrings, allErrStrings, allFileStrings] = await runTestWrinkleRunner(['-toFile', '-log', toLog, '-maxLogFileSizeBytes', 1000]);
            });

            afterAll(() => {
                fs.rmSync(testLogDir, { recursive: true, force: true });
            });

            test('Creates the \'./logs\' dir.', () => {
                expect(fs.existsSync(testLogDir)).toBe(true);
            });

            test('Creates 1 log file.', () => {
                expect(fs.readdirSync(testLogDir).length).toBe(1)
            });

            test('Names the log file with the \'LL-dd-yyyy\'.0.log format.', () => {
                const testFileName = format(Date.now(), fileDateTimeFormat) + '.0.log';
                const [foundFirstFileName] = fs.readdirSync(testLogDir);
                expect(foundFirstFileName).toBe(testFileName);
            });

            test('No errors occur in stderr', () => {
                expect(allErrStrings.length).toBe(0);
            });

            describe('Logs to file:', () => {
                test('\'debug: Test debug.\'', () => {
                    expect(allFileStrings[0].includes('debug: Test debug.')).toBe(true);
                });

                test('\'info: Test info.\'', () => {
                    expect(allFileStrings[1].includes('info: Test info.')).toBe(true);
                });

                test('\'warn: Test warn.\'', () => {
                    expect(allFileStrings[2].includes('warn: Test warn.')).toBe(true);
                });

                test('\'error: Test error.\'', () => {
                    expect(allFileStrings[3].includes('error: Test error.')).toBe(true);
                });
            });

            describe('Logs to stdout:', () => {
                test('\'debug: Test debug.\'', () => {
                    expect(allOutStrings[0].includes('debug: Test debug.')).toBe(true);
                });

                test('\'info: Test info.\'', () => {
                    expect(allOutStrings[1].includes('info: Test info.')).toBe(true);
                });

                test('\'warn: Test warn.\'', () => {
                    expect(allOutStrings[2].includes('warn: Test warn.')).toBe(true);
                });

                test('\'error: Test error.\'', () => {
                    expect(allOutStrings[3].includes('error: Test error.')).toBe(true);
                });
            });
        });
        // TODO incorporate below
        // if (!fs.existsSync('./logs')) fs.mkdirSync('./logs');
        // let version = 4;
        // for (let i = version; i >= 0; i -= 1) {
        //     console.log('aasdfsda', './logs' + format(Date.now(), fileDateTimeFormat) + '.' + i + '.log')
        //     fs.writeFileSync('./logs' + '/' + format(Date.now(), fileDateTimeFormat) + '.' + i + '.log', '')
        // }
        // const logger = new Wrinkle({ toFile: true, maxLogFileSizeBytes: 5000 });
        // logger.debug('debug');
        // logger.info('info');
        // logger.warn('warn');
        // logger.error('error');

    });
});

describe('When not writing to file, wrinkle:', () => {
    describe('On initializing:', () => {
        let allOutStrings, allErrStrings;
        beforeAll(async () => {
            [allOutStrings, allErrStrings] = await runTestWrinkleRunner();
        });

        test('No errors occur in stderr', () => {
            expect(allErrStrings.length).toBe(0);
        });

        test('Creates no \'./logs\' dir.', () => {
            expect(fs.existsSync(testLogDir)).toBe(false);
        });

        test('Logs nothing.', () => {
            expect(allOutStrings.length).toBe(0);
        });
    });

    describe('On logging without any debug level set: ', () => {
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
            expect(allErrStrings.length).toBe(0);
        });

        test('Logs \'debug: Test debug.\'', () => {
            expect(allOutStrings[0].includes('debug: Test debug.')).toBe(true);
        });

        test('Logs \'info: Test info.\'', () => {
            expect(allOutStrings[1].includes('info: Test info.')).toBe(true);
        });

        test('Logs \'warn: Test warn.\'', () => {
            expect(allOutStrings[2].includes('warn: Test warn.')).toBe(true);
        });

        test('Logs \'error: Test error.\'', () => {
            expect(allOutStrings[3].includes('error: Test error.')).toBe(true);
        });
    })

});

