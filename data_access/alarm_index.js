'use strict';

const Alarm_model = require('../models/alarm_model');
const One_Time_Alarm_model = require('../models/one_time_alarm_model');
const TTS_alarm_model_model = require('../models/tts_alarm_model');
const logging = require('../Utils/logging');
const auth = require('./../auth.json');

/**
 * Adds a new tts alarm to the database
 * @param {String} alarm_id - The id of the alarm (should be One_Time_randomstring_id)
 * @param {String} alarm_args - The cron args for the alarm
 * @param {String} message - The message that will be displayed
 * @param {String} guild - The id of the server if it is applicable
 * @param {String} channel - The id of the channel if is applicable
 * @param {String} user_id - The id of the user that sets it up if it is applicable
 * @param {String} server_name - The name of the guild
 */
async function add_ttsAlarm(alarm_id, alarm_args, message,
    guild, channel, user_id, guildName) {
    const newTTSAlarm = new TTS_alarm_model_model({
        alarm_id: alarm_id,
        alarm_args: alarm_args,
        user_id: user_id,
        message: message,
        guild: guild,
        server_name: guildName,
        channel: channel,
        isActive: true,
        timestamp: Date.now()
    });
    newTTSAlarm.save()
        .then((result) => {
            return result;
        })
        .catch((err) => {
            logging.logger.info(`An error while trying to add ${JSON.stringify(newTTSAlarm)} to the database.`);
            logging.logger.error(err);
            return null;
        });
}

/**
 * Fetches all tts alarms from user in a certain server
 * @param {String} author_id - The id of the user interacting with the alarm
 * @param {String} guild_id - The id of the server
 */
async function get_all_ttsalarms_from_user_and_guild(author_id, guild_id) {
    return await TTS_alarm_model_model.find({ guild: { $regex: `.*${guild_id}.*` }, user_id: author_id });
}

/**
 * Deletes all tts alarms from user in a certain server
 * @param {String} author_id - The id of the user interacting with the alarm
 * @param {String} guild_id - The id of the server
 */
async function delete_all_ttsAlarm_from_user(author_id, guild_id) {
    return await TTS_alarm_model_model.deleteMany(
        {
            $and: [
                { user_id: author_id },
                { guild: guild_id }
            ]
        });
}

/**
 * Deletes a tts alarm with a certain id
 * @param {String} alarm_id - The id of the alarm
 * @param {String} guild_id - The id of the server
 */
async function delete_ttsAlarm_with_id(alarm_id) {
    return await TTS_alarm_model_model.deleteOne(
        { alarm_id: alarm_id }
    );
}

/**
 * Gets all alarms for a server (guild)
 * @param {String} guild_id - the id of the server
 */
async function get_all_ttsAlarms_for_guild(guild_id) {
    return await TTS_alarm_model_model.find({ guild: guild_id });
}

async function delete_allttsalarm_from_guild(guild_id) {
    return await TTS_alarm_model_model.deleteMany({
        guild: guild_id
    });
}


/**
 * Adds a new one time one time alarm entry to the database
 * @param {String} alarm_id - The id of the alarm (should be One_Time_randomstring_id)
 * @param {Date} alarm_date - The Date when the alarm goes off
 * @param {String} message - The message that will be displayed
 * @param {String} guild - The id of the server if it is applicable
 * @param {String} channel - The id of the channel if is applicable
 * @param {String} user_id - The id of the user that sets it up if it is applicable
 */
async function add_oneTimeAlarm(alarm_id, alarm_date, message,
    guild, channel, user_id, guildName) {
    const newOneTimeAlarm = new One_Time_Alarm_model({
        alarm_id: alarm_id,
        alarm_date: alarm_date,
        message: message,
        guild: guild,
        server_name: guildName,
        channel: channel,
        user_id: user_id,
        timestamp: Date.now()
    });
    newOneTimeAlarm.save()
        .then((result) => {
            logging.logger.info(`${alarm_id} added to database`);
            return result;
        })
        .catch((err) => {
            logging.logger.info(`An error while trying to add ${JSON.stringify(newOneTimeAlarm)} to the database.`);
            logging.logger.error(err);
            return null;
        });
}

/**
 * Deletes the one time alarm with a certain id
 * @param {String} alarm_id - The id of the alarm (should be One_Time_randomstring_id)
 * @param {String} guild_id - The id of the server if it is applicable
 * @param {String} author_id - The id of the user that sets it up if it is applicable
 */
async function delete_oneTimeAlarm_with_id(alarm_id, guild_id, author_id) {
    return await One_Time_Alarm_model.deleteOne(
        {
            $or: [
                { alarm_id: alarm_id, user_id: author_id },
                { alarm_id: alarm_id, guild: guild_id }
            ]
        }
    );
}

