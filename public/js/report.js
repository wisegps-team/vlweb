/**
 * Created with JetBrains WebStorm.
 * User: 1
 * Date: 13-8-26
 * Time: 下午11:33
 * To change this template use File | Settings | File Templates.
 */

var today = new Date();
var yesterday = new Date();
yesterday.setDate(yesterday.getDate()-1);

// 修改预约
var _dealAlert = function (objectId, callback) {
    var query_json = {
        objectId: objectId
    };
    var update_json = {
        alertUndeal: false
    };
    wistorm_api._update('_iotDevice', query_json, update_json, auth_code, true, function(json){
        if (json.status_code == 0) {
            return callback();
        } else {
            return callback("清除报警失败，请稍后再试");
        }
    });
};

var showLocation = function showLocation(thisID, address) {
    thisID.html(address);
};
var updateLoc = function(){
    setTimeout(function(){
        $(".locUpdate").each(function (i) {
            console.log(i + ',' + this);
            if (i != 0) {
                var loc = $(this).html().split(",");
                var lon = parseFloat(loc[0]);
                var lat = parseFloat(loc[1].trim());
                setLocation(i, lon, lat, $(this), showLocation);
            }
        });
    }, 100);
};

function windowResize() {
    //高度变化改变(要重新计算_browserheight)
    windowHeight = $(window).height() - 215;
    // 如果宽度小于390，则设置表格为简易显示模式，并且客户列表高度改为300px
    windowWidth = $(window).width();
}

var _report;

