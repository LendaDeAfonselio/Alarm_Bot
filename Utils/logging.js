const winston = require('winston');
const { combine, timestamp, label, printf } = winston.format;
const myFormat = printf(info => {
    if (info instanceof Error) {
        return `${info.timestamp} - ${info.level}: ${info.message} ${info.stack}`;
    }
    return `${info.timestamp} - ${info.level}: ${info.message}`;
});
const logger = winston.createLogger({
    level: 'info',
    format: combine(
        winston.format.splat(),
        timestamp(),
        myFormat,
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console(),
    ],
});

module.exports = {
    logger: logger
};