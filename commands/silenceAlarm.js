"use strict";

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
const private_flag = auth.private_prefix;
const temp_flag = auth.one_time_prefix;
const logging = require('../Utils/logging');

function can_silence_alarm(message, alarm_id) {
    return message.member.hasPermission("ADMINISTRATOR") || alarm_id.includes(message.author.id);
}

module.exports = {
    name: 'silenceAlarm',
    description: 'Silences the alarm with a given id. To turn it back on use activateAlarm <id>',
    usage: auth.prefix + 'silenceAlarm <id>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (args.length >= 1) {

            var alarm_to_silence = args[0];
            if (!can_silence_alarm(msg, alarm_to_silence)) {
                msg.channel.send(`The alarm you selected isn't yours or you aren't administrator on this server therefore you cannot silence it!`)
            }
            else {
                if (cron_list[alarm_to_silence] !== undefined) {
                    if (cron_list[alarm_to_silence].running) {
                        try {
                            if (alarm_to_silence.includes(private_flag)) {
                                await Private_alarm_model.updateOne(
                                    { alarm_id: alarm_to_silence },
                                    {
                                        isActive: false
                                    }
                                )
                            } else if (!alarm_to_silence.includes(temp_flag)) {
                                await Alarm_model.updateOne(
                                    { alarm_id: alarm_to_silence },
                                    {
                                        isActive: false
                                    }
                                )
                            }
                            cron_list[alarm_to_silence].stop();
                            msg.channel.send(`${alarm_to_silence} is now silent.`);
                        } catch (e) {
                            logging.logger.info(`Error silencing alarm with id:${alarm_to_silence}... Please try again later!`);
                            logging.logger.error(e);
                            msg.channel.send(`Error silencing alarm with id:${alarm_to_silence}... Please try again later!`);
                        }
                    } else {
                        msg.channel.send(`Alarm with id ${alarm_to_silence} has already been silenced.\nTo see your alarms, type: ${auth.prefix}${myalarms_command_stg}`);

                    }
                }
                else {
                    var myalarms_command_stg = "`myalarms`";
                    msg.channel.send(`Impossible to silence alarm with id ${alarm_to_silence}.\nPlease check if you entered the id of the alarm correctly!\nTo see your alarms, type: ${auth.prefix}${myalarms_command_stg}`);
                }
            }
        } else {
            msg.channel.send(`No arguments were passed to execute this command.\n`
            + 'Usage: ' + this.usage);
        }

    }
};