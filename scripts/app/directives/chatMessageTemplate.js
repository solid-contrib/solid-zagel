app.directive('chatMessageTemplate', function() { 
  return { 
    restrict: 'E', 
    scope: { 
      post: '='
    }, 
    templateUrl: 'scripts/app/directives/chatMessageTemplate.html',
    
  }; 
});