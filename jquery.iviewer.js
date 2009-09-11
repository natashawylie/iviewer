(function($){
    var defaults = {
/*         width: 600,
        height: 400, */
        zoom: 0,
        zoom_max: 5,
        zoom_min: -5,
        zoom_delta: 1
    };
    
    var settings = {};
    /* object containing actual information about image
    *   @img_object.object - jquery img object
    *   @img_object.orig_{width|height} - original dimensions
    *   @img_object.display_{width|height} - actual dimensions
    */
    var img_object = {};
    var zoom_object; //object to show zoom status
    var current_zoom;
    var container; //div containing image
    
    //fit image in the container
    var fit = function(){
        var aspect_ratio = img_object.orig_width / img_object.orig_height;
        var window_ratio = settings.width /  settings.height;
        var choose_left = (aspect_ratio > window_ratio);
        
        var x; var y;
        
        if(choose_left){
            img_object.display_width = settings.width;
            img_object.display_height = settings.width / aspect_ratio;
        }
        else {
            img_object.display_width = settings.height * aspect_ratio;
            img_object.display_height = settings.height;
        }
        img_object.object.attr("width",img_object.display_width)
                         .attr("height",img_object.display_height);
        
        moveTo(0,0);
        current_zoom = -Math.floor(img_object.orig_height/img_object.display_height);
        update_status();
    }
    
    //center image in container
    var center = function(){
       img_object.object.css("top",-Math.round((img_object.display_height - options.height)/2))
                        .css("left",-Math.round((img_object.display_width - options.width)/2))
    }
    
    //move the point to the center of display area
    function moveTo(x,y){
        var dx = x-Math.round(settings.width/2);
        var dy = y-Math.round(settings.height/2);
        
        var new_x = parseInt(img_object.object.css("left")) - dx;
        var new_y = parseInt(img_object.object.css("top")) - dy;
        
        setCoords(new_x, new_y);
    }
    
    function setCoords(x,y)
    {
        //check new coordinates to be correct (to be in rect)
        if(y > 0) 
            y = 0;
        if(x > 0) 
            x = 0;
        if(y + img_object.display_height < settings.height) 
            y = settings.height - img_object.display_height;
        if(x + img_object.display_width < settings.width) 
            x = settings.width - img_object.display_width;
        if(img_object.display_width <= settings.width) 
            x = -(img_object.display_width - settings.width)/2;
        if(img_object.display_height <= settings.height) 
            y = -(img_object.display_height - settings.height)/2;
        
        img_object.object.css("top",y + "px")
                         .css("left",x + "px");
    };
    
    function zoomTo(zoom_delta){
        var new_zoom = current_zoom + zoom_delta;
        
        if(new_zoom < settings.zoom_min || new_zoom > settings.zoom_max)
            return;
        
        var new_x;
        var new_y;
        var new_width;
        var new_height;
        
        var old_x = -parseInt(img_object.object.css("left")) + Math.round(settings.width/2);
        var old_y = -parseInt(img_object.object.css("top")) + Math.round(settings.height/2);
        if (current_zoom < 0){
            old_x *= (Math.abs(current_zoom)+1);
            old_y *= (Math.abs(current_zoom)+1);
        } else if (current_zoom > 0){
            old_x /= (Math.abs(current_zoom)+1);
            old_y /= (Math.abs(current_zoom)+1);
        }
        
        if (new_zoom < 0){
            new_x = old_x / (Math.abs(new_zoom)+1);
            new_y = old_y / (Math.abs(new_zoom)+1);
            new_width = img_object.orig_width /  (Math.abs(new_zoom)+1);
            new_height = img_object.orig_height /  (Math.abs(new_zoom)+1);
        } else if (new_zoom > 0){
            new_x = old_x * (Math.abs(new_zoom)+1);
            new_y = old_y * (Math.abs(new_zoom)+1);
            new_width = img_object.orig_width * (Math.abs(new_zoom)+1);
            new_height = img_object.orig_height * (Math.abs(new_zoom)+1);
        }
        else {
            new_x = old_x;
            new_y = old_y;
            new_width = img_object.orig_width;
            new_height = img_object.orig_height;
        }
        new_x = settings.width/2 - new_x;
        new_y = settings.height/2 - new_y;
        
        img_object.object.attr("width",new_width)
                         .attr("height",new_height);
        img_object.display_width = new_width;
        img_object.display_height = new_height;
                           
        setCoords(new_x, new_y);
        current_zoom = new_zoom;
        update_status();
    }
    
    /* update scale info in the container */
    function update_status()
    {
        zoom_object.html(
             Math.round(100*img_object.display_height/img_object.orig_height) 
                         + "%");
    }
    
    function update_container_info()
    {
        settings.height = container.height();
        settings.width = container.width();
    }
    
    $.fn.iviewer  = function(options)
    {
        var dx; 
        var dy;
        var dragged = false;
        
        settings = $.extend(defaults, options);
        
        if(settings.src == null)
            return;
            
        current_zoom = settings.zoom;
        container = this;
        
        update_container_info();

        //init container
        this.css("overflow","hidden");
             
        $(window).resize(function()
        {
            update_container_info();
        });
                
        //init object
        img_object.object = $("<img>").load(function(){
            img_object.display_width = img_object.orig_width = this.width;
            img_object.display_height = img_object.orig_height = this.height;
            $(this).css("position","absolute")
                .css("top","0px") //this is needed, because chromium sets them
                   .css("left","0px") //auto otherwise
                   .prependTo(container);
                   
            container.addClass("iviewer_cursor");

            if((img_object.display_width > settings.width) ||
              (img_object.display_height > settings.height))
                fit();
            else
                moveTo(img_object.display_width/2, img_object.display_height/2)
            //src attribute is after setting load event, or it won't work
        }).attr("src",settings.src).mousedown(function(e){
            /* start drag event*/
            dragged = true;
            container.addClass("iviewer_drag_cursor");

            dx = e.pageX - parseInt($(this).css("left"));
            dy = e.pageY - parseInt($(this).css("top"));
            return false;
        }).mousemove(function(e){
            if(dragged){
                var ltop =  e.pageY -dy;
                var lleft = e.pageX -dx;
                
                setCoords(lleft, ltop);
                return false;
            }
        }).mouseup(function(){
            container.removeClass("iviewer_drag_cursor");
            dragged=false;
        }).mouseleave(function(){
            container.removeClass("iviewer_drag_cursor");
            dragged=false;
        }).mousewheel(function(ev, delta)
        {
            //this event is there instead of containing div, because
            //at opera it triggers many times on div
            var zoom = (delta < 0)?1:-1;
            var new_zoom = current_zoom + zoom;
            zoomTo(zoom);
            return false;
        });
        
        $("<div>").addClass("iviewer_zoom_in").addClass("iviewer_common").
        addClass("iviewer_button").
        mousedown(function(){zoomTo(1); return false;}).appendTo(container);
        
        $("<div>").addClass("iviewer_zoom_out").addClass("iviewer_common").
        addClass("iviewer_button").
        mousedown(function(){zoomTo(-1); return false;}).appendTo(container);
        
        $("<div>").addClass("iviewer_zoom_zero").addClass("iviewer_common").
        addClass("iviewer_button").
        mousedown(function(){zoomTo(-current_zoom); return false;}).appendTo(container);
        
        $("<div>").addClass("iviewer_zoom_fit").addClass("iviewer_common").
        addClass("iviewer_button").
        mousedown(function(){fit(); return false;}).appendTo(container);
        
        zoom_object = $("<div>").addClass("iviewer_zoom_status").addClass("iviewer_common").
        appendTo(container);
        
        update_status(); //initial status update
    };
    
    $.fn.iviewer.setImage = function(url)
    {
        img_object.object.attr("src",url);
    }
 
 })(jQuery);