/**
 * Deletes all private one time alarms from a certain user
 * @param {String} author_id - The id of the user that sets it up if it is applicable
 */
async function delete_all_private_oneTimeAlarm_from_user(author_id) {
    return await One_Time_Alarm_model.deleteMany({
        $and: [
            { user_id: author_id },
        ]
    });
}

/**
 * Deletes all public one time alarms from a user in a certain guild
 * @param {String} author_id - The id of the user that sets it up if it is applicable
 * @param {String} guild_id - The id of the server if it is applicable
 */
async function delete_all_public_oneTimeAlarm_from_user(author_id, guild_id) {
    return await One_Time_Alarm_model.deleteMany(
        {
            $and: [
                { user_id: author_id },
                { guild: guild_id }
            ]
        });
}

/**
 * Fetches all private or channel one time alarms from a user from the db 
 * @param {String} author_id - The id of the user that sets it up if it is applicable
 */
async function get_all_oneTimeAlarm_from_user(author_id, guild) {

    return await One_Time_Alarm_model.find({
        $and: [
            { user_id: author_id },
            { guild: guild }
        ]
    });

}

async function delete_all_expired_one_time_alarms() {
    let current_date = new Date();
    return await One_Time_Alarm_model.deleteMany({
        alarm_date: { $lt: current_date }
    });
}

async function get_all_alarms_from_user(author_id) {
    return await Alarm_model.find({ user_id: author_id });
}

async function get_all_alarms_from_guild(guild_id) {
    return await Alarm_model.find({ guild: guild_id });
}

async function get_all_alarms_from_user_and_guild(author_id, guild_id) {
    return await Alarm_model.find({ guild: { $regex: `.*${guild_id}.*` }, user_id: author_id });
}

async function get_all_otas_from_user(author_id) {
    return await One_Time_Alarm_model.find({ user_id: author_id });
}

async function get_all_otas_from_guild(guild_id) {
    return await One_Time_Alarm_model.find({ guild: guild_id });
}


async function delete_alarm_with_id(a_id) {
    return await Alarm_model.deleteOne({ alarm_id: a_id });
}

async function delete_all_alarms_for_guild(guild_id) {
    return await Alarm_model.deleteMany({ guild: guild_id });
}

async function delete_all_pubota_alarms_for_guild(guildid) {
    return await One_Time_Alarm_model.deleteMany({ guild: guildid });
}

async function get_alarm_by_id(id) {
    if (isPublicAlarm(id)) {
        return await Alarm_model.findOne({ alarm_id: id });
    } else if (isOtaAlarm(id)) {
        return await One_Time_Alarm_model.findOne({ alarm_id: id });
    } else if (isTTSAlarm(id)) {
        return await TTS_alarm_model_model.findOne({ alarm_id: id });
    }
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

module.exports = {
    get_all_oneTimeAlarm_from_user: get_all_oneTimeAlarm_from_user,
    delete_all_public_oneTimeAlarm_from_user: delete_all_public_oneTimeAlarm_from_user,
    delete_all_private_oneTimeAlarm_from_user: delete_all_private_oneTimeAlarm_from_user,
    delete_oneTimeAlarm_with_id: delete_oneTimeAlarm_with_id,
    add_oneTimeAlarm: add_oneTimeAlarm,
    delete_all_expired_one_time_alarms: delete_all_expired_one_time_alarms,
    get_all_alarms_from_user: get_all_alarms_from_user,
    get_all_otas_from_user: get_all_otas_from_user,

    delete_all_alarms_for_guild: delete_all_alarms_for_guild,
    delete_all_pubota_alarms_for_guild: delete_all_pubota_alarms_for_guild,
    delete_alarm_with_id: delete_alarm_with_id,
    get_all_alarms_from_guild: get_all_alarms_from_guild,
    get_all_otas_from_guild: get_all_otas_from_guild,
    get_all_alarms_from_user_and_guild: get_all_alarms_from_user_and_guild,
    get_alarm_by_id: get_alarm_by_id,
    add_ttsAlarm: add_ttsAlarm,
    get_all_ttsalarms_from_user_and_guild: get_all_ttsalarms_from_user_and_guild,
    delete_all_ttsAlarm_from_user: delete_all_ttsAlarm_from_user,
    delete_ttsAlarm_with_id: delete_ttsAlarm_with_id,
    get_all_ttsAlarms_for_guild: get_all_ttsAlarms_for_guild,
    delete_allttsalarm_from_guild: delete_allttsalarm_from_guild
};