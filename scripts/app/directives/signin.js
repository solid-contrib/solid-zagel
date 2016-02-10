app.directive('signin', function() {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'scripts/app/directives/signin.html',
    
    link: function(scope, element, attrs) {
      scope.signinText = "Signin";
      scope.signupText = "Signup";
      scope.signupRedirectURL = "https://databox.me";

      var Solid = require('solid.js');

      scope.signin = function() {
        Solid.auth.login.then(function(webid) {

          console.log(webid);
        }).catch(function(err) {
          console.log(err);
        });
      }

      scope.signup = function() {

      }
    },
  };
});
