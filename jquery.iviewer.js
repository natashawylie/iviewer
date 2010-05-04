(function($){
    
    $.fn.iviewer  = function(o)
    {
        return this.each(function()
                        {
						   $(this).data('viewer', new $iv(this,o));
                        });
    }
    
    var defaults = {
        /**
        * start zoom value for image, not used now
        * may be equal to "fit" to fit image into container or scale in % 
        **/
        zoom: "fit",
        /**
        * base value to scale image
        **/
        zoom_base: 100,
        /**
        * maximum zoom
        **/
        zoom_max: 800,
        /**
        * minimum zoom
        **/
        zoom_min: 25,
        /**
        * base of rate multiplier.
        * zoom is calculated by formula: zoom_base * zoom_delta^rate
        **/
        zoom_delta: 1.4,
        /**
        * if true plugin doesn't add its own controls
        **/
        ui_disabled: false,
        /**
        * if false, plugin doesn't bind resize event on window and this must 
        * be handled manually
        **/
        update_on_resize: true,
        /**
        * event is triggered when zoom value is changed
        * @param int new zoom value
        * @return boolean if false zoom action is aborted
        **/
        onZoom: null,
        /**
        * callback is fired after plugin setup
        **/
        initCallback: null,
        /**
        * event is fired on drag begin
        * @param object coords mouse coordinates on the image
        * @return boolean if false is returned, drag action is aborted
        **/
        onStartDrag: null,
        /**
        * event is fired on drag action
        * @param object coords mouse coordinates on the image
        **/
        onDrag: null,
        /**
        * event is fired when mouse moves over image
        * @param object coords mouse coordinates on the image
        **/
        onMouseMove: null,
        /**
        * mouse click event
        * @param object coords mouse coordinates on the image
        **/
        onClick: null,
        /**
        * event is fired when image starts to load
        */
        onStartLoad: null,
        /**
        * event is fired, when image is loaded and initially positioned
        */
        onFinishLoad: null
    };
    
    $.iviewer = function(e,o)
    {
        var me = this;
        
        /* object containing actual information about image
        *   @img_object.object - jquery img object
        *   @img_object.orig_{width|height} - original dimensions
        *   @img_object.display_{width|height} - actual dimensions
        */
        this.img_object = {};

        this.zoom_object = {}; //object to show zoom status
        this.image_loaded = false;
        
        //drag variables
        this.dx = 0; 
        this.dy = 0;
        this.dragged = false;
        
        this.settings = $.extend({}, defaults, o || {});
        this.current_zoom = this.settings.zoom;
        
        if(this.settings.src === null){
            return;
        }
            
        this.container = $(e);
        
        this.update_container_info();

        //init container
        this.container.css("overflow","hidden");
         
        if(this.settings.update_on_resize == true)
        {
            $(window).resize(function()
            {
                me.update_container_info();
            });
        }
        
        this.img_object.x = 0;
        this.img_object.y = 0;
        
        //init object
        this.img_object.object = $("<img>").
        css({ position: "absolute", top :"0px", left: "0px"}). //this is needed, because chromium sets them auto otherwise
        //bind mouse events
        mousedown(function(e){ return me.drag_start(e); }).
        mousemove(function(e){return me.drag(e)}).
        mouseup(function(e){return me.drag_end(e)}).
        click(function(e){return me.click(e)}).
        mouseleave(function(e){return me.drag_end(e)}).
        mousewheel(function(ev, delta)
        {
            //this event is there instead of containing div, because
            //at opera it triggers many times on div
            var zoom = (delta > 0)?1:-1;
            me.zoom_by(zoom);
            return false;
        });

        this.img_object.object.prependTo(me.container);
        this.loadImage(this.settings.src);
        
        if(!this.settings.ui_disabled)
        {
            this.createui();
        }
        
        if(this.settings.initCallback)
        {
            this.settings.initCallback.call(this);
        }
    }
    
    
    var $iv = $.iviewer;
    
    $iv.fn = $iv.prototype = {
        iviewer : "0.4.2"
    }
    $iv.fn.extend = $iv.extend = $.extend;
    
    $iv.fn.extend({

        loadImage: function(src)
        {
            this.current_zoom = this.settings.zoom;
            this.image_loaded = false;
            var me = this;
            
            if(this.settings.onStartLoad)
            {
               this.settings.onStartLoad.call(this);
            }

            this.img_object.object.unbind('load').
                removeAttr("src").
                removeAttr("width").
                removeAttr("height").
				css({ top: 0, left: 0 }).
                load(function(){
                    me.image_loaded = true;
                    me.img_object.display_width = me.img_object.orig_width = this.width;
                    me.img_object.display_height = me.img_object.orig_height = this.height;
                           
                    if(!me.container.hasClass("iviewer_cursor")){
                        me.container.addClass("iviewer_cursor");
                    }
    
                    if(me.settings.zoom == "fit"){
                        me.fit();
                    }
                    else {
                        me.set_zoom(me.settings.zoom);
                    }
                    
                    if(me.settings.onFinishLoad)
                    {
                       me.settings.onFinishLoad.call(me);
                    }
                
                //src attribute is after setting load event, or it won't work
            }).attr("src",src);
        },
                  
        /**
        * fits image in the container
        **/
        fit: function()
        {
            var aspect_ratio = this.img_object.orig_width / this.img_object.orig_height;
            var window_ratio = this.settings.width /  this.settings.height;
            var choose_left = (aspect_ratio > window_ratio);
            var new_zoom = 0;
    
            if(choose_left){
                new_zoom = this.settings.width / this.img_object.orig_width * 100;
            }
            else {
                new_zoom = this.settings.height / this.img_object.orig_height * 100;
            }

          this.set_zoom(new_zoom);
        },
        
        /**
        * center image in container
        **/
        center: function()
        {
            this.setCoords(-Math.round((this.img_object.display_height - this.settings.height)/2),
                           -Math.round((this.img_object.display_width - this.settings.width)/2));
        },
        
        /**
        *   move a point in container to the center of display area
        *   @param x a point in container
        *   @param y a point in container
        **/
        moveTo: function(x, y)
        {
            var dx = x-Math.round(this.settings.width/2);
            var dy = y-Math.round(this.settings.height/2);
            
            var new_x = this.img_object.x - this.dx;
            var new_y = this.img_object.y - this.dy;
            
            this.setCoords(new_x, new_y);
        },
        
        /**
        * set coordinates of upper left corner of image object
        **/
        setCoords: function(x,y)
        {
            //do nothing while image is being loaded
            if(!this.image_loaded)
            {
                return;
            }
            
            //check new coordinates to be correct (to be in rect)
            if(y > 0){
                y = 0;
            }
            if(x > 0){
                x = 0;
            }
            if(y + this.img_object.display_height < this.settings.height){
                y = this.settings.height - this.img_object.display_height;
            }
            if(x + this.img_object.display_width < this.settings.width){
                x = this.settings.width - this.img_object.display_width;
            }
            if(this.img_object.display_width <= this.settings.width){
                x = -(this.img_object.display_width - this.settings.width)/2;
            }
            if(this.img_object.display_height <= this.settings.height){
                y = -(this.img_object.display_height - this.settings.height)/2;
            }
            
            this.img_object.x = x;
            this.img_object.y = y;
            
            this.img_object.object.css("top",y + "px")
                             .css("left",x + "px");
        },
        
        
        /**
        * convert coordinates on the container to the coordinates on the image (in original size)
        *
        * @return object with fields x,y according to coordinates or false
        * if initial coords are not inside image
        **/
        containerToImage : function (x,y)
        {
            if(x < this.img_object.x || y < this.img_object.y ||
               x > this.img_object.x + this.img_object.display_width ||
               y > this.img_object.y + this.img_object.display_height)
            {
                return false;
            }
            
            return { x :  $iv.descaleValue(x - this.img_object.x, this.current_zoom),
                     y :  $iv.descaleValue(y - this.img_object.y, this.current_zoom)
            };
        },
        
        /**
        * convert coordinates on the image (in original size) to the coordinates on the container
        *
        * @return object with fields x,y according to coordinates or false
        * if initial coords are not inside image
        **/
        imageToContainer : function (x,y)
        {
            if(x > this.img_object.orig_width || y > this.img_object.orig_height)
            {
                return false;
            }
            
            return { x : this.img_object.x + $iv.scaleValue(x, this.current_zoom),
                     y : this.img_object.y + $iv.scaleValue(y, this.current_zoom)
            };
        },
        
        /**
        * get mouse coordinates on the image
        * @param e - object containing pageX and pageY fields, e.g. mouse event object
        *
        * @return object with fields x,y according to coordinates or false
        * if initial coords are not inside image
        **/
        getMouseCoords : function(e)
        {
            var img_offset = this.img_object.object.offset();

            return { x : $iv.descaleValue(e.pageX - img_offset.left, this.current_zoom),
                     y : $iv.descaleValue(e.pageY - img_offset.top, this.current_zoom)
            };
        },
        
        /**
        * set image scale to the new_zoom
        * @param new_zoom image scale in % 
        **/
        set_zoom: function(new_zoom)
        {
            if(this.settings.onZoom && this.settings.onZoom.call(this, new_zoom) == false)
            {
                return;
            }
            
            //do nothing while image is being loaded
            if(!this.image_loaded)
            {
                return;
            }
            
            if(new_zoom <  this.settings.zoom_min)
            {
                new_zoom = this.settings.zoom_min;
            }
            else if(new_zoom > this.settings.zoom_max)
            {
                new_zoom = this.settings.zoom_max;
            }

            /* we fake these values to make fit zoom properly work */
            if(this.current_zoom == "fit")
            {
                var old_x = Math.round(this.settings.width/2 + this.img_object.orig_width/2);
                var old_y = Math.round(this.settings.height/2 + this.img_object.orig_height/2);
                this.current_zoom = 100;
            }
            else {
                var old_x = -parseInt(this.img_object.object.css("left"),10) +
                                            Math.round(this.settings.width/2);
                var old_y = -parseInt(this.img_object.object.css("top"),10) + 
                                            Math.round(this.settings.height/2);
            }

            var new_width = $iv.scaleValue(this.img_object.orig_width, new_zoom);
            var new_height = $iv.scaleValue(this.img_object.orig_height, new_zoom);
            var new_x = $iv.scaleValue( $iv.descaleValue(old_x, this.current_zoom), new_zoom);
            var new_y = $iv.scaleValue( $iv.descaleValue(old_y, this.current_zoom), new_zoom);

            new_x = this.settings.width/2 - new_x;
            new_y = this.settings.height/2 - new_y;
            
            this.img_object.object.attr("width",new_width)
                             .attr("height",new_height);
            this.img_object.display_width = new_width;
            this.img_object.display_height = new_height;
                               
            this.setCoords(new_x, new_y);

            this.current_zoom = new_zoom;
            this.update_status();
        },
        
        /**
        * changes zoom scale by delta
        * zoom is calculated by formula: zoom_base * zoom_delta^rate 
        * @param Integer delta number to add to the current multiplier rate number 
        **/
        zoom_by: function(delta)
        {
            var closest_rate = this.find_closest_zoom_rate(this.current_zoom);

            var next_rate = closest_rate + delta;
            var next_zoom = this.settings.zoom_base * Math.pow(this.settings.zoom_delta, next_rate)
            if(delta > 0 && next_zoom < this.current_zoom)
            {
                next_zoom *= this.settings.zoom_delta;
            }
            
            if(delta < 0 && next_zoom > this.current_zoom)
            {
                next_zoom /= this.settings.zoom_delta;
            }
            
            this.set_zoom(next_zoom);
        },
        
        /**
        * finds closest multiplier rate for value
        * basing on zoom_base and zoom_delta values from settings
        * @param Number value zoom value to examine
        **/
        find_closest_zoom_rate: function(value)
        {
            if(value == this.settings.zoom_base)
            {
                return 0;
            }
            
            function div(val1,val2) { return val1 / val2 };
            function mul(val1,val2) { return val1 * val2 };
            
            var func = (value > this.settings.zoom_base)?mul:div;
            var sgn = (value > this.settings.zoom_base)?1:-1;
            
            var mltplr = this.settings.zoom_delta;
            var rate = 1;
            
            while(Math.abs(func(this.settings.zoom_base, Math.pow(mltplr,rate)) - value) > 
                  Math.abs(func(this.settings.zoom_base, Math.pow(mltplr,rate+1)) - value))
            {
                rate++;
            }
            
            return sgn * rate;
        },
        
        /* update scale info in the container */
        update_status: function()
        {
            if(!this.settings.ui_disabled)
            {
                var percent = Math.round(100*this.img_object.display_height/this.img_object.orig_height);
                if(percent)
                {
                    this.zoom_object.html(percent + "%");
                }
            }
        },
        
        update_container_info: function()
        {
            this.settings.height = this.container.height();
            this.settings.width = this.container.width();
        },
        
        /**
        *   callback for handling mousdown event to start dragging image
        **/
        drag_start: function(e)
        {
            if(this.settings.onStartDrag && 
               this.settings.onStartDrag.call(this,this.getMouseCoords(e)) == false)
            {
                return false;
            }
            
            /* start drag event*/
            this.dragged = true;
            this.container.addClass("iviewer_drag_cursor");
    
            this.dx = e.pageX - this.img_object.x;
            this.dy = e.pageY - this.img_object.y;
            return false;
        },
        
        /**
        *   callback for handling mousmove event to drag image
        **/
        drag: function(e)
        {
            this.settings.onMouseMove && 
                    this.settings.onMouseMove.call(this,this.getMouseCoords(e));
            
            if(this.dragged){
                this.settings.onDrag && 
                        this.settings.onDrag.call(this,this.getMouseCoords(e));
                        
                var ltop =  e.pageY -this.dy;
                var lleft = e.pageX -this.dx;
                
                this.setCoords(lleft, ltop);
                return false;
            }
        },
        
        /**
        *   callback for handling stop drag
        **/
        drag_end: function(e)
        {
            this.container.removeClass("iviewer_drag_cursor");
            this.dragged=false;
        },
        
        click: function(e)
        {
            this.settings.onClick && 
                    this.settings.onClick.call(this,this.getMouseCoords(e));
        },
        
        /**
        *   create zoom buttons info box
        **/
        createui: function()
        {
            var me=this; 
            
            $("<div>").addClass("iviewer_zoom_in").addClass("iviewer_common").
            addClass("iviewer_button").
            mousedown(function(){me.zoom_by(1); return false;}).appendTo(this.container);
            
            $("<div>").addClass("iviewer_zoom_out").addClass("iviewer_common").
            addClass("iviewer_button").
            mousedown(function(){me.zoom_by(- 1); return false;}).appendTo(this.container);
            
            $("<div>").addClass("iviewer_zoom_zero").addClass("iviewer_common").
            addClass("iviewer_button").
            mousedown(function(){me.set_zoom(100); return false;}).appendTo(this.container);
            
            $("<div>").addClass("iviewer_zoom_fit").addClass("iviewer_common").
            addClass("iviewer_button").
            mousedown(function(){me.fit(this); return false;}).appendTo(this.container);
            
            this.zoom_object = $("<div>").addClass("iviewer_zoom_status").addClass("iviewer_common").
            appendTo(this.container);
            
            this.update_status(); //initial status update
        }
    });
    
    $iv.extend({
        scaleValue: function(value, toZoom)
        {
            return value * toZoom / 100;
        },
        
        descaleValue: function(value, fromZoom)
        {
            return value * 100 / fromZoom;
        }
    });

 })(jQuery);
