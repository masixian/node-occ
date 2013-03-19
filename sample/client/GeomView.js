// GeomView.js

var assert = assert || function(condition, message) { 
    if (!condition) { 
        throw new Error(message);
    }
 }

var GEOMTOOL = {

   boundingBox: function(obj) {
            var me = this;
            if (obj instanceof THREE.Mesh) {

                var geometry = obj.geometry;
                geometry.computeBoundingBox();
                return  geometry.boundingBox;

            }

            if (obj instanceof THREE.Object3D) {

                var bb = new THREE.Box3();
                for (var i=0;i < obj.children.length;i++) {
                    bb.union(me.boundingBox(obj.children[i]));
                }
                return bb;
            }
    },
    shapeCenterOfGravity: function (obj) {
        var me = this;
        return me.boundingBox(obj).center();
    },

    makeGrid: function() {

        var size = 500, step = 25;
        var geometry = new THREE.Geometry();
        var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );

        var color1 = new THREE.Color( 0x444444 ), color2 = new THREE.Color( 0x888888 );

        for ( var i = - size; i <= size; i += step ) {

            geometry.vertices.push( new THREE.Vector3( -size,  i ,0) );
            geometry.vertices.push( new THREE.Vector3(  size,  i ,0) );

            geometry.vertices.push( new THREE.Vector3( i, -size ,0 ) );
            geometry.vertices.push( new THREE.Vector3( i,  size ,0 ) );

            var color = i === 0 ? color1 : color2;

            geometry.colors.push( color, color, color, color );

        }
        
        var grid = new THREE.Line( geometry, material, THREE.LinePieces );

        return grid;
    }
};




