var app = angular.module('ZagelChatApp', ['ngRoute']);

app.config(function ($routeProvider) {
  $routeProvider
    .when('/', {
      controller: "SigninController",
      templateUrl: "views/signin.html"
    })
    .when('/signin', {
     templateUrl: "views/signin.html",
     controller: "SigninController"
    })
    .when('/chathome', {
      templateUrl: "views/chathome.html",
      controller: "ChathomeController"
    });
    // .otherwise({
    //   redirectTo: '/'
    // });
});