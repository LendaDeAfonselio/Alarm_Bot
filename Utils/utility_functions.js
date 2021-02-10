function isAdministrator(message) {
    return message.member && message.member.hasPermission("ADMINISTRATOR");
}

function hasAlarmRole(message, alarm_role) {
    if (message.member) {
        let x = message.member.roles.cache.find(r => r.name.toLowerCase() === alarm_role.toLowerCase());
        return x !== undefined;
    }
    return false;
}

function can_change_alarm(message, alarm_id) {
    return (message.channel.type === 'dm' && alarm_id.includes(message.author.id)) || (alarm_id.includes(message.author.id) || isAdministrator(message));
}

function getAbsoluteDiff(a, b) {
    return a > b ? a - b : b - a;
}

/**
 * Returns an array with arrays of the given size.
 *
 * @param myArray {Array} array to split
 * @param chunk_size {Integer} Size of every group
 */
function chunkArray(myArray, chunk_size) {
    var index = 0;
    var arrayLength = myArray.length;
    var tempArray = [];

    for (index = 0; index < arrayLength; index += chunk_size) {
        myChunk = myArray.slice(index, index + chunk_size);
        // Do something if you want with the group
        tempArray.push(myChunk);
    }

    return tempArray;
}

module.exports = {
    hasAlarmRole: hasAlarmRole,
    isAdministrator: isAdministrator,
    can_change_alarm: can_change_alarm,
    getAbsoluteDiff: getAbsoluteDiff,
    chunkArray: chunkArray
}