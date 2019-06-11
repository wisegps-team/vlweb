/*
 * GET home page.
 */

var WiStormAPI = require('../lib/rest-cli/wistorm');
var define = require('../lib/rest-cli/define');
var url = require('url');
var util = require('../lib/rest-cli/util');
const crypto = require('crypto')
const fs = require('fs');
var path = require('path');
var https = require('https')
var http = require('http')

var Wechat = require('wechat-jssdk');
var FileStore = Wechat.FileStore;
var DOMAIN = 'http://u.wisegps.cn';
var WXBizDataCrypt = require('./WXBizDataCrypt') //获取微信信息


var wechatConfig = {
    //=====a service account test=====
    domain: DOMAIN,
    wechatToken: "",
    // appId: "wx789e9656ed870ea9",
    // appSecret: "fe86fe7f1d950274345dc0c500b63652",
    appId: "wxa5c196f7ec4b5df9",
    appSecret: "e89542d7376fc479aac35706305fc23f",
    wechatRedirectUrl: `${DOMAIN}/oauth`,
    // store: new MongoStore({limit: 5}),
    store: new FileStore({ interval: 1000 * 60 * 3 }),
    card: true,
    payment: true,
    merchantId: '1340675801',
    paymentSandBox: false, //dev env
    paymentKey: 'e10adc3949ba59abbe56e057f20f883e',
    // paymentSandBoxKey: '',
    paymentCertificatePfx: fs.readFileSync(path.join(process.cwd(), 'cert/apiclient_cert.p12')),
    paymentNotifyUrl: `${DOMAIN}/api/wechat/payment/`,
};

const wx = new Wechat(wechatConfig);


var dev_key = "59346d400236ab95e95193f35f3df6a4";
var app_key = "96a3e23a32d4b81894061fdd29e94319";
var app_secret = "565975d7d7d01462245984408739804d";
var access_token = '';

var wistorm_api = new WiStormAPI(app_key, app_secret, 'json', '2.0', 'md5', dev_key);

var checkValid = function (req) {
    var obj = url.parse(req.originalUrl);
    var page = obj.pathname || req.originalUrl;
    console.log('session: ' + req.session.opt);
    return req.session.uid && req.session.validPages && req.session.validPages[page];
};

exports.getSignature = function (req, res) {
    console.log(req.query);
    wx.jssdk.getSignature(req.query.url).then(
        data => {
            console.log('OK', data);
            res.json(data);
        },
        reason => {
            console.error(reason);
            res.json(reason);
        }
    );
};

exports.login = function (req, res) {
    // console.log(req.headers['user-agent'])
    // console.log(req.headers['accept-language'])
    // var langs = req.languages;
    // console.log("langs = " + lang);
    var lang;
    if (req.query.lang) {
        lang = req.language
    } else {
        if (req.headers['accept-language'].indexOf('zh-CN') > -1) {
            lang = 'zh-CN'
        } else if (req.headers['accept-language'].indexOf('en-US') > -1) {
            lang = 'en'
        } else {
            lang = req.language || 'zh-CN';
        }
        res.redirect('/?lang=' + lang);
    }

    console.log("lang = " + lang);
    // wistorm_api.getToken('13316560478', 'e10adc3949ba59abbe56e057f20f883e', 1, function (obj) {
    wistorm_api.getToken('13316560478', 'e10adc3949ba59abbe56e057f20f883e', 1, function (obj) {
        function getApp(obj) {
            access_token = obj.access_token;
            var obj = req.headers.host.split(':');
            console.log(obj);
            var query_json = {
                domainName: obj[0]
            };
            // var query_json = {
            //     domainName: 'admin.njruis.com'
            // };
            wistorm_api._get('app', query_json, 'objectId,devId,appKey,appSecret,nameLocale,copyrightLocale,version,logoLocale,mobileResource', access_token, false, function (obj) {
                if (obj.status_code == 0 && obj.data != null) {
                    var opt = {};
                    opt.app_key = obj.data.appKey;
                    opt.app_secret = obj.data.appSecret;
                    opt.title = obj.data.nameLocale[lang];
                    if (obj.data.logoLocale) {
                        opt.logo = obj.data.logoLocale[lang];
                    }
                    if (obj.data.copyrightLocale) {
                        opt.copyright = obj.data.copyrightLocale[lang];
                    }
                    if (obj.data.version && obj.data.version != '') {
                        opt.version = obj.data.version;
                    }
                    if (obj.data.mobileResource) {
                        opt.mobileResource = obj.data.mobileResource;
                    }
                    query_json = {
                        objectId: obj.data.devId
                    };
                    wistorm_api._get('developer', query_json, 'devKey', access_token, false, function (dev) {
                        if (dev.status_code == 0 && dev.data) {
                            opt.dev_key = dev.data.devKey;
                        }
                        req.session.lang = lang;
                        opt.lang = lang;
                        req.session.opt = opt;
                        res.render('login', { opt: opt });
                    });
                } else {
                    var opt = {
                        title: 'Vehicle Online Admin System',
                        copyright: 'Copyright © 2014-2017 GPS Inc. ',
                        version: 'V1.0 (build20170607)',
                        logo: 'http://img.chease.cn/default_logo_en.png',
                        app_key: "96a3e23a32d4b81894061fdd29e94319",
                        app_secret: "565975d7d7d01462245984408739804d",
                        dev_key: "59346d400236ab95e95193f35f3df6a4"
                    };
                    if (lang === 'zh-CN') {
                        opt.title = '车联在线运营管理系统';
                        opt.logo = 'http://img.chease.cn/default_logo.png';
                    }
                    req.session.lang = lang;
                    opt.lang = lang;
                    req.session.opt = opt;
                    res.render('login', { opt: opt });
                }
            });
        }
        setTimeout(() => {
            getApp(obj)
        }, 200)

    });
};