function GEOMVIEW(container,width,height)
{
    
    width = width || 100;
    height = height || 100;

    var me = this;
    me.container = container;

    me.scene = new THREE.Scene();
    me.sceneHelpers = new THREE.Scene();


    var ratio = width/height;
    me.camera = new THREE.PerspectiveCamera(50,1,1, 100000);
    me.camera.name = "Camera";
    me.camera.position.z = 100;

    me.renderer =  new THREE.WebGLRenderer( { antialias: true, clearColor: 0x7F2FFF, clearAlpha: 1 } );
    me.renderer.setClearColorHex(0x7F2FFF, 1.0);

    me.renderer.autoClear = false;
    me.renderer.clear();

    // make sure canvas can get focus;
    // see http://jsfiddle.net/erossignon/bFraK/3/
    me.renderer.domElement.setAttribute('tabindex','0');
    
    container.appendChild(me.renderer.domElement);

    me.controls = new THREE.TrackballControls( me.camera , container);

    me.controls.rotateSpeed = 1.0;
    me.controls.zoomSpeed = 1.2;
    me.controls.panSpeed = 0.8;

    me.controls.noZoom = false;
    me.controls.noPan = false;

    me.controls.staticMoving = true;
    me.controls.dynamicDampingFactor = 0.3;

    me.cameraChanged = false;
    me.controls.addEventListener( 'change', function() {
        me.cameraChanged = true;
        me.render3D();
    });    

    var radius =1.0;
    me.controls.minDistance = radius * 1.1;
    me.controls.maxDistance = radius * 10000;

    me.controls.keys = [ /*A*/65, /*S*/ 83, /*D*/68 ];


    me.lightContainer = new THREE.Object3D();
    me.lightContainer.matrixWorld = me.camera.matrix;
    me.lightContainer.matrixAutoUpdate = false;

    me.scene.add(me.lightContainer);

    for (var x= -1 ; x<2;x=x+2) {
        for (var y= -1 ; y<2;y=y+2) {
            for (var z= -1 ; z<2;z=z+2) {

                var pointLight =  new THREE.PointLight( 0xFFFFFF,0.2 );
                pointLight.position.x = 100 * x;
                pointLight.position.y = 100 * y;
                pointLight.position.z = 100 * z;
                pointLight.matrixAutoUpdate = true;

                me.lightContainer.add(pointLight);
                me.lightContainer.add(new THREE.PointLightHelper(pointLight,10));
            }
        }
    }



    var light = new THREE.AmbientLight( 0x222222 );
    me.lightContainer.add( light );

    me.sceneHelpers.add( new THREE.AxisHelper(100) );       

   
    me.intersectionPlane = new THREE.Mesh( new THREE.PlaneGeometry( 10000, 10000, 8, 8 ) );
    me.ray       = new THREE.Raycaster();
    me.projector = new THREE.Projector();
    me.offset    = new THREE.Vector3();



    me.sceneHelpers.add( GEOMTOOL.makeGrid());

    me.selectionBox = new THREE.Mesh( new THREE.CubeGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0xffff00, wireframe: true, fog: false } ) );
    me.selectionBox.matrixAutoUpdate = false;
    me.selectionBox.visible = false;
    me.sceneHelpers.add( me.selectionBox );

    me.selectionAxis = new THREE.AxisHelper( 100 );
    me.selectionAxis.material.depthTest = false;
    me.selectionAxis.material.transparent = true;
    me.selectionAxis.matrixAutoUpdate = false;
    me.selectionAxis.visible = false;
    
    me.sceneHelpers.add( me.selectionAxis );

    me.renderbackground = function() {
        // prepare graduated background for the 3D view
        var backgroundTexture = new THREE.ImageUtils.loadTexture( 
            'images/Graduated_Blue_Background.png',
            null,
            function onload(){
              if (me.render3D) { me.render3D(); }
        });
        //var backgroundTexture = new THREE.ImageUtils.loadTexture( 
        //    'images/body_bg.jpg' );
        var bg = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 2, 0),
          new THREE.MeshBasicMaterial({map: backgroundTexture})
        );

        // The bg plane shouldn't care about the z-buffer.
        bg.material.depthTest = false;
        bg.material.depthWrite = false;

        var bgScene = new THREE.Scene();
        var bgCam = new THREE.Camera();
        bgScene.add(bgCam);
        bgScene.add(bg);
        return function () {
            me.renderer.clear();
            me.renderer.render(bgScene, bgCam);
        }
    }();

   

    me.render3D = function() {
        
        var me = this;
        me.renderbackground();
        
        me.sceneHelpers.updateMatrixWorld();
        me.scene.updateMatrixWorld();

            me.renderer.render( me.sceneHelpers, me.camera );
        me.renderer.render( me.scene, me.camera );

    }

    me.resizeRenderer = function() {
        var me = this;
        var width =  me.container.offsetWidth; 
        var height = me.container.offsetHeight; 
        me.renderer.setSize( width, height );
        me.camera.aspect = width / height;
        me.camera.updateProjectionMatrix();
        me.render3D();
    };
    me.resizeRenderer();

 

    function MyAnimate() {
        "use strict";
        requestAnimationFrame( MyAnimate );
        me.controls.update();
    }
    MyAnimate();

    me.render3D();

    function getOffsetLeft( element )
    {
        var offsetLeft = 0;
        do {
          if ( !isNaN( element.offsetLeft ) )
          {
              offsetLeft += element.offsetLeft;
          }
        } while( element = element.offsetParent );
        return offsetLeft;
    }
    function getOffsetTop( element )
    {
        var offsetTop = 0;
        do {
          if ( !isNaN( element.offsetTop ) )
          {
              offsetTop += element.offsetTop;
          }
        } while( element = element.offsetParent );
        return offsetTop;
    }    
    function frustumCoord(event) {

        var el = event.currentTarget; // me.renderer.domElement;
        var dx = getOffsetLeft(el);
        var dy = getOffsetTop(el);

        var vector = new THREE.Vector3(
               ( ( event.clientX - dx ) / el.offsetWidth ) * 2 - 1,
             - ( ( event.clientY - dy ) / el.offsetHeight ) * 2 + 1,
            me.camera.near
        );
        console.log(" click at :" + event.clientX  + " " + event.clientY + " " , vector,  " dx= ",dx," dy=",dy);
        return vector;
    }

    function buildIntersectPlane(event) {

        var vector = frustumCoord(event);
        me.projector.unprojectVector( vector, me.camera );
        me.ray.set( me.camera.position, vector.sub( me.camera.position ).normalize() );
        return me.ray.intersectObject( me.intersectionPlane );
    }

    function buildIntersectScene(event) {

        var vector = frustumCoord(event);
        me.projector.unprojectVector( vector, me.camera );
        me.ray.set( me.camera.position, vector.sub( me.camera.position ).normalize() );
        return me.ray.intersectObjects( [me.scene],true);

    }   

    var SelectObjectManipulator = function()
    {

    };

    SelectObjectManipulator.prototype.onMoveDown = function(event) {
/*
        console.log(" onMouseDown ",event);

        var picked ;

        event.preventDefault();

        if ( event.button === 0 ) {

        var intersects =buildIntersectScene(event);

        if ( intersects.length > 0 ) {

            picked = findSelectedObject(intersects[ 0 ].object);
        }

        if ( picked ) {

            me.controls.enabled = false;


            function startDraging(root,point) {
                
                me.intersectionPlane.position.copy( root.position );
                
                me.intersectionPlane.lookAt( me.camera.position );

                var intersects = me.ray.intersectObject( me.intersectionPlane );

                me.offset.copy(point  ).sub( me.intersectionPlane.position );

                document.addEventListener( 'mousemove', onMouseMove, false );
                document.addEventListener( 'mouseup', onMouseUp, false );                     
            }

            startDraging(picked, intersects[ 0 ].point);


        } else {
            me.controls.enabled = true;
        }

        me.cameraChanged = false;
*/

    }

    SelectObjectManipulator.prototype.onClick = function ( event ) {

        console.log(" onClick ",event);
        var objects = [me.scene];

        if ( event.button == 0 ) {

            var intersects =buildIntersectScene(event);

            var picked = null;
            if ( intersects.length > 0)   { picked = findSelectedObject(intersects[ 0 ].object); }
            
            if (picked) {
                console.log(" clicked on " , picked.properties.OCCType, " name = ", picked.properties.OCCName);
            }

            me.selectObject(picked);
            event.preventDefault();

        }

        me.controls.enabled = true;

    };

    var DragObjectManipulator = function()
    {

    }
    DragObjectManipulator.prototype.onMouseMove = function(event) {

        var intersects = buildIntersectPlane(event);

        if ( intersects.length > 0 ) {

            intersects[ 0 ].point.sub( me.offset );

            if (me.selected) {
                // move the selection on the screen
                me.selected.position.copy( intersects[ 0 ].point );
            }
            me.render3D();
        }
    };

    me.manipulator = new SelectObjectManipulator();

    var onMouseMove = function ( event ) {
        if (me.manipulator && me.manipulator.onMouseMove) {
            me.manipulator.onMouseMove(event);
            event.preventDefault();
        }
    };

    var onMouseDown = function ( event ) {

        if (me.manipulator && me.manipulator.onMoveDown) {
            me.manipulator.onMoveDown(event);
            event.preventDefault();
        }
    };



    var onMouseUp = function ( event ) {
        if (me.manipulator && me.manipulator.onMouseUp) {
            me.manipulator.onMouseUp(event);
            event.preventDefault();
        }
    };

    var onClick = function ( event ) {
        if (me.manipulator && me.manipulator.onClick) {
            me.manipulator.onClick(event);
            event.preventDefault();
        }
    };

    function findSelectedObject(pickedObject) {
        var parent = pickedObject.parent;
        while (parent&& parent.properties.OCCType != "Solid") {
            parent = parent.parent;
        }
        return parent;
    }

    me.renderer.domElement.addEventListener( 'mousemove', onMouseMove, false );
    me.renderer.domElement.addEventListener( 'mouseup'  , onMouseUp  , false );
    me.renderer.domElement.addEventListener( 'mousedown', onMouseDown, false );
    me.renderer.domElement.addEventListener( 'click'    , onClick    , false );
};



