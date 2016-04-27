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

DAT.Globe = function(container, colorFn) {
    colorFn = colorFn || function(x) {
        var c = new THREE.Color();
        c.setHSV((0.6 - ( x * 0.5 )), 1.0, 1.0);
        return c;
    };

    var Shaders = {
        'earth': {
            uniforms: {
                'texture': { type: 't', value: 0, texture: null }
            },
            vertexShader: [
                'varying vec3 vNormal;',
                'varying vec2 vUv;',
                'void main() {',
                    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
                    'vNormal = normalize( normalMatrix * normal );',
                    'vUv = uv;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform sampler2D texture;',
                'varying vec3 vNormal;',
                'varying vec2 vUv;',
                'void main() {',
                    'vec3 diffuse = texture2D( texture, vUv ).xyz;',
                    'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
                    'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
                    'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
                '}'
            ].join('\n')
        },
        'atmosphere' : {
            uniforms: {},
            vertexShader: [
                'varying vec3 vNormal;',
                'void main() {',
                    'vNormal = normalize( normalMatrix * normal );',
                    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vNormal;',
                'void main() {',
                    'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
                    'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
                '}'
            ].join('\n')
        }
  };

  var camera, scene, renderer, w, h, globe3d
  var globeRadius   =   150;
  var vec3_origin   =   new THREE.Vector3(0,0,0);
  var iconScene, showIcons  =   true;
  var pathScene, markerScene;
  var vector, worldMesh, mesh, atmosphere, point;

  var latLngSet1    =   [];
  var latLngSet2    =   [];
  var latLngAcutal  =   [];
  latLngAcutal.push({lat: 1.3521, lng: 103.8198, check: false, name: 'marker_1'});
  latLngAcutal.push({lat: 1.46761, lng: 114.47321, check: true, name: 'marker_2'});
  latLngAcutal.push({lat: -4.64397, lng: 141.58199, check: true, name: 'marker_3'});
  latLngAcutal.push({lat: 25.0330, lng: 121.5654, check: false, name: 'marker_4'});
  latLngAcutal.push({lat: 40.93945, lng: 118.36611, check: true, name: 'marker_5'});
  latLngAcutal.push({lat: 36.44208, lng: 76.02376, check: true, name: 'marker_6'});
  latLngAcutal.push({lat: 24.20766, lng: 55.51183, check: true, name: 'marker_7'});
  latLngAcutal.push({lat: 13.26989, lng: 43.76743, check: true, name: 'marker_8'});
  latLngAcutal.push({lat: 5.73803, lng: -1.85176, check: true, name: 'marker_9'});
  latLngAcutal.push({lat: -6.64781, lng: -77.58631, check: true, name: 'marker_10'});
  latLngAcutal.push({lat: 34.89952, lng: -118.86206, check: true, name: 'marker_11'});
  latLngAcutal.push({lat: 58.40359, lng: -96.13035, check: true, name: 'marker_12'});
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
  var hammertime;
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
    scene.add(camera);
    projector       =   new THREE.Projector();
    var geometry    =   new THREE.PatchSphereGeometry(globeRadius, 40, 30);//, 0, 2 * Math.PI, -Math.PI / 2, Math.PI );

    for(var i = 0, l = geometry.faceVertexUvs[0].length; i < l; i ++ ) {
        for(var j = 0, jl = geometry.faceVertexUvs[0][i].length; j < jl; j ++) {
            var uv  =   geometry.faceVertexUvs[0][i][j];
            var a   =   uv.v * Math.PI - Math.PI / 2;
            a       =   Math.sin(a);
            uv.v    =   0.5 - Math.log( ( 1 + a ) / ( 1 - a ) ) / (4 * Math.PI);
            uv.v    =   1 - uv.v;
        }
    }

    shader      =   Shaders['earth'];
    uniforms    =   THREE.UniformsUtils.clone(shader.uniforms);
    texture     =   new THREE.Texture( mapCanvas );

    texture.minFilter   =   THREE.LinearMipMapLinearFilter;
    texture.magFilter   =   THREE.LinearMipMapLinearFilter;
    texture.wrapS       =   THREE.ClampToEdgeWrapping;
    texture.wrapT       =   THREE.ClampToEdgeWrapping;
    texture.needsUpdate =   true;

    uniforms['texture'].texture =   texture;

    material    =   new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
    });

    worldMesh   =   new THREE.Mesh(geometry, material);
    worldMesh.rotation.y    +=  Math.PI / 2;
    worldMesh.matrixAutoUpdate  =   false;
    worldMesh.updateMatrix();
    globe3d =   worldMesh;
    scene.add(worldMesh);

    geometry    =   new THREE.SphereGeometry(globeRadius, 40, 30 );
    shader      =   Shaders['atmosphere'];
    uniforms    =   THREE.UniformsUtils.clone(shader.uniforms);

    material    =   new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
    });

    geometry    =   new THREE.CubeGeometry(0.75, 0.75, 1, 1, 1, 1, null, false, {
        px: true,
        nx: true, py: true, ny: true, pz: false, nz: true
    });

    for (var i = 0; i < geometry.vertices.length; i++) {
        var vertex  =   geometry.vertices[i];
        vertex.position.z   +=  0.5;
    }

    point       =   new THREE.Mesh(geometry);

    if ( webglAvailable() ) {
		renderer    =   new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
	} else {
		renderer = new THREE.CanvasRenderer();
	}

    renderer.autoClear  =   false;
    renderer.setClearColorHex(0x000000, 0.0);
    renderer.setSize(w, h);
    renderer.sortObjects    =   true;

    renderer.domElement.style.position  =   'absolute';

    container.appendChild(renderer.domElement);

    hammertime  =   new Hammer(container, {});
    hammertime.get('pinch').set({ enable: true });
    hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });

    hammertime.on('panstart', onMouseDown);

    container.addEventListener('mousedown', onMouseDown, false);
    container.addEventListener('mousewheel', onMouseWheel, false);
    hammertime.on('pinch', function(e) {
        var delta   =   (e.deltaX + e.deltaY) / 2;

        if(e.scale < 1 && delta > 1)
            delta = -(delta);
        else if(e.scale >= 1 && delta < 1)
            delta = -(delta);

        zoom(delta * 0.3);
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

  addData = function(data, opts) {
    var lat, lng, size, color, i, step, colorFnWrapper;

    opts.animated       =   opts.animated || false;
    this.is_animated    =   opts.animated;
    opts.format         =   opts.format || 'magnitude'; // other option is 'legend'

    if(opts.format === 'magnitude') {
        step    =   3;
        colorFnWrapper  =   function(data, i) { return colorFn(data[i+2]); }
    } else if (opts.format === 'legend') {
        step    =   4;
        colorFnWrapper  =   function(data, i) { return colorFn(data[i+3]); }
    } else {
        throw('error: format not supported: ' + opts.format);
    }

    if (opts.animated) {
        if (this._baseGeometry === undefined) {
            this._baseGeometry  = new THREE.Geometry();

            for (i = 0; i < data.length; i += step) {
                lat     =   data[i];
                lng     =   data[i + 1];
                //size  =   data[i + 2];
                color   =   colorFnWrapper(data,i);
                size    =   0;
                addPoint(lat, lng, size, color, this._baseGeometry);
            }
        }

        if(this._morphTargetId === undefined)
            this._morphTargetId = 0;
        else
            this._morphTargetId +=  1;

        opts.name = opts.name || 'morphTarget' + this._morphTargetId;
    }

    var subgeo  =   new THREE.Geometry();

    for(i = 0; i < data.length; i += step) {
        lat     =   data[i];
        lng     =   data[i + 1];
        color   =   colorFnWrapper(data,i);
        size    =   data[i + 2];
        size    =   size * globeRadius;
        addPoint(lat, lng, size, color, subgeo);
    }

    if (opts.animated)
        this._baseGeometry.morphTargets.push({'name': opts.name, vertices: subgeo.vertices});
    else
        this._baseGeometry  = subgeo;
  };

  function createPoints() {
    if (this._baseGeometry !== undefined) {
        if (this.is_animated === false) {
            this.points =   new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
                color: 0xffffff,
                vertexColors: THREE.FaceColors,
                morphTargets: false
            }));
        } else {
            if (this._baseGeometry.morphTargets.length < 8) {
                var padding =   8 - this._baseGeometry.morphTargets.length;
                for(var i=0; i<=padding; i++) {
                    this._baseGeometry.morphTargets.push({'name': 'morphPadding'+i, vertices: this._baseGeometry.vertices});
                }
            }

            this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
                color: 0xffffff,
                vertexColors: THREE.FaceColors,
                morphTargets: true
            }));
        }

        scene.add(this.points);
    }
  }

  function addPoint(lat, lng, size, color, subgeo) {
    var phi     =   (90 - lat) * Math.PI / 180;
    var theta   =   (180 - lng) * Math.PI / 180;

    point.position.x    =   globeRadius * Math.sin(phi) * Math.cos(theta);
    point.position.y    =   globeRadius * Math.cos(phi);
    point.position.z    =   globeRadius * Math.sin(phi) * Math.sin(theta);

    point.lookAt(worldMesh.position);

    point.scale.z       =   -size;
    point.updateMatrix();

    var i;
    for (i = 0; i < point.geometry.faces.length; i++) {
        point.geometry.faces[i].color = color;
    }

    GeometryUtils.merge(subgeo, point);
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
    }

    if(length == 2)
        document.getElementById('btn_undo').setAttribute('disabled', true);
    else
        document.getElementById('btn_undo').setAttribute('disabled', false);

    document.getElementById('btn_submit').setAttribute('disabled', true);
  }

  function submitRoute()
  {
    var length  =   latLngConnection.length;

    if(length != 13)
        return false;

    var totalPoints =   0;

    var pointGiven  =   false;
    console.log(latLngConnection);

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
                    console.log(item.name, location.name);
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

    alert('Percentage of Accuracy ' + totalPoints + '%');
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
      container.addEventListener('mouseout', onMouseOut, false);
      container.addEventListener('dblclick', onDoubleClick, false);

      var is_touch_event    =   typeof event.changedPointers == 'undefined' ? false : true;
      mouseOnDown.x     =   is_touch_event ? (- event.changedPointers[0].clientX) : (- event.clientX);
      mouseOnDown.y     =   is_touch_event ? event.changedPointers[0].clientY : event.clientY;

      targetOnDown.x    =   target.x;
      targetOnDown.y    =   target.y;
      
      hammertime.on('tap', onDoubleClick);
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
    hammertime.off('tap');
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.style.cursor  =   'auto';
  }

  function onMouseOut(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
  }

  function onDoubleClick(event) {
      event.preventDefault();

      if(latLngConnection.length == 13)
            return false;

      document.getElementById('btn_clear').setAttribute('disabled', false);
      document.getElementById('btn_undo').setAttribute('disabled', false);

      var canvas    =   renderer.domElement;
      var vector    =   new THREE.Vector3( ( (event.offsetX) / canvas.width ) * 2 - 1, - ( (event.offsetY) / canvas.height) * 2 + 1, 0.5 );

      projector.unprojectVector( vector, camera );

      var ray   =   new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());

      var intersects    =   ray.intersectObject(globe3d);

      if (intersects.length > 0) {
            object  =   intersects[0];

            r       =   object.object.boundRadius;
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

            moveToPoint(lat, lon);
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
        var path    =   new THREE.Path( curve.getPoints(50) );

        var geometry2   =   path.createPointsGeometry(50);

        var geometry    =   new THREE.Geometry();

        curve.getPoints(50).forEach(function(item, index) {
            geometry.vertices.push( new THREE.Vertex(item));
        });

        var material2   =   new THREE.LineBasicMaterial( { color : 0xff0000 } );

        // Create the final Object3d to add to the scene
        var curveObject =   new THREE.Line(geometry, material2 );
        curveObject.name    =   name;
        pathScene.add(curveObject);
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
            renderer.render( iconScene, camera );
            renderer.render(pathScene, camera);
            renderer.render(markerScene, camera);
        }

    }

    init();
    this.animate = animate;

    this.__defineGetter__('time', function() {
        return this._time || 0;
    });

    this.__defineSetter__('time', function(t) {
        return;
        var validMorphs =   [];
        var morphDict   =   this.points.morphTargetDictionary;

        for(var k in morphDict) {
            if(k.indexOf('morphPadding') < 0) {
                validMorphs.push(morphDict[k]);
            }
        }
        validMorphs.sort();
        var l   =   validMorphs.length-1;
        var scaledt =   t * l + 1;
        var index   =   Math.floor(scaledt);
        for (i=0;i<validMorphs.length;i++) {
            this.points.morphTargetInfluences[validMorphs[i]]   =   0;
        }
        var lastIndex   =   index - 1;
        var leftover    =   scaledt - index;
        if (lastIndex >= 0) {
            this.points.morphTargetInfluences[lastIndex]    =   1 - leftover;
        }
        this.points.morphTargetInfluences[index]    =   leftover;
        this._time  =   t;
    });

	function moveToPoint( lat, lng ) {

		var phi   =   lat * Math.PI / 180;
		var theta =   lng * Math.PI / 180;

		target.x  =   - Math.PI / 2 + theta;
		target.y  =   phi;

	}

	function addSprite( id, lat, lng, panTo, name, is_marker) {
		var phi   =   (90 - lat) * Math.PI / 180;
		var theta =   (180 - lng) * Math.PI / 180;

		var r     =   155;

		var x     =   r * Math.sin(phi) * Math.cos(theta);
		var y     =   r * Math.cos(phi);
		var z     =   r * Math.sin(phi) * Math.sin(theta);

		id    =   id.trim();

		if( id != '' ) {
            sprite = new THREE.Sprite( {
                map: THREE.ImageUtils.loadTexture( '/image/' + id + ".png" ),
                useScreenCoordinates: false,
                affectedByDistance: false
            } );
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
				.to( { x: 1, y: 1, z: 1 }, 500)
				.start();
			sprite.position.set( x, y, z );
            sprite.name =   name;
			//sprite.scale.x = sprite.scale.y = sprite.scale.z = .95;
			if(typeof is_marker != 'undefined' && is_marker == true)
                markerScene.add(sprite);
            else
                iconScene.add( sprite );
		}
	}

    this.addData        =   addData;
    this.createPoints   =   createPoints;
    this.renderer       =   renderer;
    this.scene          =   scene;
    this.texture        =   texture;
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

