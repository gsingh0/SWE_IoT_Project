
const Alexa = require('ask-sdk');
const AWS = require('aws-sdk');
const scraper = require('./courseInfoRetrieve');

//-----------------------------------------------------------------------------------------------------------

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Say list of intents to get the list of intents for this skill. Also say, what is the utterance "+
          "for the specified intent. This will help you use the skill correctly.")
      .reprompt("Say list of intents to get the list of intents for this skill. Also say, what is the utterance "+
          "for the specified intent. This will help you use the skill correctly.")
      .getResponse();
  },
};

//-----------------------------------------------------------------------------------------------------------

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

//-----------------------------------------------------------------------------------------------------------

const ErrorHandler = {
  canHandle() {
    return false;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, an error occurred.')
      .reprompt('Sorry, an error occurred.')
      .getResponse();
  },
};

//-----------------------------------------------------------------------------------------------------------

const FallBackHandler = {
  canHandle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput){

    return handlerInput.responseBuilder
          .speak("I didn't understand your request. Say list of intents to get the list of intents for this skill. Also say, what is the utterance "+
            "for the specified intent. This will help you use the skill correctly.")
            .reprompt("I didn't understand your request. Say list of intents to get the list of intents for this skill. Also say, what is the utterance "+
            "for the desired intent. This will help you use the skill correctly.")
            .getResponse()
  } 
}

//-----------------------------------------------------------------------------------------------------------

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

//-----------------------------------------------------------------------------------------------------------

const LaunchRequesHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest'
  },
  async handle(handlerInput) {

    let updatedAssignments = {
      firstClass: [],
      secondClass: [],
      thirdClass: [],
      fourthClass: [],
      firstClassTime: {},
      secondClassTime: {},
      thirdClassTime: {},
      fourthClassTime: {}
    };
  
    let j = 0;
    let promise = new Promise(async function(resolve, reject){
      await getClassDetails(async function(length, data){
        await iterateThroughAssignments(j, updatedAssignments, data, resolve);
        j = await iterate(j);
      });
    });

    let updatedGeneralReminders = {
      first: {},
      second: {},
      third: {},
      fourth: {},
      fifth: {}
    }

    let k = 0;
    let promise2 = new Promise(async function(resolve, reject){
      await getGeneralReminderItems(async function(length, data){
        await iterateThroughGeneralReminder(k, updatedGeneralReminders, data, resolve);
        k = await iterate(k);
      });
    });
    
    await promise.then(function(resolvedUpdatedAssignments){
      var paramList =[ 
      {
        Item: {
          Name: currentSemesterClasses[0],
          assignments: resolvedUpdatedAssignments.firstClass,
          classTime: resolvedUpdatedAssignments.firstClassTime
        },
        TableName: "Courses"
      },
      {
        Item: {
          Name: currentSemesterClasses[1],
          assignments: resolvedUpdatedAssignments.secondClass,
          classTime: resolvedUpdatedAssignments.secondClassTime
        },
        TableName: "Courses"
      },
      {
        Item: {
          Name: currentSemesterClasses[2],
          assignments: resolvedUpdatedAssignments.thirdClass,
          classTime: resolvedUpdatedAssignments.thirdClassTime
        },
        TableName: "Courses"
      },
      {
        Item: {
          Name: currentSemesterClasses[3],
          assignments: resolvedUpdatedAssignments.fourthClass,
          classTime: resolvedUpdatedAssignments.fourthClassTime
        },
        TableName: "Courses"
      },
  
    ];
      
      for (let i = 0; i < 4; i++){
        documentClient.put(paramList[i], function(err){
          if (err){
            console.log(err);
          }
          else {
            console.log("success");
          }
        });
      }
    });

    await promise2.then(function(resolvedUpdatedGeneralReminders){
      
      let paramList = [
        {
          Item: {
            reminderNum: reminderNumList[0],
            reminderDetails: resolvedUpdatedGeneralReminders.first
          },
          TableName: "GeneralReminders"
        },
        {
          Item: {
            reminderNum: reminderNumList[1],
            reminderDetails: resolvedUpdatedGeneralReminders.second
          },
          TableName: "GeneralReminders"
        },
        {
          Item: {
            reminderNum: reminderNumList[2],
            reminderDetails: resolvedUpdatedGeneralReminders.third
          },
          TableName: "GeneralReminders"
        },
        {
          Item: {
            reminderNum: reminderNumList[3],
            reminderDetails: resolvedUpdatedGeneralReminders.fourth
          },
          TableName: "GeneralReminders"
        },
        {
          Item: {
            reminderNum: reminderNumList[4],
            reminderDetails: resolvedUpdatedGeneralReminders.fifth
          },
          TableName: "GeneralReminders"
        },
      ];

      for(let i = 0; i < 5; i++){
        console.log("readings for " + paramList[i].Item.reminderNum + " " + paramList[i].Item.reminderDetails);
        documentClient.put(paramList[i], function(err){
          if (err){
            console.log(err);
          }
          else {
            console.log("general reminders updated");
          }
        });
      }
    });

    return handlerInput.responseBuilder
      .speak(getRandomWelcomeMessage())
      .reprompt(getRandomWelcomeMessage())
      .getResponse();
  }
};

