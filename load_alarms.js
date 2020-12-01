const Alarm_model = require('./models/alarm_model');
const Private_alarm_model = require('./models/private_alarm_model');



async function fetchAlarmsforGuild(cron_list, cron, guild, channel) {
    var alarms = await Alarm_model.find({ guild: guild });
    for (alarm of alarms) {
        let message_stg = alarm.message;
        let crono = alarm.alarm_args;
        let target = alarm.target;
        let alarm_id = alarm.alarm_id;
        let scheduledMessage = new cron(crono, () => {
            channel.send(`${message_stg}! ${target}`);
        }, {
            scheduled: true
        });
        scheduledMessage.start();
        cron_list[alarm_id] = scheduledMessage;
    }
}

async function fetchPrivateAlarms(cron_list, cron, guild, guild_id) {

    var alarms = await Private_alarm_model.find({ guild: guild_id });
    for (alarm of alarms) {
        let message_stg = alarm.message;
        let crono = alarm.alarm_args;
        let alarm_id = alarm.alarm_id;
        let user_id = alarm.user_id;
        var member = await guild.members.fetch(user_id);
        if (member !== undefined) {
            let scheduledMessage = new cron(crono, () => {
                member.send(message_stg);
            }, {
                scheduled: true
            });
            scheduledMessage.start();
            cron_list[alarm_id] = scheduledMessage;
        }
    }
}

module.exports = {
    fetchAlarmsforGuild: fetchAlarmsforGuild,
    fetchPrivateAlarms: fetchPrivateAlarms
}