/**
 * Created with JetBrains WebStorm.
 * User: 1
 * Date: 13-8-26
 * Time: 下午11:33
 * To change this template use File | Settings | File Templates.
 */

var auth_code = $.cookie('auth_code');
var tabType = 1;
var _edit_cust_name = "";

// 初始化账号信息窗体
var initFrmAccount = function (title) {
    $("#divAccount").dialog("option", "title", title);
    $('#account_old_password').val("");
    $('#account_password').val("");
    $('#account_password2').val("");
};

// 修改密码
var AccountEdit = function () {
    var auth_code = $.cookie('auth_code');
    var username = $.cookie('username');    //用户名
    var old_password = $('#account_old_password').val();  //旧密码
    var new_password = $('#account_password').val();  //旧密码

    // var sendUrl = $.cookie('Host') + "dealer/user/password?auth_code=" + auth_code;
    // var sendData = {
    //     user_name: username,
    //     old_password: hex_md5(old_password),
    //     new_password: hex_md5(new_password),
    //     dealer_type: parseInt($.cookie("dealer_type"))
    // };
    // var sendObj = { type:"PUT", url:sendUrl, data:sendData, success:function (json) {
    //     AccountEditSuccess(json);
    // }, error:OnError };
    // ajax_function(sendObj);
    var query_json = {
        username: username,
        password: hex_md5(old_password)
    };

    var update_json = {
        password: hex_md5(new_password)
    };

    wistorm_api.update(query_json, update_json, auth_code, AccountEditSuccess);
};

var AccountEditSuccess = function (json) {
    if (json.status_code === 0) {
        _ok(i18next.t("account.modify_success"));
        $("#divAccount").dialog("close");
    } else {
        _alert(i18next.t("account.modify_fail"));
    }
};

// 退出事件
var exit_success = function exit_success(json) {
    $.cookie("mapType", "");
    $.cookie("msgcount", "");
    $.cookie('Login', null);
    location.href = "/";
};

// 获取报警统计
var undealAlert = function (uid, callback) {
    // 获取uid名下所有设备
    var query = {
        uid: uid.toString(),
        status: 0
    };
    wistorm_api._count('_iotAlert', query, auth_code, true, function (obj) {
        var count = obj.status_code === 0 ? obj.count : 0;
        callback(count);
    });
};

var alertBadge = document.getElementById('alertBadge');
var warnVoice = document.getElementById('warnVoice');
var voice = document.getElementById('voice');
var countChange = sessionStorage.getItem('countChange');
var is_firstVoice = sessionStorage.getItem('is_firstVoice') == 'false' ? false : true;
var is_voice = sessionStorage.getItem('is_voice') == 'false' ? false : true;

var getAlertCount = function () {
    // debugger;
    var dealerId = $.cookie('dealer_id');
    undealAlert(dealerId, function (count) {
        console.log('alert count: ' + count);
        alertBadge.innerHTML = count > 9 ? '..' : count;
        alertBadge.style.display = count > 0 ? 'block' : 'none';
        if (is_voice) {
            if (is_firstVoice && count) {
                addEmbed();
                countChange = count;
                is_firstVoice = false;
                sessionStorage.setItem('is_firstVoice', is_firstVoice)
            } else if (countChange && countChange != count) {
                addEmbed();
                countChange = count;
            }
        } else {
            changeVoice(true)
        }
        sessionStorage.setItem('countChange', countChange)
    });
};



voice.addEventListener('click', () => changeVoice(false))

function changeVoice(other_change) {
    var classIcon = $('#voice').attr('class');
    if (other_change) {
        classIcon = 'icon iconfont icon-voiceoff'
    } else {
        if (classIcon.indexOf('icon-voiceoff') > -1) {
            classIcon = classIcon.replace('icon-voiceoff', 'icon-voiceon');
            is_voice = true;
            getAlertCount();

        } else {
            classIcon = classIcon.replace('icon-voiceon', 'icon-voiceoff');
            $('#warnVoice').html('');
            is_voice = false;
        }
    }
    sessionStorage.setItem('is_voice', is_voice)
    $('#voice').attr('class', classIcon);
}

function addEmbed() {
    $('#warnVoice').html('');
    var surl = 'http://web.wisegps.cn/images/ALARM3.WAV';
    $("#warnVoice").html("<embed src='" + surl + "' autostart=true loop=false height=0px width=0px>")
}



function _accountGetCustomer() {
    var cust_id = $.cookie('dealer_id');
    var query_json = {
        uid: cust_id
    };
    wistorm_api._get('customer', query_json, 'name,contact,tel,treePath,other', auth_code, true, function (json) {
        if (json.status_code === 0 && json.data) {
            _edit_cust_name = json.data.name;
            $('#_cust_name').val(json.data.name);
            $('#_contacter').val(json.data.contact);
            $('#_contacter_tel').val(json.data.tel);
            $('#current_month_fee').val(json.data.other.monthFee || 0);
            $('#current_year_fee').val(json.data.other.yearFee || 0);
            var treePath = json.data.treePath;
            var trees = treePath.split(",");
            trees = trees.filter(function (value) {
                return value !== "";
            });
            var query_json = {
                uid: trees.join("|")
            };
            var parent_month_fee = 0;
            var parent_year_fee = 0;
            wistorm_api._list('customer', query_json, 'uid,other', 'uid', 'uid', 0, 0, 1, -1, auth_code, true, function (custs) {
                if (custs.status_code === 0 && custs.total > 0) {
                    for (var i = 0; i < custs.total; i++) {
                        if (custs.data[i].uid !== cust_id) {
                            parent_month_fee += parseFloat(custs.data[i].other.monthFee || 0);
                            parent_year_fee += parseFloat(custs.data[i].other.yearFee || 0);
                        }
                    }
                    $('#parent_month_fee').html(parent_month_fee.toFixed(2));
                    $('#parent_year_fee').html(parent_year_fee.toFixed(2));
                }
            });
        }
    });
}