var makeReport = function(type, uid, vid){
    switch (type) {
        case 1: //日统计表
            // 创建日统计表表格
            var fields = [
                {
                    title: i18next.t("vehicle.name"),
                    width: '100px',
                    name: 'vehicleName',
                    className: 'center',
                    display: 'TextBox'
                },
                {
                    title: i18next.t("monitor.date"),
                    width: '100px',
                    name: 'day',
                    className: 'center',
                    display: 'TextBox'
                },
                {
                    title: i18next.t("report.day_duration"),
                    width: '100px',
                    name: 'distance',
                    className: 'center',
                    display: 'TextBox'
                },
                {
                    title: i18next.t("alert.virbrate"),
                    width: '100px',
                    name: 'alert1',
                    className: 'center',
                    display: 'TextBox'
                },
                {
                    title: i18next.t("alert.overspeed"),
                    width: '100px',
                    name: 'alert2',
                    className: 'center',
                    display: 'TextBox'
                },
                {
                    title: i18next.t("alert.geo"),
                    width: '100px',
                    name: 'alert3',
                    className: 'center',
                    display: 'TextBox'
                },
                {
                    title: i18next.t("alert.lowpower"),
                    width: '100px',
                    name: 'alert4',
                    className: 'center',
                    display: 'TextBox'
                },
                {
                    title: i18next.t("alert.cutpower"),
                    width: '100px',
                    name: 'alert5',
                    className: 'center',
                    display: 'TextBox'
                }
            ];
            var buttons = {
                show: false //是否显示列表按钮
            };
            var uButtons = [];
            var div = $('#list');
            var query = {
                uid: uid,
                vehicleName: '<>null'
            };

            if(vid && vid > 0){
                query = {
                    vehicleId: vid
                }
            }

            _report = new _dataTable(div, '_iotDevice', fields, query, 'vehicleName', $('#vehicleKey'), 'vehicleName', buttons, uButtons);
            _report.createHeader();
            _report.sFields = 'did,vehicleName'; //重新设置初始查询返回字段
            _report.query(query, function (json) {
                // 对数据进行后置处理
            }, function (json, callback) {
                var dids = '';
                for (var i = 0; i < json.data.length; i++) {
                    dids += json.data[i].did + '|';
                }
                var startTime = $('#startTime').val();
                var endTime = $('#endTime').val();
                var query = {
                    did: dids,
                    day: startTime + '@' + endTime
                };
                var auth_code = $.cookie('auth_code');
                wistorm_api._list('_iotStat', query, 'did,day,distance,alertTotal', '-did', 'did', 0, 0, 0, -1, auth_code, true, function (stat) {
                    var _stat = {};
                    if (stat && stat.data.length > 0) {
                        for (var i = 0; i < stat.data.length; i++) {
                            _stat[stat.data[i].did] = stat.data[i];
                        }
                    }
                    for (var j = 0; j < json.data.length; j++) {
                        var s = _stat[json.data[j].did];
                        if (s) {
                            json.data[j].day = new Date(s.day).format('yyyy-MM-dd');
                            json.data[j].vehicleName = json.data[j].vehicleName || json.data[j].did;
                            json.data[j].distance = s.distance;
                            json.data[j].alert1 = s.alertTotal ? s.alertTotal[IOT_ALERT.ALERT_VIRBRATE.toString()] || 0 : 0;
                            json.data[j].alert2 = s.alertTotal ? s.alertTotal[IOT_ALERT.ALERT_OVERSPEED.toString()] || 0: 0;
                            json.data[j].alert3 = s.alertTotal ? (s.alertTotal[IOT_ALERT.ALERT_ENTERGEO.toString()] || 0 + s.alertTotal[IOT_ALERT.ALERT_EXITGEO.toString()] || 0) : 0;
                            json.data[j].alert4 = s.alertTotal ? s.alertTotal[IOT_ALERT.ALERT_LOWPOWER.toString()] || 0: 0;
                            json.data[j].alert5 = s.alertTotal ? s.alertTotal[IOT_ALERT.ALERT_CUTPOWER.toString()] || 0: 0;
                        } else {
                            json.data[j].day = yesterday.format('yyyy-MM-dd');
                            json.data[j].vehicleName = json.data[j].vehicleName || json.data[j].did;
                            json.data[j].distance = 0;
                            json.data[j].alert1 = 0;
                            json.data[j].alert2 = 0;
                            json.data[j].alert3 = 0;
                            json.data[j].alert4 = 0;
                            json.data[j].alert5 = 0;
                        }
                    }
                    callback(json);
                });
            });
            break;
        case 2: //报警详情
            var fields = [
                {
                    title: i18next.t("alert.alert_type"),
                    width: '100px',
                    name: 'alertType',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return IOT_ALERT_DESC[data.alertType.toString()];
                    }
                },
                {
                    title: i18next.t("alert.alert_time"),
                    width: '160px',
                    name: 'createdAt',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return new Date(data.createdAt).format('yyyy-MM-dd hh:mm:ss');
                    }
                },
                {
                    title: i18next.t("monitor.speed"),
                    width: '100px',
                    name: 'speed',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return data.speed.toFixed(1) + ' km/h';
                    }
                },
                {
                    title: i18next.t("monitor.location"),
                    width: '',
                    name: 'lon',
                    className: 'locUpdate',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return data.lon.toFixed(6) + ', ' + data.lat.toFixed(6);
                    }
                }
            ];
            var alertType = $('#alertType').val();
            if(alertType === '12295|12296'){
                fields = [
                    {
                        title: i18next.t("alert.alert_type"),
                        width: '100px',
                        name: 'alertType',
                        className: 'center',
                        display: 'UserDefined',
                        render: function (obj) {
                            var data = obj.aData? obj.aData: obj;
                            return IOT_ALERT_DESC[data.alertType.toString()];
                        }
                    },
                    {
                        title: i18next.t("report.alert_time"),
                        width: '160px',
                        name: 'createdAt',
                        className: 'center',
                        display: 'UserDefined',
                        render: function (obj) {
                            var data = obj.aData? obj.aData: obj;
                            return new Date(data.createdAt).format('yyyy-MM-dd hh:mm:ss');
                        }
                    },
                    {
                        title: i18next.t("report.geo_name"),
                        width: '200px',
                        name: 'targetName',
                        className: 'center',
                        display: 'UserDefined',
                        render: function (obj) {
                            var data = obj.aData ? obj.aData : obj;
                            return data.targetName || '';
                        }
                    },
                    {
                        title: i18next.t("monitor.location"),
                        width: '',
                        name: 'location',
                        className: 'locUpdate',
                        display: 'UserDefined',
                        render: function (obj) {
                            var data = obj.aData? obj.aData: obj;
                            return data.lon.toFixed(6) + ', ' + data.lat.toFixed(6);
                        }
                    }
                ];
            }
            var buttons = {
                show: false //是否显示列表按钮
            };
            var uButtons = [];
            var div = $('#list');
            var startTime = $('#startTime').val();
            var endTime = $('#endTime').val();
            var query = {
                did: _did,
                createdAt: startTime + '@' + endTime,
                map: 'BAIDU'
            };
            if(alertType != ''){
                query.alertType = alertType;
            }

            _report = new _dataTable(div, '_iotAlert', fields, query, '-createdAt', $('#vehicleKey'), 'createdAt', buttons, uButtons);
            _report.createHeader();
            var alertDisplay = 'enum' + JSON.stringify(IOT_ALERT_DESC);
            var speedFunction = function(){
                return parseFloat(v).toFixed(1) + ' km/h';
            };
            if(alertType === '12295|12296') {
                _report.sFields = 'alertType,createdAt,targetName,location,lon,lat,did'; //重新设置初始查询返回字段
                _report.setExportFields('alertType,createdAt,targetName,location,lon,lat,did');
                _report.setExportDisplays(alertDisplay + '#d#f2#s#s');
            }else{
                _report.sFields = 'alertType,createdAt,speed,location,lon,lat,did'; //重新设置初始查询返回字段
                _report.setExportFields('alertType,createdAt,speed,location,lon,lat,did');
                _report.setExportDisplays(alertDisplay + '#d#' + speedFunction.toString() +'#s');
            }
            if(_did === '')return;
            _report.query(query, function (json) {
                // 对数据进行后置处理
                updateLoc();
            });
            break;
        case 4: //轨迹报表
            var fields = [
                {
                    title: i18next.t("monitor.gps_time"),
                    width: '100px',
                    name: 'gpsTime',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return new Date(data.gpsTime).format('MM-dd hh:mm:ss');
                    }
                },
                {
                    title: i18next.t("monitor.rcv_time"),
                    width: '100px',
                    name: 'rcvTime',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return new Date(data.rcvTime).format('MM-dd hh:mm:ss');
                    }
                },
                {
                    title: i18next.t("monitor.lon"),
                    width: '80px',
                    name: 'lon',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return data.lon.toFixed(6)
                    }
                },
                {
                    title: i18next.t("monitor.lat"),
                    width: '80px',
                    name: 'lat',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return data.lat.toFixed(6);
                    }
                },
                {
                    title: i18next.t("monitor.location"),
                    width: '',
                    name: 'location',
                    className: 'locUpdate',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return data.lon.toFixed(6) + ', ' + data.lat.toFixed(6);
                    }
                },
                {
                    title: i18next.t("monitor.mileage"),
                    width: '70px',
                    name: 'mileage',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return data.mileage.toFixed(1) + ' km';
                    }
                },
                {
                    title: i18next.t("monitor.speed"),
                    width: '70px',
                    name: 'speed',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return data.speed.toFixed(1) + ' km/h';
                    }
                },
                {
                    title: i18next.t("monitor.direct"),
                    width: '60px',
                    name: 'direct',
                    className: 'center',
                    display: 'TextBox'
                },
                {
                    title: i18next.t("monitor.status"),
                    width: '80px',
                    name: 'status',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return _getStatusDesc(data);
                    }
                }
            ];

            var buttons = {
                show: false //是否显示列表按钮
            };
            var uButtons = [];
            var div = $('#list');
            var startTime = $('#startTime').val();
            var endTime = $('#endTime').val();
            var query = {
                did: _did,
                gpsTime: startTime + '@' + endTime,
                map: 'BAIDU'
            };

            _report = new _dataTable(div, '_iotGpsData', fields, query, 'gpsTime', $('#vehicleKey'), 'gpsTime', buttons, uButtons);
            _report.createHeader();
            var speedFunction = function(){
                return parseFloat(v).toFixed(1) + ' km/h';
            };
            var mileageFunction = function(){
                return parseFloat(v).toFixed(1) + ' km';
            };
            _report.sFields = 'gpsTime,rcvTime,lon,lat,location,mileage,speed,direct,status,alerts'; //重新设置初始查询返回字段
            _report.setExportFields('gpsTime,rcvTime,lon,lat,location,mileage,speed,direct,status,alerts');
            _report.setExportDisplays('d#d#f6#f6#s#' + mileageFunction.toString() + '#' + speedFunction.toString() + '#s#s');
            if(_did === '')return;
            _report.query(query, function (json) {
                // 对数据进行后置处理
                updateLoc();
            });
            break;
        case 3: //打卡详情
            // 创建日统计表表格
            var fields = [
                {
                    title: i18next.t("report.driver_name"),
                    width: '100px',
                    name: 'driverName',
                    className: 'center',
                    display: 'TextBox'
                },
                {
                    title: i18next.t("report.card_no"),
                    width: '120px',
                    name: 'cardNo',
                    className: 'center',
                    display: 'TextBox'
                },
                {
                    title: i18next.t("report.action_type"),
                    width: '100px',
                    name: 'type',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return data.type === 1 ? i18next.t("report.login"): i18next.t("report.logout");
                    }
                },
                {
                    title: i18next.t("report.tag_time"),
                    width: '160px',
                    name: 'createdAt',
                    className: 'center',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return new Date(data.createdAt).format('yyyy-MM-dd hh:mm:ss');
                    }
                },
                {
                    title: i18next.t("monitor.location"),
                    width: '',
                    name: 'lon',
                    className: 'locUpdate',
                    display: 'UserDefined',
                    render: function (obj) {
                        var data = obj.aData? obj.aData: obj;
                        return data.lon.toFixed(6) + ', ' + data.lat.toFixed(6);
                    }
                }
            ];
            var buttons = {
                show: false //是否显示列表按钮
            };
            var uButtons = [];
            var div = $('#list');
            var startTime = $('#startTime').val();
            var endTime = $('#endTime').val();
            var query = {
                did: _did,
                createdAt: startTime + '@' + endTime,
                map: 'BAIDU'
            };

            _report = new _dataTable(div, '_iotTag', fields, query, '-createdAt', $('#vehicleKey'), 'cardNo', buttons, uButtons);
            _report.createHeader();
            _report.sFields = 'did,type,cardNo,vehicleName,driverName,lon,lat,createdAt'; //重新设置初始查询返回字段
            if(_did == '')return;
            _report.query(query, function (json) {
                // 对数据进行后置处理
                updateLoc();
            });
            break;
        default:
            break;
    }
};

