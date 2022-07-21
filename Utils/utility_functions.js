'use strict';

// eslint-disable-next-line no-unused-vars
const Discord = require('discord.js');
const { PermissionsBitField } = require('discord.js');

const auth = require('./../auth.json');
const alarm_db = require('./../data_access/alarm_index');
const premium_db = require('./../data_access/premium_index');
const logging = require('./logging');

function isPrivateAlarm(alarm_id) {
    return alarm_id.startsWith(auth.private_prefix);
}

function isOtaAlarm(alarm_id) {
    return alarm_id.startsWith(auth.one_time_prefix);

}

function isPublicAlarm(alarm_id) {
    return alarm_id.startsWith(auth.public_alarm_prefix);
}

function isTTSAlarm(alarm_id) {
    return alarm_id.startsWith(auth.tts_alarm_prefix);
}

function isString(input) {
    return typeof input === 'string' && Object.prototype.toString.call(input) === '[object String]';
}
/**
 * Checks if an user can create a public alarm
 * @param {String} user_id  - the id of user
 * @param {String} guild_id - the id of the guild
 */
async function can_create_public_alarm(user_id, guild_id) {
    let alarmsUser = await alarm_db.get_all_alarms_from_user(user_id);
    if (await (isPremiumUser(user_id))) {
        return alarmsUser.length < auth.max_alarms_VIP;
    }
    let alarmsGuild = await alarm_db.get_all_alarms_from_guild(guild_id);
    return alarmsUser.length < auth.max_alarms_user &&
        alarmsGuild.length < auth.max_alarms_server;
}

/**
 * Check if users can create a private alarms
 * @param {String} user_id - the id of the user
 */
async function can_create_private_alarm(user_id) {
    let alarmsUser = await alarm_db.get_all_privAlarms_from_user(user_id);
    if (await (isPremiumUser(user_id))) {
        return alarmsUser.length < auth.max_alarms_VIP;
    }
    return alarmsUser.length < auth.max_alarms_user;
}

/**
 * Checks if users can create one time alarms, pass undefined for private alarms
 * @param {String} user_id - the id of the users
 * @param {String} guild_id - the id of the guild
 */
async function can_create_ota_alarm(user_id, guild_id) {
    let alarmsUser = await alarm_db.get_all_otas_from_user(user_id);
    if (await (isPremiumUser(user_id))) {
        return alarmsUser.length < auth.max_alarms_VIP;
    }
    let alarmsGuild = guild_id !== undefined ? (await alarm_db.get_all_otas_from_guild(guild_id))?.length : 0;
    return alarmsUser.length < auth.max_alarms_user &&
        alarmsGuild < auth.max_alarms_server;
}

async function isPremiumUser(user_id) {
    let user = await premium_db.get_premium_user_by_id(user_id);
    return user !== null;
}

/**
 * Checks if an user is a Administrator on a Guild
 * @param {Discord.Interaction} message - The Discord Message object
 */
function isAdministrator(message) {
    return message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator);
}

/**
 * Checks if an user has the alarm role 
 * @param {Discord.Interaction} message - the Discord Message object
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
 * @param {Discord.Interaction} interaction - The Discord Interaction object
 * @param {String} alarm_id - The string with the id of the alarm
 */
async function can_change_alarm(interaction, alarm_id) {
    let al = await alarm_db.get_alarm_by_id(alarm_id);
    if (!al) {
        return false;
    }
    let isOwner = al?.user_id === interaction.user.id;
    return (interaction.channel.type === 'dm' && isOwner) || isOwner || (!isPrivateAlarm && isAdministrator(interaction) && al?.guild === interaction.guild.id);
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
    let hasSpecifiedChannel = channel_regex.test(stg);
    return hasSpecifiedChannel;
}

/**
 * Returns an array with arrays of the given size.
 *
 * @param {Array} myArray  array to split
 * @param {BigInteger} chunk_size Size of every group
 */
