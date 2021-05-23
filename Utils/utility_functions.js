"use strict";

const Discord = require('discord.js');
const auth = require('./../auth.json');
const alarm_db = require('./../data_access/alarm_index');

function isPrivateAlarm(alarm_id) {
    return alarm_id.startsWith(auth.private_prefix);
}

function isOtaAlarm(alarm_id) {
    return alarm_id.startsWith(auth.one_time_prefix);

}

function isPublicAlarm(alarm_id) {
    return alarm_id.startsWith(auth.public_alarm_prefix);

}

/**
 * Checks if an user can create a public alarm
 * @param {String} user_id  - the id of user
 * @param {String} guild_id - the id of the guild
 */
async function can_create_public_alarm(user_id, guild_id) {
    let alarmsUser = await alarm_db.get_all_alarms_from_user(user_id);
    let alarmsGuild = await alarm_db.get_all_alarms_from_guild(guild_id);
    return alarmsUser.length < auth.max_alarms_user
        && alarmsGuild.length < auth.max_alarms_server;
}

/**
 * Check if users can create a private alarms
 * @param {String} user_id - the id of the user
 */
async function can_create_private_alarm(user_id) {
    let alarmsUser = await alarm_db.get_all_privAlarms_from_user(user_id);
    return alarmsUser.length < auth.max_alarms_user;
}

/**
 * Checks if users can create one time alarms, pass undefined for private alarms
 * @param {String} user_id - the id of the users
 * @param {String} guild_id - the id of the guild
 */
async function can_create_ota_alarm(user_id, guild_id) {
    let alarmsUser = await alarm_db.get_all_otas_from_user(user_id);
    let alarmsGuild = guild_id !== undefined ? (await alarm_db.get_all_otas_from_guild(guild_id))?.length : 0;
    return alarmsUser.length < auth.max_alarms_user
        && alarmsGuild < auth.max_alarms_server;
}


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
    return (message.channel.type === 'dm' && alarm_id.includes(message.author.id)) || (alarm_id.includes(message.author.id) || (!alarm_id.includes(auth.private_prefix) && isAdministrator(message)));
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
        let myChunk = myArray.slice(index, index + chunk_size);
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
    compareIgnoringCase: compareIgnoringCase,
    can_create_public_alarm: can_create_public_alarm,
    can_create_private_alarm: can_create_private_alarm,
    can_create_ota_alarm: can_create_ota_alarm,
    isPrivateAlarm: isPrivateAlarm,
    isOtaAlarm: isOtaAlarm,
    isPublicAlarm: isPublicAlarm
}