GEOMVIEW.prototype.__solidObjectsNode = function(json) {
    var me = this;
    var rootNode = me.scene.getChildByName("SOLIDS");
    if (!rootNode) { 
        var rootNode  = new THREE.Object3D();
        rootNode.name ="SOLIDS";
        me.scene.add(rootNode);
    }
    return rootNode;
}


GEOMVIEW.prototype.selectObject  = function (object) {

    var me = this;
    
    assert(typeof me.selectionBox === "object");

    if ( object !== null ) {

        me.selected = object;

        hasRotation = true;

        var bbox = GEOMTOOL.boundingBox(object);

        var vertices = me.selectionBox.geometry.vertices;

        vertices[ 0 ].x = bbox.max.x;
        vertices[ 0 ].y = bbox.max.y;
        vertices[ 0 ].z = bbox.max.z;

        vertices[ 1 ].x = bbox.max.x;
        vertices[ 1 ].y = bbox.max.y;
        vertices[ 1 ].z = bbox.min.z;

        vertices[ 2 ].x = bbox.max.x;
        vertices[ 2 ].y = bbox.min.y;
        vertices[ 2 ].z = bbox.max.z;

        vertices[ 3 ].x = bbox.max.x;
        vertices[ 3 ].y = bbox.min.y;
        vertices[ 3 ].z = bbox.min.z;

        vertices[ 4 ].x = bbox.min.x;
        vertices[ 4 ].y = bbox.max.y;
        vertices[ 4 ].z = bbox.min.z;

        vertices[ 5 ].x = bbox.min.x;
        vertices[ 5 ].y = bbox.max.y;
        vertices[ 5 ].z = bbox.max.z;

        vertices[ 6 ].x = bbox.min.x;
        vertices[ 6 ].y = bbox.min.y;
        vertices[ 6 ].z = bbox.min.z;

        vertices[ 7 ].x = bbox.min.x;
        vertices[ 7 ].y = bbox.min.y;
        vertices[ 7 ].z = bbox.max.z;

        me.selectionBox.geometry.computeBoundingSphere();
        me.selectionBox.geometry.verticesNeedUpdate = true;

        me.selectionBox.matrixWorld = object.matrixWorld;
        me.selectionAxis.matrixWorld = object.matrixWorld;
        me.selectionBox.visible = true;


    } else {
        me.selectionBox.visible = false;
        me.selected = null;
    }

    me.render3D();
};


