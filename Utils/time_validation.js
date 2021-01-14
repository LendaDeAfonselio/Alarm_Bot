"use strict";

const timezones = require('timezones.json');
var r = 0;
// Parameter parsing
function small_time_interval(mins) {
    if (mins.includes('/')) {
        var tokens = stg.split('/');
        return false;
    }
    if (mins === '*') {
        return true;
    }
    if (mins.includes('-')) {
        return true;
    }
    let num_minutes = mins.replace('*/', '');
    let n = parseInt(num_minutes);

    return isNaN(n) || n < 15;
}

/**
 * 
 * @param {String} stg - The stg to be validated
 * @param {Number} min - The min value that a number can have within this group or number
 * @param {Number} max - The max value that a number can have within this group or number
 */
function isAValidRangeGroupOrNumber(stg, min, max) {
    // TODO: Rework this function to be recursive
    if (stg == '*') {
        return true;
    } else if (stg.includes(',')) {
        var tokens = stg.split(',');
        return tokens.every(v => isAValidRangeGroupOrNumber(v, min, max));
    } else if (stg.includes('/')) {
        var tokens = stg.split('/');
        return tokens.length === 2 && tokens.every(v => isAValidRangeGroupOrNumber(v, min, max));
    } else if (stg.includes('-')) {
        let tokens = stg.split('-');
        let a = parseInt(tokens[0]);
        let b = parseInt(tokens[1]);
        return a < b && a >= min && b <= max;
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
    if (!isAValidRangeGroupOrNumber(month, 0, 11)) {
        msg.channel.send("The month parameter is invalid! Try `#alarmHelp` for more information!");
        return false;
    }

    let weekday = cron_params[4];
    if (!isAValidRangeGroupOrNumber(weekday, 0, 7)) {
        msg.channel.send("The weekday parameter is invalid! Try `#alarmHelp` for more information!");
        return false;
    }

    return true;
}

// Timezones arranging 

// https://stackoverflow.com/questions/11887934/how-to-check-if-dst-daylight-saving-time-is-in-effect-and-if-so-the-offset
Date.prototype.stdTimezoneOffset = function () {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

// https://stackoverflow.com/questions/11887934/how-to-check-if-dst-daylight-saving-time-is-in-effect-and-if-so-the-offset
Date.prototype.isDstObserved = function () {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
}


function get_timezone_by_abreviation(abr) {
    return timezones.filter(
        function (data) { return data.abbr == abr }
    )[0];
}

function get_timezone_by_city(city) {
    return timezones.filter(
        function (data) {
            return data.utc.find(a => a.includes(city))
        }
    )[0];
}

function get_timezone_offset(stg) {
    if (stg.includes('UTC')) {
        let hour_diff = stg.replace('UTC', '');
        if (hour_diff === '') {
            // simply UTC
            return 0;
        }
        let signal = hour_diff[0];
        hour_diff = hour_diff.replace(signal, '');
        if (!(signal === '-' || signal === '+')) {
            return undefined;
        }
        let tokens = hour_diff.split(':');
        if (tokens.length >= 1) {
            let hours = parseInt(signal.concat(tokens[0]));
            let offset = hours;
            if (tokens.length >= 2) {
                let minutes = parseInt(signal.concat(tokens[1]));
                offset = offset + (minutes / 60);
            }
            return offset;
        }
        return undefined;
    }
    var timezone = get_timezone_by_abreviation(stg);
    if (!timezone) {
        timezone = get_timezone_by_city(stg);
    }

    return timezone !== undefined ? timezone.offset : undefined;
}

function get_offset_difference(stg) {
    let other_offset = get_timezone_offset(stg);
    if (other_offset === undefined) {
        return undefined;
    }

    var today = new Date();
    let current_offset = 0;
    if (today.isDstObserved()) {
        current_offset = 1;
    }
    return other_offset - current_offset;
    //return utility.getAbsoluteDiff(other_offset, current_offset);
}

function updateParams(difference, crono) {
    let hour_diff = Math.trunc(difference);
    let min_diff = (difference % 1) * 60;
    let cron_params = crono.split(" ");
    cron_params[0] = updateParamsAux(cron_params[0], 60, min_diff);
    cron_params[1] = updateParamsAux(cron_params[1], 24, hour_diff);
    let r1 = r;
    cron_params[2] = updateParamsAux(cron_params[2], 31, 0);
    cron_params[3] = updateParamsAux(cron_params[3], 11, 0);
    r = r1;
    cron_params[4] = updateParamsAux(cron_params[4], 7, 0);

    crono = cron_params.slice().join(' ');
    return crono;
}

function updateParamsAux(stg, max_value, diff) {
    if (diff === 0 && r === 0) {
        return stg;
    }
    if (stg == '*') {
        return stg;
    } else if (stg.includes('-')) {
        let tokens = stg.split('-');
        let a = parseInt(tokens[0]);
        let b = parseInt(tokens[1]);
        // update range
        a = (a - diff + r);
        b = (b - diff + r);
        r = 0;
        if (b >= max_value && a >= max_value) {
            a %= max_value;
            b %= max_value;
            r++;
        } else if (b >= max_value && a < max_value) {
            return `${a}-23,0-${b % max_value}`;
        } else if (b < 0 && a < 0) {
            a += max_value;
            b += max_value;
            r--;
        } else if (a < 0 && b >= 0) {
            r--;
            return `${a + max_value}-23,0-${b}`;
        }
        return `${a}-${b}`;

    } else if (stg.includes('*/')) {
        let num = stg.replace('*/', '');
        let n = parseInt(num);
        // idk if this works tbh 
        //TODO:  Work this out
        return stg;
    } else if (stg.includes(',')) {
        let tokens = stg.split(',');
        let updateValues = new Array();
        let dec = false;
        let inc = false;
        for (let t of tokens) {
            let tot_sum = parseInt(t) - diff + r;
            let new_t = tot_sum % max_value;
            if (tot_sum < 0) {
                new_t = tot_sum + max_value;
                dec = true;
            }
            if (tot_sum > max_value) {
                inc = true;
            }
            updateValues.push(new_t);
        }
        inc ? r = 1 : r = 0;
        dec ? r = -1 : r = 0;
        return updateValues.join();
    } else {
        let update_stg = parseInt(stg) - diff + r;
        r = 0;
        if (update_stg < 0) {
            update_stg = update_stg + max_value;
            r--;
        }
        if (update_stg > max_value) {
            update_stg = update_stg % max_value;
            r++;
        }
        return update_stg;
    }
}

function generateDateGivenOffset(originalDate, offset) {
    // get UTC time in msec
    var original = originalDate.getTime();

    // create new Date object for different city
    // using supplied offset
    return new Date(original - (3600000 * offset));
}
console.log(isAValidRangeGroupOrNumber("*",0,10));
console.log(isAValidRangeGroupOrNumber("*/2",0,10));
console.log(isAValidRangeGroupOrNumber("*/2,*/3",0,10));
console.log(isAValidRangeGroupOrNumber("1-5,6-8",0,10));
console.log(isAValidRangeGroupOrNumber("6-5,6-8",0,10));
console.log(isAValidRangeGroupOrNumber("*/11",0,10));
console.log(isAValidRangeGroupOrNumber("1-32/11",0,10));
console.log(isAValidRangeGroupOrNumber("1-32/11/2",0,10));
console.log(isAValidRangeGroupOrNumber("1-32/11",0,79));
console.log(isAValidRangeGroupOrNumber("1",0,79));
console.log(isAValidRangeGroupOrNumber("111",0,79));








module.exports = {
    validate_alarm_parameters: validate_alarm_parameters,
    get_timezone_offset: get_timezone_offset,
    get_offset_difference: get_offset_difference,
    updateParams: updateParams,
    generateDateGivenOffset: generateDateGivenOffset
}