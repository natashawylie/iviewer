/*
 * iviewer Plugin for jQuery JavaScript Library
 * https://github.com/can3p/iviewer
 *
 * Copyright (c) 2009 - 2011 Dmitry Petrov
 * Dual licensed under the MIT and GPL licenses.
 *  - http://www.opensource.org/licenses/mit-license.php
 *  - http://www.gnu.org/copyleft/gpl.html
 *
 * Author: Dmitry Petrov
 * Version: 0.5.3
 */

( function( $, undefined ) {

//this code was taken from the https://github.com/furf/jquery-ui-touch-punch
var mouseEvents = {
    touchstart: 'mousedown',
    touchmove: 'mousemove',
    touchend: 'mouseup'
};

/**
 * Convert a touch event to a mouse-like
 */
function makeMouseEvent (event) {
    var touch = event.originalEvent.changedTouches[0];

    return $.extend(event, {
        type:        mouseEvents[event.type],
        which:     1,
        pageX:     touch.pageX,
        pageY:     touch.pageY,
        screenX: touch.screenX,
        screenY: touch.screenY,
        clientX: touch.clientX,
        clientY: touch.clientY,
        isTouchEvent: true
    });
}

var mouseProto = $.ui.mouse.prototype,
    _mouseInit = $.ui.mouse.prototype._mouseInit;

mouseProto._mouseInit = function() {
    var self = this;
    self._touchActive = false;

    this.element.bind( 'touchstart.' + this.widgetName, function(event) {
        self._touchActive = true;
        return self._mouseDown(makeMouseEvent(event));
    })

    var self = this;
    // these delegates are required to keep context
    this._mouseMoveDelegate = function(event) {
        if (self._touchActive) {
            return self._mouseMove(makeMouseEvent(event));
        }
    };
    this._mouseUpDelegate = function(event) {
        if (self._touchActive) {
            self._touchActive = false;
            return self._mouseUp(makeMouseEvent(event));
        }
    };

    $(document)
        .bind('touchmove.'+ this.widgetName, this._mouseMoveDelegate)
        .bind('touchend.' + this.widgetName, this._mouseUpDelegate);

    _mouseInit.apply(this);
}

var setter = function(setter, getter) {
    return function(val) {
        if (arguments.length === 0) {
            return getter.apply(this);
        } else {
            setter.call(this, val);
        }
    }
};

var ImageObject = function(img) {
    this._img = img;
    this.x(0)
    this.y(0)
    this.angle(0);
};

(function() {
    this.reset = function(w, h) {
        this._angle = 0;
        this._swapDimensions = false;
        this.x(0)
        this.y(0)

        this.orig_width(w);
        this.orig_height(h);
        this.display_width(w);
        this.display_height(h);
    };

    this._dimension = function(prefix, name) {
        var horiz = '_' + prefix + '_' + name,
            vert = '_' + prefix + '_' + (name === 'height' ? 'width' : 'height');
        return setter(function(val) {
                this[this._swapDimensions ? horiz: vert] = val;
            },
            function() {
                return this[this._swapDimensions ? horiz: vert];
            });
    };

    this.display_width = this._dimension('display', 'width'),
    this.display_height = this._dimension('display', 'height'),
    this.display_diff = function() { return Math.floor( this.display_width() - this.display_height() ) };
    this.orig_width = this._dimension('orig', 'width'),
    this.orig_height = this._dimension('orig', 'height'),

    this.x = setter(function(val) { 
            this._x = val;
            this._img.css("left",this._x + (this._swapDimensions ? this.display_diff() / 2 : 0) + "px");
        },
        function() {
            return this._x;
        });

    this.y = setter(function(val) {
            this._y = val;
            this._img.css("top",this._y - (this._swapDimensions ? this.display_diff() / 2 : 0) + "px");
        },
       function() {
            return this._y;
       });

    this.angle = setter(function(deg) {
            this._angle = deg;
            this._swapDimensions = deg % 180 !== 0;

            var cssVal = 'rotate(' + deg + 'deg)',
                img = this._img;

            jQuery.each(['', '-webkit-', '-moz-', '-o-', '-ms-'], function(i, prefix) {
                img.css(prefix + 'transform', cssVal);
            });
        },
       function() { return this._angle; });

    this.imgOffset = setter(jQuery.noop,
                           function() { return this._img.offset(); });

    this.object = setter(jQuery.noop,
                           function() { return this._img; });

}).apply(ImageObject.prototype);

$.widget( "ui.iviewer", $.ui.mouse, {
    widgetEventPrefix: "iviewer",
    options : {
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
        * whether the zoom should be animated.
        */
        zoom_animation: true,
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
    },

    _create: function() {
        var me = this;

        //drag variables
        this.dx = 0;
        this.dy = 0;
        this.dragged = false;

        /* object containing actual information about image
        *   @img_object.object - jquery img object
        *   @img_object.orig_{width|height} - original dimensions
        *   @img_object.display_{width|height} - actual dimensions
        */
        this.img_object = {};
        this.img_object

        this.zoom_object = {}; //object to show zoom status
        this.image_loaded = false;

        this._angle = 0;

        this.current_zoom = this.options.zoom;

        if(this.options.src === null){
            return;
        }

        this.container = this.element;

        this._updateContainerInfo();

        //init container
        this.container.css("overflow","hidden");

        if(this.options.update_on_resize == true)
        {
            $(window).resize(function()
            {
                me._updateContainerInfo();
            });
        }

        //init object
        var img = $("<img>").
            css({ position: "absolute", top :"0px", left: "0px"}). //this is needed, because chromium sets them auto otherwise
        //bind mouse events
        click(function(e){return me.click(e)}).
        mousewheel(function(ev, delta)
        {
            //this event is there instead of containing div, because
            //at opera it triggers many times on div
            var zoom = (delta > 0)?1:-1;
            me.zoom_by(zoom);
            return false;
        });

        img.prependTo(me.container);
        this.img_object = new ImageObject(img);

        this.loadImage(this.options.src);

        if(!this.options.ui_disabled)
        {
            this.createui();
        }

        this._mouseInit();
    },

    destroy: function() {
        this._mouseDestroy();
    },

    _updateContainerInfo: function()
    {
        this.options.height = this.container.height();
        this.options.width = this.container.width();
    },

    loadImage: function( src )
    {
        this.current_zoom = this.options.zoom;
        this.image_loaded = false;
        var me = this;

        if(this.options.onStartLoad)
        {
           this.options.onStartLoad.call(this);
        }

        this.img_object.object().unbind('load').
            removeAttr("src").
            removeAttr("width").
            removeAttr("height").
            removeAttr("style").
            css({ position: "absolute", top :"0px", left: "0px"}).
            load(function(){
                me.image_loaded = true;
                me.img_object.reset(this.width, this.height);

                if(!me.container.hasClass("iviewer_cursor")){
                    me.container.addClass("iviewer_cursor");
                }

                if(me.options.zoom == "fit"){
                    me.fit();
                }
                else {
                    me.set_zoom(me.options.zoom);
                }

                if(me.options.onFinishLoad)
                {
                   me.options.onFinishLoad.call(me);
                }

            //src attribute is after setting load event, or it won't work
        }).attr("src",src);
    },

    /**
    * fits image in the container
    **/
    fit: function()
    {
        var aspect_ratio = this.img_object.orig_width() / this.img_object.orig_height();
        var window_ratio = this.options.width /  this.options.height;
        var choose_left = (aspect_ratio > window_ratio);
        var new_zoom = 0;

        if(choose_left){
            new_zoom = this.options.width / this.img_object.orig_width() * 100;
        }
        else {
            new_zoom = this.options.height / this.img_object.orig_height() * 100;
        }

      this.set_zoom(new_zoom);
    },

    /**
    * center image in container
    **/
    center: function()
    {
        this.setCoords(-Math.round((this.img_object.display_height() - this.options.height)/2),
                       -Math.round((this.img_object.display_width() - this.options.width)/2));
    },

    /**
    *   move a point in container to the center of display area
    *   @param x a point in container
    *   @param y a point in container
    **/
    moveTo: function(x, y)
    {
        var dx = x-Math.round(this.options.width/2);
        var dy = y-Math.round(this.options.height/2);

        var new_x = this.img_object().x - dx;
        var new_y = this.img_object().y - dy;

        this.setCoords(new_x, new_y);
    },

    /**
     * Get container offset object.
     */
    getContainerOffset: function() {
        return jQuery.extend({}, this.container.offset());
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

        var coords = this._correctCoords(x,y);
        this.img_object.x(coords.x);
        this.img_object.y(coords.y);
    },

    _correctCoords: function( x, y )
    {
        x = parseInt(x, 10);
        y = parseInt(y, 10);

        //check new coordinates to be correct (to be in rect)
        if(y > 0){
            y = 0;
        }
        if(x > 0){
            x = 0;
        }
        if(y + this.img_object.display_height() < this.options.height){
            y = this.options.height - this.img_object.display_height();
        }
        if(x + this.img_object.display_width() < this.options.width){
            x = this.options.width - this.img_object.display_width();
        }
        if(this.img_object.display_width() <= this.options.width){
            x = -(this.img_object.display_width() - this.options.width)/2;
        }
        if(this.img_object.display_height() <= this.options.height){
            y = -(this.img_object.display_height() - this.options.height)/2;
        }

        return { x: x, y:y };
    },


    /**
    * convert coordinates on the container to the coordinates on the image (in original size)
    *
    * @return object with fields x,y according to coordinates or false
    * if initial coords are not inside image
    **/
    containerToImage : function (x,y)
    {
        if(x < this.img_object.x() || y < this.img_object.y() ||
           x > this.img_object.x() + this.img_object.display_width() ||
           y > this.img_object.y() + this.img_object.display_height())
        {
            return false;
        }

        return { x :  util.descaleValue(x - this.img_object.x(), this.current_zoom),
                 y :  util.descaleValue(y - this.img_object.y(), this.current_zoom)
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
        if(x > this.img_object.orig_width() || y > this.img_object.orig_height())
        {
            return false;
        }

        return { x : this.img_object.x() + util.scaleValue(x, this.current_zoom),
                 y : this.img_object.y() + util.scaleValue(y, this.current_zoom)
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
        var img_offset = this.img_object.imgOffset();

        return { x : util.descaleValue(e.pageX - img_offset.left, this.current_zoom),
                 y : util.descaleValue(e.pageY - img_offset.top, this.current_zoom)
        };
    },

    /**
    * set image scale to the new_zoom
    * @param new_zoom image scale in %
    **/
    set_zoom: function(new_zoom)
    {
        if(this.options.onZoom && this.options.onZoom.call(this, new_zoom) == false)
        {
            return;
        }

        //do nothing while image is being loaded
        if(!this.image_loaded)
        {
            return;
        }

        if(new_zoom <  this.options.zoom_min)
        {
            new_zoom = this.options.zoom_min;
        }
        else if(new_zoom > this.options.zoom_max)
        {
            new_zoom = this.options.zoom_max;
        }

        /* we fake these values to make fit zoom properly work */
        if(this.current_zoom == "fit")
        {
            var old_x = Math.round(this.options.width/2 + this.img_object.orig_width()/2);
            var old_y = Math.round(this.options.height/2 + this.img_object.orig_height()/2);
            this.current_zoom = 100;
        }
        else {
            var old_x = -parseInt(this.img_object.object().css("left"),10) +
                                        Math.round(this.options.width/2);
            var old_y = -parseInt(this.img_object.object().css("top"),10) +
                                        Math.round(this.options.height/2);
        }

        var new_width = util.scaleValue(this.img_object.orig_width(), new_zoom);
        var new_height = util.scaleValue(this.img_object.orig_height(), new_zoom);
        var new_x = util.scaleValue( util.descaleValue(old_x, this.current_zoom), new_zoom);
        var new_y = util.scaleValue( util.descaleValue(old_y, this.current_zoom), new_zoom);

        new_x = this.options.width/2 - new_x;
        new_y = this.options.height/2 - new_y;

        this.img_object.display_width(new_width);
        this.img_object.display_height(new_height);

        var coords = this._correctCoords( new_x, new_y );
        this.img_object.x(coords.x);
        this.img_object.y(coords.y);

        if (this.options.zoom_animation) {
            this.img_object.object().animate( { width: new_width, height: new_height, top: this.img_object.y(), left: this.img_object.x() }, 200 );
        } else {
            this.img_object.object().css( { width: new_width, height: new_height, top: this.img_object.y(), left: this.img_object.x() });
        }

        this.current_zoom = new_zoom;

        $.isFunction( this.options.onAfterZoom ) && this.options.onAfterZoom.call( this, new_zoom );
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
        var next_zoom = this.options.zoom_base * Math.pow(this.options.zoom_delta, next_rate)
        if(delta > 0 && next_zoom < this.current_zoom)
        {
            next_zoom *= this.options.zoom_delta;
        }

        if(delta < 0 && next_zoom > this.current_zoom)
        {
            next_zoom /= this.options.zoom_delta;
        }

        this.set_zoom(next_zoom);
    },

    /**
    * Rotate image
    * @param {num} deg Degrees amount to rotate. Positive values rotate image clockwise.
    *     Currently 0, 90, 180, 270 and -90, -180, -270 values are supported
    **/
    angle: function(deg) {
        if (deg < -270 || deg > 270 || deg % 90 !== 0) { return; }
        if (deg === this.img_object.angle()) { return; }

        this.img_object.angle(deg);
        this.center();
    },

    /**
    * finds closest multiplier rate for value
    * basing on zoom_base and zoom_delta values from settings
    * @param Number value zoom value to examine
    **/
    find_closest_zoom_rate: function(value)
    {
        if(value == this.options.zoom_base)
        {
            return 0;
        }

        function div(val1,val2) { return val1 / val2 };
        function mul(val1,val2) { return val1 * val2 };

        var func = (value > this.options.zoom_base)?mul:div;
        var sgn = (value > this.options.zoom_base)?1:-1;

        var mltplr = this.options.zoom_delta;
        var rate = 1;

        while(Math.abs(func(this.options.zoom_base, Math.pow(mltplr,rate)) - value) >
              Math.abs(func(this.options.zoom_base, Math.pow(mltplr,rate+1)) - value))
        {
            rate++;
        }

        return sgn * rate;
    },

    /* update scale info in the container */
    update_status: function()
    {
        if(!this.options.ui_disabled)
        {
            var percent = Math.round(100*this.img_object.display_height()/this.img_object.orig_height());
            if(percent)
            {
                this.zoom_object.html(percent + "%");
            }
        }
    },

    /**
    *   callback for handling mousdown event to start dragging image
    **/
    _mouseStart: function( e )
    {
        if(this.options.onStartDrag &&
           this.options.onStartDrag.call(this,this.getMouseCoords(e)) == false)
        {
            return false;
        }

        /* start drag event*/
        this.dragged = true;
        this.container.addClass("iviewer_drag_cursor");

        this.dx = e.pageX - this.img_object.x();
        this.dy = e.pageY - this.img_object.y();
        return true;
    },

    _mouseCapture: function( e ) {
        return true;
    },

    /**
    *   callback for handling mousmove event to drag image
    **/
    _mouseDrag: function(e)
    {
        this.options.onMouseMove &&
                this.options.onMouseMove.call(this,this.getMouseCoords(e));

        if(this.dragged){
            this.options.onDrag &&
                    this.options.onDrag.call(this,this.getMouseCoords(e));

            var ltop =  e.pageY - this.dy;
            var lleft = e.pageX - this.dx;

            this.setCoords(lleft, ltop);
            return false;
        }
    },

    /**
    *   callback for handling stop drag
    **/
    _mouseStop: function(e)
    {
        this.container.removeClass("iviewer_drag_cursor");
        this.dragged=false;
    },

    click: function(e)
    {
        this.options.onClick &&
                this.options.onClick.call(this,this.getMouseCoords(e));
    },

    /**
    *   create zoom buttons info box
    **/
    createui: function()
    {
        var me=this;

        $("<div>").addClass("iviewer_zoom_in iviewer_common iviewer_button")
                    .bind('mousedown touchstart',function(){me.zoom_by(1); return false;})
                    .appendTo(this.container);

        $("<div>").addClass("iviewer_zoom_out iviewer_common iviewer_button")
                    .bind('mousedown touchstart',function(){me.zoom_by(- 1); return false;})
                    .appendTo(this.container);

        $("<div>").addClass("iviewer_zoom_zero iviewer_common iviewer_button")
                    .bind('mousedown touchstart',function(){me.set_zoom(100); return false;})
                    .appendTo(this.container);

        $("<div>").addClass("iviewer_zoom_fit iviewer_common iviewer_button")
                    .bind('mousedown touchstart',function(){me.fit(this); return false;})
                    .appendTo(this.container);

        this.zoom_object = $("<div>").addClass("iviewer_zoom_status iviewer_common")
                                    .appendTo(this.container);

        var select = $('<select>')
                    .append( $('<option>', {value: 0, html: '0'}))
                    .append( $('<option>', {value: 90, html: '90'}))
                    .append( $('<option>', {value: 180, html: '180'}))
                    .append( $('<option>', {value: 270, html: '270'}))
                    .bind('change',function(){me.angle(this.value); return false;});

        $("<div>").addClass("iviewer_zoom_rotate iviewer_common")
                .append(select)
                .appendTo(this.container);

        this.update_status(); //initial status update
    }

} );


var util = {
    scaleValue: function(value, toZoom)
    {
        return value * toZoom / 100;
    },

    descaleValue: function(value, fromZoom)
    {
        return value * 100 / fromZoom;
    }
};

 } )( jQuery, undefined );