async function iterateThroughAssignments(j, updatedAssignments, data, resolve){
  switch(j){
    case(0):
      updatedAssignments.firstClass = data.Item.assignments;
      updatedAssignments.firstClassTime = data.Item.classTime;
      updatedAssignments.firstClass = await updateExpiredAssignmentReminders(updatedAssignments.firstClass);
      console.log(j+ " firstClass " + updatedAssignments.firstClass + "firstClassTime " + updatedAssignments.firstClassTime);
      break;
    case(1):
      updatedAssignments.secondClass = data.Item.assignments;
      updatedAssignments.secondClassTime = data.Item.classTime;
      updatedAssignments.secondClass = await updateExpiredAssignmentReminders(updatedAssignments.secondClass);
      console.log(j+ " firstClass " + updatedAssignments.firstClass + "firstClassTime " + updatedAssignments.firstClassTime);
      break;
    case(2):
      updatedAssignments.thirdClass = data.Item.assignments;
      updatedAssignments.thirdClassTime = data.Item.classTime;
      updatedAssignments.thirdClass = await updateExpiredAssignmentReminders(updatedAssignments.thirdClass);
      console.log(j+ " firstClass " + updatedAssignments.firstClass + "firstClassTime " + updatedAssignments.firstClassTime);
      break;
    case(3):
      updatedAssignments.fourthClass = data.Item.assignments;
      updatedAssignments.fourthClassTime = data.Item.classTime;
      updatedAssignments.fourthClass = await updateExpiredAssignmentReminders(updatedAssignments.fourthClass);
      console.log(j+ " firstClass " + updatedAssignments.firstClass + "firstClassTime " + updatedAssignments.firstClassTime);
      resolve(updatedAssignments);
      break;
    default:
      console.log("");
  }
}

async function iterateThroughGeneralReminder(k, updatedGeneralReminders, data, resolve){
  let reminderDetails = data.Item.reminderDetails;
  switch(k){
    case(0):
      updatedGeneralReminders.first = reminderDetails;
      updatedGeneralReminders.first = await updateExpiredGeneralReminders(updatedGeneralReminders.first);
      break;
    case(1):
      updatedGeneralReminders.second = reminderDetails;
      updatedGeneralReminders.second = await updateExpiredGeneralReminders(updatedGeneralReminders.second);
      break;
    case(2):
      updatedGeneralReminders.third = reminderDetails;
      updatedGeneralReminders.third = await updateExpiredGeneralReminders(updatedGeneralReminders.third);
      break;
    case(3):
      updatedGeneralReminders.fourth = reminderDetails;
      updatedGeneralReminders.fourth = await updateExpiredGeneralReminders(updatedGeneralReminders.fourth);
      break;
    case(4):
      updatedGeneralReminders.fifth = reminderDetails;
      updatedGeneralReminders.fifth = await updateExpiredGeneralReminders(updatedGeneralReminders.fifth);
      resolve(updatedGeneralReminders);
      break;
    default:
      console.log("");
  }
}

function getGeneralReminderItems(callback){
  let paramList = [
    {
      Key: {
        reminderNum: reminderNumList[0]
      },
      AttributesToGet: [
        'reminderDetails'
      ],

      TableName: 'GeneralReminders'
    },
    {
      Key: {
        reminderNum: reminderNumList[1]
      },
      AttributesToGet: [
        'reminderDetails'
      ],

      TableName: 'GeneralReminders'
    },
    {
      Key: {
        reminderNum: reminderNumList[2]
      },
      AttributesToGet: [
        'reminderDetails'
      ],

      TableName: 'GeneralReminders'
    },
    {
      Key: {
        reminderNum: reminderNumList[3]
      },
      AttributesToGet: [
        'reminderDetails'
      ],

      TableName: 'GeneralReminders'
    },
    {
      Key: {
        reminderNum: reminderNumList[4]
      },
      AttributesToGet: [
        'reminderDetails'
      ],

      TableName: 'GeneralReminders'
    },
  ];

  for (let i = 0; i < paramList.length; i++){
    documentClient.get(paramList[i], function(err, data){
      if (err){
        console.log(err);
      }
      else {
        callback(paramList.length, data);
      }
    });
  }
}

async function updateExpiredGeneralReminders(reminderDetails){
  let difference;
  console.log("reading updateExpiredGeneralReminders");
  if (reminderDetails.date !== 'none'){
    difference = await computeDifference(reminderDetails.date);
  }
  else {
    difference = -1;
  }

  if (difference < 0){
    reminderDetails.date = "none";
    reminderDetails.reminder = "none";
  }

  return reminderDetails;
}

async function updateExpiredAssignmentReminders(assignments){
  let difference;
  for (let i =0; i < assignments.length; i++){
    if (assignments[i].date !== "none"){
      difference = await computeDifference(assignments[i].date);
    }
    else {
      difference = -1;
    }
    if (difference < 0){
      assignments[i].name = "none";
      assignments[i].date = "none";
    }
  }

  return assignments;
}

//-----------------------------------------------------------------------------------------------------------

const GetSchoolEventMonthHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'SchoolEventIntentMonth';
  },
  handle(handlerInput) {
    let events = "Here are the list of events coming up this month: ";
    let eventCounter = 0;
    for (let i = 0; i < SchoolEvents.length; i++){
      let sameMonth = computeMonthDifference(SchoolEvents[i].time);
      
      if (sameMonth){
        events = events + SchoolEvents[i].game;
        eventCounter++;
      }
    }
    
    events = events + "..say repeat this month to repeat the events for this month";
    
    if (eventCounter == 0){
      return handlerInput.responseBuilder
        .speak("no events coming up this month")
        .reprompt("no events coming up this month")
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

//-----------------------------------------------------------------------------------------------------------

const GetSchoolEventWeekHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'SchoolEventIntentWeek';
  },
  handle(handlerInput) {
    let events = "Here are the list of events coming up this week: ";
    let eventCounter = 0;
    for (let i = 0; i < SchoolEvents.length; i++){
      let difference = computeDifference(SchoolEvents[i].time);
      
      if (difference <= 7 && difference > 0){
        events = events + SchoolEvents[i].game;
        eventCounter++;
      }
    }
    
    events = events + "..say repeat this week to repeat the events for this week";
    
    if (eventCounter == 0){
      return handlerInput.responseBuilder
        .speak("no events coming up this week")
        .reprompt("no events coming up this week")
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

//-----------------------------------------------------------------------------------------------------------

const GetSchoolEventDayHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'SchoolEventIntentDay';
  },
  handle(handlerInput) {
    let events = "Here are the list of events coming up today: ";
    let eventCounter = 0;
    for (let i = 0; i < SchoolEvents.length; i++){
      let difference = computeDifference(SchoolEvents[i].time);
      
      if (difference <= 1 && difference > 0){
        events = events + SchoolEvents[i].game;
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

//-----------------------------------------------------------------------------------------------------------

const setCurrentSemesterClasses = {
  canHandle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
            && request.intent.name === 'setCurrentSemesterClassIntent';
  },
  handle(handlerInput){
    let request = handlerInput.requestEnvelope.request;

    let newClass = {
      Name: request.intent.slots.className.value,
      assignments: [
        {
          date: 'none',
          name: 'none'
        },
        {
          date: 'none',
          name: 'none'
        },
        {
          date: 'none',
          name: 'none'
        }
      ]
    }

    setClass(newClass);

    return handlerInput.responseBuilder
            .speak("your class has been registered into your current semester schedule")
            .reprompt("your class has been registered into your current semester schedule")
            .getResponse();
  }
}

//-----------------------------------------------------------------------------------------------------------

const removeCurrentSemesterClasses = {
  canHandle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'removeCurrentSemesterIntent';
  },
  handle(handlerInput){
    let request = handlerInput.requestEnvelope.request;

    let Name = request.intent.slots.name.value;

    deleteCurrentSemesterClass(Name);

    return handlerInput.responseBuilder
            .speak(Name + "has been deleted from your current semester schedule")
            .reprompt(Name + "has been deleted from your current semester schedule")
            .getResponse();
  }
}

//-----------------------------------------------------------------------------------------------------------

const setAssignmentReminderHandler = {
  canHandle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'SetAssignmentReminderIntent';
  },
  async handle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    let realResponse = '';
    let responseReceived = false;
    let promise = new Promise(function(resolve, reject){
      getAssignmentList(request.intent.slots.className.value, function(data) {
        let response = '';
        let assignments = data.Item.assignments;
        let emptySlot = 0;
        let index;
        let reminderList = assignments;
        for(let i = assignments.length-1; i >=0; i--){
          if (assignments[i].date === 'none' && assignments[i].name === 'none'){
            emptySlot++;
            index = i;
          }
        }
  
        if (emptySlot > 0){ 
          reminderList[index].name = request.intent.slots.assignment.value;
          reminderList[index].date = request.intent.slots.date.value;     
          let event = {
            Name: request.intent.slots.className.value,
            assignments: reminderList
          }
  
          setAssignment(event, function(){
            response = "Your reminder for " + request.intent.slots.assignment.value + " on " + request.intent.slots.date.value + " has been set";
            responseReceived = true;
            resolve(response);
          });
        }
        else {
          response = "The reminders for this class is full. To remove a reminder, please call the remove assignment reminder intent then proceed to" +
                      "add this reminder";
          responseReceived = true;
          resolve(response);
        }
  
      });
    });

    // let list2 = request.intent.slots.className.value;

    await promise.then(
      function(result) {
        realResponse = result;
        } 
    )

    if(responseReceived == true){
      return handlerInput.responseBuilder
            .speak(realResponse)
            .reprompt(realResponse)
            .getResponse();
    }
  }
};

//-----------------------------------------------------------------------------------------------------------

const getAssignmentReminderDayHandler = {
  canHandle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'GetAssignmentReminderDayIntent';
  },
  async handle(handlerInput){
    let response = 'You have a ';
    let failedResponse = response;
    let iteration = 0;
    
    let promise = new Promise(async function(resolve, reject){
        await getAssignmentRemindersToday(function(length, data){
        iteration++;
        let assignments = data.Item.assignments;
        for (let i = 0; i < assignments.length; i++){
          let difference = computeDifference(assignments[i].date);
          if(difference > 0 && difference <=1){
            console.log("Reading same day...")
            response = response + data.Item.Name + ' ' + assignments[i].name + ', '
            console.log(response);
          }
        }

        if (iteration == length){
          console.log("reading i... " + response);
          resolve(response);
        }
      });
    });

    await promise.then(
      function(result){
        if (result === failedResponse){
          response = 'You have no assignments or exams due today lmao'
        }
        else {
          response = result + ' today';
        }
      }
    )
  
    return handlerInput.responseBuilder
            .speak(response)
            .reprompt(response)
            .getResponse();
  }
}

