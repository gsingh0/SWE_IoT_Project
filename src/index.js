/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const AWS = require('aws-sdk');

// const GetNewFactHandler = {
//   canHandle(handlerInput) {
//     const request = handlerInput.requestEnvelope.request;
//     return request.type === 'LaunchRequest'
//       || (request.type === 'IntentRequest'
//         && request.intent.name === 'GetNewFactIntent');
//   },
//   handle(handlerInput) {
//     const factArr = data;
//     const factIndex = Math.floor(Math.random() * factArr.length);
//     const randomFact = factArr[factIndex];
//     const speechOutput = GET_FACT_MESSAGE + randomFact;

//     return handlerInput.responseBuilder
//       .speak(speechOutput)
//       .withSimpleCard(SKILL_NAME, randomFact)
//       .getResponse();
//   },
// };

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_REPROMPT)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(STOP_MESSAGE)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, an error occurred.')
      .reprompt('Sorry, an error occurred.')
      .getResponse();
  },
};

const LaunchRequesHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest'
  },
  handle(handlerInput) {
    let welcomeMessage = "Welcome Panther! What can I help you with?";

    return handlerInput.responseBuilder
      .speak(welcomeMessage)
      .reprompt(welcomeMessage)
      .getResponse();
  },
};

const GetSchoolEventMonthHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'SchoolEventIntentMonth';
  },
  handle(handlerInput) {
    let events = "Here are the list of events coming up this month: ";
    let eventCounter = 0;
    for (let i = 0; i < FootballGames.length; i++){
      let sameMonth = computeMonthDifference(FootballGames[i].time);
      
      if (sameMonth){
        events = events + FootballGames[i].game;
        eventCounter++;
      }
    }
    
    events = events + "..say repeat this month to repeat the events for this month";
    
    if (eventCounter == 0){
      return handlerInput.responseBuilder
        .speak("no events coming up this month")
        .reprompt()
        .getResponse()
    }
    else {
      return handlerInput.responseBuilder
        .speak(events)
        .reprompt("say repeat this month to repeat the events for this month")
        .getResponse()
    }
    
  },
};

const GetSchoolEventWeekHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'SchoolEventIntentWeek';
  },
  handle(handlerInput) {
    let events = "Here are the list of events coming up this week: ";
    let eventCounter = 0;
    for (let i = 0; i < FootballGames.length; i++){
      let difference = computeDifference(FootballGames[i].time);
      
      if (difference <= 7 && difference > 0){
        events = events + FootballGames[i].game;
        eventCounter++;
      }
    }
    
    events = events + "..say repeat this week to repeat the events for this week";
    
    if (eventCounter == 0){
      return handlerInput.responseBuilder
        .speak("no events coming up this week")
        .reprompt()
        .getResponse()
    }
    else {
      return handlerInput.responseBuilder
        .speak(events)
        .reprompt("say repeat this week to repeat the events for this week")
        .getResponse()
    }
    
  },
};

const GetSchoolEventDayHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'SchoolEventIntentDay';
  },
  handle(handlerInput) {
    let events = "Here are the list of events coming up today: ";
    let eventCounter = 0;
    for (let i = 0; i < FootballGames.length; i++){
      let difference = computeDifference(FootballGames[i].time);
      
      if (difference <= 1 && difference > 0){
        events = events + FootballGames[i].game;
        eventCounter++;
      }
    }
    
    events = events + "...say repeat today to repeat the events for today";
    
    if (eventCounter == 0){
      return handlerInput.responseBuilder
        .speak("no events coming up today")
        .reprompt("no events coming up today")
        .getResponse()
    }
    else {
      return handlerInput.responseBuilder
        .speak(events)
        .reprompt("say repeat today to repeat the events for today")
        .getResponse()
    }
    
  },
};

const setAssignmentReminderHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'SetAssignmentIntent';
  },
  handle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    let event = {
      _assignment: request.intent.slots.assignment.value,
      _class: request.intent.slots.class.value,
      _date: request.intent.slots.date.value
    }

    setAssignment(event);

    return handlerInput.responseBuilder
          .speak("your assignment has been recorded")
          .reprompt("your assignment has been recorded")
          .getResponse();

  }
};

function computeDifference(date) {
  let currentDate = Date.now();
  date = Date.parse(date);
  let difference = (date - currentDate)/1000/60/60/24;
  console.log(difference);
  return difference;
}

function computeMonthDifference(date){
  let currentDateMonth = new Date(Date.now()).getMonth();
  let dateMonth = new Date(date).getMonth();
  let sameMonth = false;
  
  if (dateMonth == currentDateMonth){
    sameMonth = true;
  }
  
  return sameMonth;
  
}



var FootballGames = 
[
  {
    game: "Georgia State University vs Georgia Southern University at October 27th, ",
    time: "10/24/2018"
  },
  {
    game: "Georgia State University vs University of Georgia at December 15th,",
    time: "10/21/2018"
  }
]

var documentClient = new AWS.DynamoDB.DocumentClient();

function setAssignment(event, context, callback){
  
  var params = {
    Item: {
      Name: event._class,
      assignment: event._assignment,
      assignmentDate: event._date,
      exam: "none",
      examDate:"none"
    },
    TableName: "Courses"
  };
  
  documentClient.put(params, function(err, data){
    if (err){
      callback(err, null);
    }
    else {
      callback(err, data);
    }
  });
}



const skillBuilder = Alexa.SkillBuilders.standard();


exports.handler = skillBuilder
  .addRequestHandlers(
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler,
    LaunchRequesHandler,
    GetSchoolEventMonthHandler,
    GetSchoolEventWeekHandler,
    GetSchoolEventDayHandler,
    setAssignmentReminderHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