exports.role = function (req, res) {
    if (req.session.uid) {
        res.render('role', { opt: req.session.opt, groups: req.session.groups });
    } else {
        res.redirect('/');
    }
};

exports.getPage = function (req, res) {
    if (req.session.uid) {
        res.send({
            groups: req.session.groups,
            features: req.session.features
        });
    } else {
        res.send({});
    }
};

exports.vehicle = function (req, res) {
    if (checkValid(req)) {
        res.render('vehicle', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    } else {
        res.redirect('/');
    }
};

exports.device = function (req, res) {
    if (checkValid(req)) {
        res.render('device', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    } else {
        res.redirect('/');
    }
};

exports.card_management = function (req, res) {
    if (checkValid(req)) {
        res.render('cardManage', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    } else {
        res.redirect('/');
    }
}
exports.serviceplan = function (req, res) {
    // if (checkValid(req)) {
    res.render('serviceplan', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    // } else {
    // res.redirect('/');
    // }
}

exports.renew = function (req, res) {
    // if (checkValid(req)) {
    res.render('renew', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    // } else {
    // res.redirect('/');
    // }
}


exports.monitor = function (req, res) {
    if (checkValid(req)) {
        res.render('monitor', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    } else {
        res.redirect('/');
    }
};

exports.geofence = function (req, res) {
    if (checkValid(req)) {
        res.render('geofence', { opt: req.session.opt, groups: req.session.groups });
    } else {
        res.redirect('/');
    }
};

exports.playback = function (req, res) {
    if (checkValid(req)) {
        res.render('playback', { opt: req.session.opt, groups: req.session.groups, vehicle: req.query });
    } else {
        res.redirect('/');
    }
};

exports.trace = function (req, res) {
    if (checkValid(req)) {
        res.render('trace', { opt: req.session.opt, groups: req.session.groups, vehicle: req.query });
    } else {
        res.redirect('/');
    }
};

exports.customer = function (req, res) {
    if (checkValid(req)) {
        res.render('customer', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    } else {
        res.redirect('/');
    }
};

exports.member = function (req, res) {
    if (checkValid(req)) {
        res.render('member', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    } else {
        res.redirect('/');
    }
};

exports.summary = function (req, res) {
    if (checkValid(req)) {
        res.render('summary', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    } else {
        res.redirect('/');
    }
};

exports.depart = function (req, res) {
    if (checkValid(req)) {
        res.render('depart', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    } else {
        res.redirect('/');
    }
};

exports.employee = function (req, res) {
    if (checkValid(req)) {
        res.render('employee', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    } else {
        res.redirect('/');
    }
};

exports.account = function (req, res) {
    if (checkValid(req)) {
        res.render('user', { opt: req.session.opt, groups: req.session.groups });
    } else {
        res.redirect('/');
    }
};

exports.datalog = function (req, res) {
    if (checkValid(req)) {
        var device_id = "";
        if (req.query.device_id != undefined) {
            device_id = req.query.device_id;
        }
        res.render('datalog', { opt: req.session.opt, device_id: device_id });
    } else {
        res.redirect('/');
    }
};

exports.dataman = function (req, res) {
    if (checkValid(req)) {
        res.render('dataman', { opt: req.session.opt });
    } else {
        res.redirect('/');
    }
};

exports.article = function (req, res) {
    if (checkValid(req)) {
        res.render('article', { opt: req.session.opt, groups: req.session.groups });
    } else {
        res.redirect('/');
    }
};

exports.message = function (req, res) {
    if (checkValid(req)) {
        res.render('message', { opt: req.session.opt });
    } else {
        res.redirect('/');
    }
};

exports.ad = function (req, res) {
    if (checkValid(req)) {
        res.render('ad', { opt: req.session.opt });
    } else {
        res.redirect('/');
    }
};

exports.branch = function (req, res) {
    if (checkValid(req)) {
        res.render('branch', { opt: req.session.opt, groups: req.session.groups });
    } else {
        res.redirect('/');
    }
};

exports.booking = function (req, res) {
    if (checkValid(req)) {
        res.render('booking', { opt: req.session.opt, groups: req.session.groups });
    } else {
        res.redirect('/');
    }
};

exports.report = function (req, res) {
    if (checkValid(req)) {
        res.render('report', { opt: req.session.opt, groups: req.session.groups });
    } else {
        res.redirect('/');
    }
};

exports.alert = function (req, res) {
    if (checkValid(req)) {
        res.render('alert', { opt: req.session.opt, groups: req.session.groups });
    } else {
        res.redirect('/');
    }
};

exports.command = function (req, res) {
    if (checkValid(req)) {
        res.render('command', { opt: req.session.opt, groups: req.session.groups, user: req.session.user });
    } else {
        res.redirect('/');
    }
};

exports.article_detail = function (req, res) {
    var query_json = {
        objectId: req.query.id
    };
    wistorm_api._get('article', query_json, 'title,author,summary,content,article,createdAt', '', true, function (obj) {
        if (obj.status_code == 0 && obj.data) {
            obj.data.createdAt = new Date(obj.data.createdAt).format("MM-dd hh:mm");
            res.render('article_detail', obj.data);
        } else {
            res.send("无此文章!");
        }
    });
};

exports.config = function (req, res) {
    // var server = '/open/';
    var server = 'http://localhost:8000/';
    res.send(server);
};

exports.save = function (req, res) {
    req.session.user_name = req.body.user_name;
    res.send({});
};

exports.loginAndSave = function (req, res) {
    var username = req.query.username;
    var password = req.query.password;
    var uid = 0;
    var opt = req.session.opt;
    if (opt) {
        app_key = opt.app_key;
        app_secret = opt.app_secret;
        dev_key = opt.dev_key;
    }
    var wistorm_api = new WiStormAPI(app_key, app_secret, 'json', '2.0', 'md5', dev_key);
    wistorm_api.login(username, password, function (user) {
        if (user.status_code === 0) {
            uid = user.uid;
            user.uid = user.user_type === 11 ? user.pid : user.uid;
            req.session.uid = user.uid;
        } else {
            res.send(user);
            return;
        }
        if ([9, 12, 13].indexOf(user.user_type) > -1) {
            var query_json = {
                uid: uid
            };
            wistorm_api._get('employee', query_json, 'companyId,departId', user.access_token, true, function (employee) {
                if (employee.status_code === 0 && employee.data !== null) {
                    user.uid = employee.data.companyId;
                    user.depart_id = employee.data.departId;
                    // 获取客户及上级客户信息
                    // getInfo(wistorm_api, uid, user, password, req, res);
                    setTimeout(() => {
                        getInfo(wistorm_api, uid, user, password, req, res);
                    }, 300)
                } else {
                    user.status_code = 3;
                    res.send(user);
                }
            });
        } else {
            // 获取客户及上级客户信息
            setTimeout(() => {
                getInfo(wistorm_api, uid, user, password, req, res);
            }, 300)

        }
    });
};
var getInfo = function (wistorm_api, uid, user, password, req, res) {
    var lang = req.session.lang;
    var opt = req.session.opt;
    console.log('session opt: ' + req.session.opt);
    var query_json = {
        uid: user.uid + '|' + user.pid
    };

    wistorm_api._list('customer', query_json, 'uid,name,contact,tel,remark,treePath,other', '', '', 0, 0, 1, -1, user.access_token, true, function (customer) {
        // 获取角色
        var query_json = {
            users: uid.toString()
        };
        // var access_token = encodeURIComponent(user.access_token)
        wistorm_api._get('role', query_json, 'objectId', user.access_token, false, function (role) {
            // role.access_token = user.access_token
            // res.json(role)
            // res.send(role.status_code === 0 && role.data !== null)
            // res.json(user)
            if (role.status_code === 0 && role.data !== null) {
                // if (role.data != null) {
                query_json = {
                    ACL: 'role:' + role.data.objectId
                };
                wistorm_api._list('page', query_json, 'objectId,group,name,groupLocale,nameLocale,key,url,order', 'groupSort,order', 'name', 0, 0, 1, -1, user.access_token, false, function (pages) {
                    if (pages.status_code === 0) {
                        var group;
                        var groups = [];
                        var validPages = {};
                        var oldGroup = '';
                        for (var i = 0; i < pages.total; i++) {
                            validPages[pages.data[i].url] = true;
                            if (oldGroup !== pages.data[i].group) {
                                group = {
                                    name: pages.data[i].groupLocale[lang],
                                    pages: []
                                };
                                group.pages.push({
                                    id: pages.data[i].objectId,
                                    name: pages.data[i].nameLocale[lang],
                                    url: pages.data[i].url
                                });
                                groups.push(group);
                                oldGroup = pages.data[i].group;
                            } else {
                                groups[groups.length - 1].pages.push({
                                    id: pages.data[i].objectId,
                                    name: pages.data[i].nameLocale[lang],
                                    url: pages.data[i].url
                                });
                            }
                        }
                    }
                    req.session.groups = groups;
                    if (validPages['/monitor']) {
                        validPages['/trace'] = true;
                    }
                    validPages['/summary'] = true;
                    req.session.validPages = validPages;
                    req.session.user = util.clone(user);
                    // if (customer.data.other.default_page) {

                    // } else {
                    if (groups.length > 0 && groups[0].pages.length > 0) {
                        user.default_page = groups[0].pages[0].url;
                    }
                    // }

                    // user.default_page = '/summary';
                    // 用户信息
                    if (customer) {
                        if (customer.data.length === 1) {
                            user.name = customer.data[0].name;
                            user.tree_path = customer.data[0].treePath;
                            user.parent_name = '';
                            user.parent_contact = '';
                            user.parent_tel = '';
                        } else if (customer.data.length === 2) {
                            if (customer.data[0].uid == user.uid) {
                                user.name = customer.data[0].name;
                                user.tree_path = customer.data[0].treePath;
                                user.parent_name = customer.data[1].name;
                                user.parent_contact = customer.data[1].contact;
                                user.parent_tel = customer.data[1].tel;

                                customer.data[0].other ? (customer.data[0].other.default_page ? user.default_page = customer.data[0].other.default_page : null) : null;

                            } else {
                                user.name = customer.data[1].name;
                                user.tree_path = customer.data[1].treePath;
                                user.parent_name = customer.data[0].name;
                                user.parent_contact = customer.data[0].contact;
                                user.parent_tel = customer.data[0].tel;

                                customer.data[1].other ? (customer.data[1].other.default_page ? user.default_page = customer.data[1].other.default_page : null) : null;
                            }
                        }
                    }
                    // user.app_key = opt.app_key;
                    // user.app_secret = opt.app_secret;
                    // user.dev_key = opt.dev_key;
                    // req.cookies.set('app_key', opt.app_key);
                    // req.cookies.set('app_secret', opt.app_secret);
                    // req.cookies.set('dev_key', opt.dev_key);
                    var _pwd = new Date(new Date().format('yyyy-MM-dd hh:mm:00')).getTime();
                    var _secret = util.encrypt(opt.app_key + ',' + opt.app_secret + ',' + opt.dev_key, _pwd);
                    res.cookie('_secret', _secret, { maxAge: 24 * 3600 * 1000 });
                    // res.cookie('app_key', opt.app_key, {maxAge: 6000000});
                    // res.cookie('app_secret', opt.app_secret, {maxAge: 6000000});
                    // res.cookie('dev_key', opt.dev_key, {maxAge: 6000000});
                    user.sec_pass = util.md5(password);
                    wistorm_api._list('feature', query_json, 'objectId,pageId,key,name,order', '-group,order', 'name', 0, 0, 1, -1, user.access_token, false, function (features) {
                        if (features.status_code === 0 && features.total > 0) {
                            req.session.features = features.data;
                        } else {
                            req.session.features = [];
                        }
                        res.send(user);
                    });
                });
                // }
            } else {
                user.status_code = 3;
                res.send(user);
            }
        });
    });
};

// var getInfo = function (wistorm_api, uid, user, password, req, res) {
//     var lang = req.session.lang;
//     var opt = req.session.opt;
//     console.log('session opt: ' + req.session.opt);
//     var query_json = {
//         uid: user.uid + '|' + user.pid
//     };

//     wistorm_api._list('customer', query_json, 'uid,name,contact,tel,remark,treePath', '', '', 0, 0, 1, -1, user.access_token, true, function (customer) {
//         // 获取角色
//         var query_json = {
//             users: uid.toString()
//         };
//         wistorm_api._get('role', query_json, 'objectId', user.access_token, false, function (role) {
//             if (role.status_code === 0 && role.data !== null) {
//                 query_json = {
//                     ACL: 'role:' + role.data.objectId
//                 };
//                 wistorm_api._list('page', query_json, 'objectId,group,name,groupLocale,nameLocale,key,url,order', 'groupSort,order', 'name', 0, 0, 1, -1, user.access_token, false, function (pages) {
//                     if (pages.status_code === 0) {
//                         var group;
//                         var groups = [];
//                         var validPages = {};
//                         var oldGroup = '';
//                         for (var i = 0; i < pages.total; i++) {
//                             validPages[pages.data[i].url] = true;
//                             if (oldGroup !== pages.data[i].group) {
//                                 group = {
//                                     name: pages.data[i].groupLocale[lang],
//                                     pages: []
//                                 };
//                                 group.pages.push({
//                                     id: pages.data[i].objectId,
//                                     name: pages.data[i].nameLocale[lang],
//                                     url: pages.data[i].url
//                                 });
//                                 groups.push(group);
//                                 oldGroup = pages.data[i].group;
//                             } else {
//                                 groups[groups.length - 1].pages.push({
//                                     id: pages.data[i].objectId,
//                                     name: pages.data[i].nameLocale[lang],
//                                     url: pages.data[i].url
//                                 });
//                             }
//                         }
//                     }
//                     req.session.groups = groups;
//                     if (validPages['/monitor']) {
//                         validPages['/trace'] = true;
//                     }
//                     validPages['/summary'] = true;
//                     req.session.validPages = validPages;
//                     req.session.user = util.clone(user);
//                     if (groups.length > 0 && groups[0].pages.length > 0) {
//                         user.default_page = groups[0].pages[0].url;
//                     }
//                     // user.default_page = '/summary';
//                     // 用户信息
//                     if (customer) {
//                         if (customer.data.length === 1) {
//                             user.name = customer.data[0].name;
//                             user.tree_path = customer.data[0].treePath;
//                             user.parent_name = '';
//                             user.parent_contact = '';
//                             user.parent_tel = '';
//                         } else if (customer.data.length === 2) {
//                             if (customer.data[0].uid === user.uid) {
//                                 user.name = customer.data[0].name;
//                                 user.tree_path = customer.data[0].treePath;
//                                 user.parent_name = customer.data[1].name;
//                                 user.parent_contact = customer.data[1].contact;
//                                 user.parent_tel = customer.data[1].tel;
//                             } else {
//                                 user.name = customer.data[1].name;
//                                 user.tree_path = customer.data[1].treePath;
//                                 user.parent_name = customer.data[0].name;
//                                 user.parent_contact = customer.data[0].contact;
//                                 user.parent_tel = customer.data[0].tel;
//                             }
//                         }
//                     }
//                     user.app_key = opt.app_key;
//                     user.app_secret = opt.app_secret;
//                     user.dev_key = opt.dev_key;
//                     user.sec_pass = util.md5(password);
//                     wistorm_api._list('feature', query_json, 'objectId,pageId,key,name,order', 'groupSort,order', 'name', 0, 0, 1, -1, user.access_token, false, function (features) {
//                         if (features.status_code === 0 && features.total > 0) {
//                             req.session.features = features.data;
//                         } else {
//                             req.session.features = [];
//                         }
//                         res.send(user);
//                     });
//                 });
//             } else {
//                 user.status_code = 3;
//                 res.send(user);
//             }
//         });
//     });
// };

exports.logout = function (req, res) {
    req.session.uid = null;
    req.session.groups = null;
    req.session.validPages = null;
    res.send({});
};

exports.demo = function (req, res) {
    res.render('demo', { title: '车卫士管理平台' });
};

exports.callback = function (req, res) {
    console.log(req.query.data);
    res.write(req.query.data);
    res.end();
};


exports.exists = function (req, res) {
    var query_type = parseInt(req.query.query_type);
    var value = req.query.value;
    // var _auth_code = req.query.auth_code;
    var old_value = req.query.old_value;
    var uid = req.query.uid;
    if (old_value == value) {
        res.send("true");
    } else {
        wistorm_api.getToken('nwuser', 'ff864b6e5f9c42a4a2e729e55312b0f6', 1, function (token) {
            setTimeout(() => {
                _exists(token)
            }, 200);
        })
        var _exists = function (token) {
            switch (query_type) {
                case 7: //depart name
                    var query_json = { name: value };
                    wistorm_api._get('department', query_json, 'objectId', token.access_token, true, function (obj) {
                        if (obj.status_code == 0 && obj.data != null) {
                            res.send("false");
                        } else {
                            res.send("true");
                        }
                    });
                    break;
                case 6: //username
                    var query_json = { username: value };
                    wistorm_api.get(query_json, 'objectId', token.access_token, function (obj) {
                        if (obj.status_code == 0 && obj.data != null) {
                            res.send("false");
                        } else {
                            var query_json = { mobile: value };
                            wistorm_api.get(query_json, 'objectId', token.access_token, function (obj) {
                                if (obj.status_code == 0 && obj.data != null) {
                                    res.send("false");
                                } else {
                                    res.send("true");
                                }
                            });
                        }
                    });
                    break;
                case 5: //name
                    var query_json = { name: value };
                    wistorm_api._get('customer', query_json, 'objectId', token.access_token, true, function (obj) {
                        if (obj.status_code == 0 && obj.data != null) {
                            res.send("false");
                        } else {
                            res.send("true");
                        }
                    });
                    break;
                case 4: //obj_name
                    var query_json = { name: value };
                    wistorm_api._get('vehicle', query_json, 'objectId', token.access_token, true, function (obj) {
                        if (obj.status_code == 0 && obj.data != null) {
                            res.send("false");
                        } else {
                            res.send("true");
                        }
                    });
                    break;
                case 1: //sim
                    var query_json = { sim: value };
                    wistorm_api._get('vehicle', query_json, 'objectId', token.access_token, true, function (obj) {
                        if (obj.status_code == 0 && obj.data != null) {
                            res.send("false");
                        } else {
                            res.send("true");
                        }
                    });
                    break;
                case 2: //device_id
                    var query_json = { did: value, binded: false };
                    wistorm_api.validDevice(value, token.access_token, function (obj) {
                        if (obj.status_code == 0) {
                            res.send("true");
                        } else {
                            res.send("false");
                        }
                    })
                    break;
            }
        }


    }
};
// exports.planId = function (req, res) {
//     wistorm_api.getPlanId('http://api.chease.cn:13003/next_id', function (obj) {
//         res.json(obj)
//     })
// }
// exports.exists = function (req, res) {
//     var query_type = parseInt(req.query.query_type);
//     var value = req.query.value;
//     var _auth_code = req.query.auth_code;
//     var old_value = req.query.old_value;
//     var uid = req.query.uid;
//     if (old_value == value) {
//         res.send("true");
//     } else {
//         switch (query_type) {
//             case 7: //depart name
//                 var query_json = { name: value };
//                 wistorm_api.getToken('nwuser', 'ff864b6e5f9c42a4a2e729e55312b0f6', 1, function (token) {
//                     wistorm_api._get('department', query_json, 'objectId', token.access_token, true, function (obj) {
//                         if (obj.status_code == 0 && obj.data != null) {
//                             res.send("false");
//                         } else {
//                             res.send("true");
//                         }
//                     });
//                 });
//                 break;
//             case 6: //username
//                 var query_json = { username: value };
//                 wistorm_api.getToken('nwuser', 'ff864b6e5f9c42a4a2e729e55312b0f6', 1, function (token) {
//                     wistorm_api.get(query_json, 'objectId', token.access_token, function (obj) {
//                         if (obj.status_code == 0 && obj.data != null) {
//                             res.send("false");
//                         } else {
//                             var query_json = { mobile: value };
//                             wistorm_api.get(query_json, 'objectId', token.access_token, function (obj) {
//                                 if (obj.status_code == 0 && obj.data != null) {
//                                     res.send("false");
//                                 } else {
//                                     res.send("true");
//                                 }
//                             });
//                         }
//                     });
//                 });
//                 break;
//             case 5: //name
//                 var query_json = { name: value };
//                 wistorm_api.getToken('nwuser', 'ff864b6e5f9c42a4a2e729e55312b0f6', 1, function (token) {
//                     _auth_code = _auth_code || token.access_token;
//                     wistorm_api._get('customer', query_json, 'objectId', _auth_code, true, function (obj) {
//                         if (obj.status_code == 0) {
//                             if (obj.data != null) {
//                                 res.send("false");
//                             } else {
//                                 res.send("true");
//                             }
//                         } else {
//                             res.json(obj)
//                         }
//                     });
//                 });
//                 break;
//             case 4: //obj_name
//                 var query_json = { name: value };
//                 wistorm_api.getToken('nwuser', 'ff864b6e5f9c42a4a2e729e55312b0f6', 1, function (token) {
//                     _auth_code = _auth_code || token.access_token;
//                     wistorm_api._get('vehicle', query_json, 'objectId', _auth_code, true, function (obj) {
//                         if (obj.status_code == 0) {
//                             if (obj.data != null) {
//                                 res.send("false");
//                             } else {
//                                 res.send("true");
//                             }
//                         } else {
//                             res.json(obj)
//                         }
//                     });
//                 });
//                 break;
//             case 1: //sim
//                 var query_json = { sim: value };
//                 wistorm_api.getToken('nwuser', 'ff864b6e5f9c42a4a2e729e55312b0f6', 1, function (token) {
//                     wistorm_api._get('vehicle', query_json, 'objectId', token.access_token, true, function (obj) {
//                         if (obj.status_code == 0 && obj.data != null) {
//                             res.send("false");
//                         } else {
//                             res.send("true");
//                         }
//                     });
//                 });
//                 break;
//             case 2: //device_id
//                 var query_json = { did: value, binded: false };
//                 wistorm_api.getToken('nwuser', 'ff864b6e5f9c42a4a2e729e55312b0f6', 1, function (token) {
//                     wistorm_api.validDevice(value, token.access_token, function (obj) {
//                         if (obj.status_code == 0) {
//                             res.send("true");
//                         } else {
//                             res.send("false");
//                         }
//                     })
//                 });
//                 break;
//         }
//     }
// };


exports.usecar = function (req, res) {
    if (checkValid(req)) {
        res.render('usecar', { opt: req.session.opt, groups: req.session.groups });
    } else {
        res.redirect('/');
    }
}

exports.repaircar = function (req, res) {
    if (checkValid(req)) {
        res.render('repair_car', { opt: req.session.opt, groups: req.session.groups });
    } else {
        res.redirect('/');
    }
}




exports.usecar_detail = function (req, res) {
    res.render('usecar_detail', { opt: req.session.opt, groups: req.session.groups });
}

exports.usecar_apply = function (req, res) {
    res.render('usecar_apply', { opt: req.session.opt, groups: req.session.groups });
}

exports.repaircar_detail = function (req, res) {
    res.render('repaircar_detail', { opt: req.session.opt, groups: req.session.groups });
}
exports.repaircar_apply = function (req, res) {
    res.render('repaircar_apply', { opt: req.session.opt, groups: req.session.groups });
}
exports.repair_accident = function (req, res) {
    res.render('repair_accident', { opt: req.session.opt, groups: req.session.groups });
}



exports.burseLogin = function (req, res) {
    var _pwd = new Date(new Date().format('yyyy-MM-dd hh:mm:00')).getTime();
    var _secret = util.encrypt("96a3e23a32d4b81894061fdd29e94319" + ',' + "565975d7d7d01462245984408739804d" + ',' + "59346d400236ab95e95193f35f3df6a4", _pwd);
    res.cookie('_secret', _secret, { maxAge: 24 * 3600 * 1000 });
    req.session.tpUser = null;
    req.session.mbUser = null
    res.render('burseLogin');
}
exports.burseLoginAndSave = function (req, res) {
    var account = req.query.username;
    var sec_pass = req.query.password;
    req.session.tpUser = null
    wistorm_api.login(account, sec_pass, function (user) {
        if (user.status_code == 0) {
            req.session.mbUser = user;
            res.send(user)
        } else {
            req.session.mbUser = null
            res.send(user)
        }
    })
}


exports.burse = function (req, res) {
    // console.log(req.query)
    // const data = "tp_18344178461";
    //公钥
    // const publicKey = fs.readFileSync(__dirname+'/rsa_1024_priv.pem').toString('ascii');
    // 私钥
    const privateKey = fs.readFileSync(__dirname + '/rsa_1024_priv.pem').toString('ascii');
    //加密
    // const encodeData = crypto.publicEncrypt(publicKey, Buffer.from(data)).toString('base64');
    // 解密
    // const decodeData = crypto.privateDecrypt(privateKey, Buffer.from(encodeData.toString('base64'), 'base64'));
    // console.log("encode: ", encodeData)

    var _pwd = new Date(new Date().format('yyyy-MM-dd hh:mm:00')).getTime();
    var _secret = util.encrypt("96a3e23a32d4b81894061fdd29e94319" + ',' + "565975d7d7d01462245984408739804d" + ',' + "59346d400236ab95e95193f35f3df6a4", _pwd);
    res.cookie('_secret', _secret, { maxAge: 24 * 3600 * 1000 });

    if (!req.query.sign) {
        if (!req.session.tpUser && !req.session.mbUser) {
            res.redirect('burseLogin');
        } else {
            var user = req.session.tpUser || req.session.mbUser
            res.render('burse', { user: encodeURIComponent(JSON.stringify(user)) });
        }
    } else {
        try {
            const encodeData = decodeURIComponent(req.query.sign).toString('base64');
            const decodeData = crypto.privateDecrypt(privateKey, Buffer.from(encodeData.toString('base64'), 'base64'));
            console.log("decode: ", decodeData.toString())
            var account = decodeData.toString();
            var wistorm_api = new WiStormAPI(app_key, app_secret, 'json', '2.0', 'md5', dev_key);
            var sec_pass = util.md5(account);
            wistorm_api.login(account, sec_pass, function (user) {
                if (user.status_code == 0) {
                    req.session.tpUser = user;
                    res.render('burse', { user: encodeURIComponent(JSON.stringify(user)) });
                } else {
                    wistorm_api.getToken('nwuser', 'ff864b6e5f9c42a4a2e729e55312b0f6', 1, function (token) {
                        setTimeout(function () {
                            wistorm_api.create(account, account, '', sec_pass, 7, 2, 0, {}, token.access_token, function (obj) {
                                // console.log(obj)
                                wistorm_api.login(account, sec_pass, function (user) {
                                    if (user.status_code == 0) {
                                        req.session.tpUser = user;
                                        res.render('burse', { user: encodeURIComponent(JSON.stringify(user)) });
                                    } else {
                                        res.send('404')
                                    }
                                })
                            })
                        }, 200)
                    })
                }
            })
        } catch (e) {
            res.send('404')
        }
    }
}

exports.mobileHomeLogin = function (req, res) {
    var _pwd = new Date(new Date().format('yyyy-MM-dd hh:mm:00')).getTime();
    var _secret = util.encrypt("96a3e23a32d4b81894061fdd29e94319" + ',' + "565975d7d7d01462245984408739804d" + ',' + "59346d400236ab95e95193f35f3df6a4", _pwd);
    res.cookie('_secret', _secret, { maxAge: 24 * 3600 * 1000 });
    req.session.tpUser = null;
    req.session.mbUser = null
    res.render('mobileHomeLogin');
}
exports.mobileHomeLoginAndSave = function (req, res) {
    var account = req.query.username;
    var sec_pass = req.query.password;
    req.session.tpUser = null
    wistorm_api.login(account, sec_pass, function (user) {
        if (user.status_code == 0) {
            req.session.mbUser = user;
            res.send(user)
        } else {
            req.session.mbUser = null
            res.send(user)
        }
    })
}




exports.mobileHome = function (req, res) {

    if (!req.session.openid && !req.query.code) {
        var implicitOAuthUrl = wx.oauth.generateOAuthUrl(
            DOMAIN + req.url
        );
        res.redirect(implicitOAuthUrl);
        return;
    }


    var _pwd = new Date(new Date().format('yyyy-MM-dd hh:mm:00')).getTime();
    var _secret = util.encrypt("96a3e23a32d4b81894061fdd29e94319" + ',' + "565975d7d7d01462245984408739804d" + ',' + "59346d400236ab95e95193f35f3df6a4", _pwd);
    res.cookie('_secret', _secret, { maxAge: 24 * 3600 * 1000 });
    // req.session.tpUser = null;

    if (!req.session.tpUser && !req.session.mbUser) {
        res.redirect('cardQueryLogin');
    } else {
        var user = req.session.tpUser || req.session.mbUser
        if (!req.session.openid) {
            wx.oauth.getUserBaseInfo(req.query.code).then(function (tokenInfo) {
                console.log('implicit oauth: ', tokenInfo);
                req.session.openid = tokenInfo.openid;
                res.render('mobileHome', { user: encodeURIComponent(JSON.stringify(user)), openId: req.session.openid });
            });
        } else {
            res.render('mobileHome', { user: encodeURIComponent(JSON.stringify(user)), openId: req.session.openid });
        }
    }
}


exports.cardQuery = function (req, res) {
    if (!req.session.tpUser && !req.session.mbUser && !req.session.user) {
        res.redirect('mobileHomeLogin');
    } else {
        var user = req.session.tpUser || req.session.mbUser || req.session.user
        res.render('cardQuery', { user: encodeURIComponent(JSON.stringify(user)) })
    }
}



// exports.d = function (req, res) {
//     if (!req.session.openid && !req.query.code) {
//         var implicitOAuthUrl = wx.oauth.generateOAuthUrl(
//             DOMAIN + req.url
//         );
//         res.redirect(implicitOAuthUrl);
//         return;
//     }

//     if (!req.session.openid) {
//         wx.oauth.getUserBaseInfo(req.query.code).then(function (tokenInfo) {
//             // res.send(JSON.stringify(tokenInfo))
//             console.log('implicit oauth: ', tokenInfo);
//             // console.log('implicit oauth: ', JSON.stringify(tokenInfo));
//             req.session.openid = tokenInfo.openid;
//             res.send(tokenInfo.openid)
//             // 判断用户是否存在，如果不存在，则自动创建
//             // getUser(tokenInfo.openid, function(uid){
//             //     res.render('order', {
//             //         product: obj.data,
//             //         act: act.data,
//             //         skuObj: JSON.stringify(obj.data.skuObj),
//             //         openid: tokenInfo.openid,
//             //         uid: uid
//             //     });
//             // });
//         });
//     } else {
//         res.send(req.session.openid)
//     }
// };

//空气净化器小程序api
exports.littleApi = function (req, res, next) {
    wistorm_api.getToken('nwuser', 'ff864b6e5f9c42a4a2e729e55312b0f6', 1, function (token) {
        setTimeout(() => {
            littleApiFun(token, req.query, res)
        }, 200);
    })

}

var littleApiFun = function (token, query, res) {
    var method = query.method;
    var openid = query.openid;
    var query_json = {
        did: query.did || '',
        map: 'BAIDU'
    }
    //console.log(JSON.parse(query.param))
    wistorm_api._get('_iotDevice', query_json, 'params', token.access_token, true, function (obj) {
        if (obj.status_code == 0) {
            if (obj.data) {
                if (obj.data.params) {
                    if (obj.data.params.openid) { //已绑定微信
                        if (openid == obj.data.params.openid) { //绑定微信和授权微信一致
                            switch (method) {
                                case 'getDevice':
                                    getDeviceLA(token, query, res);
                                    break;
                                case 'listAirData':
                                    listAirDataLA(token, query, res);
                                    break;
                                case 'sendCommand':
                                    sendCommandLA(token, query, res);
                                    break;
                                case 'getCityQuality':
                                    getCityQualityLA(query, res);
                                    break;
                                case 'unBindWx':
                                    unbindWXLA(token, query, res)
                                    break;
                                case 'update':
                                    updateTable(token, query, res);
                                    break;
                                default:
                                    break
                            }
                        } else {  //不一致
                            res.send({ status_code: -3 })
                        }
                    } else { //绑定微信操作
                        bindWXLA(query.did, token, openid, function (uJ) {
                            if (uJ.status_code == 0) {
                                littleApiFun(token, query, res)
                            } else {
                                res.send({ status_code: -1 })
                            }
                        })
                    }
                } else { //绑定微信操作
                    bindWXLA(query.did, token, openid, function (uJ) {
                        if (uJ.status_code == 0) {
                            littleApiFun(token, query, res)
                        } else {
                            res.send({ status_code: -1 })
                        }
                    })
                }
            } else {
                res.send({ status_code: -1 })
            }
        } else {
            res.send({ status_code: -1 })
        }
    })

}


var bindWXLA = function (did, token, openid, callback) {
    var query_json = {
        did: did
    }
    var update_json = {
        'params.openid': openid
    }
    wistorm_api._update('_iotDevice', query_json, update_json, token.access_token, true, function (json) {
        callback(json)
    })
}

var unbindWXLA = function (token, query, res) {
    var query_json = {
        did: query.did
    }
    var update_json = {
        'params.openid': ''
    }
    wistorm_api._update('_iotDevice', query_json, update_json, token.access_token, true, function (json) {
        res.send(json)
    })
}

var getDeviceLA = function (token, query, res) {
    var query_json = {
        did: query.did || '',
        map: 'BAIDU'
    }
    wistorm_api._get('_iotDevice', query_json, 'activeGpsData,params', token.access_token, true, function (obj) {
        // console.log(obj)
        res.send(obj)
    })
}

var listAirDataLA = function (token, query, res) {
    var query = {
        did: query.did
    };
    wistorm_api._list('_iotGpsData', query, 'air', 'gpsTime', 'gpsTime', 0, 0, 0, -1, token.access_token, true, function (obj) {
        res.send(obj)
    });
}

//发送指令
var sendCommandLA = function (token, query, res) {
    var did = query.did;
    var cmdType = query.cmdType;
    var params = JSON.parse(query.params);
    var type = query.type;
    var remark = query.remark;
    wistorm_api.createCommand(did, cmdType, params, type, remark, token.access_token, function (obj) {
        res.send(obj)
    })
}

//获取城市空气质量
var getCityQualityLA = function (query, res) {
    var city = query.city
    var path = 'http://www.pm25.in/api/querys/aqi_details.json?city=' + encodeURIComponent(city) + '&avg=true&stations=no&token=GmBqBNJhqwsNf19Fwqdy';
    // var path = "http://www.pm25.in/api/querys/aqi_details.json?city=%E5%B9%BF%E5%B7%9E&avg=true&stations=no&token=GmBqBNJhqwsNf19Fwqdy"
    // var url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
    http.get(path, function (ress) {
        ress.on('data', function (data) {
            res.send({ status_code: 0, data: JSON.parse(data.toString()) })
            //console.log(data.toString(), 'd')
        });
        ress.on("end", function () {
            //console.log();
        });
    }).on("error", function (err) {
        res.send({ status_code: -1, err: '请求出错' })
        //console.log(err)
    });
}

var updateTable = function (token, query, res) {

    var table = query.table;
    var query_json = JSON.parse(query.query)
    var update_json = JSON.parse(query.update)

    wistorm_api._update(table, query_json, update_json, token.access_token, true, function (json) {
        res.send(json)
    })

}








exports.getSessionKey = function (req, res) {
    var appId = "wx078e1ef63be61fe2";
    var secret = "c640fe4aa693943ab3c739d7a695af0c";
    var code = req.query.code;
    var url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
    https.get(url, function (ress) {
        ress.on('data', function (data) {
            res.send({ status_code: 0, data: JSON.parse(data.toString()) })
            //console.log(data.toString(), 'd')
        });
        ress.on("end", function () {
            //console.log();
        });
    }).on("error", function (err) {
        res.send({ status_code: -1, err: '请求出错' })
        //console.log(err)
    });


}

exports.getAuthData = function (req, res) {
    var appId = 'wx078e1ef63be61fe2';
    var sessionKey = decodeURIComponent(req.query.sessionKey);
    var encryptedData = decodeURIComponent(req.query.encryptedData);
    var iv = decodeURIComponent(req.query.iv);
    console.log(iv, '/n', encryptedData, '/n', sessionKey)
    if (iv && encryptedData && sessionKey) {
        try {
            var pc = new WXBizDataCrypt(appId, sessionKey)
            var data = pc.decryptData(encryptedData, iv)
            res.send({ status_code: 0, data })
        } catch (e) {
            res.send({ status_code: -1, message: '参数错误' })
        }
    } else {
        res.send({ status_code: -2 })
    }
}