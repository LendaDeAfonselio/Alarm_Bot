"use strict";
const Premium_User_Model = require('../models/premium_user');
const logging = require('../Utils/logging');
const auth = require('./../auth.json');

async function get_premium_user_by_id(disc_id) {
    return await Premium_User_Model.findOne({ discord_user_id: disc_id });
}


async function get_premium_user_by_discord_tag(disc_tag) {
    return await Premium_User_Model.findOne({ discord_user_tag: disc_tag });
}

module.exports = {
    get_premium_user_by_id: get_premium_user_by_id,
    get_premium_user_by_discord_tag: get_premium_user_by_discord_tag
}