THREE.MercatorSphere    =   function ( radius, segmentsWidth, segmentsHeight ) {

    THREE.Geometry.call( this );

	var radius =   radius || 50,
	gridX  =   segmentsWidth || 8,
	gridY  =   segmentsHeight || 6;

	var i, j, pi   =   Math.PI;
	var iHor   =   Math.max( 3, gridX );
	var iVer   =   Math.max( 2, gridY );
	var aVtc   =   [];

	for ( j = 0; j < ( iVer + 1 ) ; j++ ) {
		var fRad1 =   j / iVer;
		var fZ    =   radius * Math.cos( fRad1 * pi );
		var fRds  =   radius * Math.sin( fRad1 * pi );
		var aRow  =   [];
		var oVtx  =   0;

		for ( i = 0; i < iHor; i++ ) {
			var fRad2    =   2 * i / iHor;
			var fX       =   fRds * Math.sin( fRad2 * pi );
			var fY       =   fRds * Math.cos( fRad2 * pi );

			if ( !( ( j == 0 || j == iVer ) && i > 0 ) )
				oVtx    =   this.vertices.push( new THREE.Vertex( new THREE.Vector3( fY, fZ, fX ) ) ) - 1;

			aRow.push( oVtx );
		}

		aVtc.push(aRow);
	}

	var n1, n2, n3, iVerNum    =   aVtc.length;

	for ( j = 0; j < iVerNum; j++ ) {
		var iHorNum   =   aVtc[ j ].length;

		if ( j > 0 ) {

			for ( i = 0; i < iHorNum; i++ ) {

				var bEnd    =   i == ( iHorNum - 1 );
				var aP1     =   aVtc[ j ][ bEnd ? 0 : i + 1 ];
				var aP2     =   aVtc[ j ][ ( bEnd ? iHorNum - 1 : i ) ];
				var aP3     =   aVtc[ j - 1 ][ ( bEnd ? iHorNum - 1 : i ) ];
				var aP4     =   aVtc[ j - 1 ][ bEnd ? 0 : i + 1 ];

				var fJ0     =   j / ( iVerNum - 1 );
				var fJ1     =   ( j - 1 ) / ( iVerNum - 1 );
				var fI0     =   ( i + 1 ) / iHorNum;
				var fI1     =   i / iHorNum;

				var theta;
				var max     =   45.501 * Math.PI / 180;

				theta       =   ( ( j / iVerNum ) * Math.PI - Math.PI / 2 );
				theta       =   theta.clamp( -max, max );
				fJ0         =   1 - lat2v( theta );
				theta       =   ( ( ( j - 1 ) / iVerNum ) * Math.PI - Math.PI / 2 );
				theta       =   theta.clamp( -max, max );
				fJ1         =   1 - lat2v( theta );

				var aP1uv   =   new THREE.UV( 1 - fI0, fJ0 );
				var aP2uv   =   new THREE.UV( 1 - fI1, fJ0 );
				var aP3uv   =   new THREE.UV( 1 - fI1, fJ1 );
				var aP4uv   =   new THREE.UV( 1 - fI0, fJ1 );

				if ( j < ( aVtc.length - 1 ) ) {
					n1      =   this.vertices[ aP1 ].position.clone();
					n2      =   this.vertices[ aP2 ].position.clone();
					n3      =   this.vertices[ aP3 ].position.clone();
					n1.normalize();
					n2.normalize();
					n3.normalize();

					this.faces.push( new THREE.Face3( aP1, aP2, aP3, [ new THREE.Vector3( n1.x, n1.y, n1.z ), new THREE.Vector3( n2.x, n2.y, n2.z ), new THREE.Vector3( n3.x, n3.y, n3.z ) ] ) );

					this.faceVertexUvs[ 0 ].push( [ aP1uv, aP2uv, aP3uv ] );
				}

				if ( j > 1 ) {
					n1      =   this.vertices[aP1].position.clone();
					n2      =   this.vertices[aP3].position.clone();
					n3      =   this.vertices[aP4].position.clone();
					n1.normalize();
					n2.normalize();
					n3.normalize();

					this.faces.push( new THREE.Face3( aP1, aP3, aP4, [ new THREE.Vector3( n1.x, n1.y, n1.z ), new THREE.Vector3( n2.x, n2.y, n2.z ), new THREE.Vector3( n3.x, n3.y, n3.z ) ] ) );

					this.faceVertexUvs[ 0 ].push( [ aP1uv, aP3uv, aP4uv ] );
				}
			}
		}
	}

	this.computeCentroids();
	this.computeFaceNormals();
	this.computeVertexNormals();

	this.boundingSphere    =   { radius: radius };

};

THREE.MercatorSphere.prototype  =   new THREE.Geometry();
THREE.MercatorSphere.prototype.constructor  =   THREE.MercatorSphere;

Math.sec    =   function(){
    return 1 / Math.cos(this);
};

function y2lat(a) { return 180/Math.PI * (2 * Math.atan(Math.exp(a*Math.PI/180)) - Math.PI/2); }
function lat2y(a) { return 180/Math.PI * Math.log(Math.tan(Math.PI/4+a*(Math.PI/180)/2)); }

function lat2v(a){
	a  =   ath.sin(a);
	return 0.5 - Math.log((1+a)/(1-a))/(4*Math.PI)
}

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};

String.prototype.trim   =   function() {
	var str = this.replace(/^\s*([\S\s]*)\b\s*$/, '$1');
	return str.replace(/(\r\n|\n|\r)/gm,"");
}
