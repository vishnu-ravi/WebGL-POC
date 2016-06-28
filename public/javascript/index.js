Number.prototype.toRadians    =   function() {
    return this * Math.PI / 180;
};

Number.prototype.toDegree    =   function() {
    return this * 180 / Math.PI;
};

var Map =   function () {
    this.globe  =   null;
    this.init();
    this.map    =   null;
    this.totalMarker    =   0;
    this.plain_id   =   null;

    /**
     * This Data shoudl be retrieved from DB
     */
    this.destinations   =   {
        'BR56': { //Chicago
            'departure': {lat: 25.0676, lng: 121.5527},
            'destination': {lat: 41.9742, lng: -87.9073},
            'nb_points': 5
        },
        'BR2': { //Los Angeles
            'departure': {lat: 25.0676, lng: 121.5527},
            'destination': {lat: 33.9416, lng: -118.4085},
            'nb_points': 5
        },
        'BR52': { //Houston
            'departure': {lat: 25.0676, lng: 121.5527},
            'destination': {lat: 29.7604, lng: -95.3698},
            'nb_points': 5
        },
        'BR32': {   //New York
            'departure': {lat: 25.0676, lng: 121.5527},
            'destination': {lat: 40.6413, lng: -73.7781},
            'nb_points': 5
        },
        'BR18': { //San Francisco
            'departure': {lat: 25.0676, lng: 121.5527},
            'destination': {lat: 37.6213, lng: -122.3790},
            'nb_points': 5
        },
        'BR26': {  //Seattle
            'departure': {lat: 25.0676, lng: 121.5527},
            'destination': {lat: 47.4502, lng: -122.3088},
            'nb_points': 5
        },
        'BR36': {  //Toronto
            'departure': {lat: 25.0676, lng: 121.5527},
            'destination': {lat: 43.6777, lng: -79.6248},
            'nb_points': 5
        },
        'BR10': { //Vancouver
            'departure': {lat: 25.0676, lng: 121.5527},
            'destination': {lat: 49.1967, lng: -123.1815},
            'nb_points': 5
        },
    };

    this.latLngConnection   =   [];
    this.markerObjects      =   [];
    this.connectionObjects  =   [];
};

Map.prototype.init  =   function() {

    $('body').removeClass('loading');

    this.bindIntroEvents();
};

/**
 * Map.prototype.bindIntroEvents - Bind the all the events related to Destination Selection
 *
 * @return {type}  description
 */
Map.prototype.bindIntroEvents   =   function() {
    var _this   =   this;

    $('ul.destinations li').on('click', function(e) {
        e.preventDefault();
        var plain_id    =   $(this).data('plain_id');

        $('#block_intro').fadeOut(1000, 'swing', function() {
            $('#block_map').fadeIn(1000, 'swing', function () {
                //_this.initGMap(plain_id);

                /**
                 * Here Webgl support is checked, if webgl not supported Goolgle Map Initilized
                 */
                if( ! Detector.webgl)
                    _this.initGMap(plain_id);
                else
                    _this.initWebGL(plain_id);
            });
        });
    })
};

/**
 * initGMap function - Initilize Google Maps
 *
 * @param  {string} plain_id Unique string
 * @return {type}          description
 */
