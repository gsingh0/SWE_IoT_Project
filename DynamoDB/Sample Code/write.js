const AWS = require('aws-sdk');

//may need to do awsConfig
//"accessKeyId"
const docClient = new.DynamoDB.DocumentClient({region: us-east-1})

exports.handle = function(event, context, callback){

    var params ={
        TableName: "Event",
        Key: {
            "event_id": gsu_hackathon //hypothetically
        }
    }

    docClient.get(params, function(err, data){
        if(err){
            callback(err, null);
        }else{
            callback(null, data)
        }
    })
}