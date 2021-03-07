const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const utility_functions = require('../Utils/utility_functions');

const auth = require('./../auth.json');
const private_flag = auth.private_prefix;
const temp_flag = auth.one_time_prefix;
const logging = require('../Utils/logging');
const db_alarms = require('../data_access/alarm_index');

let oneTimeAlarm = require('./oneTimeAlarm');

module.exports = {
    name: 'deleteAlarm',
    description: 'Deletes the alarm with a given id - **THIS ACTION CANNOT BE REVERTED**',
    usage: auth.prefix + 'deleteAlarm <id>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (args.length >= 1) {
            var alarm_to_delete = args[0];
            if (!utility_functions.can_change_alarm(msg, alarm_to_delete)) {
                msg.channel.send(`The alarm you selected is not yours or you aren't administrator on this server therefore you cannot delete it!\nIf you are the admin try checking the permissions of the bot.`)
            }
            else {
                if (cron_list[alarm_to_delete] !== undefined) {
                    try {
                        if (alarm_to_delete.includes(private_flag)) {
                            await Private_alarm_model.deleteOne(
                                { alarm_id: alarm_to_delete }
                            )
                        } else if (!alarm_to_delete.includes(temp_flag)) {
                            if (msg.channel.type === 'dm') {
                                msg.channel.send('Can only delete public alarms in a server, otherwise the bot does not know which alarms to delete.');
                                return;
                            }
                            await Alarm_model.deleteOne(
                                {
                                    $and: [
                                        { alarm_id: alarm_to_delete },
                                        { guild: msg.guild.id },
                                    ]
                                }

                            )
                        } else {
                            db_alarms.delete_oneTimeAlarm_with_id(alarm_to_delete);
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
                    var myalarms_command_stg = "`myAlarms`";
                    msg.channel.send(`Impossible to delete alarm with id ${alarm_to_delete}.\nPlease check if you entered the id of the alarm correctly!\nTo see your alarms, type: ${auth.prefix}${myalarms_command_stg}`);
                }
            }
        } else {
            msg.channel.send(`No arguments were passed to execute this command.\n`
                + 'Usage: ' + this.usage);
        }

    }
};