Map.prototype.initGMap      =   function (plain_id) {
    // Specify features and elements to define styles.
    var styleArray = [{"featureType":"water","elementType":"geometry","stylers":[{"visibility":"on"},{"color":"#aee2e0"}]},{"featureType":"landscape","elementType":"geometry.fill","stylers":[{"color":"#abce83"}]},{"featureType":"poi","elementType":"geometry.fill","stylers":[{"color":"#769E72"}]},{"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#7B8758"}]},{"featureType":"poi","elementType":"labels.text.stroke","stylers":[{"color":"#EBF4A4"}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"visibility":"simplified"},{"color":"#8dab68"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"visibility":"simplified"}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#5B5B3F"}]},{"featureType":"road","elementType":"labels.text.stroke","stylers":[{"color":"#ABCE83"}]},{"featureType":"road","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#A4C67D"}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#9BBF72"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#EBF4A4"}]},{"featureType":"transit","stylers":[{"visibility":"off"}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"visibility":"on"},{"color":"#87ae79"}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#7f2200"},{"visibility":"off"}]},{"featureType":"administrative","elementType":"labels.text.stroke","stylers":[{"color":"#ffffff"},{"visibility":"on"},{"weight":4.1}]},{"featureType":"administrative","elementType":"labels.text.fill","stylers":[{"color":"#495421"}]},{"featureType":"administrative.neighborhood","elementType":"labels","stylers":[{"visibility":"off"}]}];

    var details   =   this.destinations[plain_id];
    var midPoint  =   this.midPoint(details.departure.lat, details.departure.lng, details.destination.lat, details.destination.lng);
    var commonMidPoint    =   {lat: 39.96189047326361, lng: 186.59176249999996};
    $('#block_control').show();
    $('#block_start').hide();
    // Create a map object and specify the DOM element for display.
    var map       =   new google.maps.Map(document.getElementById('container'), {
        center: details.departure,
        scrollwheel: false,
        styles: styleArray,
        zoom: 3,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: true,
        fullscreenControl: false,
        scrollwheel: true,
        disableDoubleClickZoom: true,
        maxZoom: 7,
        minZoom: 3
    });

    setTimeout(function() {
        map.panTo(details.destination);

        setTimeout(function() {
            map.panTo(commonMidPoint);
        }, 2000);
    }, 3000);

    this.map  =   map;
    this.totalMarker    =   details.nb_points;
    this.plain_id       =   plain_id;

    var departure     =   details.departure;
    var destination   =   details.destination;
    var image         =   'image/marker_orange.png';
    this.addMarker(departure, image, false);
    this.addMarker(destination, image, false);
    this.latLngConnection.push({lat: departure.lat, lng: departure.lng, name: 'departure', check: false});

    var _this =   this;

    map.addListener('dblclick', function(e) {
        if(_this.latLngConnection.length >= (details.nb_points + 2))
            return false;

        var index   =   _this.latLngConnection.length + 1;
        var name    =   'marker_' + index;

        _this.latLngConnection.push({lat: e.latLng.lat(), lng: e.latLng.lng(), name: name, check: true});
        _this.addConnectionLine();

        if(_this.latLngConnection.length == (details.nb_points + 1)) {
            _this.latLngConnection.push({lat: destination.lat, lng: destination.lng, name: 'destination', check: false});
            _this.addConnectionLine();
            document.getElementById('btn_submit').removeAttribute('disabled');
        }

        var image         =   'image/marker_white.png';
        _this.addMarker(e.latLng, image, true);

        document.getElementById('btn_clear').removeAttribute('disabled');
        document.getElementById('btn_undo').removeAttribute('disabled');
    });

    this.bindGMapEvents();
};

/**
 * Map.prototype.bindGMapEvents - Binds all the events related to Google Maps
 *
 * @return {type}  description
 */
Map.prototype.bindGMapEvents    =   function() {
    var _this   =   this;

    $('#btn_clear').off('click').on('click', function(e) {
        e.preventDefault();

        _this.markerObjects.forEach(function(marker, key) {
            marker.setMap(null);
        });

        _this.connectionObjects.forEach(function(path, key) {
            path.setMap(null);
        });

        _this.markerObjects     =   [];
        _this.connectionObjects =   [];

        document.getElementById('btn_submit').setAttribute('disabled', true);
        document.getElementById('btn_undo').setAttribute('disabled', true);
        document.getElementById('btn_clear').setAttribute('disabled', true);

        _this.latLngConnection  =   [];

        var details   =   _this.destinations[_this.plain_id];

        var departure     =   details.departure;
        _this.latLngConnection.push({lat: departure.lat, lng: departure.lng, name: 'departure', check: false});
    });

    $('#btn_undo').off('click').on('click', function(e) {
        e.preventDefault();

        var marker  =   _this.markerObjects.pop();

        marker.setMap(null);

        if(_this.markerObjects.length == 0)
            document.getElementById('btn_undo').setAttribute('disabled', true);

        var path    =   _this.connectionObjects.pop();
        path.setMap(null);

        _this.latLngConnection.pop();
        if(_this.totalMarker == _this.connectionObjects.length) {
            var path    =   _this.connectionObjects.pop();
            path.setMap(null);
            _this.latLngConnection.pop();
        }
    });
};

/**
 * Map.prototype.addMarker - Adds Marker
 *
 * @param  {type} location    description
 * @param  {type} image       description
 * @param  {type} is_editable description
 * @return {type}             description
 */
