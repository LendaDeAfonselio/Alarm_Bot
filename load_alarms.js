const Alarm_model = require('./models/alarm_model');
const Private_alarm_model = require('./models/private_alarm_model');
const One_Time_Alarm_model = require('./models/one_time_alarm_model');

const logging = require('./Utils/logging');
const alarm_db = require('./data_access/alarm_index');

async function fetchAlarmsforGuild(cron_list, cron, guild, guild_id) {
    var alarms = await Alarm_model.find({ guild: guild_id });
    for (alarm of alarms) {
        let message_stg = alarm.message;
        let crono = alarm.alarm_args;
        let alarm_id = alarm.alarm_id;
        let channel_id = alarm.channel;
        let channel = await guild.channels.cache.get(channel_id);
        if (channel !== undefined) {
            let scheduledMessage = new cron(crono, () => {
                channel.send(`${message_stg}`);
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
            logging.logger.info(`${alarm_id} from the DB is not usable because the channel ${channel_id} was not found`);
        }
    }
}

async function fetchPrivateAlarms(cron_list, cron, client) {

    var alarms = await Private_alarm_model.find();
    for (alarm of alarms) {
        let message_stg = alarm.message;
        let crono = alarm.alarm_args;
        let alarm_id = alarm.alarm_id;
        let user_id = alarm.user_id;
        let member = await client.users.fetch(user_id);
        if (member !== undefined) {
            let scheduledMessage = new cron(crono, () => {
                member.send(message_stg);
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
            logging.logger.info(`${alarm_id} from the DB is not usable because the user was not found`);
        }
    }
}

async function fetchOTAsforGuild(cron_list, cron, guild, guild_id) {
    let current = new Date();
    var alarms = await One_Time_Alarm_model.find({ guild: guild_id, isPrivate: false });
    for (alarm of alarms) {
        let alarm_id = alarm.alarm_id;
        let crono = alarm.alarm_date;
        if (current > crono) {
            logging.logger.error(`${alarm_id} is not usable since the date has already expired`);
            continue;
        }
        let message_stg = alarm.message;
        let channel_id = alarm.channel;
        let channel = await guild.channels.cache.get(channel_id);
        if (channel !== undefined) {
            let scheduledMessage = new cron(crono, () => {
                channel.send(`${message_stg}`);
                scheduledMessage.stop();
                delete cron_list[alarm_id];
            });
            scheduledMessage.start();
            cron_list[alarm_id] = scheduledMessage;
        } else {
            logging.logger.info(`${alarm_id} from the DB is not usable because the channel ${channel_id} was not found`);
        }
    }
}

async function fetchPrivateOTAs(cron_list, cron, client) {
    let current = new Date();
    var alarms = await One_Time_Alarm_model.find({ isPrivate: true });
    for (alarm of alarms) {
        let alarm_id = alarm.alarm_id;
        let crono = alarm.alarm_date;
        if (current > crono) {
            logging.logger.error(`${alarm_id} is not usable since the date has already expired`);
            continue;
        }
        let message_stg = alarm.message;
        let user_id = alarm.user_id;
        let member = await client.users.fetch(user_id);
        if (member !== undefined) {
            let scheduledMessage = new cron(crono, () => {
                member.send(message_stg);
                scheduledMessage.stop();
                delete cron_list[alarm_id];
            });
            scheduledMessage.start();
            cron_list[alarm_id] = scheduledMessage;
        } else {
            logging.logger.info(`${alarm_id} from the DB is not usable because the user was not found`);
        }
    }

}


module.exports = {
    fetchAlarmsforGuild: fetchAlarmsforGuild,
    fetchPrivateAlarms: fetchPrivateAlarms,
    fetchPrivateOTAs: fetchPrivateOTAs,
    fetchOTAsforGuild: fetchOTAsforGuild
}