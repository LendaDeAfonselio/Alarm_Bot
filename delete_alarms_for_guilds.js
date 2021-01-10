const Alarm_model = require('./models/alarm_model');

async function deleteAlarmsForGuild(cron_list, guild_id) {
    // find all alarms from the guild to delete them later
    let alarms = await Alarm_model.find({ guild: guild_id });

    // deleting the alarms from cron list
    alarms.forEach(async (alarm) => {
        cron_list[alarm.alarm_id].stop();
        delete cron_list[alarm.alarm_id];
    });


    // delete from DB
    return await Alarm_model.deleteMany({ guild: guild_id });
}

module.exports = {
    deleteAlarmsForGuild: deleteAlarmsForGuild,
}