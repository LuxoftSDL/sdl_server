//Copyright (c) 2018, Livio, Inc.
const app = require('../app');
const flame = app.locals.flame;
const flow = app.locals.flow;
const db = app.locals.db;
const sql = require('./sql.js');
const _ = require('lodash');

//keeping this synchronous due to how small the data is. pass this to the event loop
function transformModuleConfig (info, next) {
    const base = info.base;
    const retrySeconds = info.retrySeconds;
    const endpointProperties = info.endpointProperties;

    const hashBase = {};
    //hash up base info
    for (let i = 0; i < base.length; i++) {
        hashBase[base[i].id] = base[i];
        hashBase[base[i].id] = base[i];
        hashBase[base[i].id].seconds_between_retries = [];
        hashBase[base[i].id].raw_endpoint_properties = endpointProperties;
    }

    //retry seconds are ordered
    for (let i = 0; i < retrySeconds.length; i++) {
        hashBase[retrySeconds[i].id].seconds_between_retries.push(retrySeconds[i].seconds);
    }

    //format the module configs so the UI can use them
    let moduleConfigs = [];
    for (let id in hashBase) {
        moduleConfigs.push(baseTemplate(hashBase[id]));
    }

    next(null, moduleConfigs);
}

function baseTemplate (objOverride) {
    let obj = {
        id: 0,
        status: "PRODUCTION",
        exchange_after_x_ignition_cycles: 0,
        exchange_after_x_kilometers: 0,
        exchange_after_x_days: 0,
        timeout_after_x_seconds: 0,
        seconds_between_retries: [],
        endpoints: {
            "0x04": "",
            "queryAppsUrl": "",
            "lock_screen_icon_url": "",
            "custom_vehicle_data_mapping_url": ""
        },
        endpoint_properties: {},
        notifications_per_minute_by_priority: {
            EMERGENCY: 0,
            NAVIGATION: 0,
            VOICECOM: 0,
            COMMUNICATION: 0,
            NORMAL: 0,
            NONE: 0
        }
    };

    // initialize known endpoint property objects
    for (endpoint in obj.endpoints) {
        obj.endpoint_properties[endpoint] = {};
    }

    if (objOverride) {
        //add overrides to the default
        obj.id = objOverride.id;
        obj.status = objOverride.status;
        obj.exchange_after_x_ignition_cycles = objOverride.exchange_after_x_ignition_cycles;
        obj.exchange_after_x_kilometers = objOverride.exchange_after_x_kilometers;
        obj.exchange_after_x_days = objOverride.exchange_after_x_days;
        obj.timeout_after_x_seconds = objOverride.timeout_after_x_seconds;
        obj.seconds_between_retries = objOverride.seconds_between_retries;
        obj.endpoints["0x04"] = objOverride.endpoint_0x04;
        obj.endpoints.queryAppsUrl = objOverride.query_apps_url;
        obj.endpoints.lock_screen_icon_url = objOverride.lock_screen_default_url;
        obj.endpoints.custom_vehicle_data_mapping_url = objOverride.custom_vehicle_data_mapping_url;
        obj.notifications_per_minute_by_priority.EMERGENCY = objOverride.emergency_notifications;
        obj.notifications_per_minute_by_priority.NAVIGATION = objOverride.navigation_notifications;
        obj.notifications_per_minute_by_priority.VOICECOM = objOverride.voicecom_notifications;
        obj.notifications_per_minute_by_priority.COMMUNICATION = objOverride.communication_notifications;
        obj.notifications_per_minute_by_priority.NORMAL = objOverride.normal_notifications;
        obj.notifications_per_minute_by_priority.NONE = objOverride.none_notifications;

        // inject endpoint properties we have from the database
        _.forEach(objOverride.raw_endpoint_properties, function(endProp, index) {
            if (obj.endpoint_properties[endProp.endpoint_name]) {
                obj.endpoint_properties[endProp.endpoint_name][endProp.property_name] = endProp.property_value;
            }
        });
    }

    return obj;
}

//store the information using a SQL transaction
function insertModuleConfig (isProduction, moduleConfig, next) {
    //change status
    if (isProduction) {
        moduleConfig.status = "PRODUCTION";
    } else {
        moduleConfig.status = "STAGING";
    }
    // process message groups synchronously (due to the SQL transaction)
    db.runAsTransaction(function (client, callback) {
        flame.async.waterfall([
            //stage 1: insert module config
            client.getOne.bind(client, sql.insertModuleConfig(moduleConfig)),
            //stage 2: insert module config retry seconds
            function (newModConf, next) {
                if (moduleConfig.seconds_between_retries.length > 0) {
                    client.getOne(sql.insertRetrySeconds(moduleConfig.seconds_between_retries, newModConf.id), function(err){
                        next(err, newModConf);
                    });
                } else {
                    next(null, newModConf);
                }
            },
            //stage 3: insert module config endpoint properties
            function (newModConf, next) {
                if (Object.keys(moduleConfig.endpoint_properties).length > 0) {
                    client.getOne(sql.insertEndpointProperties(moduleConfig.endpoint_properties, newModConf.id), next);
                } else {
                    next();
                }
            }
        ], callback);
    }, next);
}

module.exports = {
    transformModuleConfig: transformModuleConfig,
    insertModuleConfig: insertModuleConfig
}