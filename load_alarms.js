const Alarm_model = require('./models/alarm_model');
const Private_alarm_model = require('./models/private_alarm_model');
const logging = require('./Utils/logging');



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
        var member = await client.users.fetch(user_id);
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

module.exports = {
    fetchAlarmsforGuild: fetchAlarmsforGuild,
    fetchPrivateAlarms: fetchPrivateAlarms
}