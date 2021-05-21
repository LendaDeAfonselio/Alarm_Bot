"use strict";

const timezones_remote_library = require('timezones.json');
const custom_timezones = require('../timezones.json');

var r = 0;
// Parameter parsing
function small_time_interval(mins) {
    if (mins.includes(',')) {
        var tokens = mins.split(',');
        return (tokens.length < 4) && tokens.some(v => small_time_interval(v));
    }
    if (mins.includes('/')) {
        var tokens = mins.split('/');
        if (tokens.length !== 2) {
            return true;
        }
        var num_minutes = tokens[1];
        var n = parseInt(num_minutes);
        var isDigit = num_minutes.match(/^[0-9]+$/);

        return isDigit == null || isNaN(n) || n < 30;
    }
    if (mins === '*') {
        return true;
    }
    if (mins.includes('-')) {
        return true;
    }
    var isDigit = mins.match(/^[0-9]+$/);
    return isDigit == null;
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
        if (tokens.length !== 2) {
            return false;
        }
        var a = isAValidRangeGroupOrNumber(tokens[0], min, max);
        let isDigit = tokens[1].match(/^[0-9]+$/);
        var b = parseInt(tokens[1]);
        return isDigit != null && a && b >= min && b <= max;
    } else if (stg.includes('-')) {
        let tokens = stg.split('-');
        let isDigit1 = tokens[0].match(/^[0-9]+$/);
        let isDigit2 = tokens[1].match(/^[0-9]+$/);
        let a = parseInt(tokens[0]);
        let b = parseInt(tokens[1]);
        return isDigit1 != null && isDigit2 != null && a < b && a >= min && b <= max;
    }
    let isDigit = stg.match(/^[0-9]+$/);
    let num = parseInt(stg);
    return isDigit != null && num >= min && num <= max;
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
        msg.channel.send('Not enough parameters were passed, try `$alarmHelp` for more information!');
        return false;
    }
    let mins = cron_params[0];
    if (!isAValidRangeGroupOrNumber(mins, 0, 59)) {
        msg.channel.send("The minute parameter is invalid. This value must be between 0 and 59.\nTry `$alarmHelp` for more information!");
        return false;
    }
    if (small_time_interval(mins)) {
        msg.channel.send("The minute parameter you sent is susceptible to spam. Only time intervals bigger than 15 minutes, groups of 5 members or less and digits are allowed to avoid spam.");
        return false;
    }

    let hours = cron_params[1];
    if (!isAValidRangeGroupOrNumber(hours, 0, 23)) {
        msg.channel.send("The hour parameter is invalid! This value must be between 0 and 23.\nTry `$alarmHelp` for more information!");
        return false;
    }

    let month_day = cron_params[2];
    if (!isAValidRangeGroupOrNumber(month_day, 1, 31)) {
        msg.channel.send("The day of the month parameter is invalid! This value must be between 0 and 23.\nTry `$alarmHelp` for more information!");
        return false;
    }

    let month = cron_params[3];
    if (!isAValidRangeGroupOrNumber(month, 0, 11)) {
        msg.channel.send("The month parameter is invalid! This value must be between 0 and 11.\nTry `$alarmHelp` for more information!");
        return false;
    }

    let weekday = cron_params[4];
    if (!isAValidRangeGroupOrNumber(weekday, 0, 6)) {
        msg.channel.send("The weekday parameter is invalid! This value must be between 0 (Sunday) and 6 (Saturday).\nTry `$alarmHelp` for more information!");
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
    return custom_timezones.filter(
        function (data) { return data.timezone_abbreviation.toUpperCase() == abr.toUpperCase() }
    )[0];
}

function get_timezone_by_city(city) {
    return timezones_remote_library.filter(
        function (data) {
            return data.utc.find(a => a.includes(city))
        }
    )[0];
}

