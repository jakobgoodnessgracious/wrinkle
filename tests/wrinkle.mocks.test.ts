import Wrinkle from '../index';
import fs, { WriteStream } from 'fs';
jest.mock('fs');
const mockFS: jest.Mocked<typeof fs> = <jest.Mocked<typeof fs>>fs;
const DEFAULT_FILE_DATE_FORMAT = 'LL-dd-yyyy';
const FILE_DATE_FORMAT_SECONDS = 'LL-dd-yyyy-HH-mm-ss';
const FILE_DATE_FORMAT_MINUTES = 'LL-dd-yyyy-HH-mm';
const DEFAULT_LOG_DIR = './logs/';
import { format, sub } from 'date-fns';
// test options

describe('no opts', () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    logger = new Wrinkle();
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });
});

describe("no opts and NODE_ENV === 'production'", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    logger;
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    logger = new Wrinkle();
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    process.env.NODE_ENV = 'test';
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("writes to console 1 time, 'Test error.'", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(1); // process.stdout.write is called (console)
    expect(stdoutWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });
});

describe("logLevel: 'warn' and NODE_ENV === 'production'", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    logger = new Wrinkle({ logLevel: 'warn' });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    process.env.NODE_ENV = 'test';
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("writes to console 2 times, 'Test <level>.'", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(2); // process.stdout.write is called (console)
    expect(stdoutWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });
});