var reportType = 1;
var activeReportType = null;
var _uid = $.cookie("dealer_id");
var _vid = null;
var _did = '';

$(document).ready(function () {
    $("#alert").hide();

    var rpId = setInterval(function () {
       if(!i18nextLoaded){
           return;
       }

        activeReportType = $("#1")[0];
        $(document).on("click", ".reportType", function () {
            if(activeReportType){
                activeReportType.classList.remove("active");
            }
            $(this)[0].classList.add("active");
            activeReportType = $(this)[0];
            reportType = parseInt($(this).attr("id"));
            $('#alertPanel').css('display', reportType == 2 ? 'block': 'none');
            makeReport(reportType, _uid, _vid);
        });

        $('#alertType').change(function(e){
            makeReport(reportType, _uid, _vid);
        });

        $('#query').click(function(e){
            makeReport(reportType, _uid, _vid);
        });

        $('#export').click(function(e){
            showLoading(true, i18next.t("report.exporting"), ICON_LOADING);
            location.href = _report.exportUrl;
            showLoading(false);
        });

        // 初始化日期框
        $('.startTime').datetimepicker({
            language:  $.cookie("lang"),
            weekStart: 1,
            todayBtn:  1,
            autoclose: 1,
            todayHighlight: 1,
            startView: 2,
            forceParse: 0,
            showMeridian: 1
        });
        $('#startTime').val(today.format('yyyy-MM-dd 00:00:00'));
        $('.endTime').datetimepicker({
            language:  $.cookie("lang"),
            weekStart: 1,
            todayBtn:  1,
            autoclose: 1,
            todayHighlight: 1,
            startView: 2,
            forceParse: 0,
            showMeridian: 1
        });
        $('#endTime').val(today.format('yyyy-MM-dd 23:59:59'));

        // 初始化车辆选择框
        var ts = new vehicleSelector($('#vehicle'), function(vid, did, name){
            makeReport(reportType, 0, vid);
            _vid = vid;
            _did = did;
        });
        ts.init();

        // 初始化用户选择框
        var cs = new customerSelector($('#customer'), function(uid, name){
            ts.getData(uid, name);
            makeReport(reportType, uid);
            _uid = uid;
        });
        cs.init();

        // 初始加载本级用户所有车辆数据
        makeReport(reportType, _uid);

       clearInterval(rpId);
    }, 100);
});

function _tableResize() {
    // 修改车辆列表高度
    var height = $(window).height() - 200;
    $('.dataTables_wrapper').css({"height": height + "px"});
}


