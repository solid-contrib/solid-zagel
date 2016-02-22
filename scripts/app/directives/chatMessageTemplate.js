app.directive('chatMessageTemplate', function() { 
  return { 
    restrict: 'E', 
    scope: { 
      msg: '='
    }, 
    templateUrl: 'scripts/app/directives/chatMessageTemplate.html',
    
  }; 
});