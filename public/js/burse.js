$(document).ready(function () {
    // var _body = `提现${amount}元`;
    // var eAccess = encodeURIComponent(auth_code)
    // var _link = `http://h5.bibibaba.cn/pay/wicare/wxpayv3/scanreq.php?action=withdraw&token=${eAccess}&body=${_body}&total=${amount}`
    // wistorm_api.payService
    // wistorm_api.getBillList

    // $('')

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
                setTimeout(htmlInit, 200)
                // console.log(stack.dom,'dd')
            });

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
        // .container 设置了 overflow 属性, 导致 Android 手机下输入框获取焦点时, 输入法挡住输入框的 bug
        // 相关 issue: https://github.com/weui/weui/issues/15
        // 解决方法:
        // 0. .container 去掉 overflow 属性, 但此 demo 下会引发别的问题
        // 1. 参考 http://stackoverflow.com/questions/23757345/android-does-not-correctly-scroll-on-input-focus-if-not-body-element
        //    Android 手机下, input 或 textarea 元素聚焦时, 主动滚一把
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
        androidInputBugFix();
        setPageManager();

        window.pageManager = pageManager;
        window.home = function () {
            location.hash = '';
        };
    }
    init();


    var auth_code;
    var oldOpenId;
    var iswithdraw = false;
    var $iosDialog1 = $('#iosDialog1');
    var id = setInterval(function () {
        htmlInit()
        clearInterval(id)
    }, 200)


    function htmlInit() {
        auth_code = $.cookie('auth_code');
        $iosDialog1 = $('#iosDialog1');
        getAmount()
        WxBind()

        $('#bindWxBtn').click(function () {
            var eAccess = encodeURIComponent(auth_code)
            var _link = `http://h5.bibibaba.cn/pay/wicare/wxpayv3/scanreq.php?action=bind&token=${eAccess}`;
            location.href = _link;
        })

        $('#unbindWxBtn').click(function () {
            var eAccess = encodeURIComponent(auth_code)
            var _link = `http://h5.bibibaba.cn/pay/wicare/wxpayv3/scanreq.php?action=unbind&token=${eAccess}`;
            location.href = _link;
        })
        $('#drawCancel').off('click', drawCancelFun)
        $('#drawCancel').on('click', drawCancelFun)
        $('#drawSubmit').off('click', drawSubmitFun)
        $('#drawSubmit').on('click', drawSubmitFun)
        $('#withdrawDialog').off('click', withdrawDialogFun)
        $('#withdrawDialog').on('click', withdrawDialogFun);
        $('#detail').off('click', detailFun)
        $('#detail').on('click', detailFun);
    }

    function drawCancelFun() {
        console.log(1)
        $iosDialog1.fadeOut(200);
    }

    function drawSubmitFun() {
        var amount = $('#rechargeAmount').val().trim();
        var amountRegx = /^\d+(\.\d{1,2})?$/
        if (amount == '') {
            alert('请输入提现金额！');
            return;
        }
        if (!amountRegx.test(amount)) {
            alert('请输入正确的提现金额！');
            return;
        }
        var _body = `提现${amount}元`;
        var eAccess = encodeURIComponent(auth_code)
        var _link = `http://h5.bibibaba.cn/pay/wicare/wxpayv3/scanreq.php?action=withdraw&token=${eAccess}&body=${_body}&total=${amount}`
        location.href = _link
    }
    function withdrawDialogFun() {
        if (!iswithdraw) {
            return
        }
        $iosDialog1.fadeIn(200);
    }

    function detailFun() {
        setTimeout(function () {
            $('#detail_cell').empty();
            // var loadData = loadDataFun();
            $('#detail_cell').append(loadDataFun());
            pageno = 1
            getBillList()
            // $('#detail_cell')
            // console.log($('#detail_cell'))
        }, 200)
    }


    function getAmount() {
        var query = {
            objectId: $.cookie('dealer_id')
        }
        wistorm_api.get(query, '', auth_code, function (user) {
            console.log(user)
            $('#balance').text('￥' + parseFloat(user.data.balance).toFixed(2));
            $('#frozenBalance').text('￥' + parseFloat(user.data.frozenBalance).toFixed(2));
        })
    }
    var pageno = 1;
    var allDate = [];
    function getBillList() {
        var dealer_id = $.cookie('dealer_id');
        var startTime = '2010-01-01 00:00:00';
        var endTime = '2099-01-01 00:00:00';
        var pageCount = 20
        wistorm_api.getBillList(dealer_id, startTime, endTime, pageno, pageCount, auth_code, function (stat) {
            if (stat.total == 0) {
                $('#detail_cell').empty();
                $('#detail_cell').append(loadNoDataFun());
            } else {
                if (pageno == 1) {
                    $('#detail_cell').empty();
                }
                console.log(stat.data)
                stat.data.forEach(function (ele, i) {
                    var billH = showBill(ele);
                    $('#detail_cell').append(billH)
                })
                if (pageno * pageCount >= stat.total) {
                    $('#detail_cell').append(loadNoDataFun())
                } else {
                    $('.loadMore').remove();
                    loadMore()
                }
            }
            // console.log(stat)
        })
    }

    function WxBind() {
        var query = {
            objectId: $.cookie('dealer_id')
        }
        wistorm_api.getUserList(query, 'authData', 'createdAt', 'createdAt', 0, 0, -1, auth_code, function (res) {
            console.log(res)
            if (res.status_code == 0 && res.data.length) {
                if (res.data[0].authData) {
                    if (res.data[0].authData.openid) {
                        $('#withdrawDialog').removeClass('weui-btn_disabled');
                        iswithdraw = true;
                        $('.burseIcon').css('background', 'url(' + res.data[0].authData.weixin.headimgurl + ')')
                        $('.burseIcon').css('backgroundSize', '102px')
                        $('.burseIcon').css('backgroundRepeat', 'no-repeat')
                        $('#unbindWxBtn').show();
                        $('#bindWxBtn').hide();
                    } else {
                        $('#withdrawDialog').addClass('weui-btn_disabled');
                        $('.burseIcon').css('background', 'url(./img/burse.svg)')
                        $('.burseIcon').css('backgroundSize', '102px')
                        $('.burseIcon').css('backgroundRepeat', 'no-repeat')
                        iswithdraw = false;
                        $('#bindWxBtn').show();
                        $('#unbindWxBtn').hide();
                    }
                } else {
                    $('#withdrawDialog').addClass('weui-btn_disabled');
                    $('.burseIcon').css('background', 'url(./img/burse.svg)')
                    $('.burseIcon').css('backgroundSize', '102px')
                    $('.burseIcon').css('backgroundRepeat', 'no-repeat')
                    iswithdraw = false;
                    $('#bindWxBtn').show();
                    $('#unbindWxBtn').hide();
                }
            }
        })
    }

    function loadDataFun() {
        return `<div class="weui-loadmore">
                    <i class="weui-loading"></i>
                    <span class="weui-loadmore__tips">正在加载</span>
                </div>`
    }
    function loadNoDataFun() {
        return ` <div class="weui-loadmore weui-loadmore_line">
                    <span class="weui-loadmore__tips">暂无数据</span>
                </div>`
    }

    function loadMore() {

        var div = document.createElement('div');
        div.className = 'loadMore';
        div.innerHTML = '加载更多';
        $('#detail_cell').append(div);
        $(div).on('click', function () {
            div.innerHTML = '正在加载';
            pageno++;
            getBillList();

        })
        // return ` <div class="loadMore">加载更多</div>`
    }
    var _billType = { 1: "交易", 2: "充值", 3: "扣费", 4: "体现", 5: "退款", 6: "手续费", 7: "充押金", 8: "退押金", 9: "购买游戏币", 10: "商户分佣", 11: "服务费分成" };
    function showBill(data) {
        return `<div class="weui-cell">
                    <div class="weui-cell__bd">
                        <p>${data.remark}</p>
                        <p style="color:#ccc">${new Date(data.createdAt).format('yyyy-MM-dd hh:mm:ss')}</p>
                    </div>
                    <div class="weui-cell__ft">
                        ${data.billType == 2 ? `<span style="color:green">+ ${data.amount}</span>` : `<span style="color:#000">- ${data.amount}</span>`}
                        
                    </div>
                </div>`
    }

})