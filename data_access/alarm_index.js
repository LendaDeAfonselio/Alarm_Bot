"use strict";

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');
const One_Time_Alarm_model = require('../models/one_time_alarm_model');
const logging = require('../Utils/logging');
const auth = require('./../auth.json');

/**
 * Adds a new one time one time alarm entry to the database
 * @param {String} alarm_id - The id of the alarm (should be One_Time_randomstring_id)
 * @param {Date} alarm_date - The Date when the alarm goes off
 * @param {String} message - The message that will be displayed
 * @param {Boolean} isPrivate - If it is a private one time alarm or not, true for a private alarm, false otherwise
 * @param {String} guild - The id of the server if it is applicable
 * @param {String} channel - The id of the channel if is applicable
 * @param {String} user_id - The id of the user that sets it up if it is applicable
 */
async function add_oneTimeAlarm(alarm_id, alarm_date, message,
    isPrivate, guild, channel, user_id) {
    const newOneTimeAlarm = new One_Time_Alarm_model({
        alarm_id: alarm_id,
        alarm_date: alarm_date,
        message: message,
        isPrivate: isPrivate,
        guild: guild,
        channel: channel,
        user_id: user_id,
        timestamp: Date.now()
    });
    newOneTimeAlarm.save()
        .then((result) => {
            logging.logger.info(`${result} added to database`);
            return result;
        })
        .catch((err) => {
            logging.logger.info(`An error while trying to add ${result} to the database.`);
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
                { alarm_id: alarm_id, isPrivate: true, user_id: author_id },
                { alarm_id: alarm_id, isPrivate: false, guild: guild_id }
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
            { isPrivate: true }
        ]
    });
}

/**
 * Deletes all public one time alarms from a user in a certain guild
 * @param {*} author_id - The id of the user that sets it up if it is applicable
 * @param {String} guild_id - The id of the server if it is applicable
 */
async function delete_all_public_oneTimeAlarm_from_user(author_id, guild_id) {
    return await One_Time_Alarm_model.deleteMany(
        {
            $and: [
                { user_id: author_id },
                { isPrivate: false },
                { guild: guild_id }
            ]
        });
}

/**
 * Fetches all private or channel one time alarms from a user from the db 
 * @param {*} author_id - The id of the user that sets it up if it is applicable
 * @param {*} isPrivate  - If it is a private one time alarm or not, true for a private alarm, false otherwise
 */
async function get_all_oneTimeAlarm_from_user(author_id, isPrivate, guild) {
    if (isPrivate) {
        return await One_Time_Alarm_model.find({
            $and: [
                { user_id: author_id },
                { isPrivate: true }
            ]
        });
    } else {
        return await One_Time_Alarm_model.find({
            $and: [
                { user_id: author_id },
                { isPrivate: false },
                { guild: guild }
            ]
        });
    }
}

async function delete_all_expired_one_time_alarms() {
    let current_date = new Date();
    return await One_Time_Alarm_model.deleteMany({
        alarm_date: { "$lt": current_date }
    });
}

async function get_all_alarms_from_user(author_id) {
    return await Alarm_model.find({ user_id: author_id });
}

async function get_all_alarms_from_guild(guild_id) {
    return await Alarm_model.find({ guild: guild_id });
}

async function get_all_alarms_from_user_and_guild(author_id, guild_id) {
    return await Alarm_model.find({ "guild": { $regex: `.*${guild_id}.*` }, user_id: author_id });
}

async function get_all_otas_from_user(author_id) {
    return await One_Time_Alarm_model.find({ user_id: author_id });
}

async function get_all_otas_from_guild(guild_id) {
    return await One_Time_Alarm_model.find({ guild: guild_id });
}


async function get_all_privAlarms_from_user(author_id) {
    return await Private_alarm_model.find({ user_id: author_id });
}

async function delete_all_private_alarms_for_id(author_id) {
    return await Private_alarm_model.deleteMany({ user_id: author_id });
}

async function delete_private_alarm_with_id(a_id) {
    return await Private_alarm_model.deleteOne({ alarm_id: a_id });
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

    } else if (isOtaAlarm) {
        return await One_Time_Alarm_model.findOne({ alarm_id: id });

    } else if (isPrivateAlarm) {
        return await Private_alarm_model.findOne({ alarm_id: id });
    }
}

function isPrivateAlarm(alarm_id) {
    return alarm_id.startsWith(auth.private_prefix);
}

function isOtaAlarm(alarm_id) {
    return alarm_id.startsWith(auth.one_time_prefix);

}

function isPublicAlarm(alarm_id) {
    return alarm_id.startsWith(auth.public_alarm_prefix);

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
    get_all_privAlarms_from_user: get_all_privAlarms_from_user,
    delete_all_private_alarms_for_id: delete_all_private_alarms_for_id,
    delete_all_alarms_for_guild: delete_all_alarms_for_guild,
    delete_all_pubota_alarms_for_guild: delete_all_pubota_alarms_for_guild,
    delete_private_alarm_with_id: delete_private_alarm_with_id,
    get_all_alarms_from_guild: get_all_alarms_from_guild,
    get_all_otas_from_guild: get_all_otas_from_guild,
    get_all_alarms_from_user_and_guild: get_all_alarms_from_user_and_guild,
    get_alarm_by_id: get_alarm_by_id
}