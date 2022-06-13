const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const utility_functions = require('../Utils/utility_functions');

const auth = require('./../auth.json');
const logging = require('../Utils/logging');
const db_alarms = require('../data_access/alarm_index');

module.exports = {
    name: 'deleteAlarm',
    description: 'Deletes the alarm with a given id - **THIS ACTION CANNOT BE REVERTED**',
    usage: auth.prefix + 'deleteAlarm <id>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (args.length >= 1) {
            let alarm_to_delete = args[0];
            if (!(await utility_functions.can_change_alarm(msg, alarm_to_delete))) {
               await msg.channel.send(`The alarm you selected is not yours or you aren't administrator on this server therefore you cannot delete it!\nIf you are the admin try checking the permissions of the bot.`)
            }
            else {
                if (cron_list[alarm_to_delete] !== undefined) {
                    try {
                        if (utility_functions.isPrivateAlarm(alarm_to_delete)) {
                            await db_alarms.delete_private_alarm_with_id(alarm_to_delete);
                        } else if (utility_functions.isPublicAlarm(alarm_to_delete)) {
                            if (msg.channel.type === 'dm') {
                               await msg.channel.send('Can only delete public alarms in a server, otherwise the bot does not know which alarms to delete.');
                                return;
                            }
                            await db_alarms.delete_alarm_with_id(alarm_to_delete);
                        } else if (utility_functions.isOtaAlarm(alarm_to_delete)) {
                            await db_alarms.delete_oneTimeAlarm_with_id(alarm_to_delete);
                        } else if (utility_functions.isTTSAlarm(alarm_to_delete)) {
                            if (msg.channel.type === 'dm') {
                               await msg.channel.send('Can only delete public alarms in a server, otherwise the bot does not know which alarms to delete.');
                                return;
                            }
                            await db_alarms.delete_ttsAlarm_with_id(alarm_to_delete);
                        }
                        cron_list[alarm_to_delete].stop();
                        delete cron_list[alarm_to_delete];
                       await msg.channel.send(`Sucessfully deleted alarm: ${alarm_to_delete}.`);
                    } catch (e) {
                        logging.logger.info(`Error deleting alarm with id:${alarm_to_delete}... Please try again later!`);
                        logging.logger.error(e);
                       await msg.channel.send(`Error deleting alarm with id:${alarm_to_delete}... Please try again later!`);
                    }
                }
                else {
                   await msg.channel.send(`Impossible to delete alarm with id ${alarm_to_delete}.\nTry again later. If the problem persist use the bot support server`);
                }
            }
        } else {
           await msg.channel.send(`No arguments were passed to execute this command.\nUsage: ${this.usage}`);
        }

    }
};