//-----------------------------------------------------------------------------------------------------------

const GetRandomFact = {
  canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'IntentRequest'
      && (request.intent.name === 'GetRandomFact');
  },
  handle(handlerInput) {
      return handlerInput.responseBuilder
        .speak(getFact())
        .reprompt(getFact())
        .getResponse();
  },
};

//-----------------------------------------------------------------------------------------------------------

const GetHealthTipHandler = {
  canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'IntentRequest'
      && (request.intent.name === 'GetHealthTipIntent');
  },
  handle(handlerInput) {
      return handlerInput.responseBuilder
      .speak(getHealth())
      .reprompt(getHealth())
      .getResponse();
  },
};

//-----------------------------------------------------------------------------------------------------------

const ListofIntentsHandler = {
  canHandle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'ListofIntentsIntent';
  },
  handle(handlerInput){
    let listofintents = "The list of intents for this skill are: ";

    for (let i = 0; i < IntentList.length; i++){
      listofintents = listofintents + IntentList[i].name + ', ';
    }


    return handlerInput.responseBuilder
          .speak(listofintents + ". To repeat this list, simply say repeat list of intents.")
          .reprompt(listofintents + ". To repeat this list, simply say repeat list of intents.")
          .getResponse();
  }
}

//-----------------------------------------------------------------------------------------------------------

const UtteranceListHandler = {
  canHandle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'UtteranceListIntent';
  },
  handle(handlerInput){
    let idOfIntent;
    let utterance = "";
    let resolutionsPerAuthority = handlerInput.requestEnvelope.request.intent.slots.intentlist.resolutions.resolutionsPerAuthority;
    if (resolutionsPerAuthority[0].status.code === "ER_SUCCESS_MATCH"){
      idOfIntent = resolutionsPerAuthority[0].values[0].value.name;
    }
    else {
      idOfIntent = "0";
    }

    for (let i = 0; i < IntentList.length; i++){
      if(idOfIntent === IntentList[i].id){
        utterance = IntentList[i].utterance;
        break;
      }
    }

    if (utterance.length == 0){
        return handlerInput.responseBuilder
        .speak("The request for that intent either does not exist or was pronounced incorrectly. Please try again to hear the utterance for an intent.")
        .reprompt("The request for that intent either does not exist or was pronounced incorrectly. Please try again to hear the utterance for an intent.")
        .getResponse();
    }
    else {
      return handlerInput.responseBuilder
        .speak(utterance)
        .reprompt(utterance)
        .getResponse();
    }
  }

}

//-----------------------------------------------------------------------------------------------------------
var futureCourseList = {
  course: []
};

const CourseScraperHandler = {
  canHandle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'CourseScraperIntent';
  },
  async handle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    var response = "I did not find your course. Either you said it incorrectly or the course information is incorrect. Try scraping again.";
    let courseAbbr = request.intent.slots.courseAbbr.value;
    let term = request.intent.slots.term.value;
    let sectionID = request.intent.slots.sectionID.value;
    let courseNumber = request.intent.slots.courseNumber.value;

    let promise = new Promise(function(resolve, reject){
        if (courseAbbr == null || term == null || sectionID == null || courseNumber == null){
          reject();
        }
        else if (term === "course" && courseNumber > -1){
          courseAbbr = courseAbbr.toUpperCase();
          term = "future";
          resolve();
        }
        else if(term === "semester" && courseNumber > -1){
          courseAbbr = courseAbbr.toUpperCase();
          term = "current";
          resolve();
        }
        else {
          reject();
        }
      });
      
      await promise.then(async function(){
          await scraper.courseInfoRetrieve(courseAbbr, courseNumber, sectionID, term).then(function(data){
            if(data[6] === "MW"){
              data[6] = "Monday and Wednesday";
            }
            else if(data[6] === "TR"){
              data[6] = "Tuesday and Thursday";
            }
            if (term === "current"){
              console.log("reading current");
              response = "The course for this class is " + data[5] + " which is on " + data[6] + " at " + data[7] + " to " + data[8] + " located in " + data[11];  
            }
            else {
              if (data[9] > 0){
                response = "There are " + data[9] + " seats left for " + data[5] + " on " + data[6] + " at " + data[7]+ " to " + data[8] + ". Say register scraped courses " +
                            " to register them in your next semester schedule."
                if (futureCourseList.course.length == 1){
                  futureCourseList.course.pop();
                  futureCourseList.course = data;
                }
                else {
                  futureCourseList.course = data;
                }
              }
            }
          });
      })
      
      await promise.catch(function(){
        response = "I did not find your course. Either you said it incorrectly or the course information is incorrect. Try scraping again.";
      });

    return handlerInput.responseBuilder
            .speak(response)
            .reprompt(response)
            .getResponse();
  }
}

