const Wrinkle = require('wrinkle');
const fs = require('fs');
const { format } = require('date-fns');
const fileDateTimeFormat = 'LL-dd-yyyy';
let logger;
const testLogDir = './logs';

beforeAll(async () => {
    if (!logger) {
        logger = new Wrinkle({ toFile: true, logLevel: process.env.LOG_LEVEL, fileDateTimeFormat: 'LL-dd-yyyy', maxLogFileSizeBytes: 5000 });
    }
    let interval;
    const prom = new Promise((resolve, reject) => {
        interval = setInterval(() => {
            if (fs.existsSync(testLogDir)) {
                resolve();
            }
        }, 500);
    });

    await prom;
    clearInterval(interval);
});

afterAll(() => {
    logger.destroy();
    fs.rmSync(testLogDir, { recursive: true, force: true });
});

describe('When no log directory exists, wrinkle:', () => {

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