GEOMVIEW.prototype.highlightObject = function(obj3D) {

    // me.selection =
}
/*
 *  json = { solids: [ id: "ID" , { faces: [], edges: [] }, ...]}
 *   
 *
 */
GEOMVIEW.prototype.updateShapeObject = function (json) {

    var color = [ Math.random(),Math.random(),Math.random()];

    function rgb2hex( rgb ) {
        return ( rgb[ 0 ] * 255 << 16 ) + ( rgb[ 1 ] * 255 << 8 ) + rgb[ 2 ] * 255;
    }
    function process_face_mesh(rootNode,jsonEntry,color){
       
        var jsonFace = jsonEntry.mesh;

        jsonFace.scale = 1.0;
        var jsonLoader = new THREE.JSONLoader();

        var model;

        model = jsonLoader.createModel( jsonFace,

            function(geometry,material ){
                material = new THREE.MeshLambertMaterial({color: rgb2hex(color)});
                var mesh = new THREE.Mesh(geometry,material);
                mesh.properties.OCCType = "face";
                mesh.properties.OCCName = jsonFace.name;
                rootNode.add(mesh);
            },/* texturePath */ undefined);
    }

    function process_edge_mesh(rootNode,jsonEdge) {
        var v = jsonEdge.mesh;
        var geometry = new THREE.Geometry();
        var i = 0
        while ( i<v.length) {
            geometry.vertices.push(new THREE.Vector3(v[i],v[i+1],v[i+2]));        
            i+=3;
        }
        var material = new THREE.LineDashedMaterial({ linewidth: 4, color: 0xffffff}); 
        var polyline = new THREE.Line(geometry,material);
        polyline.properties.OCCType = "edge";
        polyline.properties.OCCName = jsonEdge.name;
        rootNode.add(polyline);
    }    

    var me = this;
    rootNode  = me.__solidObjectsNode();

    var node = rootNode;
    if (json.name) {
        var oldObj = rootNode.getChildByName(json.name);
        if (oldObj) { rootNode.remove(oldObj); }
        node  = new THREE.Object3D();
        node.name =json.name;
        rootNode.add(node);
    }

    // read solids
    var jsonSolids = json.solids;



    jsonSolids.forEach(function(solidMesh) {

        color = [ Math.random(),Math.random(),Math.random()];

        var group = new THREE.Object3D();
        node.add(group);
        group.properties.OCCType =  "Solid";
        group.properties.OCCName  =  solidMesh.name;
        group.properties.OCCID    =  solidMesh.id;
        group.properties.OCCColor = color.slice(0);

        // one object
        solidMesh.faces.forEach(function(face){
            // one face
            process_face_mesh(group,face,color);
        });
        solidMesh.edges.forEach(function(edge){
            // one face
            process_edge_mesh(group,edge);
        });
    });
}

/*
 * remove all objects from the graphical view
 */
GEOMVIEW.prototype.clearAll = function() {
    var me = this;
    rootNode  = me.__solidObjectsNode();
    if (rootNode) { me.scene.remove(rootNode); }
}
/*
 * point the current camera to the center
 * of the graphical object (zoom factor is not affected)
 */
GEOMVIEW.prototype.pointCameraTo = function(node) {
    var me = this;
    // Refocus camera to the center of the new object
    var COG = GEOMTOOL.shapeCenterOfGravity(node);
    me.camera.lookAt(COG);
    me.controls.target.set( COG.x,COG.y,COG.z );  

    me.render3D();
}
/*
 * Zoom All
 */
GEOMVIEW.prototype.zoomAll = function() {
    this.pointCameraTo(this.__solidObjectsNode());
}

/*
 *
 */
 GEOMVIEW.prototype.on = function(event_name,callback) {
   // to DO
}