//-----------------------------------------------------------------------------------------------------------

const setFutureSemesterCoursesHandler = {
  canHandle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'setFutureSemesterCoursesIntent';
  },
  async handle(handlerInput){
      let response = "There was an error adding your course, please use the course scraper intent before setting your course for next semester.";
    
      await registerFutureCourse(futureCourseList, function(){
        response = "Your course for " + futureCourseList.course[5] + " has been added to your next semester schedule";
      });
      
    return handlerInput.responseBuilder
          .speak(response)
          .reprompt(response)
          .getResponse();

  }
}

async function registerFutureCourse(futureCourseList, callback){
  let params = {
    TableName: 'FutureCourses',
    Item: {
      Name: futureCourseList.course[5],
      assignments: [
        {
          date: "none",
          name: "none"
        },
        {
          date: "none",
          name: "none"
        },
        {
          date: "none",
          name: "none"
        }
      ],
      classTime: {
        day: futureCourseList.course[6],
        time: futureCourseList.course[7] + " to " + futureCourseList.course[8]
      }
    }
  };

  if (futureCourseList.course.length > 0){
    await documentClient.put(params, async function(err){
      if (err){
        console.log(err)
      }
      else {
        console.log("new item added");
        await callback();
      }
    });
  }
  
}

//-----------------------------------------------------------------------------------------------------------



//-----------------------------------------------------------------------------------------------------------
const AllEventsReminderDayHandler = {
  canHandle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'AllEventsReminderIntent';
  },
  async handle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    let assignmentsToday = "";
    let classesToday = "";
    let generalRemindersToday = "";
    let eventsToday = "";
    let response = "";
    let iteration = 0;
    let iteration2 = 0;

    let promise = new Promise(async function(resolve, reject){
      await getClassDetails(async function(length, data){
        let assignments = data.Item.assignments;
        assignmentsToday = assignmentsToday + await getAssignmentsToday(assignments, data);
  
        let classTime = data.Item.classTime;
        classesToday = classesToday + await getClassesToday(classTime, data);

        iteration = await iterate(iteration);
        
        await iterateToResolve(iteration, length, function(){
          
          let todaysList = {
            assignmentsToday: assignmentsToday,
            classesToday: classesToday
          }
  
          resolve(todaysList);
        });
      });
    });

    let promise2 = new Promise(async function(resolve, reject){
      console.log("gigglybob");
      await getGeneralReminderItems(async function(length, data){
        let reminderDetails = data.Item.reminderDetails;
        generalRemindersToday = generalRemindersToday + await getGeneralRemindersToday(reminderDetails, data);

        iteration2 = await iterate(iteration2);

        await iterateToResolve(iteration2, length, function(){
          resolve(generalRemindersToday);
        });
      });
    });

    let promise3 = new Promise(async function(resolve, reject){
      eventsToday = await getEventsToday(SchoolEvents, eventsToday);
      resolve(eventsToday);
    });

    await promise.then(function(todaysList){
      console.log("assignments today are: "+todaysList.assignmentsToday);
      console.log("classes today are: "+todaysList.classesToday);
      if(todaysList.assignmentsToday.length == 0){
        assignmentsToday = "There are no assignments for today.";
      }
      else {
        assignmentsToday = "The assignments today are: "+ todaysList.assignmentsToday;
      }

      if (todaysList.classesToday.length == 0){
        classesToday = "There are no classes for today";
      }
      else {
        classesToday = "The classes today are: "+ todaysList.classesToday;
      }
    });

    await promise2.then(function(resolvedGeneralReminders){
      if (generalRemindersToday.length == 0){
        generalRemindersToday = "There are no general reminders today."
      }
      else {
        generalRemindersToday = "The other reminders today are: " + resolvedGeneralReminders; 
      }
     });

     await promise3.then(function(result){
      if (result.length == 0){
        eventsToday = "There are no school events going on today. ";
      } else {
        eventsToday = "School events today are: " + result;
      }
      });

    
    return handlerInput.responseBuilder
          .speak("Your schedule for today is as follows: " + classesToday + assignmentsToday + eventsToday + generalRemindersToday +
                  ". Would you like me to repeat your schedule again? just simply say todays schedule.")
          .reprompt("Your schedule for today is as follows: " + classesToday + assignmentsToday + eventsToday + generalRemindersToday +
                  ". Would you like me to repeat your schedule again? just simply say todays schedule.")
          .getResponse();

  }
}

/**
 * gets all the school events that are today and returns a string value of those events
 * @param {*} SchoolEvents: list of school events (and array that has hard-coded list of events).
 * @param {*} eventsToday: string value that concats all the school events that are today. 
 */
