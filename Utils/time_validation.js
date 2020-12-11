function small_time_interval(mins) {
    if (mins === '*') {
        return true;
    }
    if (mins.includes('-')) {
        return true;
    }
    if (!mins.includes('*/')) {
        return false;
    }
    let num_minutes = mins.replace('*/', '');
    let n = parseInt(num_minutes);

    return isNaN(n) || n < 15;
}

function isAValidRangeGroupOrNumber(stg, min, max) {
    if (stg == '*') {
        return true;
    } else if (stg.includes('-')) {
        let tokens = stg.split('-');
        let a = parseInt(tokens[0]);
        let b = parseInt(tokens[1]);
        return a >= min && b <= max;
    } else if (stg.includes('/*')) {
        let num = mins.replace('*/', '');
        let n = parseInt(num);
        return n >= min && n <= max;
    } else if (stg.includes(',')) {
        let tokens = stg.split(',');
        for (let t of tokens) {
            if (t < min || t > max) {
                return false;
            }
        }
        return true;
    }
    let num = parseInt(stg);
    return num >= min && num <= max;
}

function validate_alarm_parameters(msg, cron_stg, message_stg) {
    let cron_params = cron_stg.split(" ");
    if (message_stg.length === 0) {
        msg.channel.send('The message is empty! Please insert a message before proceding!');
        return false;
    }

    if (message_stg.length > 350) { // message is too long
        msg.channel.send('The message is too long, please trim it down!');
        return false;
    }

    if (cron_params.length < 5) {
        msg.channel.send('Not enough parameters were passed, try `#alarmHelp` for more information!');
        return false;
    }
    let mins = cron_params[0];
    if (small_time_interval(mins)) {
        msg.channel.send("The minute parameter you sent is either invalid or too short. Only time intervals bigger than 15 minutes are allowed to avoid spam");
        return false;
    }

    let hours = cron_params[1];
    if (!isAValidRangeGroupOrNumber(hours, 0, 23)) {
        msg.channel.send("The hour parameter is invalid! Try `#alarmHelp` for more information!");
        return false;
    }

    let month_day = cron_params[2];
    if (!isAValidRangeGroupOrNumber(month_day, 1, 31)) {
        msg.channel.send("The day of the month parameter is invalid! Try `#alarmHelp` for more information!");
        return false;
    }

    let month = cron_params[3];
    if(!isAValidRangeGroupOrNumber(month, 0, 11)){
        msg.channel.send("The month parameter is invalid! Try `#alarmHelp` for more information!");
        return false;
    }

    let weekday = cron_params[4];
    if(!isAValidRangeGroupOrNumber(weekday, 0, 7)){
        msg.channel.send("The weekday parameter is invalid! Try `#alarmHelp` for more information!");
        return false;
    }

    return true;
}

module.exports = {
    validate_alarm_parameters : validate_alarm_parameters
}