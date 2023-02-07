const Wrinkle = require('wrinkle');
const flags = {};
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

let logger;
if (flags['toFile']) {
    logger = new Wrinkle({ logLevel: process.env.LOG_LEVEL, toFile: true, fileDateTimeFormat: 'LL-dd-yyyy', maxLogFileSizeBytes: 5000 });
} else {
    logger = new Wrinkle();

}

if (flags['log']) {
    logger.debug(flags['log']);
}
