(function($){
    var defaults = {
        zoom: 0,
        zoom_max: 5,
        zoom_min: -5,
        zoom_delta: 1,
        ui_disabled: false,
        update_on_resize: true,
        //event is triggered, when zoom is changed
        //first parameter is zoom delta
        onZoom: null,
        initCallback: null
    };

    //fit image in the container
    function fit(instance){
        var aspect_ratio = instance.img_object.orig_width / instance.img_object.orig_height;
        var window_ratio = instance.settings.width /  instance.settings.height;
        var choose_left = (aspect_ratio > window_ratio);

        if(choose_left){
            instance.img_object.display_width = instance.settings.width;
            instance.img_object.display_height = instance.settings.width / aspect_ratio;
        }
        else {
            instance.img_object.display_width = instance.settings.height * aspect_ratio;
            instance.img_object.display_height = instance.settings.height;
        }
        instance.img_object.object.attr("width",instance.img_object.display_width)
                         .attr("height",instance.img_object.display_height);

        center(instance);
        instance.current_zoom = -Math.floor(instance.img_object.orig_height/instance.img_object.display_height);
        //console.log("current zoom: " + 
        update_status(instance);
    }
    
    //center image in container
    function center(instance){
       instance.img_object.object.css("top",-Math.round((instance.img_object.display_height - instance.settings.height)/2))
                        .css("left",-Math.round((instance.img_object.display_width - instance.settings.width)/2));
    }
    
    /**
    *   move a point in container to the center of display area
    *   @param x a point in container
    *   @param y a point in container
    **/
    function moveTo(instance, x,y){
        var dx = x-Math.round(instance.settings.width/2);
        var dy = y-Math.round(instance.settings.height/2);
        
        var new_x = parseInt(instance.img_object.object.css("left"),10) - instance.dx;
        var new_y = parseInt(instance.img_object.object.css("top"),10) - instance.dy;
        
        setCoords(new_x, new_y);
    }
    
    /**
    * set coordinates of upper left corner of image object
    **/
    function setCoords(instance, x,y)
    {
        //check new coordinates to be correct (to be in rect)
        if(y > 0){
            y = 0;
        }
        if(x > 0){
            x = 0;
        }
        if(y + instance.img_object.display_height < instance.settings.height){
            y = instance.settings.height - instance.img_object.display_height;
        }
        if(x + instance.img_object.display_width < instance.settings.width){
            x = instance.settings.width - instance.img_object.display_width;
        }
        if(instance.img_object.display_width <= instance.settings.width){
            x = -(instance.img_object.display_width - instance.settings.width)/2;
        }
        if(instance.img_object.display_height <= instance.settings.height){
            y = -(instance.img_object.display_height - instance.settings.height)/2;
        }
        
        instance.img_object.object.css("top",y + "px")
                         .css("left",x + "px");
    }
    
    
    /**
    * set image scale to the new_zoom
    * @param new_zoom image scale. 
    * if new_zoom == 0 then display image in original size
    * if new_zoom < 0 then scale = 1/new_zoom * 100 %
    * if new_zoom > 0 then scale = 1*new_zoom * 100 %
    **/
    function set_zoom(instance, new_zoom)
    {
        if(new_zoom <  instance.settings.zoom_min)
        {
            new_zoom = instance.settings.zoom_min;
        }
        else if(new_zoom > instance.settings.zoom_max)
        {
            new_zoom = instance.settings.zoom_max;
        }
        
        var new_x;
        var new_y;
        var new_width;
        var new_height;
        
        var old_x = -parseInt(instance.img_object.object.css("left"),10) +
                                    Math.round(instance.settings.width/2);
        var old_y = -parseInt(instance.img_object.object.css("top"),10) + 
                                    Math.round(instance.settings.height/2);
        if (instance.current_zoom < 0){
            old_x *= (Math.abs(instance.current_zoom)+1);
            old_y *= (Math.abs(instance.current_zoom)+1);
        } else if (instance.current_zoom > 0){
            old_x /= (Math.abs(instance.current_zoom)+1);
            old_y /= (Math.abs(instance.current_zoom)+1);
        }
        
        if (new_zoom < 0){
            new_x = old_x / (Math.abs(new_zoom)+1);
            new_y = old_y / (Math.abs(new_zoom)+1);
            new_width = instance.img_object.orig_width /  (Math.abs(new_zoom)+1);
            new_height = instance.img_object.orig_height /  (Math.abs(new_zoom)+1);
        } else if (new_zoom > 0){
            new_x = old_x * (Math.abs(new_zoom)+1);
            new_y = old_y * (Math.abs(new_zoom)+1);
            new_width = instance.img_object.orig_width * (Math.abs(new_zoom)+1);
            new_height = instance.img_object.orig_height * (Math.abs(new_zoom)+1);
        }
        else {
            new_x = old_x;
            new_y = old_y;
            new_width = instance.img_object.orig_width;
            new_height = instance.img_object.orig_height;
        }
        new_x = instance.settings.width/2 - new_x;
        new_y = instance.settings.height/2 - new_y;
        
        instance.img_object.object.attr("width",new_width)
                         .attr("height",new_height);
        instance.img_object.display_width = new_width;
        instance.img_object.display_height = new_height;
                           
        setCoords(instance,new_x, new_y);
        
        if(instance.settings.onZoom !== null)
        {
            instance.settings.onZoom(new_zoom - current_zoom);
        }
        
        instance.current_zoom = new_zoom;
        update_status(instance);
    }

    
    /* update scale info in the container */
    function update_status(instance)
    {
        if(!instance.settings.ui_disabled)
        {
            var percent = Math.round(100*instance.img_object.display_height/instance.img_object.orig_height);
            if(percent)
            {
                instance.zoom_object.html(percent + "%");
            }
        }
    }
    
    function update_container_info(instance)
    {
        instance.settings.height = instance.container.height();
        instance.settings.width = instance.container.width();
    }
    
    
    /**
    *   callback for handling mousdown event to start dragging image
    **/
    function drag_start(instance, e)
    {
        /* start drag event*/
        instance.dragged = true;
        instance.container.addClass("iviewer_drag_cursor");

        instance.dx = e.pageX - parseInt($(this).css("left"),10);
        instance.dy = e.pageY - parseInt($(this).css("top"),10);
        return false;
    }
    
    
    /**
    *   callback for handling mousmove event to drag image
    **/
    function drag(instance, e)
    {
        if(instance.dragged){
            var ltop =  e.pageY -instance.dy;
            var lleft = e.pageX -instance.dx;
            
            setCoords(instance, lleft, ltop);
            return false;
        }
    }
    
    
    /**
    *   callback for handling stop drag
    **/
    function drag_end(instance, e)
    {
        instance.container.removeClass("iviewer_drag_cursor");
        instance.dragged=false;
    }
    
    /**
    *   create zoom buttons info box
    **/
    function createui(instance)
    {
        $("<div>").addClass("iviewer_zoom_in").addClass("iviewer_common").
        addClass("iviewer_button").
        mousedown(function(){set_zoom(instance, instance.current_zoom + 1); return false;}).appendTo(instance.container);
        
        $("<div>").addClass("iviewer_zoom_out").addClass("iviewer_common").
        addClass("iviewer_button").
        mousedown(function(){set_zoom(instance, instance.current_zoom - 1); return false;}).appendTo(instance.container);
        
        $("<div>").addClass("iviewer_zoom_zero").addClass("iviewer_common").
        addClass("iviewer_button").
        mousedown(function(){set_zoom(instance, 0); return false;}).appendTo(instance.container);
        
        $("<div>").addClass("iviewer_zoom_fit").addClass("iviewer_common").
        addClass("iviewer_button").
        mousedown(function(){fit(instance); return false;}).appendTo(instance.container);
        
        instance.zoom_object = $("<div>").addClass("iviewer_zoom_status").addClass("iviewer_common").
        appendTo(instance.container);
        
        update_status(instance); //initial status update
    }
    
    $.fn.iviewer  = function(options)
    {
        var instance = {};
        
        /**
        *   external api stub
        */
        instance.zoom = function(delta) { 
            set_zoom(instance, instance.current_zoom + delta);
        };
        instance.fit  = function() { fit(instance); };
        instance.toOrig  = function() { set_zoom(instance, 0); };
        instance.update = function() { update_container_info(instance); };
        
        /* object containing actual information about image
        *   @img_object.object - jquery img object
        *   @img_object.orig_{width|height} - original dimensions
        *   @img_object.display_{width|height} - actual dimensions
        */
        instance.img_object = {};

        instance.zoom_object = {}; //object to show zoom status
        instance.current_zoom = 0;
        
        //drag variables
        instance.dx = 0; 
        instance.dy = 0;
        instance.dragged = false;
        
        this.instance = instance;
        
        
        instance.settings = $.extend({}, defaults, options || {});
        
        if(instance.settings.src === null){
            return this;
        }
            
        instance.current_zoom = instance.settings.zoom;
        instance.container = this;
        
        update_container_info(instance);

        //init container
        this.css("overflow","hidden");
         
        if(instance.settings.update_on_resize == true)
        {
            $(window).resize(function()
            {
                update_container_info(instance);
            });
        }
                
        //init object
        instance.img_object.object = $("<img>").load(function(){
            instance.img_object.display_width = instance.img_object.orig_width = this.width;
            instance.img_object.display_height = instance.img_object.orig_height = this.height;
            $(this).css("position","absolute")
                .css("top","0px") //this is needed, because chromium sets them
                   .css("left","0px") //auto otherwise
                   .prependTo(instance.container);
                   
            instance.container.addClass("iviewer_cursor");

            if((instance.img_object.display_width > instance.settings.width) ||
               (instance.img_object.display_height > instance.settings.height)){
                fit(instance);
            } else {
                moveTo(instance, instance.img_object.display_width/2, instance.img_object.display_height/2);
            }
            //src attribute is after setting load event, or it won't work
        }).attr("src",instance.settings.src).
        mousedown(function(e){
                  return drag_start.call(this, instance,e)
                  }).
        mousemove(function(e){return drag.call(this, instance,e)}).
        mouseup(function(e){return drag_end.call(this, instance,e)}).
        mouseleave(function(e){return drag_end.call(this, instance,e)}).
        mousewheel(function(ev, delta)
        {
            //this event is there instead of containing div, because
            //at opera it triggers many times on div
            var zoom = (delta > 0)?1:-1;
            var new_zoom = instance.current_zoom + zoom;
            set_zoom(instance, new_zoom);
            return false;
        });
        
        if(!instance.settings.ui_disabled)
        {
            createui(instance);
        }
        
        if(instance.settings.initCallback)
        {
            instance.settings.initCallback(instance);
        }
        
        return this;
    };
    
 })(jQuery);
