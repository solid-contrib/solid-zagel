app.controller('SigninController', function($scope, $window, $location, sharedProperties) {
  
	  $scope.signinText = "Sign in";
	  $scope.signupText = "Sign up";
	  $scope.signinResultText = "";

	  var Solid = require('solid.js');

	  var signinResultFeedback = function(result , msg) {

	  	$scope.$apply(function() {
	      	
	      	$scope.signinResultText = msg;

	      	if (result) {
		      	$('#signin-success-alert').fadeIn();
		      } else {
		      	$('#signin-fail-alert').fadeIn();
		      	$scope.signinText = "Sign in";
		      }
	      });
	  };
	  
	  $scope.signinCallback = function() {
	  	
	  	$scope.signinText = "Signing in...";

	    Solid.auth.login()
	    .then(function(webid) {

	      // console.log(webid);
	      sharedProperties.getUserInfo().webid = webid;
	      sessionStorage.setItem("userWebid" , webid);
	      // $scope.$apply(function() {
	      // 	$('#signin-success-alert').fadeIn();
	      // 	$scope.signinResultText = "Signed in as " + webid;
	      // });
	    signinResultFeedback(true , "Signed in as " + webid);

	      setTimeout( function() {
	      	$scope.$apply(function() {
		        $location.path("/chathome");
		        console.log($location.path());
		      });
		      // $location.path("/chathome");
		      // console.log( $location.path());
	      // $window.location.href = "#/chathome";
	      } , 1000);

	    }).catch(function(err) {
	      console.log(err);

	      signinResultFeedback(false , "failed to sign in with code: " + err.xhr.status);
	    });
	  };

	  $scope.signupCallback = function(event) {

	  	var url = event.target.getAttribute("link-url");
	  	$window.location.href = url;
	  };

	  $('a, button').click(function() {
        $(this).toggleClass('active');
	    });
});