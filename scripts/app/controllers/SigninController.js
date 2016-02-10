app.controller('SigninController', ['$scope', '$window', '$location', function($scope, $window, $location) {
  
	  $scope.signinText = "Sign in";
	  $scope.signupText = "Sign up";
	  $scope.signupRedirectURL = "https://databox.me";

	  var Solid = require('solid.js');
	  
	  $scope.signinCallback = function() {
	  	
	  	$scope.signinText = "Signing in...";

	    Solid.auth.login()
	    .then(function(webid) {

	      // console.log(webid);
	      $scope.$apply(function() {
	      	$scope.signinText = "Signed in as " + webid;
	      });

	      setTimeout( function() {
	      	$scope.$apply(function() {
		        $location.path("/chathome");
		        console.log($location.path());
		      });
		      // $location.path("/chathome");
		      // console.log( $location.path());
	      // $window.location.href = "#/chathome";
	      } , 3000);

	    }).catch(function(err) {
	      console.log(err);
	    });
	  };

	  $scope.signupCallback = function() {
	  	$window.location.href = $scope.signupRedirectURL;
	  };
}]);