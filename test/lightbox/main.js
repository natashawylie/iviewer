(function($) {
    function open(src) {
        var firstZoom = true;

        $("#iviewer").fadeIn().trigger('fadein');

        $("#iviewer .viewer").
            width($(window).width() - 80).
            height($(window).height()).
            iviewer({
                src : src,
                ui_disabled : true,
                zoom : 'fit',
                initCallback : function() {
                    var self = this;

                    $("#iviewer .zoomin").click(function(e) {
                        e.preventDefault();
                        self.zoom_by(1);
                    });

                    $("#iviewer .zoomout").click(function(e) {
                        e.preventDefault();
                        self.zoom_by(-1);
                    });
                },
                onZoom : function() {
                    if (!firstZoom) return;

                    $("#iviewer .loader").fadeOut();
                    $("#iviewer .viewer").fadeIn();
                    firstZoom = true;
                }
            }
        );
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