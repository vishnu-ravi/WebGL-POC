 /**
 * dat.globe Javascript WebGL Globe Toolkit
 * http://dataarts.github.com/dat.globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

var DAT   = DAT || {};
THREE.CanvasTexture = function ( canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy ) {

	THREE.Texture.call( this, canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy );

	this.needsUpdate = true;

};

THREE.CanvasTexture.prototype = Object.create( THREE.Texture.prototype );
THREE.CanvasTexture.prototype.constructor = THREE.CanvasTexture;
DAT.Globe = function(container, colorFn) {
    colorFn = colorFn || function(x) {
        var c = new THREE.Color();
        c.setHSV((0.6 - ( x * 0.5 )), 1.0, 1.0);
        return c;
    };

  var camera, scene, renderer, w, h, globe3d, shadow_plane;
  var globeRadius   =   150;
  var vec3_origin   =   new THREE.Vector3(0,0,0);
  var iconScene, showIcons  =   true;
  var pathScene, markerScene;
  var vector, worldMesh, mesh, atmosphere, point;
  var loader    =   new THREE.ColladaLoader();
  var paths =   [], movingPlanes   =   [];
  var latLngSet1    =   [];
  var latLngSet2    =   [];
  var latLngAcutal  =   [];
  latLngAcutal.push({lat: 1.3521, lng: 103.8198, check: false, name: 'marker_1'});
  latLngAcutal.push({lat: 11.44369, lng: 104.39086, check: true, name: 'marker_2'});
  latLngAcutal.push({lat: 24.67631, lng: 113.98106, check: true, name: 'marker_3'});
  latLngAcutal.push({lat: 25.0330, lng: 121.5654, check: false, name: 'marker_4'});
  latLngAcutal.push({lat: 32.34188, lng: 129.96099, check: true, name: 'marker_5'});
  latLngAcutal.push({lat: 38.68364, lng: 142.14383, check: true, name: 'marker_6'});
  latLngAcutal.push({lat: 46.82084, lng: 145.32773, check: true, name: 'marker_7'});
  latLngAcutal.push({lat: 53.89372, lng: 157.41155, check: true, name: 'marker_8'});
  latLngAcutal.push({lat: 63.66249, lng: 170.98911, check: true, name: 'marker_9'});
  latLngAcutal.push({lat: 64.77069, lng: -160.80509, check: true, name: 'marker_10'});
  latLngAcutal.push({lat: 64.5688, lng: -133.74215, check: true, name: 'marker_11'});
  latLngAcutal.push({lat: 56.1372, lng: -97.747, check: true, name: 'marker_12'});
  latLngAcutal.push({lat: 40.7128, lng: -74.0059, check: false, name: 'marker_13'});

  var latLngConnection  =   [];
  latLngConnection.push({lat: 1.3521, lng: 103.8198, name: 'marker_1'});

  latLngSet1[0]     =   {lat: 1.3521, lng: 103.8198};
  latLngSet1[3]     =   {lat: 25.0330, lng: 121.5654};

  latLngSet2[0]     =   {lat: 25.0330, lng: 121.5654};
  latLngSet2[9]     =   {lat: 40.7128, lng: -74.0059};

  var overRenderer;

  var imgDir        =   '';

  var curZoomSpeed  =   0;
  var zoomSpeed     =   50;
  var hammertime, mc;
  var mouse         =   { x: 0, y: 0 },
      mouseOnDown   =   { x: 0, y: 0 };
  var rotation      =   { x: 0, y: 0 },
      target        =   { x: Math.PI*3/2, y: Math.PI / 6.0 },
      targetOnDown  =   { x: 0, y: 0 };

  var distance      =   100000, distanceTarget  = 100000;
  var padding       =   40;
  var PI_HALF       =   Math.PI / 2;

  var texture;
  function webglAvailable() {
    	try {
    		var canvas    =   document.createElement( 'canvas' );
    		return !!( window.WebGLRenderingContext && (
    			canvas.getContext( 'webgl' ) ||
    			canvas.getContext( 'experimental-webgl' ) )
    		);
    	} catch ( e ) {
    		return false;
    	}
    }
  function init() {
    container.style.color   =   '#fff';
    container.style.font    =   '13px/20px Arial, sans-serif';

    var shader, uniforms, material;
    w       =   container.offsetWidth || window.innerWidth;
    h       =   container.offsetHeight || window.innerHeight;

    camera  =   new THREE.PerspectiveCamera( 30, w / h, 1, 10000);
    camera.position.z   =   distance;
    camera.target       =   new THREE.Vector3( 0, 0, 0 );


    vector  =   new THREE.Vector3();
    scene   =   new THREE.Scene();

    iconScene       =   new THREE.Scene();
    markerScene     =   new THREE.Scene();
    pathScene       =   new THREE.Scene();

    projector       =   new THREE.Projector();
    var geometry    =   new THREE.SphereGeometry(globeRadius, 40, 30);//, 0, 2 * Math.PI, -Math.PI / 2, Math.PI );

    geometry.mergeVertices();
    var l = geometry.vertices.length;
    var waves   =   [];
    for (var i=0; i<l; i++){
		// get each vertex
		var v = geometry.vertices[i];

		// store some data associated to it
		waves.push({y:v.y,
			 x:v.x,
			 z:v.z,
			 // a random angle
			 ang:Math.random()*Math.PI*2,
			 // a random distance
			 amp:2 + Math.random()*0.8,
			 // a random speed between 0.016 and 0.048 radians / frame
			 speed:0.016 + Math.random()*0.032
		});
	};

    var texture =   THREE.ImageUtils.loadTexture('image/world.jpg');
    texture.needsUpdate = true;
    material    =   new THREE.MeshBasicMaterial({map: texture});

    worldMesh   =   new THREE.Mesh(geometry, material);

    worldMesh.rotation.y    +=  (Math.PI / 2) + 1.6;
    worldMesh.matrixAutoUpdate  =   false;
    worldMesh.updateMatrix();

    var verts = worldMesh.geometry.vertices;
	var l = verts.length;

	for (var i=0; i<l; i++){
		var v     =   verts[i];

		// get the data associated to it
		var vprops    =   waves[i];

		// update the position of the vertex
		v.x = vprops.x + Math.cos(vprops.ang)*vprops.amp;
		v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;

		// increment the angle for the next frame
		vprops.ang += vprops.speed;

	}

	worldMesh.geometry.verticesNeedUpdate=true;

    globe3d =   worldMesh;
    scene.add(worldMesh);

    //Shadow
    var canvas = document.createElement( 'canvas' );
	canvas.width = 300;
	canvas.height = 300;

	var context = canvas.getContext( '2d' );
	var gradient = context.createRadialGradient(
		canvas.width / 2,
		canvas.height / 2,
		0,
		canvas.width / 2,
		canvas.height / 2,
		canvas.width / 2
	);
	gradient.addColorStop( 0.1, 'rgba(210,210,210,1)' );
	gradient.addColorStop( 1, 'rgba(255,255,255,1)' );

	context.fillStyle = gradient;
	context.fillRect( 0, 0, canvas.width, canvas.height );

	var shadow_texture = new THREE.CanvasTexture( canvas );

    var plane_geo   =   new THREE.PlaneBufferGeometry(300, 300);
    var plane_mat   =   new THREE.MeshBasicMaterial( {map: shadow_texture, overdraw: 0.5} );
    shadow_plane    =   new THREE.Mesh(plane_geo, plane_mat);

    scene.add(camera);
    camera.add( shadow_plane );
    shadow_plane.position.set(0, -220, -800);
    shadow_plane.scale.set(0.5, 0.5, 0.5);
    shadow_plane.rotation.x   =   -Math.PI / 4;
    if ( webglAvailable() ) {
		renderer    =   new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
	} else {
		renderer = new THREE.CanvasRenderer();
	}

    renderer.autoClear  =   false;
    renderer.setClearColor(0xffffff, 0.0);
    renderer.setSize(w, h);
    renderer.sortObjects    =   true;

    renderer.domElement.style.position  =   'absolute';

    container.appendChild(renderer.domElement);

    hammertime  =   new Hammer(container, {});
    mc          =   new Hammer.Manager(container, {});
    hammertime.get('pinch').set({ enable: true });
    hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });

    hammertime.on('panstart', onMouseDown);
    mc.add( new Hammer.Tap({ event: 'doubletap', taps: 2 }) );

    if('ontouchstart' in document.documentElement)
        mc.on('doubletap', onDoubleClick);
    else
        container.addEventListener('dblclick', onDoubleClick, false);

    container.addEventListener('mousedown', onMouseDown, false);
    container.addEventListener('mousewheel', onMouseWheel, false);
    hammertime.on('pinchin', function(e) {
        zoom(-20);
    });

    hammertime.on('pinchout', function(e) {
        zoom(20);
    });

    document.addEventListener('keydown', onDocumentKeyDown, false);

    window.addEventListener('resize', onWindowResize, false);

    container.addEventListener('mouseover', function() {
        overRenderer = true;
    }, false);

    container.addEventListener('mouseout', function() {
        overRenderer = false;
    }, false);
  }

  function clearAll() {
    for(i = markerScene.children.length - 1; i >= 0; i --) {
        obj =   markerScene.children[i];
        markerScene.remove(obj);
    }

    for(i = pathScene.children.length - 1; i >= 0; i --) {
        obj =   pathScene.children[i];
        pathScene.remove(obj);
    }

    document.getElementById('btn_clear').setAttribute('disabled', true);
    document.getElementById('btn_undo').setAttribute('disabled', true);
    document.getElementById('btn_submit').setAttribute('disabled', true);

    latLngConnection    =   [];
    movingPlanes        =   [];
    paths               =   [];
    latLngConnection.push({lat: 1.3521, lng: 103.8198, name: 'marker_1'});
  }

  function undo() {
    var length      =   latLngConnection.length;

    if(length == 1)
        return;

    if(length == 4)
    {
        latLngConnection.pop();
        var toRemove    =   latLngConnection.pop();
        var object      =   getObjectByName(markerScene, toRemove.name);

        if(object)
            markerScene.remove(object);

        object          =   getObjectByName(pathScene, 'marker_2_marker_3');

        if(object)
            pathScene.remove(object);

        object          =   getObjectByName(pathScene, 'marker_3_marker_4');

        if(object)
            pathScene.remove(object);

        paths.pop();
        paths.pop();

        toRemove        =   movingPlanes.pop();
        object      =   getObjectByName(pathScene, toRemove.name);

        if(object)
            pathScene.remove(object);

        toRemove        =   movingPlanes.pop();
        object      =   getObjectByName(pathScene, toRemove.name);

        if(object)
            pathScene.remove(object);
    }
    else if(length == 13)
    {
        latLngConnection.pop();

        var toRemove    =   latLngConnection.pop();
        var object      =   getObjectByName(markerScene, toRemove.name);

        if(object)
            markerScene.remove(object);

        object          =  getObjectByName(pathScene, 'marker_12_marker_13');

        if(object)
            pathScene.remove(object);

        object          =  getObjectByName(pathScene, 'marker_11_marker_12');

        if(object)
            pathScene.remove(object);

        paths.pop();
        paths.pop();

        toRemove        =   movingPlanes.pop();
        object      =   getObjectByName(pathScene, toRemove.name);

        if(object)
            pathScene.remove(object);

        toRemove        =   movingPlanes.pop();
        object      =   getObjectByName(pathScene, toRemove.name);

        if(object)
            pathScene.remove(object);
    }
    else
    {
        var toRemove    =   latLngConnection.pop();
        var object      =   getObjectByName(markerScene, toRemove.name);

        if(object)
            markerScene.remove(object);

        var name        =   'marker_' + (length - 1) + '_marker_' + length;
        object          =   getObjectByName(pathScene, name);

        if(object)
            pathScene.remove(object);

        paths.pop();

        toRemove        =   movingPlanes.pop();
        object      =   getObjectByName(pathScene, toRemove.name);

        if(object)
            pathScene.remove(object);
    }

    if(length == 2)
        document.getElementById('btn_undo').setAttribute('disabled', true);
    else {
        document.getElementById('btn_undo').removeAttribute('disabled');
    }

    document.getElementById('btn_submit').setAttribute('disabled', true);
  }

  function submitRoute()
  {
    var length  =   latLngConnection.length;

    if(length != 13)
        return false;

    var totalPoints =   0;

    var pointGiven  =   false;
    console.log(JSON.stringify(latLngConnection));

    latLngAcutal.forEach(function(item, index) {
        if(item.check == false)
            return;

        var d   =   distanceBetweenTwoPoints(item.lat, item.lng, latLngConnection[index].lat, latLngConnection[index].lng);
        d       =   d /100000;
        var old_point   =   totalPoints;

        if(d <= 8)
            totalPoints +=  10;
        else if(d <= 16 && d > 8)
            totalPoints +=  5;
        else if(d <= 24 && d > 16)
            totalPoints +=  2;

        if(old_point != totalPoints)
            latLngConnection[index].is_point_given  = true;
        else
            latLngConnection[index].is_point_given  = false;
    });

    latLngConnection.forEach(function(location, key) {
        if(location.check == true && location.is_point_given == false)
        {
            latLngAcutal.forEach(function(item, index) {
                if(item.check == true)
                {
                    var d   =   distanceBetweenTwoPoints(item.lat, item.lng, location.lat, location.lng);
                    d       =   d /100000;

                    if(d <= 8)
                        totalPoints +=  10;
                    else if(d <= 16 && d > 8)
                        totalPoints +=  5;
                    else if(d <= 24 && d > 16)
                        totalPoints +=  2;
                }
            });
        }
    });

    document.getElementById('result').innerHTML =   totalPoints;
    document.getElementById('result_container').style.display = 'block';
  }

  Number.prototype.toRadians    =   function() {
      return this * Math.PI / 180;
  }

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

  function getObjectByName(var_scene, name) {
    for(i = var_scene.children.length - 1; i >= 0; i --) {
        obj =   var_scene.children[i];
        if(obj.name == name)
            return obj;
    }

    return false;
  }

  function onMouseDown(event) {
      var el  =   document.querySelectorAll( '.hide' );
      for( var j = 0; j < el.length; j++ ) {
          el[ j ].style.opacity       =   0;
          el[ j ].style.pointerEvents =   'none';
      }
      event.preventDefault();

      hammertime.on('panmove', onMouseMove);
      hammertime.on('panend pancancel', onMouseUp);
      container.addEventListener('mousemove', onMouseMove, false);
      container.addEventListener('mouseup', onMouseUp, false);

      var is_touch_event    =   typeof event.changedPointers == 'undefined' ? false : true;

      container.addEventListener('mouseout', onMouseOut, false);

      mouseOnDown.x     =   is_touch_event ? (- event.changedPointers[0].clientX) : (- event.clientX);
      mouseOnDown.y     =   is_touch_event ? event.changedPointers[0].clientY : event.clientY;

      targetOnDown.x    =   target.x;
      targetOnDown.y    =   target.y;

      container.style.cursor  =   'move';
  }

  function onMouseMove(event) {

      var is_touch_event    =   typeof event.changedPointers == 'undefined' ? false : true;

      mouse.x =   is_touch_event ? (- event.changedPointers[0].clientX) : (- event.clientX);
      mouse.y =   is_touch_event ? event.changedPointers[0].clientY : event.clientY;

      var zoomDamp    =   distance/1000;

      target.x    =   targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
      target.y    =   targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

      target.y    =   target.y > PI_HALF ? PI_HALF : target.y;
      target.y    =   target.y < - PI_HALF ? - PI_HALF : target.y;
  }

  function onMouseUp(event) {

    var is_touch_event    =   typeof event.changedPointer == 'undefined' ? false : true;
	var el     =   document.querySelectorAll( '.hide' );
	for( var j = 0; j < el.length; j++ ) {
        el[ j ].style.opacity       =   1;
        el[ j ].style.pointerEvents =   'auto';
	}
    hammertime.off('panmove');
    hammertime.off('panend pancancel');

    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.style.cursor  =   'auto';
  }

  function onMouseOut(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    hammertime.off('tap');
  }

  function onDoubleClick(event) {
      event.preventDefault();

      if(latLngConnection.length == 13)
            return false;

      document.getElementById('btn_clear').removeAttribute('disabled');
      document.getElementById('btn_undo').removeAttribute('disabled');

      var is_touch_event    =   typeof event.changedPointers == 'undefined' ? false : true;
      var offsetX, offsetY;

      if(is_touch_event) {
          var rect  =   event.target.getBoundingClientRect();
          var offsetX     =   event.changedPointers[0].pageX; - rect.left;
          var offsetY     =   event.changedPointers[0].pageY; - rect.top;
      }
      else {
          offsetX   =   event.offsetX;
          offsetY   =   event.offsetY;
      }

      var canvas    =   renderer.domElement;
      var vector    =   new THREE.Vector3( ( (offsetX) / canvas.width ) * 2 - 1, - ( (offsetY) / canvas.height) * 2 + 1, 0.5 );

      projector.unprojectVector( vector, camera );

      var ray   =   new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

      var intersects    =   ray.intersectObject(globe3d);

      if (intersects.length > 0) {
            object  =   intersects[0];

            r       =   globeRadius;
            x       =   object.point.x;
            y       =   object.point.y;
            z       =   object.point.z;

            lat     =   90 - (Math.acos(y / r)) * 180 / Math.PI;
            lon     =   ((270 + (Math.atan2(x, z)) * 180 / Math.PI) % 360) - 180;

            lat     =   Math.round(lat * 100000) / 100000;
            lon     =   Math.round(lon * 100000) / 100000;

            var index   =   latLngConnection.length + 1;
            var name    =   'marker_' + index;
            latLngConnection.push({lat: lat, lng: lon, name: name, check: true});

            //moveToPoint(lat, lon);
            addSprite('marker', lat, lon, true, name, true);

            var tmp         =   latLngConnection.slice(0);
            var last_two    =   tmp.slice(-2);

            var start       =   {latitude: last_two[0].lat, longitude: last_two[0].lng};
            var end         =   {latitude: last_two[1].lat, longitude: last_two[1].lng};
            var connection_name =   last_two[0].name + '_' + last_two[1].name;

            addConnectionLine(start, end, 500, connection_name);

            if(latLngConnection.length == 3) {
                var index   =   latLngConnection.length + 1;
                var name    =   'marker_' + index;
                latLngConnection.push({lat: latLngSet1[3].lat, lng: latLngSet1[3].lng, name: name, check: false});
                var tmp     =   latLngConnection.slice(0);
                var last_two    =   tmp.slice(-2);

                var start   =   {latitude: last_two[0].lat, longitude: last_two[0].lng};
                var end     =   {latitude: last_two[1].lat, longitude: last_two[1].lng};
                var connection_name =   last_two[0].name + '_' + last_two[1].name;
                addConnectionLine(start, end, 500, connection_name);
            }
            else if(latLngConnection.length == 12) {
                var index   =   latLngConnection.length + 1;
                var name    =   'marker_' + index;
                latLngConnection.push({lat: latLngSet2[9].lat, lng: latLngSet2[9].lng, name: name, check: false});
                var tmp         =   latLngConnection.slice(0);
                var last_two    =   tmp.slice(-2);

                var start       =   {latitude: last_two[0].lat, longitude: last_two[0].lng};
                var end         =   {latitude: last_two[1].lat, longitude: last_two[1].lng};
                var connection_name =   last_two[0].name + '_' + last_two[1].name;

                addConnectionLine(start, end, 500, connection_name);

                document.getElementById('btn_submit').removeAttribute('disabled');
            }
        }
    }

    function translateCordsToPoint(lat, lng) {
        var phi     =   (90 - lat) * Math.PI / 180;
        var theta   =   (180 - lng) * Math.PI / 180;

        var x       =   globeRadius * Math.sin(phi) * Math.cos(theta);
        var y       =   globeRadius * Math.cos(phi);
        var z       =   globeRadius * Math.sin(phi) * Math.sin(theta);

        return new THREE.Vector3(x, y, z);
    }

    function addConnectionLine(start, end, elevation, name) {
        var vF      =    translateCordsToPoint(start.latitude,start.longitude);
        var vT      =   translateCordsToPoint(end.latitude, end.longitude);
        var dist    =   vF.distanceTo(vT);

        var xC  =   ( 0.5 * (vF.x + vT.x) );
        var yC  =   ( 0.5 * (vF.y + vT.y) );
        var zC  =   ( 0.5 * (vF.z + vT.z) );
        var mid =   new THREE.Vector3(xC, yC, zC);

        var length  =   Math.log(dist) * Math.LOG10E + 1 | 0, fraction;

        if(dist > 300)
            fraction  =   17;
        else if(dist > 250 && dist <= 300)
            fraction  = 16;
        else if(dist > 200 && dist <= 250)
            fraction  = 15;
        else if(dist > 150 && dist <= 200)
            fraction  = 14;
        else if(dist > 100 && dist <= 150)
            fraction  = 13;
        else if(dist > 50 && dist <= 100)
            fraction  = 12;
        else
            fraction  = 11;

        var smoothDist  =   map(dist, 0, 10, 0, fraction/dist);

        mid.setLength( globeRadius * smoothDist );

        var cvTx    =   vT.x + mid.x;
        var cvTy    =   vT.y + mid.y;
        var cvTz    =   vT.z + mid.z;

        var cvFx    =   vF.x + mid.x;
        var cvFy    =   vF.y + mid.y;
        var cvFz    =   vF.z + mid.z;

        var cvT     =   new THREE.Vector3(cvTx, cvTy, cvTz);
        var cvF     =   new THREE.Vector3(cvFx, cvFy, cvFz);

        cvT.setLength( globeRadius * smoothDist );
        cvF.setLength( globeRadius * smoothDist );

        var curve   =   new THREE.CubicBezierCurve3( vF, cvF, cvT, vT );
        loader.load('/models/plane/plane.dae', function(collada) {
            plane_object = collada.scene;

            plane_object.scale.x    =   plane_object.scale.y    =   plane_object.scale.z = 0.003;
            plane_object.name   =   'plane_' + name;
            pathScene.add(plane_object);

            /*var lat1    =   start.latitude * Math.PI / 180;
            var lng1    =   start.longitude * Math.PI / 180;

            var lat2    =   end.latitude * Math.PI / 180;
            var lng2    =   end.longitude * Math.PI / 180;

            var dLon    =   lng1 - lng2;
            var y       =   Math.sin(dLon) * Math.cos(lat2);
            var x       =   Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
            var brng    =   Math.atan2(y, x);
            brng        =   brng * 180 / Math.PI;
            brng        =   (brng + 360) % 360;*/

            movingPlanes.push({name: 'plane_' + name, plane: plane_object, destination: vT});
        });

        var path    =   new THREE.Path( curve.getPoints(50) );

        var geometry2   =   path.createPointsGeometry(50);

        var geometry    =   new THREE.Geometry();

        curve.getPoints(50).forEach(function(item, index) {
            geometry.vertices.push(item);
        });

        var material2   =   new THREE.LineBasicMaterial({color: 0xff0000});
        // Create the final Object3d to add to the scene
        var curveObject =   new THREE.Line(geometry, material2 );

        curveObject.name    =   name;
        pathScene.add(curveObject);

        paths.push({name: name, curve: curve});
    }

    function map(x,  in_min,  in_max,  out_min,  out_max) {
        return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    }

    function onMouseWheel(event) {
        event.preventDefault();

        if (overRenderer)
            zoom(event.wheelDeltaY * 0.3);

        return false;
    }

    function onDocumentKeyDown(event) {
        switch (event.keyCode) {
            case 38:
                zoom(100);
                event.preventDefault();
            break;
            case 40:
                zoom(-100);
                event.preventDefault();
            break;
        }
    }

    function onWindowResize( event ) {
        camera.aspect   =   window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    }

    function zoom(delta) {
        distanceTarget  -=   delta;
        distanceTarget  =   distanceTarget > 1000 ? 1000 : distanceTarget;
        distanceTarget  =   distanceTarget < 300 ? 300 : distanceTarget;
    }

    function animate() {
        requestAnimationFrame(animate);
        render();
    }
    var t = 0, log = true;

    function render() {
        zoom(curZoomSpeed);

        rotation.x  +=  (target.x - rotation.x) * 0.1;
        rotation.y  +=   (target.y - rotation.y) * 0.1;
        distance    +=  (distanceTarget - distance) * 0.3;

        camera.position.x   =   distance * Math.sin(rotation.x) * Math.cos(rotation.y);
        camera.position.y   =   distance * Math.sin(rotation.y);
        camera.position.z   =   distance * Math.cos(rotation.x) * Math.cos(rotation.y);
        camera.lookAt( camera.target );

        vector.copy(camera.position);

        renderer.clear();

        renderer.render(scene, camera);

        if( showIcons ) {
            for( var i = 0; i < movingPlanes.length; i ++ ) {
                pt      =   paths[i].curve.getPoint(t);
                var to_look =   ((t + 0.2) < 1)
                                    ? paths[i].curve.getPoint(t + 0.2)
                                    : movingPlanes[i].destination;

                movingPlanes[i].plane.position.set( pt.x, pt.y, pt.z );
                movingPlanes[i].plane.lookAt(to_look);
                movingPlanes[i].plane.rotation.y += Math.PI;
            }
            t = (t >= 1) ? 0 : t += 0.002;
            renderer.render(iconScene, camera);
            renderer.render(pathScene, camera);
            renderer.render(markerScene, camera);
        }
    }

    init();
    this.animate = animate;

	function moveToPoint( lat, lng ) {

		var phi   =   lat * Math.PI / 180;
		var theta =   lng * Math.PI / 180;

		target.x  =   - Math.PI / 2 + theta;
		target.y  =   phi;

	}

	function addSprite( id, lat, lng, panTo, name, is_marker) {
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
                iconScene.add( sprite );
		}
	}

    this.renderer       =   renderer;
    this.scene          =   scene;
    this.moveTo         =   moveToPoint;
    this.addSprite      =   addSprite;
    this.takeSnapshot   =   takeSnapshot;
    this.toggleIcons    =   toggleIcons;
    this.clearAll       =   clearAll;
    this.undo           =   undo;
    this.submitRoute    =   submitRoute;

    function takeSnapshot(){
        var data    =   renderer.domElement.toDataURL();
        window.open( data, 'WebGL Route' );
    }

    function toggleIcons() {
        showIcons   =   !showIcons;
    }

    return this;
};



Math.sec    =   function(){
    return 1 / Math.cos(this);
};

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};

String.prototype.trim   =   function() {
	var str = this.replace(/^\s*([\S\s]*)\b\s*$/, '$1');
	return str.replace(/(\r\n|\n|\r)/gm,"");
}
