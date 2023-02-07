const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const fileDateTimeFormat = 'LL-dd-yyyy';
const testLogDir = './logs';

// todo, improve this with less setIntervals
const runTestWrinkleRunner = (argz, ticksP = 0) =>
    new Promise((resolve) => {
        let stdoutData = '';
        let stderrData = []
        let ticks = 0;
        let waitForDir = argz && argz.includes('-toFile');
        let dirCreated = waitForDir ? false : true;
        let ticksDone = argz ? false : true;
        const normalizedArgs = [];
        if (argz) {
            argz.forEach((arg) => {
                if (typeof arg !== 'string') {
                    arg = JSON.stringify(arg);
                }
                normalizedArgs.push(arg);
            })
        }
        if (!ticksP) {
            ticksP = normalizedArgs.length - 1;
        }

        const testAppFilePath = path.join(
            __dirname,
            './testWrinkleRunner.js',
        );

        if (waitForDir) {
            const interval = setInterval(() => {
                if (fs.existsSync(testLogDir)) {
                    dirCreated = true;
                    clearInterval(interval);
                }
            }, 500);
        }

        const testApp = spawn('node', [testAppFilePath, ...normalizedArgs]);

        testApp.stdout.on('data', data => {
            stdoutData += data.toString();
            if (ticks === ticksP) {
                ticksDone = true;
            }
            ticks += 1;
        });

        testApp.stderr.on('data', err => {
            stderrData.push(err.toString());
        });

        const interval = setInterval(() => {
            if (ticksDone && dirCreated) {
                testApp.kill('SIGINT');
                // split on newline, rm empty vals after split
                resolve([stdoutData.split('\n').filter(val => val), stderrData]);
                clearInterval(interval);
            }
        }, 500);
    });


describe('When writing to file and no log directory exists, wrinkle:', () => {
    describe('On initializing:', () => {
        beforeAll(async () => {
            await runTestWrinkleRunner(['-toFile']);
        });

        afterAll(() => {
            fs.rmSync(testLogDir, { recursive: true, force: true });
        });

        test('Creates the \'./logs\' dir.', () => {
            expect(fs.existsSync(testLogDir)).toBe(true);
        });

        test('Creates one log file.', () => {
            expect(fs.readdirSync(testLogDir).length).toBe(1)
        });

        test('Names the log file with the \'LL-dd-yyyy\' format.', () => {
            const testFileName = format(Date.now(), fileDateTimeFormat) + '.log';
            const [foundFirstFileName] = fs.readdirSync(testLogDir);
            expect(foundFirstFileName).toBe(testFileName);
        });

        test('Logs the first line: \'[wrinkle] Created directory: \'./logs\' for logging.\'', () => {
            const searchString = '[wrinkle] Created directory: \'./logs\' for logging.';
            let hasline = fs.readFileSync(testLogDir + '/' + format(Date.now(), fileDateTimeFormat) + '.log', { encoding: 'utf8', flag: 'r' }).includes(searchString);
            expect(hasline).toBe(true);
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
            expect(allErrStrings.length).toBe(0);
        });

        test('Creates no \'./logs\' dir.', () => {
            expect(fs.existsSync(testLogDir)).toBe(false);
        });

        test('Does not log \'debug: [wrinkle] Created directory: \'./logs\' for logging.\'', () => {
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

