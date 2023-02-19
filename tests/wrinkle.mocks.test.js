const Wrinkle = require('../index.js');
const fs = require('fs');


describe('On logging stdout', () => {
    describe('no opts', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        describe('debug', () => {
            it('is called', () => {
                const debug = jest.spyOn(Wrinkle.prototype, 'debug');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const logger = new Wrinkle();
                logger.debug('Test debug.');

                expect(debug).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
            });
        });

        describe('info', () => {
            it('is called', () => {
                const info = jest.spyOn(Wrinkle.prototype, 'info');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const logger = new Wrinkle();
                logger.info('Test info.');

                expect(info).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
            });
        });

        describe('warn', () => {
            it('is called', () => {
                const warn = jest.spyOn(Wrinkle.prototype, 'warn');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const logger = new Wrinkle();
                logger.warn('Test warn.');

                expect(warn).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
            });
        });

        describe('error', () => {
            it('is called', () => {
                const error = jest.spyOn(Wrinkle.prototype, 'error');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const logger = new Wrinkle();
                logger.error('Test error.');

                expect(error).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('no opts', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        describe('debug', () => {
            it('is called', () => {
                const debug = jest.spyOn(Wrinkle.prototype, 'debug');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const logger = new Wrinkle();
                logger.debug('Test debug.');

                expect(debug).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
            });
        });

        describe('info', () => {
            it('is called', () => {
                const info = jest.spyOn(Wrinkle.prototype, 'info');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const logger = new Wrinkle();
                logger.info('Test info.');

                expect(info).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
            });
        });

        describe('warn', () => {
            it('is called', () => {
                const warn = jest.spyOn(Wrinkle.prototype, 'warn');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const logger = new Wrinkle();
                logger.warn('Test warn.');

                expect(warn).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
            });
        });

        describe('error', () => {
            it('is called', () => {
                const error = jest.spyOn(Wrinkle.prototype, 'error');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const logger = new Wrinkle();
                logger.error('Test error.');

                expect(error).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
            });
        });
    });
});


describe('On logging to file', () => {
    describe('toFile: true', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        describe('debug', () => {
            it('is called', () => {
                const debug = jest.spyOn(Wrinkle.prototype, 'debug');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const createWriteStream = jest.spyOn(fs, 'createWriteStream');
                const logger = new Wrinkle({ toFile: true });
                logger.debug('Test debug.');

                expect(debug).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
                expect(createWriteStream).toHaveBeenCalledTimes(1);
            });
        });

        describe('info', () => {
            it('is called', () => {
                const info = jest.spyOn(Wrinkle.prototype, 'info');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const createWriteStream = jest.spyOn(fs, 'createWriteStream');
                const logger = new Wrinkle({ toFile: true });
                logger.info('Test info.');

                expect(info).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
                expect(createWriteStream).toHaveBeenCalledTimes(1);
            });
        });

        describe('warn', () => {
            it('is called', () => {
                const warn = jest.spyOn(Wrinkle.prototype, 'warn');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const createWriteStream = jest.spyOn(fs, 'createWriteStream');
                const logger = new Wrinkle({ toFile: true });
                logger.warn('Test warn.');

                expect(warn).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
                expect(createWriteStream).toHaveBeenCalledTimes(1);
            });
        });

        describe('error', () => {
            it('is called', () => {
                const error = jest.spyOn(Wrinkle.prototype, 'error');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const createWriteStream = jest.spyOn(fs, 'createWriteStream');
                const logger = new Wrinkle({ toFile: true });
                logger.error('Test error.');

                expect(error).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
                expect(createWriteStream).toHaveBeenCalledTimes(1);
            });
        });
    })

    describe('toFile: true, logDir: \'./test\'', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        describe('debug', () => {
            it('is called', () => {
                const debug = jest.spyOn(Wrinkle.prototype, 'debug');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const createWriteStream = jest.spyOn(fs, 'createWriteStream');
                const logger = new Wrinkle({ toFile: true, logDir: './test', maxLogFileSizeBytes: 360, maxLogFileAge: '1:day' });
                logger.debug('Test debug.');

                expect(debug).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
                expect(createWriteStream).toHaveBeenCalledTimes(1);
            });
        });

        describe('info', () => {
            it('is called', () => {
                const info = jest.spyOn(Wrinkle.prototype, 'info');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const createWriteStream = jest.spyOn(fs, 'createWriteStream');
                const logger = new Wrinkle({ toFile: true, logDir: './test', maxLogFileSizeBytes: 360, maxLogFileAge: '1:day' });
                logger.info('Test info.');

                expect(info).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
                expect(createWriteStream).toHaveBeenCalledTimes(1);
            });
        });

        describe('warn', () => {
            it('is called', () => {
                const warn = jest.spyOn(Wrinkle.prototype, 'warn');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const createWriteStream = jest.spyOn(fs, 'createWriteStream');
                const logger = new Wrinkle({ toFile: true, logDir: './test', maxLogFileSizeBytes: 360, maxLogFileAge: '1:day' });
                logger.warn('Test warn.');

                expect(warn).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
                expect(createWriteStream).toHaveBeenCalledTimes(1);
            });
        });

        describe('error', () => {
            it('is called', () => {
                const error = jest.spyOn(Wrinkle.prototype, 'error');
                const stdoutWrite = jest.spyOn(process.stdout, 'write');
                const createWriteStream = jest.spyOn(fs, 'createWriteStream');
                const logger = new Wrinkle({ toFile: true, logDir: './test', maxLogFileSizeBytes: 360, maxLogFileAge: '1:day' });
                logger.error('Test error.');

                expect(error).toHaveBeenCalledTimes(1);
                expect(stdoutWrite).toHaveBeenCalledTimes(1);
                expect(createWriteStream).toHaveBeenCalledTimes(1);
            });
        });
    })
});