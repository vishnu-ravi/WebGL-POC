/**
 * midPoint - Used to get the midpoints of two latitudes and longitudes
 *
 * @param  {float} lat1 Latitude 1
 * @param  {float} lon1 longitude 1
 * @param  {float} lat2 Latitude 2
 * @param  {float} lon2 longitude 2
 * @return {object}      Mid point lat & lon
 */
function midPoint(lat1, lon1, lat2, lon2) {
    var dLon  =   (lon2 - lon1).toRadians();
    lat1      =   lat1.toRadians();
    lat2      =   lat2.toRadians();
    lon1      =   lon1.toRadians();

    var bx    =   Math.cos(lat2) * Math.cos(dLon);
    var by    =   Math.cos(lat2) * Math.sin(dLon);
    var lat3  =   Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by));
    var lon3  =   lon1 + Math.atan2(by, Math.cos(lat1) + bx);

    return {lat: lat3.toDegree(), lng: lon3.toDegree()};
}


/**
 * distanceBetweenTwoPoints - used to find the distance between two latitudes and longitudes
 *
 * @param  {float} lat1 Latitude 1
 * @param  {float} lon1 longitude 1
 * @param  {float} lat2 Latitude 2
 * @param  {float} lon2 longitude 2
 * @return {float}      distance
 */
function distanceBetweenTwoPoints(lat1, lon1, lat2, lon2) {
    var R   =   6371000; // metres
    var φ1  =   lat1.toRadians();
    var φ2  =   lat2.toRadians();
    var Δφ  =   (lat2-lat1).toRadians();
    var Δλ  =   (lon2-lon1).toRadians();

    var a   =   Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c   =   2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return d    =   R * c;
};


/**
 * translateCordsToPoint - Translates the Lat and Lon to x, y, z Vector Points
 *
 * @param  {float} lat Latitude
 * @param  {float} lng Longitude
 * @constant globeRadius which the radius given for sphere geomentry
 * @return {Vector3}     Vector3 Points
 */
function translateCordsToPoint(lat, lng) {
    var phi     =   (90 - lat) * Math.PI / 180;
    var theta   =   (180 - lng) * Math.PI / 180;

    var x       =   globeRadius * Math.sin(phi) * Math.cos(theta);
    var y       =   globeRadius * Math.cos(phi);
    var z       =   globeRadius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

/**
 * moveToPoint - rotates the globle to face the given latitude & longitude
 *
 * @param  {float} lat description
 * @param  {float} lng description
 * @return {type}     return nothing
 */
function moveToPoint( lat, lng ) {
    var phi   =   lat * Math.PI / 180;
    var theta =   lng * Math.PI / 180;

    target.x  =   - Math.PI / 2 + theta;
    target.y  =   phi;
}

/**
 * addSprite - adds the Marker to the Globe
 *
 * @param  {string} id        marker name
 * @param  {float} lat       description
 * @param  {float} lng       description
 * @param  {string} name      unique name for the marker
 * @param  {boolean} is_marker description
 * @return {type}           description
 */
function addSprite(id, lat, lng, name, is_marker) {
    var phi   =   (90 - lat) * Math.PI / 180;
    var theta =   (180 - lng) * Math.PI / 180;

    var r     =   globeRadius + 2;

    var x     =   r * Math.sin(phi) * Math.cos(theta);
    var y     =   r * Math.cos(phi);
    var z     =   r * Math.sin(phi) * Math.sin(theta);

    id    =   id.trim();

    if( id != '' ) {
        var map =   THREE.ImageUtils.loadTexture('/image/' + id + '.png');
        var material    =   new THREE.SpriteMaterial({ map: map});
        sprite = new THREE.Sprite(material);
        sprite.opacity   =   1;
        sprite.scale.x   =   sprite.scale.y  =   sprite.scale.z  =   0;

        /**
         * To add animation to the Marker, currently not using to get better performance
         */
        /*var opacityTween = new TWEEN
            .Tween( sprite )
            .easing(TWEEN.Easing.Elastic.EaseInOut)
            .to( { opacity: 1 }, 500)
            .start();*/
        var sizeTween = new TWEEN
            .Tween( sprite.scale )
            .easing(TWEEN.Easing.Back.EaseOut)
            .to( { x: 10, y: 10, z: 10 }, 500)
            .start();
        sprite.position.set( x, y, z );
        sprite.name =   name;

        if(typeof is_marker != 'undefined' && is_marker == true)
            markerScene.add(sprite);
        else
            iconScene.add(sprite);
    }
}
