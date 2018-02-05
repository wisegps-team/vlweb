/**
 * Created with JetBrains WebStorm.
 * User: 1
 * Date: 13-8-26
 * Time: 下午11:33
 * To change this template use File | Settings | File Templates.
 */

// 修改报警
var _dealAlert = function (objectId, callback) {
    var query_json = {
        objectId: objectId
    };
    var update_json = {
        status: 1
    };
    wistorm_api._update('_iotAlert', query_json, update_json, auth_code, true, function(json){
        if (json.status_code === 0) {
            return callback();
        } else {
            return callback(i18next.t("alert.clear_alert_fail"));
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

$(document).ready(function () {
    $("#alert").hide();

    windowResize();

    var alertId = setInterval(function(){
        if(!i18nextLoaded){
            return;
        }
        // 创建报警表格
        var fields = [
            {
                title: 'ID',
                width: '30px',
                name: 'objectId',
                className: 'center',
                display: 'CheckBox'
            },
            {
                title: i18next.t("vehicle.name"),
                width: '100px',
                name: 'vehicleName',
                className: 'center',
                display: 'TextBox'
            },
            {
                title: i18next.t("device.id"),
                width: '140px',
                name: 'did',
                className: 'center',
                display: 'TextBox'
            },
            {
                title: i18next.t("alert.alert_type"),
                width: '180px',
                name: 'alertType',
                className: 'center',
                display: 'UserDefined',
                render: function (obj) {
                    return obj.aData ? IOT_ALERT_DESC[obj.aData.alertType.toString()]: IOT_ALERT_DESC[obj.aData.alertType.toString()]
                }
            },
            {
                title: i18next.t("alert.alert_time"),
                width: '140px',
                name: 'createdAt',
                className: 'center',
                display: 'UserDefined',
                render: function (obj) {
                    var createdAt = obj.aData? new Date(obj.aData.createdAt): new Date(obj.createdAt);
                    createdAt = createdAt.format('yyyy-MM-dd hh:mm:ss');
                    return createdAt;
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
            show: true,
            edit: false,
            delete: false
        };
        var uButtons = [
            {
                title: i18next.t("table.deal"),
                className: 'icon-check'
            }
        ];
        var div = $('#list');
        var uid = $.cookie("dealer_id");
        var query = {
            'uid': uid,
            'status': 0
        };

        var t = new _dataTable(div, '_iotAlert', fields, query, '-createdAt', $('#alertKey'), 'did', buttons, uButtons);
        t.createHeader();
        t.sFields += ',lat';
        t.query(null, function(){
            updateLoc();
        });

        $("#checkAll").click(function () {
            $("[type='checkbox']").prop("checked", $('#checkAll').prop("checked"));
        });

        $("#dealChecked").click(function () {
            var obj = $("[type='checkbox']:checked:not(#checkAll)");
            var Ids = [];
            for (var i = 0; i < obj.length; i++) {
                Ids.push($(obj[i]).val());
            }
            if (CloseConfirm(i18next.t("alert.confirm_deal"))) {
                _dealAlert(Ids.join('|'), function(err){
                    if(err){
                        _alert(err, 3);
                        return;
                    }
                    t.query(null, function(){
                        updateLoc();
                    });
                    if(getAlertCount){
                        getAlertCount();
                    }
                });
            }
        });

        $(document).on("click", "#list .icon-check", function () {
            var objectId = $(this).attr("objectId");
            if (CloseConfirm(i18next.t("alert.confirm_deal"))) {
                _dealAlert(objectId, function(err){
                    if(err){
                        _alert(err, 3);
                        return;
                    }
                    t.query(null, function(){
                        updateLoc();
                    });
                    if(getAlertCount){
                        getAlertCount();
                    }
                });
            }
        });

        $('#alertKey').keydown(function(e){
            var curKey = e.which;
            var searchType = $('#searchType').val();
            if(curKey == 13){
                var query = {
                    uid: uid,
                    alertUndeal: true
                };
                query[searchType] = '^' + $('#alertKey').val();
                t.query(query, function(){
                    updateLoc();
                });
                return false;
            }
        });

        clearInterval(alertId);
    }, 100);
});


