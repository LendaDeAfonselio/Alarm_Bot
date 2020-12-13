function isAdministrator(message) {
    return message.member.hasPermission("ADMINISTRATOR");
}

function hasAlarmRole(message, alarm_role) {
    var x = message.member.roles.cache.find(r => r.name.toLowerCase() === alarm_role.toLowerCase());
    return x !== undefined;
}

module.exports = {
    hasAlarmRole: hasAlarmRole,
    isAdministrator: isAdministrator
}