function chunkArray(myArray, chunk_size) {
    let index = 0;
    let arrayLength = myArray.length;
    let tempArray = [];

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

async function send_message_to_default_channel(guild, message) {
    const channel = guild.channels.cache.find(
        (c) => c.type === 'text' && c.permissionsFor(guild.me).has('SEND_MESSAGES')
    );
    if (channel) {
        await channel.send(message);
    } else {
        logging.logger.error(`Impossible to send message to guild ${guild.id}`);
    }
}

async function fetchValuesAndConcatValues(client, queryStg) {
    return client.shard.fetchClientValues(queryStg).then(
        (allArrays) => {
            return Array.prototype.concat.apply([], allArrays);
        }
    );
}

async function broadcastEvalAndConcatLambda(client, query) {
    let resultsArray = await client.shard.broadcastEval(query);
    return Array.prototype.concat.apply([], resultsArray);
}

async function broadcastEvalAndConcat(client, queryStg) {
    let resultsArray = await client.shard.broadcastEval(queryStg);
    return Array.prototype.concat.apply([], resultsArray);
}

function deleteFromCronList(cron_list, alarm) {
    if (cron_list[alarm.alarm_id] !== undefined) {
        cron_list[alarm.alarm_id]?.stop();
        delete cron_list[alarm.alarm_id];
    }
}

function can_send_embeded(msg) {
    if (!msg || !msg.channel || !msg.guild || !msg.guild.members.me) {
        return false;
    }
    let ch = msg.channel;
    let permission = msg.guild.members.me.permissionsIn(ch);
    return permissions_include(permission, PermissionsBitField.Flags.EmbedLinks);
}


function can_send_tts_messages(msg) {
    if (!msg || !msg.channel || !msg.guild || !msg.guild.members.me) {
        return false;
    }
    let ch = msg.channel;
    let permission = msg.guild.members.me.permissionsIn(ch);
    return permissions_include(permission, PermissionsBitField.Flags.SendTTSMessages);
}

function can_send_messages(msg) {
    if (!msg || !msg.channel || !msg.guild || !msg.guild.members.me) {
        return false;
    }
    let ch = msg.channel;
    let permission = msg.guild.members.me.permissionsIn(ch);
    return permissions_include(permission, PermissionsBitField.Flags.SendMessages);
}

function can_send_messages_to_ch(msg, ch) {
    if (!ch || !msg || !msg.guild || !msg.guild.members.me) {
        return false;
    }
    let permission = msg.guild.members.me.permissionsIn(ch);
    return permissions_include(permission, PermissionsBitField.Flags.SendMessages);
}
function can_send_ttsmessages_to_ch(msg, ch) {
    if (!ch || !msg || !msg.guild || !msg.guild.members.me) {
        return false;
    }
    let permission = msg.guild.members.me.permissionsIn(ch);
    return permissions_include(permission, PermissionsBitField.Flags.SendTTSMessages);
}

function permissions_include(permissions, perm) {

    return permissions && permissions.has(PermissionsBitField.Flags.ViewChannel) && permissions.has(perm);
}

function can_send_messages_to_ch_using_guild(guild, ch) {
    let permission = guild.members.me.permissionsIn(ch);
    return permissions_include(permission, PermissionsBitField.Flags.SendMessages);
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
    isPublicAlarm: isPublicAlarm,
    fetchValuesAndConcatValues: fetchValuesAndConcatValues,
    send_message_to_default_channel: send_message_to_default_channel,
    broadcastEvalAndConcat: broadcastEvalAndConcat,
    broadcastEvalAndConcatLambda: broadcastEvalAndConcatLambda,
    isTTSAlarm: isTTSAlarm,
    deleteFromCronList: deleteFromCronList,
    can_send_embeded: can_send_embeded,
    can_send_tts_messages: can_send_tts_messages,
    can_send_messages: can_send_messages,
    can_send_messages_to_ch: can_send_messages_to_ch,
    can_send_ttsmessages_to_ch: can_send_ttsmessages_to_ch,
    can_send_messages_to_ch_using_guild: can_send_messages_to_ch_using_guild,
    isString: isString
};