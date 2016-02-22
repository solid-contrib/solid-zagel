app.directive('friendListItem', function() { 
  return { 
    restrict: 'E', 
    scope: { 
      friend: '=',
      parentCallback: '&'
    }, 
    templateUrl: 'scripts/app/directives/friendListItem.html',
    
  }; 
});