/**
 * Created with JetBrains WebStorm.
 * User: 1
 * Date: 13-8-26
 * Time: 下午11:33
 * To change this template use File | Settings | File Templates.
 */

var vehicle_table;
var branch;
var lon = parseFloat($.cookie("lon")) || 113.84714;
var lat = parseFloat($.cookie("lat")) || 22.67805;
var did = $('#did').val();
var drawingManager;
var auth_code = $.cookie('auth_code');
var updateTime = new Date(0);
var names = [];
var vehicles = [];
var map_type = MAP_TYPE_BAIDU;
var map_engine = 'BAIDU';

// 设备查询
function deviceQuery(dids, callback) {
    var startTime = updateTime.format("yyyy-MM-dd hh:mm:ss");
    var endTime = '2100-01-01';
    var query_json = {
        did: dids,
        map: map_engine,
        'activeGpsData.rcvTime': startTime + '@' + endTime
    };
    wistorm_api._get('_iotDevice', query_json, 'did,vehicleName,activeGpsData,params', auth_code, true, function(json){
        if(json.status_code && json.data){
            updateTime = new Date(json.data.activeGpsData.rcvTime);
            updateTime.setSeconds(updateTime.getSeconds() + 1);
        }
        callback(json.data);
    });
}

var getAcc = function(device){
    var acc = device.activeGpsData.status.join(",").indexOf('8196') > -1 ? i18next.t("monitor.acc_on"): i18next.t("monitor.acc_off");
    return acc;
};

var getSpeed = function(device){
    var speed = (device.activeGpsData.speed || 0).toFixed(1) + 'km/h';
    return speed;
};

var getMileage = function(device){
    var mileage = (device.activeGpsData.mileage || 0).toFixed(1) + 'km/h';
    return mileage;
};

var getFlag = function(device){
    var flag = '';
    if(!device.activeGpsData || !getOnLine(device)){
        flag = '2';
    }else if(device.activeGpsData && device.activeGpsData.alerts.length > 0){
        flag = '3';
    }else{
        flag = '1';
    }
    return flag;
};

var getColorFlag = function (device) {
    var flag = '';
    if (!device.activeGpsData || !getOnLine(device)) {
        flag = '_offline';
    } else if (device.activeGpsData && device.activeGpsData.alerts.length > 0) {
        flag = '_alert';
    } else {
        if (device.activeGpsData.status.join(",").indexOf('8196') > -1) {
            flag = '_run';
        }
    }
    return flag;
};

var setColor = function(vehicle){
    var obj = $('#' + vehicle.did);
    var flag = getColorFlag(vehicle);
    obj.parent().parent().removeClass('_run');
    obj.parent().parent().removeClass('_alert');
    obj.parent().parent().removeClass('_offline');
    obj.parent().parent().addClass(flag);
};

var setInfo = function(vehicle){
    var obj = $('#' + vehicle.did);
    // obj.parent().parent().find('td')[2].innerHTML = vehicle.acc;
    // obj.parent().parent().find('td')[3].innerHTML = vehicle.speed;
    obj.parent().parent().find('td')[2].innerHTML = vehicle.status;
    var d = vehicle_table.api().rows(obj.parent().parent()).data()[0];
    d.flag = vehicle.flag;
    // vehicle_table.api().rows(obj.parent().parent()).data(d).draw();
    // vehicle_table.api().row(obj.parent().parent()).remove();
    // vehicle_table.api().row.add(d);
    var idx = vehicle_table.api().row(obj.parent().parent()).index();
    vehicle_table.api().cell(idx, 3).data(vehicle.flag).draw();
    $('#' + vehicle.did).prop("checked", true);
    // vehicle_table.api().row().draw();
};

function windowResize() {
    //高度变化改变(要重新计算_browserheight)
    var windowHeight = $(window).height() - 200;
    $('#map_canvas').css({"height": windowHeight + "px"});
    // 修改车辆列表高度
    var height = $(window).height();
    $('.dataTables_scrollBody').css({"height": height + "px"});
}

var oldGpsTime = 0;

var gpsFlagDesc = ['', '参考', 'GPS', '基站', '北斗'];

