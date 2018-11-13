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