(function($) {
    function open(src) {
        var firstZoom = true;

        $("#iviewer").fadeIn().trigger('fadein');

        var viewer = $("#iviewer .viewer").
            width($(window).width() - 80).
            height($(window).height()).
            iviewer({
                src : src,
                ui_disabled : true,
                zoom : 'fit',
                initCallback : function() {
                    var self = this;

                },
                onZoom : function() {
                    if (!firstZoom) return;

                    $("#iviewer .loader").fadeOut();
                    $("#iviewer .viewer").fadeIn();
                    firstZoom = true;
                }
            }
        );

        $("#iviewer .zoomin").click(function(e) {
            e.preventDefault();
            viewer.iviewer('zoom_by', 1);
        });

        $("#iviewer .zoomout").click(function(e) {
            e.preventDefault();
            viewer.iviewer('zoom_by', -1);
        });
    }

    function close() {
        $("#iviewer").fadeOut().trigger('fadeout');
    }

    $('#go').click(function(e) {
        e.preventDefault();
        var src = $(this).attr('href');
        open(src);
    });

    $("#iviewer .close").click(function(e) {
        e.preventDefault();
        close();
    });

    $("#iviewer").bind('fadein', function() {
        $(window).keydown(function(e) {
            if (e.which == 27) close();
        });
    });
})(jQuery);
