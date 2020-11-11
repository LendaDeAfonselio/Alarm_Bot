const Alarm_model = require('./models/alarm_model');


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

module.exports = {
    fetchAlarmsforGuild: fetchAlarmsforGuild
}