function getEventsToday(SchoolEvents, eventsToday){
  for (let i = 0; i < SchoolEvents.length; i++){
    let difference = computeDifference(SchoolEvents[i].time);
    if (difference > 0 && difference < 1){
      eventsToday = eventsToday + SchoolEvents[i].game + ',';
    }
  }
  return eventsToday;
}

/** 
 * checks to see if the last item in the database has been read (which is when iteration = 4). 
 * Once its read, it calls callback function that resolves the result.
 * @param: iteration: number of times database has been queried 
 * @param: length: length of the current semester classes (inherently 4)
 * @param: callback: function that is called when iteration = 4. Resolves the result 
 * @return none
 */
function iterateToResolve(iteration, length, callback){
  console.log("reading iterateToResolve...");
  console.log("iteration: " + iteration);
  if (iteration == length){
    callback();
  }
}

/**
 * gets all the general reminders for today and returns a string value of those values
 * @param {*} reminderDetails: database field that is of type object with two fields: reminder and date. 
 * @param {*} data: no idea why this is here, ignore for now
 */
function getGeneralRemindersToday(reminderDetails, data){
  let generalRemindersToday = "";
  console.log("date: " + reminderDetails.date);
  let difference = computeDifference(reminderDetails.date);
  if (difference > 0 && difference <= 1.5){
    generalRemindersToday = reminderDetails.reminder + ', ';
  }

  return generalRemindersToday;
}

/**
 * adds 1 to iteration after every time database has been queried
 * @param: iteration: number of times database has been queried 
 * @return: integer value (iteration + 1)
 */

function iterate(iteration){
  iteration = iteration + 1;
  return iteration;
}

/**
 * reads through every assignment reminder in the assignments array to see if a reminder is today.
 * @param {*} assignments: this is a field of a database item (item example: 'software engineering'). This attribute
 *                          is an array of objects with each object having 2 attributes: name and date. The default size of this array is 3.
 * @param {*} data: the object that is returned from documentClient.get()...
 * @return: returns a string value that reads the name of the class and the assignment type for that reminder
 */
function getAssignmentsToday(assignments, data){
  console.log("reading getAssignmentsToday...");
  let assignmentsToday = "";
  for (let i = 0; i < assignments.length; i++){
    let difference = computeDifference(assignments[i].date);
    if(difference > 0 && difference <=1.5){
      assignmentsToday = assignmentsToday + data.Item.Name + ' ' + assignments[i].name + ', '
    }
  }

  return assignmentsToday;
}

/**
 * checks today's day (Mon-Sat) and checks to see if there are classes today given today's day
 * @param {*} classTime: this is a field of a database item (item example: 'software engineering'). This attribute is an object
 *                      with 2 fields: day and time. 
 * @param {*} data: the object that is returned from documentClient.get()...
 * @return: returns a string value containing the name of the class and the time for that class.
 */
function getClassesToday(classTime, data){
  console.log("reading getClassesToday..");
  let dayOfWeek = "";
  let classesToday = "";
  let currentDate = new Date(Date.now()).getUTCDay();
    switch(currentDate){
      case 0:
        dayOfWeek = "sunday";
        break;
      case 1: 
        dayOfWeek = "monday"
        break;
      case 2:
        dayOfWeek = "tuesday"
        break;
      case 3:
        dayOfWeek = "wednesday"
        break;
      case 4: 
        dayOfWeek = "thursday"
        break;
      case 5:
        dayOfWeek = "friday"
        break;
      case 6:
        dayOfWeek = "saturday"
        break;
      default:
        dayOfWeek = "";
    }

    if (classTime.day.toLowerCase().includes(dayOfWeek)){
      classesToday = classesToday + data.Item.Name + 'at ' + classTime.time + ', ';
    }

    return classesToday;
}

//-----------------------------------------------------------------------------------------------------------

const setGeneralReminderHandler = {
  canHandle(handlerInput){
    let request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'setGeneralReminder';
  },
  async handle(handlerInput){
    let request = handlerInput.requestEnvelope.request;

    return handlerInput.responseBuilder
          .speak()
          .reprompt()
          .getResponse();

  }
}


//-----------------------------------------------------------------------------------------------------------

//This is a intent to see which professor teaches a class.
const GetClassProfessor = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'GetClassProfessor';
  },
  handle(handlerInput) {
    let events = "Here are the list of Professors for this class: ";
    let eventCounter = 0;
    for (let i = 0; i < Professors.length; i++){
      
      if (difference <= 1 && difference > 0){
        events = events + Professors[i].professor;
        eventCounter++;
      }
    }
    
    events = events + "...say repeat today to repeat the professor list";
    
    if (eventCounter == 0){
      return handlerInput.responseBuilder
        .speak("no professors found")
        .reprompt("no professors found")
        .getResponse()
    }
    else {
      return handlerInput.responseBuilder
        .speak(events)
        .reprompt("say repeat today to repeat the professor list")
        .getResponse()
    }
    
  },
};

var Professors = 
[
{
  professor: "Jaman Bhola",
  class: "Software Engineering"
},
{
  professor: "William Gregory Johnson,",
  class: "Software Engineering"
}
]


