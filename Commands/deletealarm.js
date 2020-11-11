const Alarm_model = require('../models/alarm_model');


module.exports = {
    name: 'deletealarm',
    description: 'Deletes the alarm with a given id',
    usage: '<prefix>deletealarm <id>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        var alarm_to_delete = args[0];
        if (cron_list[alarm_to_delete] !== undefined) {
            delete cron_list[alarm_to_delete];
            await Alarm_model.deleteOne(
                { alarm_id: alarm_to_delete }
            )
            msg.channel.send(`Sucessfully deleted alarm: ${alarm_to_delete}.`);
        }
        else {
            console.log(`Impossible to delete alarm with id ${alarm_to_delete}`);
            var myalarms_command_stg = "`myalarms`";
            msg.channel.send(`Impossible to delete alarm with id ${alarm_to_delete}.\nPlease check if you entered the id of the alarm correctly!\nTo see your alarms, do: ${myalarms_command_stg}`);
        }
    }
};