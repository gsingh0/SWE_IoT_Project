const GetClassProfessor = {
    canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'IntentRequest'
          && request.intent.name === 'ClassProfessor';
    },
    handle(handlerInput) {
      let events = "Here are the list of Professors for this class: ";
      let eventCounter = 0;
      for (let i = 0; i < Professors.length; i++){
        let difference = computeDifference(Professor[i].time);
        
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