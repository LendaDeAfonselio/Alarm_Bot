function isAdministrator(message) {
    return message.member.hasPermission("ADMINISTRATOR");
}

function hasAlarmRole(message, alarm_role) {
    var x = message.member.roles.cache.find(r => r.name.toLowerCase() === alarm_role.toLowerCase());
    return x !== undefined;
}

function getAbsoluteDiff (a, b) {
    return a > b ? a - b : b - a;
} 

module.exports = {
    hasAlarmRole: hasAlarmRole,
    isAdministrator: isAdministrator,
    getAbsoluteDiff : getAbsoluteDiff
}