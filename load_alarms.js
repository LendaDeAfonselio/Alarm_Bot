'use strict';
const Alarm_model = require('./models/alarm_model');
const Private_alarm_model = require('./models/private_alarm_model');
const One_Time_Alarm_model = require('./models/one_time_alarm_model');
const alarm_db = require('./data_access/alarm_index');
const logging = require('./Utils/logging');
const utility_functions = require('./Utils/utility_functions');

async function fetchAlarmsforGuild(cron_list, cron, guild, guild_id, client) {
    let shard_guilds = Array.from(client.guilds.cache.keys());
    if (shard_guilds.includes(guild_id)) {
        let alarms = await Alarm_model.find({ guild: guild_id });
        for (const alarm of alarms) {
            let message_stg = alarm.message;
            let crono = alarm.alarm_args;
            let alarm_id = alarm.alarm_id;
            let channel_id = alarm.channel;

            let scheduledMessage = new cron(crono, async () => {
                try {
                    let channel = await guild.channels.cache.get(channel_id);
                    if (channel && !utility_functions.can_send_messages_to_ch_using_guild(guild, channel)) {
                        await utility_functions.send_message_to_default_channel(guild, `Cannot setup the alarm in channel ${channel_id} because the bot does not have permission to send messages to it.`);
                        return false;
                    }
                    if (channel && utility_functions.can_send_messages_to_ch_using_guild(guild, channel)) {
                        await channel.send(message_stg);
                    } else {
                        await alarm_db.delete_alarm_with_id(alarm_id);
                        cron_list[alarm_id].stop();
                        delete cron_list[alarm_id];
                        logging.logger.info(`${alarm_id} from the DB was deleted because the channel ${channel_id} was not found`);
                        return false;
                    }
                }
                catch (err) {
                    logging.logger.error(`Alarm with id ${alarm_id} failed to go off. Error: ${err}.`);

                    if (err.code && err.code.toString().includes('GUILD_CHANNEL_RESOLVE')) {
                        await alarm_db.delete_alarm_with_id(alarm_id);
                        logging.logger.info(`Deleted alarm ${alarm_id} when loading due to ${err}`);
                    }
                    cron_list[alarm_id].stop();
                    delete cron_list[alarm_id];
                }
            }, {
                scheduled: true
            });

            try {
                scheduledMessage.start();
            }
            catch (err) {
                logging.logger.error(`Error starting cron for alarm ${alarm_id}: ${err}`);
            }

            if (!alarm.isActive) {
                // it is not active
                scheduledMessage.stop();
            }
            cron_list[alarm_id] = scheduledMessage;
        }
        return alarms;
    }
    return [];
}

async function fetchPrivateAlarms(cron_list, cron, client, shardid) {
    let alarms = await Private_alarm_model.find();
    for (const alarm of alarms) {
        let message_stg = alarm.message;
        let crono = alarm.alarm_args;
        let alarm_id = alarm.alarm_id;
        let user_id = alarm.user_id;
        let user_from_shard = await client.users.fetch(user_id);
        if (user_from_shard !== undefined) {

            let scheduledMessage = new cron(crono, async () => {
                try {
                    let member = await client.users.fetch(user_id);
                    if (member !== undefined) {
                        member.send(message_stg).catch(() => {
                            logging.logger.info(`Shard number ${shardid} does not have permission to send message to ${user_id}`);
                            cron_list[alarm_id].stop();
                            delete cron_list[alarm_id];
                        });
                    } else {
                        logging.logger.info(`${alarm_id} from the DB is not usable because the user ${user_id} was not found in shard ${shardid}`);
                    }
                } catch (err) {
                    logging.logger.error(`Alarm with id ${alarm_id} failed to go off. Error: ${err}. ${err.stack}`);
                }
            }, {
                scheduled: true
            });
            scheduledMessage.start();
            if (!alarm.isActive) {
                // it is not active
                scheduledMessage.stop();
            }
            cron_list[alarm_id] = scheduledMessage;
        } else {
            logging.logger.info(`${alarm_id} from the DB is not usable because the user ${user_id} was not found in shard ${shardid}`);
        }
    }
}

