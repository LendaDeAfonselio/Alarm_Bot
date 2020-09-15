module.exports = {
    name: 'deletealarm',
    description: 'Deletes the alarm with a given id',
    usage: '<prefix>deletealarm <id>',
    execute(msg, args, client, cron, cron_list) {
        var alarm_to_delete = args[0];
        if (cron_list[alarm_to_delete] !== undefined) {
            cron_list[alarm_to_delete].cancel();
            delete cron_list[alarm_to_delete];
            msg.channel.send(`Sucessfully deleted alarm: ${alarm_to_delete}.\n`);
        }
        else {
            console.log(`Impossible to delete alarm with id ${alarm_to_delete}`);
            var myalarms_command_stg = "`myalarms`";
            msg.channel.send(`Impossible to delete alarm with id ${alarm_to_delete}.\nPlease check if you entered the id of the alarm correctly!\nTo see your alarms, do: ${myalarms_command_stg}`);
        }
    }
};