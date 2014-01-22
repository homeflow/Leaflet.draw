L.Freehand = {};

L.Draw.Freehand = L.Draw.Feature.extend({
    
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
        this.type = L.Draw.Polyline.TYPE;

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


            findxy: function(res, e){
                if (res == 'down') {
                   this.points.push([e.clientX,e.clientY])
                }

                if (res == 'move' && this.points.length > 0) {
                    this.points.push([e.clientX,e.clientY])
                    this.draw()
                }
                this.redraw(res, this.points)
            },

            _on_mouse_move : function(e){this.findxy('move', e)}, 
            
            _on_mouse_down : function(e){this.findxy('down', e)}, 

            _on_mouse_up : function(e){ this.findxy('up', e)}, 

            _on_mouse_out : function(e){ this.findxy('out', e)}, 

            render: function() {
                this.canvas = this.getCanvas();
                this.ctx = this.canvas.getContext('2d');
                var self = this;
                this.canvas.addEventListener("mousemove", function(e){self._on_mouse_move(e)}, false);
                this.canvas.addEventListener("mousedown", function(e){self._on_mouse_down(e)}, false);
                this.canvas.addEventListener("mouseup",   function(e){self._on_mouse_up(e)}, false);
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
		        polygon.editing.enable()
		    },


            redraw: function(res, cArray) {
                if (res == 'up'){
                    this.drawPolygon(this.sampler(cArray));
                    this.callbackTarget.disable()
                }
            },

            sampler: function(cArray){
                mArray = []
                for (i = 0; i < cArray.length; i=i+(Math.floor(cArray.length/10))){
                    mArray.push([cArray[i][0], cArray[i][1]]);
                }
                return mArray;
            }


		});

        this._map.dragging.disable()
        this.canvasLayer = new CanvasLayer
        this.canvasLayer.options = this.options;
        this.canvasLayer.callbackTarget = this;
        this.canvasLayer.addTo(this._map);
    }


});