Map.prototype.addMarker =   function(location, image, is_editable) {
    var markerImage;
    var size, point1, point2;

    if(is_editable) {
        size    =  new google.maps.Size(28, 28);
        point1  =  new google.maps.Point(0, 0);
        point2  =  new google.maps.Point(14, 14);
    }
    else {
        size    =  new google.maps.Size(53, 53);
        point1  =  new google.maps.Point(0, 0);
        point2  =  new google.maps.Point(26.5, 26.5);
    }

    var markerImage =   new google.maps.MarkerImage(image, size, point1, point2);

    var marker = new google.maps.Marker({
        position: location,
        map: this.map,
        animation: google.maps.Animation.DROP,
        icon: markerImage
    });

    if(is_editable)
        this.markerObjects.push(marker);
};

/**
 * Map.prototype.addConnectionLine - Adds the connection line between two Lat & lng on GMap
 *
 * @return {type}  description
 */
Map.prototype.addConnectionLine =   function() {
    var tmp         =   this.latLngConnection.slice(0);
    var last_two    =   tmp.slice(-2);

    var cordinates  =   [
        {lat: last_two[0].lat, lng: last_two[0].lng},
        {lat: last_two[1].lat, lng: last_two[1].lng}
    ];

    var flightPath = new google.maps.Polyline({
        path: cordinates,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });

    flightPath.setMap(this.map);
    this.connectionObjects.push(flightPath);
};

/**
 * Map.prototype.initWebGL - Initilize Webgl
 *
 * @param  {string} plain_id Unique Plane Id
 * @return {type}          description
 */
Map.prototype.initWebGL   =   function(plain_id) {
    var mapZoom		=	3;
    var mapCanvas	=	document.createElement('canvas');
    var mapCtx		=	mapCanvas.getContext('2d');

    var container	=	document.getElementById('container');
    this.globe		=	new DAT.Globe(container);

    var i, tweens	=	[];
    var map_image   =   $('<img id="dynamic">');
    var _this       =   this;
    $('body').addClass('loading');
    map_image.load(function() {
        $('body').removeClass('loading');
        TWEEN.start();
        _this.globe.animate();
        _this.addMarkers(plain_id);
        var details =   _this.destinations[plain_id];
        _this.globe.setEndPoints(details);
        _this.bindWebGLEvents();
    }).attr('src', 'image/world_small.jpg');

};

Map.prototype.addMarkers    =   function(plain_id) {
    var details =   this.destinations[plain_id];
    //this.globe.moveTo(details.departure.lat, details.departure.lng);

    this.globe.addSprite('marker_orange', details.departure.lat, details.departure.lng, true, 'marker_1');
    this.globe.addSprite('marker_orange', details.destination.lat, details.destination.lng, true, 'marker_7');
    var start   =   {latitude: details.departure.lat, longitude: details.departure.lng};
    var end     =   {latitude: details.destination.lat, longitude: details.destination.lng};

    this.globe.addConnectionLine(start, end, 500, 'start');
    var midPoint    =   this.globe.midPoint(details.departure.lat, details.departure.lng, details.destination.lat, details.destination.lng);

    this.globe.moveTo(midPoint.lat, midPoint.lng);
};

/**
 * Map.prototype.bindWebGLEvents - Binds events releated to Webgl
 *
 * @return {type}  description
 */
Map.prototype.bindWebGLEvents   =   function() {
    var _this   =  this;

    $('#btn_start').off('click').on('click', function (e) {
        e.preventDefault();
        _this.globe.enableClick();
        _this.globe.clearAll();
        $('#block_start').hide();
        $('#block_control').show();
    });

    $('#btn_clear').off('click').on('click', function(e) {
        e.preventDefault();

        var is_disabled	=	this.getAttribute('disabled');

        if(is_disabled == true)
            return false;

        _this.globe.clearAll();
    });

    $('#btn_undo').off('click').on('click', function(e) {
        e.preventDefault();

        var is_disabled	=	this.getAttribute('disabled');

        if(is_disabled == true)
            return false;

        _this.globe.undo();
    });

    $('#btn_submit').off('click').on('click', function(e) {
        e.preventDefault();

        var is_disabled	=	this.getAttribute('disabled');

        if(is_disabled == true)
            return false;

        _this.globe.submitRoute();
    });

    $('#btn_continue').off('click').on('click', function(e) {
        e.preventDefault();

        document.getElementById('result_container').style.display = 'none';
        document.getElementById('result').innerHTML =	'';
        _this.globe.clearAll();
    });
}

$(document).ready(function() {
    var map =   new Map();
});