async function fetchOTAsforGuild(cron_list, cron, guild, guild_id, client) {
    let shard_guilds = Array.from(client.guilds.cache.keys());
    if (shard_guilds.includes(guild_id)) {
        let current = new Date();
        let alarms = await One_Time_Alarm_model.find({ guild: guild_id, isPrivate: false });
        for (const alarm of alarms) {
            let alarm_id = alarm.alarm_id;
            let crono = alarm.alarm_date;
            if (current > crono) {
                logging.logger.error(`${alarm_id} is not usable since the date has already expired`);
                continue;
            }
            let message_stg = alarm.message;
            let channel_id = alarm.channel;
            let channel = await guild.channels.cache.get(channel_id);
            if (!utility_functions.can_send_messages_to_ch_using_guild(guild, channel)) {
                await utility_functions.send_message_to_default_channel(guild, `Cannot setup the alarm in channel ${channel_id} because the bot does not have permission to send messages to it.`);
                return false;
            }
            let scheduledMessage = new cron(crono, async () => {
                try {
                    if (channel && utility_functions.can_send_messages_to_ch_using_guild(guild, channel)) {
                        await channel.send(message_stg);
                        scheduledMessage.stop();
                        delete cron_list[alarm_id];
                    } else {
                        await alarm_db.delete_alarm_with_id(alarm_id);
                        cron_list[alarm_id].stop();
                        delete cron_list[alarm_id];
                        logging.logger.info(`${alarm_id} from the DB was deleted because the channel ${channel_id} was not found`);
                        return false;
                    }
                }
                catch (err) {
                    logging.logger.error(`Alarm with id ${alarm_id} failed to off. Error: ${err}. ${err.stack}`);
                }
            });
            scheduledMessage.start();
            cron_list[alarm_id] = scheduledMessage;
        }
        return alarms;
    }
    return [];
}

async function fetchPrivateOTAs(cron_list, cron, client, shardid) {

    let current = new Date();
    let alarms = await One_Time_Alarm_model.find({ isPrivate: true });
    for (const alarm of alarms) {

        let alarm_id = alarm.alarm_id;
        let crono = alarm.alarm_date;
        if (current > crono) {
            logging.logger.error(`${alarm_id} is not usable since the date has already expired`);
            continue;
        }
        let message_stg = alarm.message;
        let user_id = alarm.user_id;
        let user_from_shard = await client.users.fetch(user_id);

        if (user_from_shard !== undefined) {
            let scheduledMessage = new cron(crono, async () => {
                try {
                    user_from_shard.send(message_stg)
                        .catch(logging.logger.info(`Shard with number ${shardid} does not have permission to send message to ${user_id}`));
                    scheduledMessage.stop();
                    delete cron_list[alarm_id];
                } catch (err) {
                    logging.logger.error(`Alarm with id ${alarm_id} failed to off. Error: ${err}. ${err.stack}`);
                }
            });
            scheduledMessage.start();
            cron_list[alarm_id] = scheduledMessage;
        } else {
            logging.logger.info(`${alarm_id} from the DB is not usable because the user ${user_id} was not found in shard ${shardid}`);
        }
    }

}

async function fetchTTSAlarms(cron_list, cron, guild, guild_id, client) {
    let shard_guilds = Array.from(client.guilds.cache.keys());
    if (shard_guilds.includes(guild_id)) {
        let alarms = await alarm_db.get_all_ttsAlarms_for_guild(guild_id);
        for (const alarm of alarms) {
            let message_stg = alarm.message;
            let crono = alarm.alarm_args;
            let alarm_id = alarm.alarm_id;
            let channel_id = alarm.channel;

            let scheduledMessage = new cron(crono, async () => {
                try {
                    let channel = await guild.channels.cache.get(channel_id);
                    if (channel && !utility_functions.can_send_messages_to_ch_using_guild(guild, channel)) {
                        await utility_functions.send_message_to_default_channel(guild, `Cannot setup the alarm in channel ${channel_id} because the bot does not have permission to send messages to it.`);
                        return false;
                    }
                    if (channel && utility_functions.can_send_messages_to_ch_using_guild(guild, channel)) {
                        await channel.send(message_stg, {
                            tts: true
                        });
                    } else {
                        await alarm_db.delete_alarm_with_id(alarm_id);
                        cron_list[alarm_id].stop();
                        delete cron_list[alarm_id];
                        logging.logger.info(`${alarm_id} from the DB was deleted because the channel ${channel_id} was not found`);
                        return false;
                    }
                }
                catch (err) {
                    logging.logger.error(`TTS Alarm with id ${alarm_id} failed to go off. Error: ${err}`);
                    if (err.code && err.code.includes('GUILD_CHANNEL_RESOLVE')) {
                        await alarm_db.delete_ttsAlarm_with_id(alarm_id);
                        logging.logger.info(`Deleted TTS alarm ${alarm_id} when loading due to ${err}`);
                    }
                    cron_list[alarm_id].stop();
                    delete cron_list[alarm_id];
                }
            }, {
                scheduled: true
            });
            scheduledMessage.start();
            if (!alarm.isActive) {
                // it is not active
                scheduledMessage.stop();
            }
            cron_list[alarm_id] = scheduledMessage;
        }
        return alarms;
    }
    return [];
}

module.exports = {
    fetchAlarmsforGuild: fetchAlarmsforGuild,
    fetchPrivateAlarms: fetchPrivateAlarms,
    fetchPrivateOTAs: fetchPrivateOTAs,
    fetchOTAsforGuild: fetchOTAsforGuild,
    fetchTTSAlarms: fetchTTSAlarms
}