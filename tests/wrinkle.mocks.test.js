const Wrinkle = require('../index.js');
const fs = require('fs');
jest.mock('fs');
const DEFAULT_FILE_DATE_FORMAT = 'LL-dd-yyyy';
const FILE_DATE_FORMAT_SECONDS = 'LL-dd-yyyy-HH-mm-ss';
const DEFAULT_LOG_DIR = './logs/';
const { format, sub, parse } = require('date-fns');
// test options

describe('no opts', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        logger = new Wrinkle();
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })

    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

});


describe('toFile: true ', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, mockStreamEnd, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.readdirSync.mockReturnValue([]);
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'}`;
        logger = new Wrinkle({ toFile: true });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })
    // afterEach(() => {
    //     jest.resetAllMocks(); // allows mockReturnValues to be different per test
    // });

    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(testFileName, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});


describe('toFile: true, logLevel: debug', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, mockStreamEnd, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.readdirSync.mockReturnValue([]);
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'}`;
        logger = new Wrinkle({ toFile: true, logLevel: 'debug' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })
    // afterEach(() => {
    //     jest.resetAllMocks(); // allows mockReturnValues to be different per test
    // });

    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(testFileName, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});

describe('toFile: true, logLevel: info ', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, mockStreamEnd, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.readdirSync.mockReturnValue([]);
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'}`;
        logger = new Wrinkle({ toFile: true, logLevel: 'info' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    });

    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);
    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(testFileName, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(3); // process.stdout.write is called (console)
        expect(stdoutWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(3); // stream.write is called (file)
        expect(mockStreamWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});

describe('toFile: true, logLevel: warn ', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, mockStreamEnd, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.readdirSync.mockReturnValue([]);
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'}`;
        logger = new Wrinkle({ toFile: true, logLevel: 'warn' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })

    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(testFileName, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(2); // process.stdout.write is called (console)
        expect(stdoutWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(2); // stream.write is called (file)
        expect(mockStreamWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});

describe('toFile: true, logLevel: error ', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, mockStreamEnd, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.readdirSync.mockReturnValue([]);
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'}`;
        logger = new Wrinkle({ toFile: true, logLevel: 'error' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })
    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(1); // process.stdout.write is called (console)
        expect(stdoutWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(testFileName, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(1); // stream.write is called (file)
        expect(mockStreamWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).not.toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});

describe('toFile: true, logDir: \'./test\' ', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, mockStreamEnd, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.readdirSync.mockReturnValue([]);
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `./test/${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'}`;
        logger = new Wrinkle({ toFile: true, logDir: './test' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })
    // afterEach(() => {
    //     jest.resetAllMocks(); // allows mockReturnValues to be different per test
    // });

    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(testFileName, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});

describe('toFile: true, maxLogFileSizeBytes: 360 ', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, mockStreamEnd, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.readdirSync.mockReturnValue([]);
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`;
        logger = new Wrinkle({ toFile: true, maxLogFileSizeBytes: 360 });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })

    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(testFileName, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});


describe('toFile: true, maxLogFileSizeBytes: 360 and file already exists', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, mockStreamEnd, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.statSync.mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
            .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
        fs.readdirSync.mockReturnValue([`${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`]);
        fs.existsSync.mockReturnValueOnce(true) // getfilesize 
            .mockReturnValueOnce(true) // create dir: already exists ./logs/
            .mockReturnValueOnce(true) // filesize checks already exists: currentLogFileName.0.log
            .mockReturnValueOnce(false) // currentLogFileName.1.log already exists: createWriteStream
            .mockReturnValue(true) // filesize checks already exists: currentLogFileName.1.log
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`;
        logger = new Wrinkle({ toFile: true, maxLogFileSizeBytes: 360 });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })


    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.1' + '.log'}`, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});



describe('toFile: true, maxLogFileAge: \'1:month\' and out of date file already exists', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.statSync.mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
            .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
        fs.readdirSync.mockReturnValueOnce([`${format(sub(Date.now(), { months: 1 }), DEFAULT_FILE_DATE_FORMAT) + '.log'}`]) // set lastwrotefilename
            .mockReturnValueOnce([`${format(sub(Date.now(), { months: 1 }), DEFAULT_FILE_DATE_FORMAT) + '.log'}`]) // clean out of date initialization
            .mockReturnValueOnce([`${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'}`]) // clean out of date after write
        fs.existsSync.mockReturnValueOnce(true) // getfilesize 
            .mockReturnValueOnce(true) // create dir: already exists ./logs/
            .mockReturnValueOnce(false) // filesize checks already exists: currentLogFileName.log (todays date)
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'}`;
        logger = new Wrinkle({ toFile: true, maxLogFileAge: '1:month' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })


    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'}`, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
        expect(fs.rmSync).toHaveBeenCalledTimes(1);
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});


describe('toFile: true, maxLogFileSizeBytes: 360, maxLogFileAge: \'1:month\' and out of date file already exists', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.statSync.mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
            .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
        fs.readdirSync.mockReturnValueOnce([`${format(sub(Date.now(), { months: 1 }), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`]) // set lastwrotefilename
            .mockReturnValueOnce([`${format(sub(Date.now(), { months: 1 }), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`]) // clean out of date initialization
            .mockReturnValueOnce([`${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`]) // clean out of date after write
        fs.existsSync.mockReturnValueOnce(true) // getfilesize 
            .mockReturnValueOnce(true) // create dir: already exists ./logs/
            .mockReturnValueOnce(false) // filesize checks already exists: currentLogFileName.log (todays date)
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`;
        logger = new Wrinkle({ toFile: true, maxLogFileSizeBytes: 360, maxLogFileAge: '1:month' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })


    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
        expect(fs.rmSync).toHaveBeenCalledTimes(1);
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});



describe('toFile: true, maxLogFileSizeBytes: 360, maxLogFileAge: \'1:day\' and out of date file already exists', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.statSync.mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
            .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
        fs.readdirSync.mockReturnValueOnce([`${format(sub(Date.now(), { days: 1 }), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`]) // set lastwrotefilename
            .mockReturnValueOnce([`${format(sub(Date.now(), { days: 1 }), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`]) // clean out of date initialization
            .mockReturnValueOnce([`${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`]) // clean out of date after write
        fs.existsSync.mockReturnValueOnce(true) // getfilesize 
            .mockReturnValueOnce(true) // create dir: already exists ./logs/
            .mockReturnValueOnce(false) // filesize checks already exists: currentLogFileName.log (todays date)
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`;
        logger = new Wrinkle({ toFile: true, maxLogFileSizeBytes: 360, maxLogFileAge: '1:day' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })


    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
        expect(fs.rmSync).toHaveBeenCalledTimes(1);
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});



describe('toFile: true, fileDateTimeFormat: \'LL-dd-yyyy-HH-mm-ss\' maxLogFileSizeBytes: 360, maxLogFileAge: \'1:second\' and out of date file already exists', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.statSync.mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
            .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
        fs.readdirSync.mockReturnValueOnce([`${format(sub(Date.now(), { seconds: 1 }), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`]) // set lastwrotefilename
            .mockReturnValueOnce([`${format(sub(Date.now(), { seconds: 1 }), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`]) // clean out of date initialization
            .mockReturnValueOnce([`${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`]) // clean out of date after write
        fs.existsSync.mockReturnValueOnce(true) // getfilesize 
            .mockReturnValueOnce(true) // create dir: already exists ./logs/
            .mockReturnValueOnce(false) // filesize checks already exists: currentLogFileName.log (toseconds date)
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`;
        logger = new Wrinkle({ toFile: true, fileDateTimeFormat: FILE_DATE_FORMAT_SECONDS, maxLogFileSizeBytes: 360, maxLogFileAge: '1:second' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })


    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${DEFAULT_LOG_DIR}${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
        expect(fs.rmSync).toHaveBeenCalledTimes(1);
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});


describe('toFile: true, maxLogFileSizeBytes: 360, maxLogFileAge: \'1:week\' and out of date file already exists', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.statSync.mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
            .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
        fs.readdirSync.mockReturnValueOnce([`${format(sub(Date.now(), { weeks: 1 }), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`]) // set lastwrotefilename
            .mockReturnValueOnce([`${format(sub(Date.now(), { weeks: 1 }), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`]) // clean out of date initialization
            .mockReturnValueOnce([`${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`]) // clean out of date after write
        fs.existsSync.mockReturnValueOnce(true) // getfilesize 
            .mockReturnValueOnce(true) // create dir: already exists ./logs/
            .mockReturnValueOnce(false) // filesize checks already exists: currentLogFileName.log (toweeks date)
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`;
        logger = new Wrinkle({ toFile: true, maxLogFileSizeBytes: 360, maxLogFileAge: '1:week' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })


    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${DEFAULT_LOG_DIR}${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
        expect(fs.rmSync).toHaveBeenCalledTimes(1);
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});

describe('toFile: true, fileDateTimeFormat: \'LL-dd-yyyy-HH-mm-ss\', maxLogFileSizeBytes: 360, maxLogFileAge: \'1:hour\' and out of date file already exists', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.statSync.mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
            .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
        fs.readdirSync.mockReturnValueOnce([`${format(sub(Date.now(), { hours: 1 }), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`]) // set lastwrotefilename
            .mockReturnValueOnce([`${format(sub(Date.now(), { hours: 1 }), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`]) // clean out of date initialization
            .mockReturnValueOnce([`${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`]) // clean out of date after write
        fs.existsSync.mockReturnValueOnce(true) // getfilesize 
            .mockReturnValueOnce(true) // create dir: already exists ./logs/
            .mockReturnValueOnce(false) // filesize checks already exists: currentLogFileName.log (tohours date)
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`;
        logger = new Wrinkle({ toFile: true, fileDateTimeFormat: FILE_DATE_FORMAT_SECONDS, maxLogFileSizeBytes: 360, maxLogFileAge: '1:hour' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })


    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${DEFAULT_LOG_DIR}${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
        expect(fs.rmSync).toHaveBeenCalledTimes(1);
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});


describe('toFile: true, fileDateTimeFormat: \'LL-dd-yyyy-HH-mm-ss\', maxLogFileSizeBytes: 360, maxLogFileAge: \'1:minute\' and out of date file already exists', () => {
    let debug, info, warn, error, stdoutWrite, mockStreamWrite, testFileName, logger;
    beforeAll(() => {
        debug = jest.spyOn(Wrinkle.prototype, 'debug');
        info = jest.spyOn(Wrinkle.prototype, 'info');
        warn = jest.spyOn(Wrinkle.prototype, 'warn');
        error = jest.spyOn(Wrinkle.prototype, 'error');
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { }); // globalize this
        mockStreamWrite = jest.fn();
        mockStreamEnd = jest.fn();
        fs.statSync.mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
            .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
        fs.readdirSync.mockReturnValueOnce([`${format(sub(Date.now(), { minutes: 1 }), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`]) // set lastwrotefilename
            .mockReturnValueOnce([`${format(sub(Date.now(), { minutes: 1 }), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`]) // clean out of date initialization
            .mockReturnValueOnce([`${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`]) // clean out of date after write
        fs.existsSync.mockReturnValueOnce(true) // getfilesize 
            .mockReturnValueOnce(true) // create dir: already exists ./logs/
            .mockReturnValueOnce(false) // filesize checks already exists: currentLogFileName.log (tominutes date)
        fs.createWriteStream.mockReturnValue({ write: mockStreamWrite, end: mockStreamEnd });
        testFileName = `${DEFAULT_LOG_DIR}${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`;
        logger = new Wrinkle({ toFile: true, fileDateTimeFormat: FILE_DATE_FORMAT_SECONDS, maxLogFileSizeBytes: 360, maxLogFileAge: '1:minute' });
        logger.debug('Test debug.');
        logger.info('Test info.');
        logger.warn('Test warn.');
        logger.error('Test error.');
    })


    afterAll(() => {
        jest.resetAllMocks();
    })

    it('calls debug, info, warn, error once each', () => {
        expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
        expect(info).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);

    });

    it('creates the log dir and file with the correct format', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${DEFAULT_LOG_DIR}${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`, '');
        expect(fs.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
        expect(mockStreamEnd).not.toHaveBeenCalled();
        expect(fs.rmSync).toHaveBeenCalledTimes(1);
    });

    it('writes to console 4 times, \'Test <level>.\' each', () => {
        expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'));
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'));
    });

    it('writes to stream (file) 4 times, \'Test <level>.\' each', () => {
        expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test debug.'), expect.any(Function)); // stream.write is called with log text (file)
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test info.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test warn.'), expect.any(Function));
        expect(mockStreamWrite).toHaveBeenCalledWith(expect.stringContaining('Test error.'), expect.any(Function));
    });
});