var refreshVehicles = function(){
    var gpsFlagDesc =
        ['',
            i18next.t("locate.bad"),
            i18next.t("locate.gps"),
            i18next.t("locate.lbs"),
            i18next.t("locate.bd")
        ];
    deviceQuery(did, function(device) {
        console.log("更新车辆数据。");
        var vehicles = [];
        var vehicle = {
            did: device.did,
            name: device.vehicleName,
            activeGpsData: device.activeGpsData,
            acc: getAcc(device),
            speed: getSpeed(device),
            mileage: getMileage(device),
            direct: getDirectDesc(device.activeGpsData.direct),
            status: getStatusDesc(device, 1),
            params: device.params
        };
        vehicles.push(vehicle);
        var lastGpsTime = new Date(device.activeGpsData.gpsTime);
        if(lastGpsTime > oldGpsTime){
            var gpsTime = new Date(device.activeGpsData.gpsTime).format('MM-dd hh:mm:ss');
            addRow(gpsTime, vehicle.acc, gpsFlagDesc[device.activeGpsData.gpsFlag], vehicle.speed, vehicle.mileage, vehicle.direct, vehicle.status, '', vehicle.activeGpsData.lon, vehicle.activeGpsData.lat);
            wimap.addVehicles(vehicles, true, false, true);
            oldGpsTime = lastGpsTime;
        }
    });
};

var interval = 10;
var intervalId;
var refreshLocation = function(){
    $('#refreshText').html(i18next.t("monitor.refresh_after", {interval: interval}));
    if(interval == 0){
        refreshVehicles();
        interval = 10;
    }else{
        interval--;
    }
    intervalId = setTimeout('refreshLocation()', 1000);
};

var showLocation = function showLocation(thisID, address) {
    thisID.html(address);
};

var addRow = function (gps_time, acc, gpsFlag, speed, mileage, direct, status, location, lon, lat) {
    if(t){
        var lonlat = "<a class='lonUpdate' href='#'>" + lon.toFixed(6) + "," + lat.toFixed(6) + "</a>";
        t.row.add([
            gps_time,
            acc,
            gpsFlag,
            speed,
            mileage,
            direct,
            status,
            lonlat,
            lon.toFixed(6),
            lat.toFixed(6)
        ]).draw(false);

        $(".lonUpdate").each(function (i) {
            if (i === 0) {
                loc = $(this).html().split(",");
                setLocation(i, loc[0], loc[1], $(this), showLocation);
            }
        });
    }
};

var statusSelected;
var collapsed = true;
var t = null;
$(document).ready(function () {
    windowResize();

    map_type = $.cookie('lang') === 'zh' || $.cookie('lang') === 'zh-CN' ? MAP_TYPE_BAIDU : MAP_TYPE_GOOGLE;
    map_engine = $.cookie('lang') === 'zh' || $.cookie('lang') === 'zh-CN' ? 'BAIDU' : 'GOOGLE';

    var tId = setInterval(function(){
        if(!i18nextLoaded){
            return;
        }
        var center_point = { lon:lon, lat:lat };
        wimap = new wiseMap(map_type, document.getElementById('map_canvas'), center_point, 14);

        //高度变化改变(要重新计算_browserheight)
        $(window).resize(function () {
            windowResize();
        });

        var lang = i18next.language || 'en';
        var objTable = {
            "bInfo":true,
            "bLengthChange":false,
            "bProcessing":false,
            "bServerSide":false,
            "bFilter":false,
            "searching": false,//本地搜索
            // "data":json.data,
            "paging": false,
            "scrollY": "180px",
            "order": [[ 0, 'desc' ]],
            // "scrollCollapse": true,
            "sDom":"<'row'r>t<'row'<'pull-right'p>>",
            // "sPaginationType":"bootstrap",
            "oLanguage":{"sUrl":'css/' + lang +'.txt'}
        };

        t = $("#vehicle_list").DataTable(objTable);
        $('#vehicle_list tbody').on('click', 'tr', function () {
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            }
            else {
                t.$('tr.selected').removeClass('selected');
                $(this).addClass('selected');
                var lon = parseFloat($(this).children(0)[8].innerText);
                var lat = parseFloat($(this).children(0)[9].innerText);
//            alert(lon + "," + lat);
                wimap.addStartMarker(lon, lat, $(this).children(0)[0].innerText);
                wimap.setCenter(lon, lat);
            }
        });

        refreshVehicles();
        refreshLocation();

        clearInterval(tId);
    }, 100);
});