// 编辑客户
var _accountUpdateCustomer = function () {
    var auth_code = $.cookie('auth_code');
    var cust_id = $.cookie('dealer_id');
    var cust_name = $('#_cust_name').val(); //用户名称，只有当用户类型为集团用户时有效，需判断用户名是否存在
    var contacter = $('#_contacter').val(); //姓名
    var contacter_tel = $('#_contacter_tel').val();  //手机号码
    var month_fee = parseFloat($("#current_month_fee").val());
    var year_fee = parseFloat($("#current_year_fee").val());

    var query_json = {
        uid: cust_id
    };
    var update_json = {
        name: cust_name,
        contact: contacter,
        tel: contacter_tel,
        'other.monthFee': month_fee,
        'other.yearFee': year_fee
    };
    wistorm_api._update('customer', query_json, update_json, auth_code, true, function (json) {
        if (json.status_code == 0) {
            $("#divAccount").dialog("close");
        } else {
            _alert(i18next.t("customer.msg_edit_fail"));
        }
    });
};

var setValidator = function (tabType) {
    switch (tabType) {
        case 1:
            validator_account = $('#frmAccount').validate(
                {
                    rules: {
                        _cust_name: {
                            minlength: 2,
                            required: true,
                            remote: {
                                url: "/exists", //后台处理程序
                                type: "get", //数据发送方式
                                dataType: "json", //接受数据格式
                                data: {
                                    auth_code: function () {
                                        return $.cookie('auth_code');
                                    },
                                    query_type: function () {
                                        return 5;
                                    },
                                    old_value: function () {
                                        return _edit_cust_name;
                                    },
                                    value: function () {
                                        return $('#cust_name').val();
                                    }
                                }
                            }
                        }
                    },
                    messages: {
                        cust_name: { minlength: i18next.t("customer.cust_name_minlength"), required: i18next.t("customer.cust_name_required"), remote: i18next.t("customer.cust_name_remote") }
                    },
                    highlight: function (element) {
                        $(element).closest('.control-group').removeClass('success').addClass('error');
                    },
                    success: function (element) {
                        element
                            .text('OK!').addClass('valid')
                            .closest('.control-group').removeClass('error').addClass('success');
                        //alert('success');
                    }
                });
            break;
        case 2:
            validator_account = $('#frmAccount').validate(
                {
                    rules: {
                        account_old_password: {
                            minlength: 6,
                            required: true
                        },
                        account_password: {
                            minlength: 6,
                            required: true
                        },
                        account_password2: {
                            minlength: 6,
                            required: true,
                            equalTo: "#account_password"
                        }
                    },
                    messages: {
                        account_old_password: { minlength: i18next.t("acount.old_password_minlength"), required: i18next.t("acount.old_password_required") },
                        account_password: { minlength: i18next.t("acount.new_password_minlength"), required: i18next.t("acount.new_password_required") },
                        account_password2: { required: i18next.t("acount.password2_required"), minlength: i18next.t("acount.password2_minlength"), equalTo: i18next.t("acount.password2_equalTo") }
                    },
                    highlight: function (element) {
                        $(element).closest('.control-group').removeClass('success').addClass('error');
                    },
                    success: function (element) {
                        element
                            .text('OK!').addClass('valid')
                            .closest('.control-group').removeClass('error').addClass('success');
                        //alert('success');
                    }
                });
            break;
    }
};

$(document).ready(function () {
    var timerAlertCount = function () {
        getAlertCount();
        setTimeout(function () {
            timerAlertCount();
        }, 60000);
    };
    // 获取报警计数
    timerAlertCount();

    //设置dealer_name
    $("#dealer_name").html($.cookie('username'));
    $("#btnExit").click(function () {
        var ExitMsg = i18next.t("system.exit");
        if (CloseConfirm(ExitMsg)) {
            var exitUrl = '/logout';
            var exitObj = { type: "GET", url: exitUrl, data: null, success: exit_success, error: OnError };
            ajax_function(exitObj);
        }
    });

    $("#dealer_name").click(function () {
        initFrmAccount(i18next.t("account.my_account"));
        $("#divAccount").dialog("open");
    });

    $('#acountTab a').click(function (e) {
        tabType = parseInt($(this).attr('value'));
        setValidator(tabType);
        // alert(tabType);
    });

    var accountId = setInterval(function () {
        if (!i18nextLoaded) {
            return;
        }
        var buttons = {};
        buttons[i18next.t("system.save")] = function () {
            $('#frmAccount').submit();
        };
        buttons[i18next.t("system.cancel")] = function () {
            validator_account.resetForm();
            $(this).dialog("close");
        };
        // Dialog Simple
        $('#divAccount').dialog({
            autoOpen: false,
            width: 480,
            buttons: buttons
        });

        $('#frmAccount').submit(function () {
            if ($('#frmAccount').valid()) {
                switch (tabType) {
                    case 1:
                        _accountUpdateCustomer();
                        break;
                    case 2:
                        AccountEdit();
                        break;
                }
            }
            return false;
        });

        clearInterval(accountId);
        setValidator(1);
        _accountGetCustomer();
    }, 100);
});