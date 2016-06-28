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

Math.sec    =   function(){
    return 1 / Math.cos(this);
};

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};

Number.prototype.toRadians    =   function() {
  return this * Math.PI / 180;
};

Number.prototype.toDegree    =   function() {
  return this * 180 / Math.PI;
};

String.prototype.trim   =   function() {
    var str = this.replace(/^\s*([\S\s]*)\b\s*$/, '$1');
    return str.replace(/(\r\n|\n|\r)/gm,"");
}

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
    DAT.Globe.enableClick    =   false;

    var camera, scene, renderer, w, h, globe3d, shadow_plane, dirLight;
    var backgroundScene, backgroundCamera;
    var globeRadius   =   150;
    var vec3_origin   =   new THREE.Vector3(0,0,0);
    var iconScene, showIcons  =   true;
    var pathScene, markerScene;
    var vector, worldMesh, mesh, atmosphere, point;
    var loader    =   new THREE.ColladaLoader();
    var paths =   [], movingPlanes   =   [];
    var is_backwards    =   false;
    var endpoints    =   {
        'departure' : {
            'lat': null,
            'lng': null
        },
        'destination': {
            'lat': null,
            'lng': null
        }
    };

    var latLngConnection    =   [];
    var totalMarker         =   0;

    var overRenderer;
    var curZoomSpeed  =   0;
    var zoomSpeed     =   50;
    var hammertime, mc;
    var mouse         =   { x: 0, y: 0 }, mouseOnDown   =   { x: 0, y: 0 };
    var rotation      =   { x: 0, y: 0 },
      target        =   { x: Math.PI*3/2, y: Math.PI / 6.0 },
      targetOnDown  =   { x: 0, y: 0 };

    var distance      =   100000, distanceTarget  = 100000;
    var padding       =   40;
    var PI_HALF       =   Math.PI / 2;
    var textureFlare0, textureFlare1, textureFlare3;

    var texture;


    /**
     * webglAvailable - Checks wheather Webgl supported on the browser
     *
     * @return {boolean}  returns true or false
     */
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

    /**
     * midPoint - Used to get the
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
     * setEndPoints - set the marker for the departure and destinations points
     *
     * @param  {json} details json containing the data of destination and departure points
     * @return {boolean}  returns true
     */
    function setEndPoints(details) {
        endpoints.departure.lat     =   details.departure.lat;
        endpoints.departure.lng     =   details.departure.lng;

        endpoints.destination.lat   =   details.destination.lat;
        endpoints.destination.lng   =   details.destination.lng;

        totalMarker =   details.nb_points;

        latLngConnection.push({lat: details.departure.lat, lng: details.departure.lng, name: 'marker_1'});
    }


    /**
     * init - Initilize the Webgl setup the globe
     *
     * @return {type}  description
     */
    function init() {
        container.style.color   =   '#5a99bc';
        container.style.font    =   '13px/20px Arial, sans-serif';

        var shader, uniforms, material, hemiLight;
        w       =   container.offsetWidth || window.innerWidth;
        h       =   container.offsetHeight || window.innerHeight;

        camera  =   new THREE.PerspectiveCamera( 30, w / h, 1, 10000);
        camera.position.z   =   distance;
        camera.target       =   new THREE.Vector3( 0, 0, 0 );

        vector  =   new THREE.Vector3();
        scene   =   new THREE.Scene();


        /**
         * Add a fog to the scene
         */
        scene.fog   = new THREE.Fog(0xffffff, 1, 10000);
    	scene.fog.color.setHSL( 0.6, 0, 1 );

        /**
         * Adds the Hemisphere Light to the Scene
         */
        hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
    	hemiLight.color.setHSL( 0.6, 1, 0.6 );
    	hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
    	hemiLight.position.set( 0, 800, 0 );
    	camera.add(hemiLight);

        /**
         * Adds the Directional Light to the scene
         */
        dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    	dirLight.color.setHSL( 0.1, 1, 0.95 );
    	dirLight.position.set(-1200, 400, 800);
    	dirLight.position.multiplyScalar( 50 );
    	camera.add(dirLight);
        dirLight.castShadow     =   true;
    	dirLight.shadowMapWidth    =   2048;
    	dirLight.shadowMapHeight   =   2048;
        window.dirLight         =   dirLight;
    	var d = 50;
    	dirLight.shadowCameraLeft = -d;
    	dirLight.shadowCameraRight = d;
    	dirLight.shadowCameraTop = d;
    	dirLight.shadowCameraBottom = -d;

    	dirLight.shadowCameraFar = 3500;
    	dirLight.shadowBias = -0.0001;

        iconScene       =   new THREE.Scene();
        markerScene     =   new THREE.Scene();
        pathScene       =   new THREE.Scene();

        projector       =   new THREE.Projector();
        var geometry    =   new THREE.SphereGeometry(globeRadius, 40, 30);//, 0, 2 * Math.PI, -Math.PI / 2, Math.PI );

        geometry.mergeVertices();

        /**
         *   This commented part of code make bumps on the sphere, might be used in future
         */
        /*var l = geometry.vertices.length;
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
    	};*/

        //Loads the world Image
        var texture =   THREE.ImageUtils.loadTexture('image/world_small.jpg');
        texture.needsUpdate = true;
        material    =   new THREE.MeshPhongMaterial({map: texture});

        worldMesh   =   new THREE.Mesh(geometry, material);

        worldMesh.rotation.y    +=  (Math.PI / 2) + 1.6;
        worldMesh.matrixAutoUpdate  =   false;
        worldMesh.updateMatrix();
        worldMesh.castShadow    =   true;

        /**
         *   A outter glow added to the globe
         */
        var customMaterial = new THREE.ShaderMaterial(
        {
            uniforms: {  },
            vertexShader:   document.getElementById('vertexShader').textContent,
            fragmentShader: document.getElementById('fragmentShader').textContent,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        var ballGeometry = new THREE.SphereGeometry( (globeRadius + 20), 40, 30 );
        var ball = new THREE.Mesh( ballGeometry, customMaterial );
        scene.add(ball);

        /**
         *   This commented part of code make bumps on the sphere, might be used in future
         */
        /*var verts = worldMesh.geometry.vertices;
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

    	}*/

    	worldMesh.geometry.verticesNeedUpdate  = true;

        globe3d =   worldMesh;
        scene.add(worldMesh);


        /**
         *  This commented part of the code adds a shadow under the globe. Might be used in future
         */
        /*//Shadow
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
        shadow_plane.position.set(0, -220, -800);
        shadow_plane.scale.set(0.5, 0.5, 0.5);
        shadow_plane.rotation.x   =   -Math.PI / 4;
        camera.add( shadow_plane );*/

        //Background Image
        // Load the background texture
        var texture = THREE.ImageUtils.loadTexture('image/map-BG.jpg');
        var backgroundMesh = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(2, 2, 0),
            new THREE.MeshBasicMaterial({
                map: texture
        }));
        backgroundMesh.material.depthTest   =   false;
        backgroundMesh.material.depthWrite  =   false;

        // Create your background scene
       backgroundScene  =   new THREE.Scene();
       backgroundCamera =   new THREE.Camera();
       backgroundScene.add(backgroundCamera);
       backgroundScene.add(backgroundMesh);


       /**
        * This commented part of code creates a lensFlare effect, might be used in future
        */
       //lensFlare
       /*var lensFlare_loader = new THREE.TextureLoader();

       lensFlare_loader.load('image/lensFlare/lensflare0.png', function(texture) {
           textureFlare0   =   texture;
           textureFlare0.needsUpdate = true;
           lensFlare_loader.load('image/lensFlare/lensflare2.png', function(texture) {
               textureFlare2   =   texture;
               textureFlare0.needsUpdate = true;
               lensFlare_loader.load('image/lensFlare/lensflare3.png', function(texture) {
                   textureFlare3   =   texture;
                   textureFlare3.needsUpdate = true;
                   console.log('add light');

                   addLight( 0.08, 0.8, 0.5, 0, 0, -5000);
               });
           });
       });*/

       // create custom material from the shader code above
	//   that is within specially labeled script tags

       scene.add(camera);

       if ( webglAvailable() ) {
           renderer    =   new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true, alpha: true});
       } else {
           renderer = new THREE.CanvasRenderer();
       }

        renderer.autoClear  =   false;
        renderer.setClearColor(0xffffff, 0.0);
        renderer.setSize(w, h);
        renderer.sortObjects    =   true;

        renderer.shadowMapEnabled = true;
        renderer.shadowMapSoft = true;

        renderer.shadowCameraNear = 3;
        renderer.shadowCameraFar = camera.far;
        renderer.shadowCameraFov = 50;

        renderer.shadowMapBias = 0.0039;
        renderer.shadowMapDarkness = 0.5;
        renderer.shadowMapWidth = 1024;
        renderer.shadowMapHeight = 1024;

        renderer.domElement.style.position  =   'absolute';

        container.appendChild(renderer.domElement);


        /**
         * Touch events for mobile
         */
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

        /**
         * loader - Add the Airoplane 3D Object into the scene
         *
         * @param  {type} '/models/plane/plane.dae' 3d Object
         * @return {type}                           description
         */
        loader.load('/models/plane/plane.dae', function(collada) {
            plane_object = collada.scene;

            plane_object.scale.x    =   plane_object.scale.y    =   plane_object.scale.z = 0.003;
            plane_object.name   =   'plane';
            pathScene.add(plane_object);

            window.plane    =   plane_object;
            movingPlanes.push({name: 'plane', plane: plane_object});
        });
    }

    /**
     * addLensFlare - Adds the LensFlare effect to the scene
     *
     * @param  {type} h Color cordinates
     * @param  {type} s Color cordinates
     * @param  {type} l Color cordinates
     * @param  {type} x Position
     * @param  {type} y Position
     * @param  {type} z Position
     * @return {type}   description
     */
    function addLensFlare( h, s, l, x, y, z ) {
		var light = new THREE.PointLight( 0xffffff, 10000, 20000 );
		light.color.setHSL( h, s, l );
		light.position.set( x, y, z );
		camera.add( light );
		var flareColor = new THREE.Color( 0xffffff );
		flareColor.setHSL( h, s, l + 0.5 );
		var lensFlare = new THREE.LensFlare( textureFlare0, 700, 0.0, THREE.AdditiveBlending, flareColor );
		lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
		lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
		lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
		lensFlare.add( textureFlare3, 60, 0.6, THREE.AdditiveBlending );
		lensFlare.add( textureFlare3, 70, 0.7, THREE.AdditiveBlending );
		lensFlare.add( textureFlare3, 120, 0.9, THREE.AdditiveBlending );
		lensFlare.add( textureFlare3, 70, 1.0, THREE.AdditiveBlending );
		lensFlare.position.copy( light.position );
		camera.add( lensFlare );
	}

    /**
     * addStars - Add Star field around the globe currently it is not used, we are using static background image
     *
     * @return {type}  description
     */
    function addStars() {
        var material = new THREE.PointCloudMaterial({
          size: 4,
          color: 0xffffcc,
          blending: THREE.AdditiveBlending,
          transparent: true
        });

        var geometry = new THREE.Geometry();
        var x, y, z;
        for(var i = 0; i < 500; i++) {
            x = (Math.random() * 800) - 400;
            y = (Math.random() * 800) - 400;
            z = (Math.random() * 800) - 400;

            geometry.vertices.push(new THREE.Vector3(x, y, z));
        }

        var pointCloud = new THREE.PointCloud(geometry, material);
        scene.add(pointCloud);
    }

    /**
     * clearAll - Clears all the Markers added by user, Connection Lines and Moving Plane
     *
     * @return {type}  description
     */
    function clearAll() {
        for(i = markerScene.children.length - 1; i >= 0; i --) {
            obj =   markerScene.children[i];
            markerScene.remove(obj);
        }

        for(i = pathScene.children.length - 1; i >= 0; i --) {
            obj =   pathScene.children[i];

            if(obj.name != 'plane')
                pathScene.remove(obj);
        }

        document.getElementById('btn_clear').setAttribute('disabled', true);
        document.getElementById('btn_undo').setAttribute('disabled', true);
        document.getElementById('btn_submit').setAttribute('disabled', true);

        latLngConnection    =   [];
        paths               =   [];
        latLngConnection.push({lat: endpoints.departure.lat, lng: endpoints.departure.lng, name: 'marker_1'});
        movingPlanes[0].plane.visible   =   false;
        is_backwards    =   false;
    }

    /**
     * undo - Clears the last user action
     *
     * @return {type}  description
     */
    function undo() {
        var length      =   latLngConnection.length;

        if(length == 1)
            return;

        if(length == (totalMarker + 2))
        {
            latLngConnection.pop();

            var toRemove    =   latLngConnection.pop();
            var object      =   getObjectByName(markerScene, toRemove.name);

            if(object)
                markerScene.remove(object);

            var connection_line1    =   'marker_' + (length - 1) + '_marker_' + (length);
            var connection_line2    =   'marker_' + (length - 2) + '_marker_' + (length - 1);

            object          =   getObjectByName(pathScene, connection_line1);

            if(object)
                pathScene.remove(object);

            object          =   getObjectByName(pathScene, connection_line2);

            if(object)
                pathScene.remove(object);

            paths.pop();
            paths.pop();
            pathIndex   -=  2;
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
            pathIndex   -=  1;
        }

        if(length == 2) {
            movingPlanes[0].plane.visible   =   false;
            is_backwards    =   false;
            document.getElementById('btn_undo').setAttribute('disabled', true);
        }
        else {
            document.getElementById('btn_undo').removeAttribute('disabled');
        }

        document.getElementById('btn_submit').setAttribute('disabled', true);
    }

    /**
     * submitRoute - This is not fully done, this should be moved to Server Side.
     *
     * @return {type}  description
     */
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
     * getObjectByName - Used to get a Object by unique name
     *
     * @param  {object} var_scene Scene
     * @param  {string} name      name to be find
     * @return {object}           return object if found else return boolean false
     */
    function getObjectByName(var_scene, name) {
        for(i = var_scene.children.length - 1; i >= 0; i --) {
            obj =   var_scene.children[i];
            if(obj.name == name)
                return obj;
        }

        return false;
    }

    /**
     * onMouseDown - Used to rotate the globe
     *
     * @param  {type} event event object from browser
     * @return {type}       description
     */
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

    /**
     * onMouseMove - Used to rotate the globe
     *
     * @param  {type} event event object from browser
     * @return {type}       description
     */
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


    /**
     * onMouseUp - Used to rotate the globe
     *
     * @param  {type} event event object from browser
     * @return {type}       description
     */
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

    /**
     * onMouseOut - Used to rotate the globe
     *
     * @param  {type} event event object from browser
     * @return {type}       description
     */
    function onMouseOut(event) {
        container.removeEventListener('mousemove', onMouseMove, false);
        container.removeEventListener('mouseup', onMouseUp, false);
        container.removeEventListener('mouseout', onMouseOut, false);
        hammertime.off('tap');
    }

    /**
     * onDoubleClick - Used to rotate the globe
     *
     * @param  {type} event event object from browser
     * @return {type}       description
     */
    function onDoubleClick(event) {
        event.preventDefault();

        if(latLngConnection.length == (totalMarker + 2) || ! DAT.Globe.enableClick)
            return false;

        var is_touch_event    =   typeof event.changedPointers == 'undefined' ? false : true;
        var offsetX, offsetY;
        var vector      =   new THREE.Vector3();

        if(is_touch_event) {
            var rect  =   event.target.getBoundingClientRect();

            offsetX     =   event.changedPointers[0].pageX - rect.left;
            offsetY     =   event.changedPointers[0].pageY - rect.top;
            vector.set(parseFloat(( (offsetX) / window.innerWidth ) * 2 - 1), parseFloat(- ( (offsetY) / window.innerHeight) * 2 + 1), 1);
        }
        else {
            var canvas    =   renderer.domElement;
            offsetX   =   event.offsetX;
            offsetY   =   event.offsetY;
            vector.set(parseFloat(( (offsetX) / canvas.width ) * 2 - 1), parseFloat(- ( (offsetY) / canvas.height) * 2 + 1), parseFloat(0.5));
        }

        var raycaster   =   new THREE.Raycaster();

        vector.unproject(camera);
        raycaster.set(camera.position, vector.sub(camera.position).normalize())
        var intersects = raycaster.intersectObjects([globe3d], true);

        if (intersects.length > 0) {
            document.getElementById('btn_clear').removeAttribute('disabled');
            document.getElementById('btn_undo').removeAttribute('disabled');

            object  =   intersects[0];

            r       =   globeRadius;
            x       =   object.point.x;
            y       =   object.point.y;
            z       =   object.point.z;

            lat     =   90 - (Math.acos(y / r)) * 180 / Math.PI;
            lon     =   ((270 + (Math.atan2(x, z)) * 180 / Math.PI) % 360) - 180;

            lat     =   Math.round(lat * 100000) / 100000;
            lon     =   Math.round(lon * 100000) / 100000;

            movingPlanes[0].plane.visible   =   true;
            var index   =   latLngConnection.length + 1;
            var name    =   'marker_' + index;
            latLngConnection.push({lat: lat, lng: lon, name: name, check: true});

            //moveToPoint(lat, lon);
            addSprite('marker_white', lat, lon, name, true);

            var tmp         =   latLngConnection.slice(0);
            var last_two    =   tmp.slice(-2);

            var start       =   {latitude: last_two[0].lat, longitude: last_two[0].lng};
            var end         =   {latitude: last_two[1].lat, longitude: last_two[1].lng};
            var connection_name =   last_two[0].name + '_' + last_two[1].name;

            addConnectionLine(start, end, 500, connection_name);

            if(latLngConnection.length == (totalMarker + 1)) {
                var index   =   latLngConnection.length + 1;
                var name    =   'marker_' + index;
                latLngConnection.push({lat: endpoints.destination.lat, lng: endpoints.destination.lng, name: name, check: false});
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

    /**
     * translateCordsToPoint - Translates the Lat and Lon to x, y, z Vector Points
     *
     * @param  {float} lat Latitude
     * @param  {float} lng Longitude
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
     * addConnectionLine - Adds the Curve line between two Latitudes and Longtudes
     *
     * @param  {object} start     latitude and longitude object
     * @param  {object} end       latitude and longitude object
     * @param  {int} elevation height of the curve
     * @param  {string} name      Unique name for the Connection line
     * @return {type}           no ruturn
     */
    function addConnectionLine(start, end, elevation, name) {
        var vF      =   translateCordsToPoint(start.latitude,start.longitude);
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

        var path    =   new THREE.Path( curve.getPoints(50) );

        var geometry2   =   path.createPointsGeometry(50);

        var geometry    =   new THREE.Geometry();

        curve.getPoints(50).forEach(function(item, index) {
            geometry.vertices.push(item);
        });

        var material2   =   new THREE.LineBasicMaterial({color: 0xffffcc});
        // Create the final Object3d to add to the scene
        var curveObject =   new THREE.Line(geometry, material2 );

        curveObject.name    =   name;
        pathScene.add(curveObject);

        paths.push({name: name, curve: curve, destination: vT, departure: vF});
    }

    /**
     * map - a Mathmetical function used to provide the smoot curve
     *
     * @param  {int} x       description
     * @param  {int} in_min  description
     * @param  {int} in_max  description
     * @param  {int} out_min description
     * @param  {int} out_max description
     * @return {int}         description
     */
    function map(x,  in_min,  in_max,  out_min,  out_max) {
        return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    }

    /**
     * onMouseWheel - Used to zoom the globe on mouse wheel
     *
     * @param  {object} event event object from browser
     * @return {boolean}       description
     */
    function onMouseWheel(event) {
        event.preventDefault();

        if (overRenderer)
            zoom(event.wheelDeltaY * 0.3);

        return false;
    }

    /**
     * onDocumentKeyDown - Used to Zoom globe on keypress
     *
     * @param  {object} event event object from browser
     * @return {type}   return nothing
     */
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

    /**
     * onWindowResize - adjust the canvas on windows risize
     *
     * @param  {type} event event object from browser
     * @return {type}       return nothing
     */
    function onWindowResize(event) {
        camera.aspect   =   window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    }

    /**
     * zoom - set the zoom value based on input from mousewheel, keypress or pinch
     *
     * @param  {type} delta description
     * @return {type}       description
     */
    function zoom(delta) {
        distanceTarget  -=   delta;
        distanceTarget  =   distanceTarget > 1000 ? 1000 : distanceTarget;
        distanceTarget  =   distanceTarget < 300 ? 300 : distanceTarget;
    }


    /**
     * animate - this uses requestAnimationFrame for animation
     *
     * @return {type}  description
     */
    /*var stats = new Stats();
    stats.showPanel(0);
    stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.showPanel(2);
    stats.dom.style.top =   '50px';
    document.body.appendChild(stats.dom);*/
    function animate() {
        requestAnimationFrame(animate);
        //stats.begin();

        render();

        //stats.end();
    }
    var t = 0, log = true, pathIndex    =   0;

    /**
     * render - it is called inside animation
     *
     * @return {type}  description
     */


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

        renderer.render(backgroundScene, backgroundCamera);
        renderer.render(scene, camera);

        if( showIcons ) {
            if(typeof paths[pathIndex] != 'undefined' && typeof movingPlanes[0] != 'undefined') {
                pt          =   paths[pathIndex].curve.getPoint(t);
                var to_look;

                if(is_backwards) {
                    to_look =   ((t - 0.2) < 0)
                                    ? paths[pathIndex].departure
                                    : paths[pathIndex].curve.getPoint(t - 0.2);
                }
                else {
                    to_look =   ((t + 0.2) < 1)
                                    ? paths[pathIndex].curve.getPoint(t + 0.2)
                                    : paths[pathIndex].destination;
                }

                if(typeof movingPlanes[0] != 'undefined') {
                    movingPlanes[0].plane.visible   =   true;
                    movingPlanes[0].plane.position.set(pt.x, pt.y, pt.z);
                    movingPlanes[0].plane.lookAt(to_look);

                    movingPlanes[0].plane.rotation.y    +=  Math.PI;
                    movingPlanes[0].plane.rotation.z    +=  (Math.PI * 2);
                }

                if(is_backwards) {
                    if(t <= 0) {
                        t   =   1;

                        if(pathIndex == 0) {
                            pathIndex       =   0;
                            is_backwards    =   false;
                            t               =   0;
                        }
                        else
                            --pathIndex;
                    }
                    else {
                        t   -=  0.002;
                    }
                }
                else {
                    if(t >= 1) {
                        t   =   0;
                        if((pathIndex + 1) >= paths.length) {
                            pathIndex       =   paths.length - 1;
                            is_backwards    =   true;
                            t               =   1;
                        }
                        else
                            ++pathIndex;
                    }
                    else {
                        t   +=  0.002;
                    }
                }
            }

            renderer.render(iconScene, camera);
            renderer.render(pathScene, camera);
            renderer.render(markerScene, camera);
        }
    }

    init();
    this.animate = animate;

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

    /**
     * enableClick - activates the user actions on globe
     *
     * @return {type}  description
     */
    function enableClick() {
        DAT.Globe.enableClick   =   true;
    }

    this.renderer       =   renderer;
    this.scene          =   scene;
    this.moveTo         =   moveToPoint;
    this.midPoint       =   midPoint;
    this.addSprite      =   addSprite;
    this.addConnectionLine  =   addConnectionLine;
    this.takeSnapshot   =   takeSnapshot;
    this.toggleIcons    =   toggleIcons;
    this.clearAll       =   clearAll;
    this.undo           =   undo;
    this.submitRoute    =   submitRoute;
    this.enableClick    =   enableClick;
    this.setEndPoints   =   setEndPoints;

    /**
     * takeSnapshot - to take the Snapshot of the canvas, currently not using
     *
     * @return {type}  description
     */
    function takeSnapshot(){
        var data    =   renderer.domElement.toDataURL();
        window.open( data, 'WebGL Route' );
    }


    /**
     * toggleIcons - to toggle the visibility of marker, plane, connection lines on globe
     *
     * @return {type}  description
     */
    function toggleIcons() {
        showIcons   =   !showIcons;
    }

    return this;
};
