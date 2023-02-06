const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const fileDateTimeFormat = 'LL-dd-yyyy';
const testLogDir = './logs';

const runTestWrinkleRunner = (argz, ticksP = 0) => new Promise((resolve) => {
    let stdoutData = [];
    let ticks = 0;
    const testAppFilePath = path.join(
        __dirname,
        './testWrinkleRunner.js',
    );
    console.log('[testAppFilePath, ...(argz ? argz : [])]', [testAppFilePath, ...(argz ? argz : [])]);
    const testApp = spawn('node', [testAppFilePath, ...(argz ? argz : [])]);
    testApp.stdout.on('data', data => {
        stdoutData.push(data.toString());
        console.log('stdoutData', stdoutData);
        if (ticks === ticksP) {
            testApp.kill('SIGINT');
            resolve(stdoutData);
        }
        ticks += 1;
    });
});

describe('When writing to file and no log directory exists, wrinkle:', () => {
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

describe('When not writing to file, wrinkle:', () => {
    let allDataStrings = [];
    beforeAll(async () => {
        allDataStrings = await runTestWrinkleRunner(['-log', 'Test debug.']);
    });

    test('Creates no \'./logs\' dir.', () => {
        expect(fs.existsSync(testLogDir)).toBe(false);
    });

    test('Does not log \'debug: [wrinkle] Created directory: \'./logs\' for logging.\'', () => {
        // expect(!allDataString.includes(' debug: [wrinkle] Created directory: \'./logs\' for logging.')).toBe(true);
        expect(!allDataStrings[0].includes(' debug: [wrinkle] Created directory: \'./logs\' for logging.')).toBe(true);
    });

    test('Logs \'Test debug.\' after running logger.debug(\'Test debug.\');', () => {
        expect(allDataStrings[0].includes('Test debug.')).toBe(true);
    });

});

