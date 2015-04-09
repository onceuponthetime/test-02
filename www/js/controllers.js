angular.module('starter.controllers', [])

.controller('MapCtrl', function($scope, $ionicLoading, $compile) {

	function initialize() {
        var site = new google.maps.LatLng(55.9879314,-4.3042387);
        var insole = new google.maps.LatLng(55.8934378,-4.2201905);
      
        var mapOptions = {
          streetViewControl:true,
          center: site,
          zoom: 8,
          mapTypeId: google.maps.MapTypeId.TERRAIN
        };
        var map = new google.maps.Map(document.getElementById("map"),
            mapOptions);
        
        //Marker + infowindow + angularjs compiled ng-click
        var contentString = "<div><a ng-click='clickTest()'>Click me!</a></div>";
        var compiled = $compile(contentString)($scope);

        var infowindow = new google.maps.InfoWindow({
          content: compiled[0]
        });

        var marker = new google.maps.Marker({
          position: site,
          map: map,
          title: 'Strathblane (Job Location)'
        });
        
        var insoleRoute = new google.maps.Marker({
          position: insole,
          map: map,
          title: 'insole (Stobhill)'
        });
        
        var infowindow = new google.maps.InfoWindow({
             content:"My location"
        });

        infowindow.open(map,marker);
        
        var insolewindow = new google.maps.InfoWindow({
             content:"Susy's insole"
        });

        insolewindow.open(map,insoleRoute);
       
        google.maps.event.addListener(marker, 'click', function() {
          infowindow.open(map,marker);
        });

        $scope.map = map;
        
        var directionsService = new google.maps.DirectionsService();
        var directionsDisplay = new google.maps.DirectionsRenderer();

        var request = {
            origin : site,
            destination : insole,
            travelMode : google.maps.TravelMode.DRIVING
        };
        directionsService.route(request, function(response, status) {
            if (status == google.maps.DirectionsStatus.OK) {
                directionsDisplay.setDirections(response);
            }
        });

        directionsDisplay.setMap(map); 
       
      }
  
      google.maps.event.addDomListener(window, 'load', initialize);
    
      $scope.centerOnMe = function() {
        if(!$scope.map) {
          return;
        }

        $scope.loading = $ionicLoading.show({
          content: 'Getting current location...',
          showBackdrop: false
        });
        navigator.geolocation.getCurrentPosition(function(pos) {
          $scope.map.setCenter(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
          $scope.loading.hide();
        }, function(error) {
          alert('Unable to get location: ' + error.message);
        });
      };
      
      $scope.clickTest = function() {
        alert('Example of infowindow with ng-click')
      };

})

angular.module('ionic-geofence')
    .controller('GeofencesCtrl', function ($scope, $ionicActionSheet, $timeout, $log, $state, geolocationService, geofenceService, $ionicLoading, $ionicActionSheet) {
        $ionicLoading.show({
            template: 'Getting geofences from device...',
            duration: 5000
        });

        $scope.geofences = [];

        geofenceService.getAll().then(function (geofences) {
            $ionicLoading.hide();
            $scope.geofences = geofences;
        }, function (reason) {
            $ionicLoading.hide();
            $log.log('An Error has occured', reason);
        });

        $scope.createNew = function () {
            $log.log('Obtaining current location...');
            $ionicLoading.show({
                template: 'Obtaining current location...'
            });
            geolocationService.getCurrentPosition()
                .then(function (position) {
                    $log.log('Current location found');
                    $ionicLoading.hide();

                    geofenceService.createdGeofenceDraft = {
                        id: UUIDjs.create().toString(),
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        radius: 1000,
                        transitionType: TransitionType.ENTER,
                        notification: {
                            id: geofenceService.getNextNotificationId(),
                            title: 'Insole geofence',
                            text: '',
                            openAppOnClick: true
                        }
                    };
                    geofenceService.createdGeofenceDraft.notification.data = angular.copy(geofenceService.createdGeofenceDraft);
                    $state.go('geofence', {
                        geofenceId: geofenceService.createdGeofenceDraft.id
                    });
                }, function (reason) {
                    $log.log('Cannot obtain current location', reason);
                    $ionicLoading.show({
                        template: 'Cannot obtain current location',
                        duration: 1500
                    });
                });
        };

        $scope.editGeofence = function (geofence) {
            $state.go('geofence', {
                geofenceId: geofence.id
            });
        };

        $scope.removeGeofence = function (geofence) {
            geofenceService.remove(geofence);
        };

        $scope.more = function () {
            // Show the action sheet
            $ionicActionSheet.show({
                buttons: [
                    { text: 'Test application' }
                ],
                destructiveText: 'Delete all geofences',
                titleText: 'More options',
                cancelText: 'Cancel',
                destructiveButtonClicked: function () {
                    geofenceService.removeAll();
                    return true;
                },
                buttonClicked: function(index) {
                    window.location.href = 'cdvtests/index.html';
                }
            });
        };
    })

.controller('GeofenceCtrl', function ($scope, $state, $ionicLoading, geofence, geofenceService) {
    $scope.geofence = geofence;
    $scope.TransitionType = TransitionType;

    $scope.center = {
        lat: geofence.latitude,
        lng: geofence.longitude,
        zoom: 12
    };
    $scope.markers = {
        marker: {
            draggable: true,
            message: geofence.notification.text,
            lat: geofence.latitude,
            lng: geofence.longitude,
            icon: {}
        }
    };
    $scope.paths = {
        circle: {
            type: 'circle',
            radius: geofence.radius,
            latlngs: $scope.markers.marker,
            clickable: false
        }
    };

    $scope.isTransitionOfType = function (transitionType) {
        return ($scope.geofence.transitionType & transitionType);
    };

    $scope.isWhenGettingCloser = function () {
        return $scope.geofence.transitionType === TransitionType.ENTER;
    };

    $scope.toggleWhenIgetCloser = function () {
        $scope.geofence.transitionType ^= TransitionType.ENTER;
    };

    $scope.toggleWhenIamLeaving = function () {
        $scope.geofence.transitionType ^= TransitionType.EXIT;
    };

    $scope.save = function () {
        if (validate()) {
            $scope.geofence.radius = parseInt($scope.paths.circle.radius);
            $scope.geofence.latitude = $scope.markers.marker.lat;
            $scope.geofence.longitude = $scope.markers.marker.lng;
            geofenceService.addOrUpdate($scope.geofence);
            $state.go('geofences');    
        }
    };

    function validate () {
        if (!$scope.geofence.notification.text) {
            $ionicLoading.show({
                template: 'Please enter some notification text.',
                duration: 3000
            });
            return false;
        }

        if ($scope.geofence.transitionType === 0) {
            $ionicLoading.show({
                template: 'You must select when you want notification. When entering or/and exiting region?',
                duration: 3000
            });
            return false;
        }
        return true;
    };
});


.controller('ChatsCtrl', function($scope, Chats) {
  $scope.chats = Chats.all();
  $scope.remove = function(chat) {
    Chats.remove(chat);
  };
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
