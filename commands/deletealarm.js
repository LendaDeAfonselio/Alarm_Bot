const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
const private_flag = auth.private_prefix;
const temp_flag = auth.one_time_prefix;
const logging = require('../Utils/logging');

function can_delete_alarm(message, alarm_id) {
    return (message.member.hasPermission("ADMINISTRATOR") || alarm_id.includes(msg.author.id));
}

module.exports = {
    name: 'deleteAlarm',
    description: 'Deletes the alarm with a given id - **THIS ACTION CANNOT BE REVERTED**',
    usage: auth.prefix + 'deleteAlarm <id>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        var alarm_to_delete = args[0];
        if (!can_delete_alarm(msg, alarm_to_delete)) {
            msg.channel.send(`The alarm you selected isn't yours or you aren't administrator on this server therefore you cannot delete it!`)
        }
        else {
            if (cron_list[alarm_to_delete] !== undefined) {
                try {
                    if (alarm_to_delete.includes(private_flag)) {
                        await Private_alarm_model.deleteOne(
                            { alarm_id: alarm_to_delete }
                        )
                    } else if (!alarm_to_delete.includes(temp_flag)) {
                        await Alarm_model.deleteOne(
                            { alarm_id: alarm_to_delete }
                        )
                    }
                    cron_list[alarm_to_delete].stop();
                    delete cron_list[alarm_to_delete];
                    msg.channel.send(`Sucessfully deleted alarm: ${alarm_to_delete}.`);
                } catch (e) {
                    logging.logger.info(`Error deleting alarm with id:${alarm_to_delete}... Please try again later!`);
                    logging.logger.error(e);
                    msg.channel.send(`Error deleting alarm with id:${alarm_to_delete}... Please try again later!`);
                }
            }
            else {
                var myalarms_command_stg = "`myalarms`";
                msg.channel.send(`Impossible to delete alarm with id ${alarm_to_delete}.\nPlease check if you entered the id of the alarm correctly!\nTo see your alarms, type: ${auth.prefix}${myalarms_command_stg}`);
            }
        }

    }
};