describe('toFile: true, create, destroy, end', () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    mockStreamDestroy: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    mockStreamDestroy = jest.fn();
    (<jest.Mock>fs.readdirSync).mockReturnValue([]);
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
      destroy: mockStreamDestroy,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'
    }`;
    logger = new Wrinkle({ toFile: true });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
    logger.end();
    logger.create();
    logger.destroy();
    logger.create();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(testFileName, '');
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(3); // fs.createWriteStream is called twice (file)
    expect(mockStreamEnd).toHaveBeenCalledTimes(1);
    expect(mockStreamDestroy).toHaveBeenCalledTimes(1);
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe('toFile: true, logLevel: debug', () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.readdirSync).mockReturnValue([]);
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'
    }`;
    logger = new Wrinkle({ toFile: true, logLevel: 'debug' });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(testFileName, '');
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe('toFile: true, logLevel: info ', () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.readdirSync).mockReturnValue([]);
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'
    }`;
    logger = new Wrinkle({ toFile: true, logLevel: 'info' });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(testFileName, '');
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(3); // process.stdout.write is called (console)
    expect(stdoutWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(3); // stream.write is called (file)
    expect(mockStreamWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe('toFile: true, logLevel: warn ', () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.readdirSync).mockReturnValue([]);
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'
    }`;
    logger = new Wrinkle({ toFile: true, logLevel: 'warn' });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(testFileName, '');
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(2); // process.stdout.write is called (console)
    expect(stdoutWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(2); // stream.write is called (file)
    expect(mockStreamWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe('toFile: true, logLevel: error ', () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.readdirSync).mockReturnValue([]);
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'
    }`;
    logger = new Wrinkle({ toFile: true, logLevel: 'error' });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });
  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(1); // process.stdout.write is called (console)
    expect(stdoutWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(testFileName, '');
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(1); // stream.write is called (file)
    expect(mockStreamWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).not.toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe("toFile: true, logDir: './test' ", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.readdirSync).mockReturnValue([]);
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `./test/${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'
    }`;
    logger = new Wrinkle({ toFile: true, logDir: './test' });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(testFileName, '');
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe("toFile: true, logDir: './test/' ", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.readdirSync).mockReturnValue([]);
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `./test/${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'
    }`;
    logger = new Wrinkle({ toFile: true, logDir: './test/' });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(testFileName, '');
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // mockFS.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe("toFile: true, logDir: '../test' ", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    stderrWrite: jest.SpyInstance,
    testFileName: string,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    stderrWrite = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.readdirSync).mockReturnValue([]);
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'
    }`;
    logger = new Wrinkle({ toFile: true, logDir: '../test' });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
    process.exitCode = 0; // reset the code back to non-exit-code
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('does not create the log dir or file', () => {
    expect(mockFS.writeFileSync).not.toHaveBeenCalled();
    expect(mockFS.createWriteStream).not.toHaveBeenCalled(); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('does not write to stdout, writes to stderr once', () => {
    expect(stdoutWrite).not.toHaveBeenCalled(); // process.stdout.write is called (console)
    expect(stderrWrite).toHaveBeenCalledTimes(1);
    expect(stderrWrite).toHaveBeenCalledWith(
      expect.stringContaining(
        "[wrinkle]: logDir: '../test/' is not a safe path. Set option 'unsafeMode: true' to ignore this check. Exiting..."
      )
    );
  });

  it('does not write to stream (file)', () => {
    expect(mockStreamWrite).not.toHaveBeenCalled(); // stream.write is called (file)
  });
});

describe("toFile: true, logDir: '/test' ", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    stderrWrite: jest.SpyInstance,
    testFileName: string,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    stderrWrite = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    mockFS.readdirSync.mockReturnValue([]);
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'
    }`;
    logger = new Wrinkle({ toFile: true, logDir: '/test' });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
    process.exitCode = 0; // reset the code back to non-exit-code
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('does not create the log dir or file', () => {
    expect(mockFS.writeFileSync).not.toHaveBeenCalled();
    expect(mockFS.createWriteStream).not.toHaveBeenCalled(); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('does not write to stdout, writes to stderr once', () => {
    expect(stdoutWrite).not.toHaveBeenCalled(); // process.stdout.write is called (console)
    expect(stderrWrite).toHaveBeenCalledTimes(1);
    expect(stderrWrite).toHaveBeenCalledWith(
      expect.stringContaining(
        "[wrinkle]: logDir: '/test/' is not a safe path. Set option 'unsafeMode: true' to ignore this check. Exiting..."
      )
    );
  });

  it('does not write to stream (file)', () => {
    expect(mockStreamWrite).not.toHaveBeenCalled(); // stream.write is called (file)
  });
});

describe('toFile: true, maxLogFileSizeBytes: 360 ', () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    mockFS.readdirSync.mockReturnValue([]);
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'
    }`;
    logger = new Wrinkle({ toFile: true, maxLogFileSizeBytes: 360 });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(testFileName, '');
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe('toFile: true, maxLogFileSizeBytes: 360 and file already exists', () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    const oneVersionedFile: string[] = [
      `${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`,
    ];
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.statSync)
      .mockReturnValueOnce({ mtime: { getTime: () => 123 } }) // topVersioned // TODO type better
      .mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
      .mockReturnValueOnce({ size: BigInt(0) }); // currentLogFileName.1.log
    (<jest.Mock>fs.readdirSync).mockReturnValue(oneVersionedFile); // TODO type better
    mockFS.existsSync
      .mockReturnValueOnce(true) // getfilesize
      .mockReturnValueOnce(true) // create dir: already exists ./logs/
      .mockReturnValueOnce(true) // filesize checks already exists: currentLogFileName.0.log
      .mockReturnValueOnce(false) // currentLogFileName.1.log already exists: createWriteStream
      .mockReturnValue(true); // filesize checks already exists: currentLogFileName.1.log
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'
    }`;
    logger = new Wrinkle({ toFile: true, maxLogFileSizeBytes: 360 });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(
      `${DEFAULT_LOG_DIR}${
        format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.1' + '.log'
      }`,
      ''
    );
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe("toFile: true, maxLogFileAge: '1:month' and out of date file already exists", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    const oneOldVersionedFile = [
      `${
        format(sub(Date.now(), { months: 1 }), DEFAULT_FILE_DATE_FORMAT) +
        '.log'
      }`,
    ];
    const oneVersionedFile = [
      `${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'}`,
    ];
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.statSync)
      .mockReturnValueOnce({ mtime: { getTime: () => 123 } }) // topVersioned // TODO type better
      .mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
      .mockReturnValueOnce({ size: BigInt(0) }); // currentLogFileName.1.log

    (<jest.Mock>fs.statSync)
      .mockReturnValueOnce({ mtime: { getTime: () => 123 } }) // topVersioned
      .mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
      .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
    (<jest.Mock>fs.readdirSync)
      .mockReturnValueOnce(oneOldVersionedFile) // set lastwrotefilename
      .mockReturnValueOnce(oneOldVersionedFile) // clean out of date initialization
      .mockReturnValueOnce(oneVersionedFile); // clean out of date after write
    mockFS.existsSync
      .mockReturnValueOnce(true) // getfilesize
      .mockReturnValueOnce(true) // create dir: already exists ./logs/
      .mockReturnValueOnce(false); // filesize checks already exists: currentLogFileName.log (todays date)
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'
    }`;
    logger = new Wrinkle({ toFile: true, maxLogFileAge: '1:month' });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(
      `${DEFAULT_LOG_DIR}${
        format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.log'
      }`,
      ''
    );
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
    expect(mockFS.rmSync).toHaveBeenCalledTimes(1);
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe("toFile: true, maxLogFileSizeBytes: 360, maxLogFileAge: '1:month' and out of date file already exists", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    const oneOldVersionedFile = [
      `${
        format(sub(Date.now(), { months: 1 }), DEFAULT_FILE_DATE_FORMAT) +
        '.0' +
        '.log'
      }`,
    ];
    const oneVersionedFile = [
      `${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`,
    ];
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.statSync)
      .mockReturnValueOnce({ mtime: { getTime: () => 123 } }) // topVersioned
      .mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
      .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
    (<jest.Mock>fs.readdirSync)
      .mockReturnValueOnce(oneOldVersionedFile) // set lastwrotefilename
      .mockReturnValueOnce(oneOldVersionedFile) // clean out of date initialization
      .mockReturnValueOnce(oneVersionedFile); // clean out of date after write
    mockFS.existsSync
      .mockReturnValueOnce(true) // getfilesize
      .mockReturnValueOnce(true) // create dir: already exists ./logs/
      .mockReturnValueOnce(false); // filesize checks already exists: currentLogFileName.log (todays date)
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'
    }`;
    logger = new Wrinkle({
      toFile: true,
      maxLogFileSizeBytes: 360,
      maxLogFileAge: '1:month',
    });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(
      `${DEFAULT_LOG_DIR}${
        format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'
      }`,
      ''
    );
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
    expect(mockFS.rmSync).toHaveBeenCalledTimes(1);
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe("toFile: true, maxLogFileSizeBytes: 360, maxLogFileAge: '1:day' and out of date file already exists", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    const oneOldVersionedFile = [
      `${
        format(sub(Date.now(), { days: 1 }), DEFAULT_FILE_DATE_FORMAT) +
        '.0' +
        '.log'
      }`,
    ];
    const oneVersionedFile = [
      `${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`,
    ];
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.statSync)
      .mockReturnValueOnce({ mtime: { getTime: () => 123 } }) // topVersioned
      .mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
      .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
    (<jest.Mock>fs.readdirSync)
      .mockReturnValueOnce(oneOldVersionedFile) // set lastwrotefilename
      .mockReturnValueOnce(oneOldVersionedFile) // clean out of date initialization
      .mockReturnValueOnce(oneVersionedFile); // clean out of date after write
    mockFS.existsSync
      .mockReturnValueOnce(true) // getfilesize
      .mockReturnValueOnce(true) // create dir: already exists ./logs/
      .mockReturnValueOnce(false); // filesize checks already exists: currentLogFileName.log (todays date)
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'
    }`;
    logger = new Wrinkle({
      toFile: true,
      maxLogFileSizeBytes: 360,
      maxLogFileAge: '1:day',
    });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(
      `${DEFAULT_LOG_DIR}${
        format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'
      }`,
      ''
    );
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
    expect(mockFS.rmSync).toHaveBeenCalledTimes(1);
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe("toFile: true, fileDateTimeFormat: 'LL-dd-yyyy-HH-mm-ss' maxLogFileSizeBytes: 360, maxLogFileAge: '1:second' and out of date file already exists", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    const oneOldVersionedFile = [
      `${
        format(sub(Date.now(), { seconds: 1 }), FILE_DATE_FORMAT_SECONDS) +
        '.0' +
        '.log'
      }`,
    ];
    const oneVersionedFile = [
      `${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`,
    ];
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.statSync)
      .mockReturnValueOnce({ mtime: { getTime: () => 123 } }) // topVersioned
      .mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
      .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
    (<jest.Mock>fs.readdirSync)
      .mockReturnValueOnce(oneOldVersionedFile) // set lastwrotefilename
      .mockReturnValueOnce(oneOldVersionedFile) // clean out of date initialization
      .mockReturnValueOnce(oneVersionedFile); // clean out of date after write
    mockFS.existsSync
      .mockReturnValueOnce(true) // getfilesize
      .mockReturnValueOnce(true) // create dir: already exists ./logs/
      .mockReturnValueOnce(false); // filesize checks already exists: currentLogFileName.log (toseconds date)
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'
    }`;
    logger = new Wrinkle({
      toFile: true,
      fileDateTimeFormat: FILE_DATE_FORMAT_SECONDS,
      maxLogFileSizeBytes: 360,
      maxLogFileAge: '1:second',
    });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(
      `${DEFAULT_LOG_DIR}${
        format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'
      }`,
      ''
    );
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
    expect(mockFS.rmSync).toHaveBeenCalledTimes(1);
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe("toFile: true, maxLogFileSizeBytes: 360, maxLogFileAge: '1:week' and out of date file already exists", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    const oneOldVersionedFile = [
      `${
        format(sub(Date.now(), { weeks: 1 }), DEFAULT_FILE_DATE_FORMAT) +
        '.0' +
        '.log'
      }`,
    ];
    const oneVersionedFile = [
      `${format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'}`,
    ];
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.statSync)
      .mockReturnValueOnce({ mtime: { getTime: () => 123 } }) // topVersioned
      .mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
      .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
    (<jest.Mock>fs.readdirSync)
      .mockReturnValueOnce(oneOldVersionedFile) // set lastwrotefilename
      .mockReturnValueOnce(oneOldVersionedFile) // clean out of date initialization
      .mockReturnValueOnce(oneVersionedFile); // clean out of date after write
    mockFS.existsSync
      .mockReturnValueOnce(true) // getfilesize
      .mockReturnValueOnce(true) // create dir: already exists ./logs/
      .mockReturnValueOnce(false); // filesize checks already exists: currentLogFileName.log (toweeks date)
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'
    }`;
    logger = new Wrinkle({
      toFile: true,
      maxLogFileSizeBytes: 360,
      maxLogFileAge: '1:week',
    });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(
      `${DEFAULT_LOG_DIR}${
        format(Date.now(), DEFAULT_FILE_DATE_FORMAT) + '.0' + '.log'
      }`,
      ''
    );
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
    expect(mockFS.rmSync).toHaveBeenCalledTimes(1);
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe("toFile: true, fileDateTimeFormat: 'LL-dd-yyyy-HH-mm-ss', maxLogFileSizeBytes: 360, maxLogFileAge: '1:hour' and out of date file already exists", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    const oneOldVersionedFile = [
      `${
        format(sub(Date.now(), { hours: 1 }), FILE_DATE_FORMAT_SECONDS) +
        '.0' +
        '.log'
      }`,
    ];
    const oneVersionedFile = [
      `${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`,
    ];
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.statSync)
      .mockReturnValueOnce({ mtime: { getTime: () => 123 } }) // topVersioned
      .mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
      .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
    (<jest.Mock>fs.readdirSync)
      .mockReturnValueOnce(oneOldVersionedFile) // set lastwrotefilename
      .mockReturnValueOnce(oneOldVersionedFile) // clean out of date initialization
      .mockReturnValueOnce(oneVersionedFile); // clean out of date after write
    mockFS.existsSync
      .mockReturnValueOnce(true) // getfilesize
      .mockReturnValueOnce(true) // create dir: already exists ./logs/
      .mockReturnValueOnce(false); // filesize checks already exists: currentLogFileName.log (tohours date)
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'
    }`;
    logger = new Wrinkle({
      toFile: true,
      fileDateTimeFormat: FILE_DATE_FORMAT_SECONDS,
      maxLogFileSizeBytes: 360,
      maxLogFileAge: '1:hour',
    });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(
      `${DEFAULT_LOG_DIR}${
        format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'
      }`,
      ''
    );
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
    expect(mockFS.rmSync).toHaveBeenCalledTimes(1);
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe("toFile: true, fileDateTimeFormat: 'LL-dd-yyyy-HH-mm-ss', maxLogFileSizeBytes: 360, maxLogFileAge: '1:minute' and out of date file already exists", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    const oneOldVersionedFile = [
      `${
        format(sub(Date.now(), { minutes: 1 }), FILE_DATE_FORMAT_SECONDS) +
        '.0' +
        '.log'
      }`,
    ];
    const oneVersionedFile = [
      `${format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'}`,
    ];
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.statSync)
      .mockReturnValueOnce({ mtime: { getTime: () => 123 } }) // topVersioned
      .mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
      .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
    (<jest.Mock>fs.readdirSync)
      .mockReturnValueOnce(oneOldVersionedFile) // set lastwrotefilename
      .mockReturnValueOnce(oneOldVersionedFile) // clean out of date initialization
      .mockReturnValueOnce(oneVersionedFile); // clean out of date after write
    mockFS.existsSync
      .mockReturnValueOnce(true) // getfilesize
      .mockReturnValueOnce(true) // create dir: already exists ./logs/
      .mockReturnValueOnce(false); // filesize checks already exists: currentLogFileName.log (tominutes date)
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'
    }`;
    logger = new Wrinkle({
      toFile: true,
      fileDateTimeFormat: FILE_DATE_FORMAT_SECONDS,
      maxLogFileSizeBytes: 360,
      maxLogFileAge: '1:minute',
    });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(
      `${DEFAULT_LOG_DIR}${
        format(Date.now(), FILE_DATE_FORMAT_SECONDS) + '.0' + '.log'
      }`,
      ''
    );
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
    expect(mockFS.rmSync).toHaveBeenCalledTimes(1);
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

describe("toFile: true, fileDateTimeFormat: 'LL-dd-yyyy-HH-mm', maxLogFileSizeBytes: 360, maxLogFileAge: '1:minute' and out of date files already exist in multiple formats", () => {
  let debug: jest.SpyInstance<void, string[], any>,
    info: jest.SpyInstance<void, string[], any>,
    warn: jest.SpyInstance<void, string[], any>,
    error: jest.SpyInstance<void, string[], any>,
    stdoutWrite: jest.SpyInstance,
    mockStreamWrite: jest.Func,
    mockStreamEnd: jest.Func,
    testFileName: string,
    logger;
  beforeAll(() => {
    const vzeroAnd1files = [
      `${format(Date.now(), FILE_DATE_FORMAT_MINUTES) + '.0' + '.log'}`,
      `${format(Date.now(), FILE_DATE_FORMAT_MINUTES) + '.1' + '.log'}`,
    ];
    const twoOldFilesMix = [
      `${
        format(sub(Date.now(), { minutes: 1 }), DEFAULT_FILE_DATE_FORMAT) +
        '.log'
      }`,
      `${
        format(sub(Date.now(), { minutes: 1 }), FILE_DATE_FORMAT_MINUTES) +
        '.0' +
        '.log'
      }`,
    ];
    debug = jest.spyOn(Wrinkle.prototype, 'debug');
    info = jest.spyOn(Wrinkle.prototype, 'info');
    warn = jest.spyOn(Wrinkle.prototype, 'warn');
    error = jest.spyOn(Wrinkle.prototype, 'error');
    stdoutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true); // globalize this
    mockStreamWrite = jest
      .fn()
      .mockImplementation((buffer, handler) => handler());
    mockStreamEnd = jest.fn();
    (<jest.Mock>fs.statSync)
      .mockReturnValueOnce({ mtime: { getTime: () => 123 } }) // topVersioned
      .mockReturnValueOnce({ mtime: { getTime: () => 123 } }) // topVersioned
      .mockReturnValueOnce({ size: 360 }) // currentLogFileName.0.log
      .mockReturnValueOnce({ size: 0 }); // currentLogFileName.1.log
    (<jest.Mock>fs.readdirSync)
      .mockReturnValueOnce(twoOldFilesMix) // set lastwrotefilename
      .mockReturnValueOnce(twoOldFilesMix) // clean out of date initialization
      .mockReturnValueOnce(vzeroAnd1files) // clean out of date after write
      .mockReturnValueOnce(vzeroAnd1files) // clean out of date after write
      .mockReturnValueOnce(vzeroAnd1files) // clean out of date after write
      .mockReturnValueOnce(vzeroAnd1files); // clean out of date after write
    mockFS.existsSync
      .mockReturnValueOnce(true) // getfilesize
      .mockReturnValueOnce(true) // create dir: already exists ./logs/
      .mockReturnValueOnce(true) // filesize checks already exists: currentLogFileName.log (tominutes date)
      .mockReturnValueOnce(false) // createWriteStream checks already exists: currentLogFileName.log (tominutes date)
      .mockReturnValue(true); // createWriteStream checks already exists: currentLogFileName.log (tominutes date)
    mockFS.createWriteStream.mockReturnValue({
      write: mockStreamWrite,
      end: mockStreamEnd,
    } as WriteStream);
    testFileName = `${DEFAULT_LOG_DIR}${
      format(Date.now(), FILE_DATE_FORMAT_MINUTES) + '.0' + '.log'
    }`;
    logger = new Wrinkle({
      toFile: true,
      fileDateTimeFormat: FILE_DATE_FORMAT_MINUTES,
      maxLogFileSizeBytes: 360,
      maxLogFileAge: '1:minute',
    });
    logger.debug('Test debug.');
    logger.info('Test info.');
    logger.warn('Test warn.');
    logger.error('Test error.');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('calls debug, info, warn, error once each', () => {
    expect(debug).toHaveBeenCalledTimes(1); // debug is called (wrinkle)
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('creates the log dir and file with the correct format', () => {
    expect(mockFS.writeFileSync).toHaveBeenCalledWith(
      `${DEFAULT_LOG_DIR}${
        format(Date.now(), FILE_DATE_FORMAT_MINUTES) + '.1' + '.log'
      }`,
      ''
    );
    expect(mockFS.createWriteStream).toHaveBeenCalledTimes(1); // fs.createWriteStream is called (file)
    expect(mockStreamEnd).not.toHaveBeenCalled();
    expect(mockFS.rmSync).toHaveBeenCalledTimes(2); // removes two files (one day format, one second format)
  });

  it("writes to console 4 times, 'Test <level>.' each", () => {
    expect(stdoutWrite).toHaveBeenCalledTimes(4); // process.stdout.write is called (console)
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.')
    );
    expect(stdoutWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.')
    );
  });

  it("writes to stream (file) 4 times, 'Test <level>.' each", () => {
    expect(mockStreamWrite).toHaveBeenCalledTimes(4); // stream.write is called (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test debug.'),
      expect.any(Function)
    ); // stream.write is called with log text (file)
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test info.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test warn.'),
      expect.any(Function)
    );
    expect(mockStreamWrite).toHaveBeenCalledWith(
      expect.stringContaining('Test error.'),
      expect.any(Function)
    );
  });
});

// TODO test lastwrotefilename different file formats -- kind of done
// TODO test logdatetime
// TODO test log file name rollover -- kind of done
// TODO test oldfilenames regular day only format, new ones with seconds -- kind of done
// TODO test bad inputs on opts
