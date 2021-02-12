const Discord = require('discord.js');

/**
 * Checks if an user is a Administrator on a Guild
 * @param {Discord.Message} message - The Discord Message object
 */
function isAdministrator(message) {
    return message.member && message.member.hasPermission("ADMINISTRATOR");
}

/**
 * Checks if an user has the alarm role 
 * @param {Discord.Message} message - the Discord Message object
 * @param {String} alarm_role - The name of the role
 */
function hasAlarmRole(message, alarm_role) {
    if (message.member) {
        let x = message.member.roles.cache.find(r => r.name.toLowerCase() === alarm_role.toLowerCase());
        return x !== undefined;
    }
    return false;
}

/**
 * Checks if a certain user has the permissions to change the alarm
 * @param {Discord.Message} message - The Discord Message object
 * @param {String} alarm_id - The string with the id of the alarm
 */
function can_change_alarm(message, alarm_id) {
    return (message.channel.type === 'dm' && alarm_id.includes(message.author.id)) || (alarm_id.includes(message.author.id) || isAdministrator(message));
}

/**
 * Get the absolute difference between two numbers
 * @param {Number} a - The first number
 * @param {Number} b - The second number
 */
function getAbsoluteDiff(a, b) {
    return a > b ? a - b : b - a;
}

/**
 * Checks if a certain string contains the regular expression for a discord channel
 * @param {String} stg - A string
 */
function isAChannel(stg) {
    const channel_regex = /<#\d+>/;
    var hasSpecifiedChannel = channel_regex.test(stg);
    return hasSpecifiedChannel;
}

/**
 * Returns an array with arrays of the given size.
 *
 * @param {Array} myArray  array to split
 * @param {BigInteger} chunk_size Size of every group
 */
function chunkArray(myArray, chunk_size) {
    var index = 0;
    var arrayLength = myArray.length;
    var tempArray = [];

    for (index = 0; index < arrayLength; index += chunk_size) {
        myChunk = myArray.slice(index, index + chunk_size);
        // Do something if you want with the group
        tempArray.push(myChunk);
    }

    return tempArray;
}

/**
 * Compares two strings ignoring casing
 * @param {String} stg1 - the first string
 * @param {String} stg2 - the second string
 */
function compareIgnoringCase(stg1, stg2) {
    return stg1.toUpperCase() === stg2.toUpperCase();
}

module.exports = {
    hasAlarmRole: hasAlarmRole,
    isAdministrator: isAdministrator,
    can_change_alarm: can_change_alarm,
    getAbsoluteDiff: getAbsoluteDiff,
    chunkArray: chunkArray,
    isAChannel: isAChannel,
    compareIgnoringCase: compareIgnoringCase
}