function get_timezone_offset(stg) {

    // check if the timezone is in format UTC+X
    var offset_utc = get_offset_from_stg('UTC', stg);
    if (offset_utc !== undefined) {
        return offset_utc;
    }

    // check if timezone is in format GMT+X
    var offset_gmt = get_offset_from_stg('GMT', stg);
    if (offset_gmt !== undefined) {
        return offset_gmt;
    }


    var timezone = get_timezone_by_abreviation(stg);
    if (!timezone) {
        timezone = get_timezone_by_city(stg);
        return timezone !== undefined ? timezone.offset : undefined;
    }

    return timezone !== undefined ? get_offset_from_stg('UTC', timezone.utc_offset)
        : undefined;
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
    cron_params[0] = updateParamsAux(cron_params[0], 0, 60, min_diff);
    cron_params[1] = updateParamsAux(cron_params[1], 0, 24, hour_diff);
    let r1 = r;
    cron_params[2] = updateParamsAux(cron_params[2], 1, 31, 0);
    cron_params[3] = updateParamsAux(cron_params[3], 0, 12, 0);
    r = r1;
    cron_params[4] = updateParamsAux(cron_params[4], 0, 6, 0);

    crono = cron_params.slice().join(' ');
    r = 0;
    return crono;
}

function updateParamsAux(stg, min_value, max_value, diff) {
    if (diff === 0 && r === 0) {
        return stg;
    }
    if (stg == '*') {
        return stg;
    } else if (stg.includes(',')) {
        let tokens = stg.split(',');
        let dec = false;
        let inc = false;
        let generated_stgs = new Array();
        for (let t of tokens) {
            let r1 = r;
            generated_stgs.push(updateParamsAux(t, min_value, max_value, diff));
            if (r < 0) {
                dec = true;
            } else if (r > 0) {
                inc = true;
            }
            r = r1;
        }
        inc ? r = 1 : r = 0;
        dec ? r = -1 : r = 0;
        return generated_stgs.join();
    } else if (stg.includes('/')) {
        var tokens = stg.split('/');

        var left_arg = tokens[0];
        var right_arg = tokens[1];
        if (left_arg === '*') {
            left_arg = `${min_value}-${max_value}`;
        }

        let values = get_numbers_for_pattern(left_arg, right_arg);

        return updateParamsAux(values.join(), min_value, max_value, diff);
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
            return `${a}-${max_value - 1},${min_value}-${b % max_value}`;
        } else if (b < 0 && a < 0) {
            a += max_value;
            b += max_value;
            r--;
        } else if (a < 0 && b >= 0) {
            r--;
            return `${a + max_value}-${max_value - 1},0-${b}`;
        }
        return `${a}-${b}`;

    }
    let update_stg = parseInt(stg) - diff + r;
    r = 0;
    if (update_stg < min_value) {
        update_stg = update_stg + max_value;
        r--;
    }
    if (update_stg >= max_value) {
        update_stg = update_stg % max_value;
        r++;
    }
    return update_stg;

}

function get_numbers_for_pattern(left_arg, right_arg) {
    var bounds = left_arg.split('-');
    var min_bound = parseInt(bounds[0]);
    var max_bound = parseInt(bounds[1]);
    var right_arg_num = parseInt(right_arg);
    var numbers_in_interval = new Array();
    for (let i = min_bound; i <= max_bound; i += right_arg_num) {
        numbers_in_interval.push(i);
    }
    return numbers_in_interval;
}

function generateDateGivenOffset(originalDate, offset) {
    if (originalDate === undefined) {
        return undefined;
    }
    // get UTC time in msec
    var original = originalDate.getTime();

    // create new Date object for different city
    // using supplied offset
    return new Date(original - (3600000 * offset));
}

function get_offset_from_stg(ref, stg) {
    if (stg.includes(ref)) {
        let hour_diff = stg.replace(ref, '');
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
}


module.exports = {
    validate_alarm_parameters: validate_alarm_parameters,
    get_timezone_offset: get_timezone_offset,
    get_offset_difference: get_offset_difference,
    updateParams: updateParams,
    generateDateGivenOffset: generateDateGivenOffset,
    get_timezone_by_abreviation: get_timezone_by_abreviation
}