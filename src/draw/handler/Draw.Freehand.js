L.Freehand = {};

L.Draw.Freehand = L.Draw.Feature.extend({

    statics: {
        TYPE: 'freehand'
    },

    
    options: {
        allowIntersection: true,
        repeatMode: false,
        drawError: {
            color: '#b00b00',
            timeout: 2500
        },
        icon: new L.DivIcon({
            iconSize: new L.Point(8, 8),
            className: 'leaflet-div-icon leaflet-editing-icon'
        }),
        guidelineDistance: 20,
        maxGuideLineLength: 4000,
        shapeOptions: {
            stroke: true,
            color: '#f06eaa',
            weight: 4,
            opacity: 0.5,
            fill: false,
            clickable: true
        },
        metric: true, // Whether to use the metric meaurement system or imperial
        showLength: true, // Whether to display distance in the tooltip
        zIndexOffset: 2000 // This should be > than the highest z-index any map layers
    },

    canvasLayer : undefined,


    initialize: function (map, options) {
        // Need to set this here to ensure the correct message is used.
        this.options.drawError.message = L.drawLocal.draw.handlers.polyline.error;

        // Merge default drawError options with custom options
        if (options && options.drawError) {
            options.drawError = L.Util.extend({}, this.options.drawError, options.drawError);
        }

        // Save the type so super can fire, need to do this as cannot do this.TYPE :(
        this.type = L.Draw.Freehand.TYPE;

        L.Draw.Feature.prototype.initialize.call(this, map, options);
    },

   disable: function(){

      this._map.removeLayer(this.canvasLayer);
      L.Draw.Feature.prototype.disable.call(this);
    },


    addHooks : function(){
        L.Draw.Feature.prototype.addHooks.call(this);

        var CanvasLayer  = L.CanvasLayer.extend({



            callbackTarget: undefined,

            points : [],

            draw: function() { 
                var p_length = this.points.length
                this.extendPath(
                    this.points[p_length-2][0],
                    this.points[p_length-2][1],
                    this.points[p_length-1][0],
                    this.points[p_length-1][1]
                );
            },

            extendPath: function(x1,y1,x2,y2){
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2,y2);
                this.ctx.strokeStyle = this.options.shapeOptions.color;
                this.ctx.lineWidth = this.options.shapeOptions.weight;
                this.ctx.stroke();
                this.ctx.closePath();
            },


            pushPoints: function(e){
                if(e.touches == undefined){
                   this.points.push([e.clientX,e.clientY])
                }
                else{
                    this.points.push([e.touches[0].clientX, e.touches[0].clientY])
                } 
            },

            findxy: function(res, e){
                if (res == 'up') {
                   this.callbackTarget.disable()
                }
                if (res == 'down') {
                    this.pushPoints(e)
                }
                if (res == 'move' && this.points.length > 0) {
                    this.pushPoints(e)
                    this.draw()
                }
                this.redraw(res, this.points)
            },

            _on_finger_move : function(e){this.findxy('drag', e)}, 

            _on_mouse_move : function(e){this.findxy('move', e)}, 
            
            _on_mouse_down : function(e){this.findxy('down', e)}, 

            _on_mouse_up : function(e){ this.findxy('up', e)}, 

            //_on_mouse_out : function(e){ this.findxy('out', e)}, 

            render: function() {
                this.canvas = this.getCanvas();
                this.ctx = this.canvas.getContext('2d');
                var self = this;
                this.canvas.addEventListener("mousemove", function(e){self._on_mouse_move(e)}, false);
                this.canvas.addEventListener("mousedown", function(e){self._on_mouse_down(e)}, false);
                this.canvas.addEventListener("mouseup",   function(e){self._on_mouse_up(e)}, false);

                this.canvas.addEventListener("touchstart",   function(e){
                    e.preventDefault(); self._on_mouse_down(e)
                }, false);
                this.canvas.addEventListener("touchmove",   function(e){
                    self._on_mouse_move(e)
                }, false);
                this.canvas.addEventListener("touchend",   function(e){
                    self._on_mouse_up(e)
                }, false
                );


               // this.canvas.addEventListener("mouseout",  function(e){self._on_mouse_out(e)}, false);
            }, 
        


			drawPolygon: function(cArray) {
				var polyPoints = []
    		    for(i = 1; i < cArray.length; i++){
    		        var pintilus = new L.Point(cArray[i-1][0], cArray[i-1][1]);
    		        var xip = map.containerPointToLatLng(pintilus);
    		        polyPoints[i-1] = new L.LatLng(xip.lat, xip.lng);
    		    }
		        polygon = new L.Polygon(polyPoints);
		        console.log(polyPoints)
		        drawnItems.addLayer(polygon);
		        polygon.editing.enable();
                this._map.dragging.enable()
		    },


            redraw: function(res, cArray) {
                if (res == 'up'){
                    console.log(cArray.length, 'Carry')
                    this.drawPolygon(this.properRDP(cArray,5));
                    this.callbackTarget.disable()
                }
            },


             properRDP: function(points,epsilon){
                var firstPoint=points[0];
                var lastPoint=points[points.length-1];
                if (points.length<3){
                    return points;
                }
                var index=-1;
                var dist=0;
                for (var i=1;i<points.length-1;i++){
                    var cDist=this.findPerpendicularDistance(points[i],firstPoint,lastPoint);
                    if (cDist>dist){
                        dist=cDist;
                        index=i;
                    }
                }
                if (dist>epsilon){
                    // iterate
                    var l1=points.slice(0, index+1);
                    var l2=points.slice(index);
                    var r1=this.properRDP(l1,epsilon);
                    var r2=this.properRDP(l2,epsilon);
                    // concat r2 to r1 minus the end/startpoint that will be the same
                    var rs=r1.slice(0,r1.length-1).concat(r2);
                    return rs;
                }else{
                    return [firstPoint,lastPoint];
                }
            },
                
                
            findPerpendicularDistance: function(p, p1,p2) {
                // if start and end point are on the same x the distance is the difference in X.
                var result;
                var slope;
                var intercept;
                if (p1[0]==p2[0]){
                    result=Math.abs(p[0]-p1[0]);
                }else{
                    slope = (p2[1] - p1[1]) / (p2[0] - p1[0]);
                    intercept = p1[1] - (slope * p1[0]);
                    result = Math.abs(slope * p[0] - p[1] + intercept) / Math.sqrt(Math.pow(slope, 2) + 1);
                }
               
                return result;
            }


		});

        this._map.dragging.disable()
        this.canvasLayer = new CanvasLayer
        this.canvasLayer.options = this.options;
        this.canvasLayer.callbackTarget = this;
        this.canvasLayer.addTo(this._map);
    }


});