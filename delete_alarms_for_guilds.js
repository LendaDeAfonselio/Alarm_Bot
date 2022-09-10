'use strict';

const Alarm_model = require('./models/alarm_model');
const alarm_db = require('./data_access/alarm_index');
const utility_functions = require('./Utils/utility_functions');
async function deleteAlarmsForGuild(cron_list, guild_id) {
    // find all alarms from the guild to delete them later
    let alarms = await Alarm_model.find({ guild: guild_id });

    // deleting the alarms from cron list
    alarms.forEach((alarm) => utility_functions.deleteFromCronList(cron_list, alarm));

    // delete from DB
    return await Alarm_model.deleteMany({ guild: guild_id });
}

async function deleteTTSAlarmsForGuild(cron_list, guild_id) {
    let alarms = await alarm_db.get_all_ttsAlarms_for_guild(guild_id);
    alarms.forEach((alarm) => utility_functions.deleteFromCronList(cron_list, alarm));
    return await alarm_db.delete_allttsalarm_from_guild(guild_id);
}

module.exports = {
    deleteAlarmsForGuild: deleteAlarmsForGuild,
    deleteTTSAlarmsForGuild: deleteTTSAlarmsForGuild
};