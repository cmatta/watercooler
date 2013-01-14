var mongoose = require('mongoose')
    , Schema = mongoose.Schema;

var UsersSchema = new Schema({
        "provider": {type: String, required: true },
        "provider_id": {type: String, required: true},
        "displayName": {type: String, requred: true},
        "name" : {
            "familyName": {type: String},
            "givenName": {type: String},
            "middleName": {type: String}
        },
        "emails":[
            {
                "value": {type: String},
                "type": {type: String}
            }
        ]
    },
    {collection: 'Users'}
);

var Users = mongoose.model('Users', UsersSchema);
module.exports.Users = Users;