//this is an intent to get review for Professor Bhola
const GetBholaReview = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'GetBholaReview';
  },
  handle(handlerInput) {
    let events = "This is what students are saying about Bhola: ";
    let eventCounter = 0;
    for (let i = 0; i < BholaReview.length; i++){
      
      if (difference <= 1 && difference > 0){
        events = events + BholaReview[i].name;
        eventCounter++;
      }
    }
    
    events = events + "...say repeat today to repeat the review";
    
    if (eventCounter == 0){
      return handlerInput.responseBuilder
        .speak("no professor found")
        .reprompt("no professor found")
        .getResponse()
    }
    else {
      return handlerInput.responseBuilder
        .speak(events)
        .reprompt("say repeat today to repeat the review")
        .getResponse()
    }
    
  },
};

var BholaReview = 
[
{
  name: "Jaman Bhola, ",
  review: "Fear for your soul"
}
]

// this is an intent to get Professor Johnson Reviews
const GetJohnsonReview = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
        && request.intent.name === 'GetJohnsonReview';
  },
  handle(handlerInput) {
    let events = "This is what students are saying about Johnson: ";
    let eventCounter = 0;
    for (let i = 0; i < JohnsonReview.length; i++){
      
      if (difference <= 1 && difference > 0){
        events = events + JohnsonReview[i].name;
        eventCounter++;
      }
    }
    
    events = events + "...say repeat today to repeat the review";
    
    if (eventCounter == 0){
      return handlerInput.responseBuilder
        .speak("no professor found")
        .reprompt("no professor found")
        .getResponse()
    }
    else {
      return handlerInput.responseBuilder
        .speak(events)
        .reprompt("say repeat today to repeat the review")
        .getResponse()
    }
    
  },
};

var JohnsonReview = 
[
{
  name: "William Gregory Johnson, ",
  review: "Give everyone an A!"
}
]


/**
 * Calculates the difference in days between today and the date that is passed in the parameter. Returns the difference
 * @param {*} date: date of some day  
 */
function computeDifference(date) {
  let currentDate = Date.now();
  date = Date.parse(date);
  let difference = (date - currentDate)/1000/60/60/24;
  if (Math.abs(difference) > 0 && Math.abs(difference) <= 1.5){
    difference = Math.abs(difference);
  }
  console.log(difference);
  return difference;
}

/**
 * Checks to see if the current date's month is the same as the month of the date that is passed as the parameter
 * @param {*} date: date of some day
 */
function computeMonthDifference(date){
  let currentDateMonth = new Date(Date.now()).getMonth();
  let dateMonth = new Date(date).getMonth();
  let sameMonth = false;
  
  if (dateMonth == currentDateMonth){
    sameMonth = true;
  }
  
  return sameMonth;
  
}

//-----------------------------------------------------------------------------------------------------------

var SchoolEvents = 
[
  {
    game: "Georgia State University vs Georgia Southern University at October 27th, ",
    time: "11/25/2018"
  },
  {
    game: "Georgia State University vs University of Georgia at December 15th,",
    time: "12/21/2018"
  }
]



// Random Fact Array
var randomFactArr = [
  'Chik-fil-a is located on the first floor of Student Center West',
  'GSU has a student-run movie theater located at Student Center West on the second floor. Admission is free with a valid Georgia State University student ID',
  'Microwaves and Vending Machinces can be found at the Student Recreation Center as well as Student Center East.',
  'You can reserve a group study room by going to the GSU library website under the Service and Support Tab.',
  'Parking decks on campus that are available to students all day are the decks K, N, and the top of S deck.',
  'If you plan to park on campus, might I suggest obtaining a budget parking card from Parking and Transporation services on the second floor of Student Center West',
  'Interested in watching Georgia State Athletic Events? Visit GSUStudentTickets.com for your free student ticket.',
  'If you lose your Panther Card, you can renew one for a fee of $5. Just visit Campus Services on the second floor of Student Center West',
  'Want to get Academic Advisement at the GSU Atlanta Campus? Visit the University Advisement Center at 25 Park Place building. Freshmen, sophomores, and juniors can visit the fourth and fifth floor for advisement.',
  'Still don\'t know what to major in? take a major recommendation quiz at gsu.mymajors.com/quiz/'
]
// Function to get a random fact based on a random floor index value.
function getFact () {
  return randomFactArr[Math.floor(Math.random() * randomFactArr.length)];
}


// Random Health Note Array
var randomHealthArr = [
  'Are you that unlucky bastard that has to walk long distances to your class? Don\'t forget to stay hydrated!',
  'How much sleep are you getting? It is recommended to sleep 7 to 9 hours nightly.',
  'Good sleep can improve your overall health and wellness and relieve stress.',
  'Foods that are high in protein and fiber are better for you than caffeinated and sugary drinks.',
  'Get a flu shot.',
  'Remember to step away from your studies from time to time if you are overwhelmed.',
  'Try to stop procrastinating. Create a schedule and stick to it.',
  'Take advantage of the Student Recreation Center that you are paying for with your tuition and exercise! Exercise also helps with your mentality!',
  'Don\t be afraid to ask for help',
  'College will fly by fast, enjoy your time and practice self care!',
]

