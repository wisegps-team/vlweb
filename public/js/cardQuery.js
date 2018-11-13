$(document).ready(function () {
    var msisdn, _iotCardData;
    var auth_code;
    var sendMsisdn;
    var cardFee;
    var amount

    var pageManager = {
        $container: $('#container'),
        _pageStack: [],
        _configs: [],
        _pageAppend: function () { },
        _defaultPage: null,
        _pageIndex: 1,
        setDefault: function (defaultPage) {
            this._defaultPage = this._find('name', defaultPage);
            return this;
        },
        setPageAppend: function (pageAppend) {
            this._pageAppend = pageAppend;
            return this;
        },
        init: function () {
            var self = this;

            $(window).on('hashchange', function () {
                var state = history.state || {};
                var url = location.hash.indexOf('#') === 0 ? location.hash : '#';
                var page = self._find('url', url) || self._defaultPage;
                if (state._pageIndex <= self._pageIndex || self._findInStack(url)) {
                    self._back(page);
                } else {
                    self._go(page);
                }
            });

            if (history.state && history.state._pageIndex) {
                this._pageIndex = history.state._pageIndex;
            }

            this._pageIndex--;

            var url = location.hash.indexOf('#') === 0 ? location.hash : '#';
            var page = self._find('url', url) || self._defaultPage;
            this._go(page);
            return this;
        },
        push: function (config) {
            this._configs.push(config);
            return this;
        },
        go: function (to) {
            var config = this._find('name', to);
            if (!config) {
                return;
            }
            location.hash = config.url;
        },
        _go: function (config) {
            this._pageIndex++;

            history.replaceState && history.replaceState({ _pageIndex: this._pageIndex }, '', location.href);

            var html = $(config.template).html();
            var $html = $(html).addClass('slideIn').addClass(config.name);
            $html.on('animationend webkitAnimationEnd', function () {
                $html.removeClass('slideIn').addClass('js_show');
            });

            this.$container.append($html);

            // console.log(config, 'html')
            pageChange(config.name)

            // this.$container.append($html);
            this._pageAppend.call(this, $html);
            this._pageStack.push({
                config: config,
                dom: $html
            });

            if (!config.isBind) {
                this._bind(config);
            }

            return this;
        },
        back: function () {
            history.back();
        },
        _back: function (config) {
            this._pageIndex--;

            var stack = this._pageStack.pop();
            if (!stack) {
                return;
            }

            var url = location.hash.indexOf('#') === 0 ? location.hash : '#';
            var found = this._findInStack(url);
            if (!found) {
                var html = $(config.template).html();
                var $html = $(html).addClass('js_show').addClass(config.name);
                $html.insertBefore(stack.dom);

                if (!config.isBind) {
                    this._bind(config);
                }

                this._pageStack.push({
                    config: config,
                    dom: $html
                });
            }

            stack.dom.addClass('slideOut').on('animationend webkitAnimationEnd', function () {
                stack.dom.remove();
                // setTimeout(htmlInit, 200)
                // console.log(stack.dom,'dd')
            });
            pageChange(config.name)
            return this;
        },
        _findInStack: function (url) {
            var found = null;
            for (var i = 0, len = this._pageStack.length; i < len; i++) {
                var stack = this._pageStack[i];
                if (stack.config.url === url) {
                    found = stack;
                    break;
                }
            }
            return found;
        },
        _find: function (key, value) {
            var page = null;
            for (var i = 0, len = this._configs.length; i < len; i++) {
                if (this._configs[i][key] === value) {
                    page = this._configs[i];
                    break;
                }
            }
            return page;
        },
        _bind: function (page) {
            var events = page.events || {};
            for (var t in events) {
                for (var type in events[t]) {
                    this.$container.on(type, t, events[t][type]);
                }
            }
            page.isBind = true;
        }
    };

    function setPageManager() {
        var pages = {}, tpls = $('script[type="text/html"]');
        var winH = $(window).height();

        for (var i = 0, len = tpls.length; i < len; ++i) {
            var tpl = tpls[i], name = tpl.id.replace(/tpl_/, '');
            pages[name] = {
                name: name,
                url: '#' + name,
                template: '#' + tpl.id
            };
        }
        pages.home.url = '#';

        for (var page in pages) {
            pageManager.push(pages[page]);
        }
        pageManager
            .setPageAppend(function ($html) {
                var $foot = $html.find('.page__ft');
                if ($foot.length < 1) return;

                if ($foot.position().top + $foot.height() < winH) {
                    $foot.addClass('j_bottom');
                } else {
                    $foot.removeClass('j_bottom');
                }
            })
            .setDefault('home')
            .init();
    }

    function androidInputBugFix() {
        if (/Android/gi.test(navigator.userAgent)) {
            window.addEventListener('resize', function () {
                if (document.activeElement.tagName == 'INPUT' || document.activeElement.tagName == 'TEXTAREA') {
                    window.setTimeout(function () {
                        document.activeElement.scrollIntoViewIfNeeded();
                    }, 0);
                }
            })
        }
    }

    function init() {
        auth_code = $.cookie('auth_code');
        androidInputBugFix();
        setPageManager();

        window.pageManager = pageManager;
        window.home = function () {
            location.hash = '';
        };
        initHTML();
        _accountGetCustomer();
        // getAmount()
    }
    init();


    function pageChange(name) { //页面切换

        switch (name) {
            case 'home':
                sendMsisdn = ''
                goHome()
                break
            case 'detail':
                sendMsisdn = ''
                goDetail()
                break;
            case 'getMessage':
                goGetMessage();
                changeHeight('#getMessageRecord', 100)
                break;
            case 'sendMessage':
                goSendMessage()
                break;
            case 'renew':
                sendMsisdn = '';
                if (cardFee) {
                    goRenew()
                } else {
                    _accountGetCustomer(goRenew)
                }



                break;
            default:
                break
        }
    }




    function initHTML() { //全局点击事件

        $(document).on('input', '#queryCard', function () {
            console.log('homehtmlInit')
            if ($(this).val().length >= 13) {
                $('#queryCardButton').addClass('bColor')
            } else {
                $('#queryCardButton').removeClass('bColor')
            }
        })

        $(document).on('click', '#queryCardButton', function () {
            msisdn = $('#queryCard').val();
            var query_json = {
                uid: $.cookie('dealer_id'),
                msisdn: msisdn
            }
            wistorm_api._get('_iotCard', query_json, 'msisdn,iccid,status,expireIn,salePackage,monthUsed', auth_code, true, function (res) {
                if (res.data) {
                    $.cookie('msisdn', msisdn);
                    location.href = '#detail';
                    _iotCardData = res.data
                } else {
                    _iotCardData = null
                    showTip('物联卡不存在')
                }
            })
        })



        $(document).on('click', '#queryCards', function () {
            var firstCard = $('#startCard').val();
            var lastCard = $('#endCard').val();
            if (!firstCard) {
                showTip('请输入起始号段');
                return;
            }
            if (!lastCard) {
                showTip('请输入结束号段');
                return;
            }
            var query_json = {
                uid: $.cookie('dealer_id'),
                msisdn: firstCard + '@' + lastCard
            }
            wistorm_api._list('_iotCard', query_json, '', 'msisdn', 'msisdn', 0, 0, 1, 100, $.cookie('auth_code'), true, function (obj) {
                var str = '';
                obj.data.forEach(function (ele, i) {
                    if (i == obj.data.length - 1) {
                        str += ele.msisdn
                    } else {
                        str += ele.msisdn + ';'
                    }

                })
                sendMsisdn = str.split(';')[0]
                $('#cards').val(str);
            })
            // console.log('homehtmlInit')
        })

        $(document).on('input', '#cards', function () {
            sendMsisdn = $(this).val().split(';')[0]
        })
        //发送短信
        $(document).on('click', '#send', function () {
            var content = $('#content').val()
            var msisdns = $('#cards').val();
            var r = /^[^\u4e00-\u9fa5]+$/;
            var url = 'https://in.gpsoo.net/1/cardpool/charge?method=PayAndSendSmss'
            if (!content) {
                showTip('内容不能为空')
                return;
            }
            if (!msisdns) {
                showTip('卡号不能为空')
                return;
            }
            sendMsisdn = msisdns.split(';')[0]
            var data = {
                msisdns: msisdns,
                account_id: 16926,
                content: content,
                format: 0
            }
            if (r.test(content)) {

                $.ajax({
                    url: url,
                    type: 'POST',
                    dataType: 'json',
                    data: data,
                    success: function (succ) {
                        console.log(succ)
                        if (succ.success) {
                            showTip('发送成功')
                        }

                    },
                    error: function (err) {
                        console.log(err)
                    }
                })
            } else {
                showTip('不能包含中文')
            }
            // console.log('send')
        })


        //续费按钮
        $(document).on('click', '#renewBtn', function () {
            // console.log(e)
            var _uid = $.cookie('dealer_id');
            var pay_count = 1;
            var pay_type = 1;
            var attach = $.cookie('msisdn');
            var remark = $('#feeRemark').val();
            var needMoney = parseFloat($('#renewAmount').text());
            // var adminUser = $.cookie('adminUser') == 0 ? 829909845607059600 : $.cookie('adminUser');
            // if (watchBalance) {
            //     clearInterval(watchBalance)
            // }

            // var setFlag = 0;
            var isrecharge = function () {
                getAmount(function (res) {
                    if (res.status_code == 0 && res.data) {
                        var balance = res.data.balance
                        balance = parseFloat(balance.toFixed(2));
                        var adminUser = $.cookie('adminUser') == 0 ? 829909845607059600 : $.cookie('adminUser');
                        if (balance < needMoney) {
                            showTip('余额不足')
                            // if (setFlag == 0) {
                            //     setFlag++;
                            //     var amount = needMoney - balance + 0.01;
                            //     amount = parseFloat(amount.toFixed(2))

                            //     var _link = 'http://h5.bibibaba.cn/pay/wicare/wxpayv3/index.php?'
                            //         + 'total=' + amount
                            //         + '&adminUser=' + adminUser
                            //         + '&orderType=2'
                            //         + '&uid=' + $.cookie('dealer_id')
                            //         + '&subject=充值&body=充值&tradeType=NATIVE&productId=chargePC&deviceInfo=WEB';
                            //     showQRCode(_link, 1);
                            //     var divText = document.createElement('div');
                            //     divText.innerText = '您的账号余额不足以支持本次续费，需充值';
                            //     divText.style.textAlign = 'center';
                            //     divText.style.color = 'red';
                            //     divText.style.fontSize = '14px';
                            //     $(rechargeDiv).append(divText)
                            // }
                        } else {
                            wistorm_api.payService(_uid, adminUser, 2, 3, pay_type, pay_count, remark, attach, function (pay) {
                                console.log(pay, 'paystatus')
                                if (pay.status_code == 0) {
                                    // $('#divRenew').dialog("close");
                                    showTip('续费成功！')
                                }
                                // if (rechargeDiv) {
                                //     $(rechargeDiv).remove();
                                // }
                                // if (watchBalance) {
                                //     clearInterval(watchBalance)
                                // }
                            })
                        }
                    }
                })
            }
            if (confirm('确定要续费？')) {
                isrecharge()
            }

        })

        //回复消息发送按钮
        $(document).on('click', '#sendMessageBtn', function () {
            // var msisdn = sendMsisdn || $.cookie('msisdn');
            var msisdn = $('#showCard').text()
            var content = $('.messageInput').val()
            var r = /^[^\u4e00-\u9fa5]+$/;
            var url = 'https://in.gpsoo.net/1/cardpool/charge?method=PayAndSendSmss'
            if (!content) {
                showTip('内容不能为空')
                return;
            }
            if (!r.test(content)) {
                showTip('不能包含中文')
                return;
            }

            var data = {
                msisdns: msisdn,
                account_id: 16926,
                content: content,
                format: 0
            }
            $.ajax({
                url: url,
                type: 'POST',
                dataType: 'json',
                data: data,
                success: function (succ) {
                    console.log(succ)
                    if (succ.success) {
                        // showTip('发送成功')
                        $('.messageInput').val('')
                        setTimeout(function () { goGetMessage(msisdn) }, 100)

                    }

                },
                error: function (err) {
                    console.log(err)
                }
            })
        })




    }

    function goHome() {
        $('#queryCard').val('')
    }

    function goDetail() {
        if (_iotCardData) {
            frmInitDetailHtml(_iotCardData)
        } else {
            msisdn = $.cookie('msisdn')
            if (msisdn) {
                var query_json = {
                    uid: $.cookie('dealer_id'),
                    msisdn: msisdn
                }
                wistorm_api._get('_iotCard', query_json, 'msisdn,iccid,status,expireIn,salePackage,monthUsed', auth_code, true, function (res) {
                    if (res.data) {
                        _iotCardData = res.data;
                        frmInitDetailHtml(_iotCardData)
                    } else {
                        location.href = '#home'
                    }
                })
            } else {
                location.href = '#home'
            }
        }
    }

    // var oldMLength = 0;
    var lastTime = 0;
    function goGetMessage(msis) {
        // webWorcket()
        var msisdn = sendMsisdn || $.cookie('msisdn');
        if (msis) {
            msisdn = msis;
        }
        $('#showCard').text(msisdn)
        var last_time = String(new Date().getTime() + 3000).slice(0, -3);
        // alert(last_time)
        var url = 'https://in.gpsoo.net/1/cardpool/charge?method=wechatQuerySmsResponse&msisdn=' + msisdn + '&last_time=' + last_time
        if (msisdn) {
            $.ajax({
                url: url,
                type: 'get',
                dataType: 'JSON',
                success: function (json) {
                    // alert(msis, 'dd')
                    // alert(json.data.smsList.length+','+oldMLength)/

                    var _smsList = json.data.smsList
                    lastTime = _smsList[0] ? _smsList[0].create_time : 0
                    showMessage(_smsList)


                },
                error: function (err) {
                    showTip('获取数据错误')
                }
            })
        } else {
            location.href = '#home'
        }

    }

    //显示回复短信列表
    function showMessage(data) {
        $('#getMessageRecord').empty();
        if (!data.length) {
            $('#getMessageRecord').append('<div style="text-align:center">无历史短信</div>')
            return;
        }
        for (var i = 0; i < data.length; i++) {
            var time = new Date(data[i].create_time * 1000).format('yyyy-MM-dd hh:mm:ss');
            var content = data[i].content
            var oneS = ''
            if (data[i].direction == 0) {
                oneS = '<div class="message_cell"><div style="text-align: right;">' + time + '</div><div style="text-align: right;"><div class="message1">' + content + '</div> </div></div>'
            } else if (data[i].direction == 1) {
                oneS = '<div class="message_cell"><div>' + time + '</div><div class="message">' + content + '</div></div>'
            }
            // oneS = '<div class="message_cell"><div>' + time + '</div><div class="message">' + content + '</div></div>'
            $('#getMessageRecord').append(oneS)
        }

        scrollToEnd('#getMessageRecord')
    }

    function loadMore(data){
        if(!data.length){
            return
        }
        for (var i = data.length - 1; i < data.length && i > -1; i--) {
            var time = new Date(data[i].create_time * 1000).format('yyyy-MM-dd hh:mm:ss');
            var content = data[i].content
            var oneS = ''
            if (data[i].direction == 0) {
                oneS = '<div class="message_cell"><div style="text-align: right;">' + time + '</div><div style="text-align: right;"><div class="message1">' + content + '</div> </div></div>'
            } else if (data[i].direction == 1) {
                oneS = '<div class="message_cell"><div>' + time + '</div><div class="message">' + content + '</div></div>'
            }
            // oneS = '<div class="message_cell"><div>' + time + '</div><div class="message">' + content + '</div></div>'
            $('#getMessageRecord').prepend(oneS)
        }
    }

    function goSendMessage() {
        msisdn = sendMsisdn || $.cookie('msisdn')
        if (msisdn) {
            $('#cards').val(msisdn)
        } else {
            location.href = '#'
        }

    }


    //续费费用
    function goRenew() {
        msisdn = $.cookie('msisdn');
        if (msisdn) {
            $('#renewCard').text(msisdn);
            if (!_iotCardData) {
                var query_json = {
                    uid: $.cookie('dealer_id'),
                    msisdn: msisdn
                }
                wistorm_api._get('_iotCard', query_json, 'msisdn,iccid,status,expireIn,salePackage,monthUsed', auth_code, true, function (res) {
                    if (res.data) {
                        _iotCardData = res.data;
                        var fee = cardFee[_iotCardData.salePackage];
                        $('#renewAmount').text(fee)
                    } else {
                        location.href = '#home'
                    }
                })
            } else {
                var fee = cardFee[_iotCardData.salePackage];
                $('#renewAmount').text(fee)
            }
        } else {
            location.href = '#'
        }
    }





    // 显示流量卡的详细信息
    function frmInitDetailHtml(data) {
        var status = { "0": "未知", "1": "测试期", "2": "静默期", "3": "正常使用", "4": "停机", "5": "销户", "6": "预销户", "7": "单向停机", "8": "休眠", "9": "过户", "99": "号码不存在", "undefined": "" }
        var salePackage = parseFloat(data.salePackage);
        var monthUsed = parseFloat(data.monthUsed);
        $('#msisdn').text(data.msisdn);
        $('#iccid').text(data.iccid);
        $('#status').text(status[data.status])
        $('#expireIn').text(new Date(data.expireIn).format('yyyy-MM-dd'));
        $('#salePackage').text(salePackage.toFixed(3) + 'M/月');
        $('#monthUsed').text(monthUsed.toFixed(3) + 'M/月');
        $('#monthNoUsed').text(salePackage.toFixed(3) - monthUsed.toFixed(3) + 'M/月')
    }


    //获取该账号下流量卡费率
    function _accountGetCustomer(callback) {
        // getAmount()
        var cust_id = $.cookie('dealer_id');
        var query_json = {
            uid: cust_id
        };
        wistorm_api._get('customer', query_json, 'name,contact,tel,treePath,other', auth_code, true, function (json) {
            if (json.status_code === 0 && json.data) {

                var treePath = json.data.treePath;
                var trees = treePath.split(",");
                trees = trees.filter(function (value) {
                    return value !== "";
                });
                var query_json = {
                    uid: trees.join("|")
                };
                var parentYearFee2 = parentYearFee5 = parentYearFee30 = parentYearFee100 = 0;
                wistorm_api._list('customer', query_json, 'uid,other', 'uid', 'uid', 0, 0, 1, -1, auth_code, true, function (custs) {
                    if (custs.status_code === 0 && custs.total > 0) {
                        for (var i = 0; i < custs.total; i++) {
                            if (custs.data[i].uid == cust_id) {
                                if (custs.data[i].other) {
                                    if (custs.data[i].other.flow) {
                                        if (custs.data[i].other.flow[2]) {
                                            parentYearFee2 += parseFloat(custs.data[i].other.flow[2].parentYearFee || 0)
                                        }
                                        if (custs.data[i].other.flow[5]) {
                                            parentYearFee5 += parseFloat(custs.data[i].other.flow[5].parentYearFee || 0)
                                        }
                                        if (custs.data[i].other.flow[30]) {
                                            parentYearFee30 += parseFloat(custs.data[i].other.flow[30].parentYearFee || 0)
                                        }
                                        if (custs.data[i].other.flow[100]) {
                                            parentYearFee100 += parseFloat(custs.data[i].other.flow[100].parentYearFee || 0)
                                        }
                                    }
                                }
                            } else {
                                if (custs.data[i].other) {
                                    if (custs.data[i].other.flow) {
                                        if (custs.data[i].other.flow[2]) {
                                            parentYearFee2 += parseFloat(custs.data[i].other.flow[2].parentYearFee || 0) + parseFloat(custs.data[i].other.flow[2].yearFee || 0);
                                        }
                                        if (custs.data[i].other.flow[5]) {
                                            parentYearFee5 += parseFloat(custs.data[i].other.flow[5].parentYearFee || 0) + parseFloat(custs.data[i].other.flow[5].yearFee || 0);
                                        }
                                        if (custs.data[i].other.flow[30]) {
                                            parentYearFee30 += parseFloat(custs.data[i].other.flow[30].parentYearFee || 0) + parseFloat(custs.data[i].other.flow[30].yearFee || 0);
                                        }
                                        if (custs.data[i].other.flow[100]) {
                                            parentYearFee100 += parseFloat(custs.data[i].other.flow[100].parentYearFee || 0) + parseFloat(custs.data[i].other.flow[100].yearFee || 0);
                                        }
                                    }
                                }
                            }
                        }

                        cardFee = {
                            2: parentYearFee2,
                            5: parentYearFee5,
                            30: parentYearFee30,
                            100: parentYearFee100
                        }
                        if (callback) {
                            callback()
                        }
                        // console.log(cardFee)
                    }
                });
            }
        });
    }








    function getAmount(callback) {
        var query = {
            objectId: $.cookie('dealer_id')
        }
        wistorm_api.get(query, '', auth_code, function (user) {
            // amount = parseFloat(user.data.balance)
            callback(user)
            // console.log(amount)
        })
    }


    function changeHeight(id, minus) {
        var h = $(window).height() - minus;
        $(id).height(h + 'px');
        $(id).scroll(function (e) {
            // console.log($(id).scrollTop())
            
            var msisdn = $('#showCard').text()
            if ($(id).scrollTop() == 0 && lastTime != 0) {
                var oldScollHeight = $('#getMessageRecord')[0].scrollHeight
                var url = 'https://in.gpsoo.net/1/cardpool/charge?method=wechatQuerySmsResponse&msisdn=' + msisdn + '&last_time=' + lastTime
                $.ajax({
                    url: url,
                    type: 'get',
                    dataType: 'JSON',
                    success: function (json) {
                       
                        var _smsList = json.data.smsList
                        lastTime = _smsList[0] ? _smsList[0].create_time : 0
                        loadMore(_smsList)
                        var newScollHeight = $('#getMessageRecord')[0].scrollHeight
                        $('#getMessageRecord').scrollTop(newScollHeight - oldScollHeight)

                    },
                    error: function (err) {
                        showTip('获取数据错误')
                    }
                })
            }

        })
    }

    function scrollToEnd(id) {//滚动到底部
        var h = $(id)[0].scrollHeight - $(window).height() + 100;
        $(id).scrollTop(h);
    }

})

function showTip(str) {
    var div = document.createElement('div');
    div.innerText = str;
    div.className = 'showTip'
    $('body').append(div);
    setTimeout(function () { $(div).remove() }, 1000)
}





