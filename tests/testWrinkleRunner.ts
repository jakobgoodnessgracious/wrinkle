import Wrinkle from '../index';
const flags: { [key: string]: any } = {};
for (let j = 0; j < process.argv.length; j++) {
  const argument = process.argv[j];
  const nextArgument = process.argv[j + 1];
  if (argument.startsWith('-')) {
    const argNoDash = argument.split('-')[1];
    flags[argNoDash] = true;
    if (nextArgument && !nextArgument.startsWith('-')) {
      try {
        flags[argNoDash] = JSON.parse(nextArgument);
      } catch (e) {
        flags[argNoDash] = nextArgument;
      }
    }
  }
}

const logger = new Wrinkle(flags);

const logAtLevel = (level: string, text: string) => {
  switch (level) {
    case 'debug':
      logger.debug(text);
      break;
    case 'info':
      logger.info(text);
      break;
    case 'warn':
      logger.warn(text);
      break;
    case 'error':
      logger.error(text);
      break;
    default:
      logger.debug(level); // no loglevel set - TODO consider handling better
  }
};

if (flags['log']) {
  const logValues = flags['log'];
  let logs: string[] = [];
  if (Array.isArray(logValues)) {
    logs = logValues;
  } else {
    logs.push(logValues);
  }

  logs.forEach((log: string) => {
    const [level, text] = log.split(':');
    logAtLevel(level, text);
  });
}