// Function to get a random Health Note
function getHealth () {
  return randomHealthArr[Math.floor(Math.random() * randomHealthArr.length)];
}


var welcomeMessageArray = [
  "Welcome Panther! What can I help you with?",
  "Welcome back Panther, would you like to hear a cool fact about Georgia State? Just say fact to hear something cool about GSU!",
  "Welcome Panther, interested to hear an important health tip? Just say health and I'll tell you an important health fact!",
  "Welcome Panther! How can I help you?"
];

function getRandomWelcomeMessage(){
  return welcomeMessageArray[Math.floor(Math.random() * welcomeMessageArray.length)];
}


var IntentList = [
  {
    name: "School Events for the week",
    utterance: "the utterance is: school events for this week",
    id: '1'
  },
  {
    name: "School Events for today",
    utterance: "the utterance is: school events for today",
    id: '2'
  },
  {
    name: "School Events for this month",
    utterance: "the utterance is: school events for this month",
    id: '3'
  },
  {
    name: "Set assignment reminder for a class",
    utterance: "the utterance is for example, set an exam reminder on december 15th for software engineering",
    id: '4'
  },
  {
    name: "get assignment reminders for today",
    utterance: "the utterance is: any assignment reminders coming up today",
    id: '5'
  },
  {
    name: "fact of the day",
    utterance: "the utterance is: tell me a random fact",
    id: '6'
  },
  {
    name: "health tip of the day",
    utterance: "the utterance is: tell me a health tip",
    id: '7'
  }

];

let currentSemesterClasses = [
  'software engineering',
  'system level programming',
  'databases',
  'web programming'
];

var reminderNumList = [0, 1, 2, 3, 4];

//-----------------------------------------------------------------------------------------------------------

var documentClient = new AWS.DynamoDB.DocumentClient();

/**
 * Gets all the items in the Courses table (Name, assignments, and classTime). Callback function handles the returned data and is
 * within a for loop which means the documentClient.get() method is run multiple times.
 * @param {*} callback: a function that handles the returned data
 */
function getClassDetails(callback){
  let paramList = [
    {
      Key: {
       Name: currentSemesterClasses[0]
      },
      AttributesToGet: [
        'assignments',
        'Name',
        'classTime'
      ],
  
      TableName: 'Courses'
    },
    {
      Key: {
       Name: currentSemesterClasses[1]
      },
      AttributesToGet: [
        'assignments',
        'Name',
        'classTime'
      ],
  
      TableName: 'Courses'
    },
    {
      Key: {
       Name: currentSemesterClasses[2]
      },
      AttributesToGet: [
        'assignments',
        'Name',
        'classTime'
      ],
  
      TableName: 'Courses'
    },
    {
      Key: {
       Name: currentSemesterClasses[3]
      },
      AttributesToGet: [
        'assignments',
        'Name',
        'classTime'
      ],
  
      TableName: 'Courses'
    }
  ]

  for (let i =0; i < paramList.length; i++){
    documentClient.get(paramList[i], function(err, data){
      if (err){
        console.log(err)
      }
      else {
        callback(paramList.length,data);
      }
    });
  }
}

/**
 * Gets the list of assignments from the Courses table in the database.
 * @param {*} className: Name of the class (needed to search for the correct assignments)
 * @param {*} callback: a function that handles the returned data
 */
function getAssignmentList(className, callback){
  let params  = {
    Key: {
      Name: className
    },
    AttributesToGet: [
      'assignments'
    ],

    TableName: "Courses"
  }

  documentClient.get(params, function(err, data){
    if (err){
      console.log(err);
    }
    else {
      console.log(data);
      callback(data);
    }

  });

}

/**
 * 
 * @param {*} event 
 * @param {*} callback 
 */
function setAssignment(event, callback){ 
  var params = {
    Item: {
      Name: event.Name,
      assignments: event.assignments
    },
    TableName: "Courses"
  };
  
  documentClient.put(params, function(err, data){
    if (err){
      console.log(err);
    }
    else {
      callback();
    }
  });
}

function deleteCurrentSemesterClass(className, context, callback) {
  documentClient.delete(className, function(err, data){
    if (err){
      callback(err, null);
    }
    else {
      callback(err, data);
    }
  });
}

function setClass(newClass, context, callback){
 let params = {
   Item: {
     Name: newClass.Name,
     exam: newClass.exam,
     examDate: newClass.examDate,
     homework: newClass.homework,
     homeworkDate: newClass.homeworkDate,
     otherAssignment: newClass.otherAssignment,
     otherAssignmentDate: newClass.otherAssignmentDate,
     quiz: newClass.quiz,
     quizDate: newClass.quizDate
   },

   TableName: 'Courses'
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

//-----------------------------------------------------------------------------------------------------------

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
    setAssignmentReminderHandler,
    getAssignmentReminderDayHandler,
    GetClassProfessor,
    GetBholaReview,
    GetJohnsonReview,
    GetHealthTipHandler,
    GetRandomFact,
    FallBackHandler,
    ListofIntentsHandler,
    UtteranceListHandler,
    CourseScraperHandler,
    AllEventsReminderDayHandler,
    setFutureSemesterCoursesHandler

  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

