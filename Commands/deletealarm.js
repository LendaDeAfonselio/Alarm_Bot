const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
const private_flag = auth.private_prefix;


module.exports = {
    name: 'deletealarm',
    description: 'Deletes the alarm with a given id',
    usage: auth.prefix + 'deletealarm <id>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        var alarm_to_delete = args[0];
        if (cron_list[alarm_to_delete] !== undefined) {
            try {
                if (!alarm_to_delete.includes(private_flag)) {
                    await Alarm_model.deleteOne(
                        { alarm_id: alarm_to_delete }
                    )
                } else {
                    await Private_alarm_model.deleteOne(
                        { alarm_id: alarm_to_delete }
                    )
                }
                cron_list[alarm_to_delete].stop();
                delete cron_list[alarm_to_delete];
                msg.channel.send(`Sucessfully deleted alarm: ${alarm_to_delete}.`);
            } catch (e) {
                console.log(e);
                msg.channel.send(`Error deleting that alarm from the database... Please try again later!`);
            }
        }
        else {
            console.log(`Impossible to delete alarm with id ${alarm_to_delete}`);
            var myalarms_command_stg = "`myalarms`";
            msg.channel.send(`Impossible to delete alarm with id ${alarm_to_delete}.\nPlease check if you entered the id of the alarm correctly!\nTo see your alarms, do: ${myalarms_command_stg}`);
        }
    }
};