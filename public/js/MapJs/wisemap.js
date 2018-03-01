﻿if ($.cookie('lang') === 'zh' || $.cookie('lang') === 'zh-CN') {
    document.write('<script type="text/javascript" src="http://api.map.baidu.com/getscript?v=2.0&ak=B40b712d90ffc5e40854d259b2e627cd&services=&t=20180201111639"></script>');
    document.write('<script src="js/DrawingManager.js"></script>')
    document.write('<script src="js/MapJs/define.js"></script>');
    document.write('<script src="js/MapJs/bmap.js"></script>');
    // $.getScript("http://api.map.baidu.com/getscript?v=2.0&ak=B40b712d90ffc5e40854d259b2e627cd&services=&t=20180201111639");
    // $.getScript('js/DrawingManager.js');
    // setTimeout(() => $.getScript('js/DrawingManager.js'),500)
    // $.getScript("http://api.map.baidu.com/library/DrawingManager/1.4/src/DrawingManager_min.js");
    // $.getScript("js/MapJs/define.js");
    // $.getScript("js/MapJs/bmap.js");
    // $.ajax({
    //     url: "http://api.map.baidu.com/getscript?v=2.0&ak=B40b712d90ffc5e40854d259b2e627cd&services=&t=20180201111639",
    //     async: false,
    //     dataType: "script",
    //     success: function () {
    //         //ok
    //         // $.getScript('js/DrawingManager.js');
    //         // setTimeout(() => $.getScript('js/DrawingManager.js'),500)
    //         // $.getScript("http://api.map.baidu.com/library/DrawingManager/1.4/src/DrawingManager_min.js");
    //     }
    // });
    // $.getScript('js/DrawingManager.js');
    // $.getScript("js/MapJs/define.js");
    // $.getScript("js/MapJs/bmap.js");
} else {
    document.write('<script type="text/javascript" src="http://ditu.google.cn/maps/api/js?libraries=drawing&key=AIzaSyAPNfIol28jBmFgzU-ubjI_nVE8fIEtdjg"></script>');
    // document.write('<script type="text/javascript" src="js/MapJs/markerwithlabel.js"></script>');
    // document.write('<script type="text/javascript" src="js/MapJs/markerclusterer.js"></script>');
    document.write('<script src="js/MapJs/define.js"></script>');
    document.write('<script src="js/MapJs/gmap.js"></script>');
    // $.getScript("http://ditu.google.cn/maps/api/js?libraries=drawing&key=AIzaSyAPNfIol28jBmFgzU-ubjI_nVE8fIEtdjg");
    // $.getScript("js/MapJs/markerwithlabel.js");
    // $.getScript("js/MapJs/markerclusterer.js");
    // $.getScript("js/MapJs/define.js");
    // $.getScript("js/MapJs/gmap.js");
}

function wiseMap(map_type, div_map, center_point, zoom) {
    var map = null;
    // console(JSON.stringify(BMap))
    // var latLng;
    switch (map_type) {
        case MAP_TYPE_GOOGLE:
            var latLng = new google.maps.LatLng(center_point.lat, center_point.lon);
            map = new gmap(div_map, latLng, zoom);

            break;
        case MAP_TYPE_BAIDU:
            var latLng = new BMap.Point(center_point.lon, center_point.lat);
            // BMap.Point ? latLng = new BMap.Point(center_point.lon, center_point.lat) : setTimeout(() => wiseMap(map_type, div_map, center_point, zoom),500);
            map = new bmap(div_map, latLng, zoom);
            // if (BMap.Point) {
            //     latLng = new BMap.Point(center_point.lon, center_point.lat)
            //     map = new bmap(div_map, latLng, zoom);
            // } else {
            //     setTimeout(() => wiseMap(map_type, div_map, center_point, zoom), 500)
            // }
            break;
    }
    return map;
}

function setLocation(idx, rev_lon, rev_lat, obj, showLocation) {
    if (i18next.language === 'zh' || i18next.language === 'zh-CN') {
        var pt = new BMap.Point(rev_lon, rev_lat);
        var gc = new BMap.Geocoder();
        gc.getLocation(pt, function (rs) {
            var di = 2000;
            var shortpoint = -1;
            for (i = 0; i < rs.surroundingPois.length; i++) {
                var d = calDistance(rs.surroundingPois[i].point.lat, rs.surroundingPois[i].point.lng, rev_lat, rev_lon) * 1000;
                if (d < di) {
                    shortpoint = i;
                    di = d;
                }
            }
            var getAddAddress = rs.addressComponents.city + rs.addressComponents.district + rs.addressComponents.street + rs.addressComponents.streetNumber;
            if (shortpoint >= 0) {
                getAddAddress += '，离' + rs.surroundingPois[shortpoint].title + di.toFixed(0) + '米';
            }

            if (showLocation) {
                showLocation(obj, getAddAddress);
            }
        }, { "poiRadius": "500", "numPois": "10" });
    } else {
        var latLng = new google.maps.LatLng(rev_lat, rev_lon);
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'latLng': latLng }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                if (results[1]) {
                    if (this.showLocation) {
                        this.showLocation(obj, results[0].formatted_address);
                    }
                }
            } else {
                //alert("Geocoder failed due to: " + status);
            }
        });
    }
}