/*
 # Endpoint URL #
 
 https://api.github.com/legacy/repos/search/{query}
 
 Note: Github imposes a rate limit of 60 request per minute. Documentation can be found at http://developer.github.com/v3/.
 
 # Example Response JSON #
 
 {
 "meta": {...},
 "data": {
 "repositories": [
 {
 "type": string,
 "watchers": number,
 "followers": number,
 "username": string,
 "owner": string,
 "created": string,
 "created_at": string,
 "pushed_at": string,
 "description": string,
 "forks": number,
 "pushed": string,
 "fork": boolean,
 "size": number,
 "name": string,
 "private": boolean,
 "language": number
 },
 {...},
 {...}
 ]
 }
 }
 */

/**
 # Endpoint URL: https://developer.github.com/v3/search/ #
 
 Right now the legacy api is deprecated and will be removed in the next version.  
 See:
 https://developer.github.com/v3/search/legacy/#legacy-search-api-is-deprecated
 
 I have created a personal token to avoid the limit of 5 requests per minute.
 See: https://developer.github.com/v3/search/#rate-limit
 
 I will use a personal token to increase this number up to 20 per minute:
 https://github.com/blog/1509-personal-api-tokens
 * 
 */

/**
 * Encapsulating actions an jQuery object
 */
(function ($) {
    var PAGE = 1,
        noop = function(){},
        API_URL = "https://api.github.com/search/repositories",
        total = 1;
    /**
     * Simple plugin to search an api and show the results in a list
     * @param {Object} initOptions basic configuration options
     * @param {String} initOptions.api api url
     * @param {Object} initOptions.resultsContainer either a dom object or its id as a string, this reference the container where results will be displayed.
     * @param {Function} initOptions.onError error callback that will be executed on an error
     * @param {Function} initOptions.onSuccess callback that will be executed when we fetch the api results
     * @returns {app_L57.$.fn}
     */
    /*$.fn.apiSearcher = function (initOptions) {
        var self = this,
                wrapper = $("<div>")
        empty = function () {
        },
                settings = $.extend({
                    // These are the defaults.
                    color: "#556b2f",
                    backgroundColor: "white"
                }, initOptions);

        if (settings.resultsContainer) {
            var el = document.getElementById(settings.resultsContainer);
            this.resultsContainer = $(el);
            if (!this.resultsContainer.length) {
                var el = $("<div />");
                el.attr("id", "results" + Math.floor(Math.random() * 100000000));
                $("body").append(el);
                this.resultsContainer = el;
            }
        }

        var toFunction = function (fn) {
            if (!$.isFunction(fn)) {
                fn = empty;
                console.log(fn, "is a not function")
            } else {
                console.log(fn, "is a function")
            }
            return fn;
        }

        var doSearch = function () {
            var ajaxOptions = {
                type: "GET",
                url: settings.api,
                dataType: "json",
                data: {q: self.val(), access_token: ACCESS_TOKEN},
                success: self.toFunction(settings.onSuccess),
                error: self.toFunction(settings.onError)
            };

            $.ajax(ajaxOptions);
        }

        this.wrap(wrapper);

        this.on("keyup", function (e) {
            if (e.which == 83)
                console.log(e, e.keyCode);
            if (e.keyCode == 13) {
                doSearch();
            }
        });
        return this;
    }*/
    
    function ApiSearcher(url, defaultSuccessCb, defaultErrorCb){
        if( !(this instanceof ApiSearcher) ){
            return new ApiSearcher(url, defaultSuccessCb, defaultErrorCb);
        }
        var noop = function(){};
        this.apiUrl = url;
        this.customSuccess = $.isFunction(defaultSuccessCb) ? defaultSuccessCb : noop;
        this.customError = $.isFunction(defaultErrorCb) ? defaultErrorCb : noop;
    }
    ApiSearcher.ACCESS_TOKEN = "2161f323efe781e7c9c8cb9986abb3c5ccf30cef";
    ApiSearcher.SEARCH = "ON_SEARCH";
    ApiSearcher.ERROR = "ON_ERROR";
    ApiSearcher.prototype = {        
        defaultSuccess: function(data_, res){
            this.customSuccess.call(this, data_, res);
            var ev = $.Event( ApiSearcher.SEARCH, { response: data_,  result:res, target: this} ); 
            $(this).trigger(ev);
        },
        defaultError: function(data_, res){            
            this.customError.call(this, data_, res);
            var ev = $.Event( ApiSearcher.SEARCH, { response: data_,  result:res, target: this} ); 
            this.trigger(ev);
        },
        trigger: function(ev){
            $(this).trigger(ev);
        },
        on: function(ev, action){
          $(this).on(ev, action);  
        },
        off: function(ev, action){
          $(this).off(ev, action);  
        },
        doSearch: function (val, token_) {
            var self = this,
                token = token_ || ApiSearcher.ACCESS_TOKEN,
                ajaxOptions = {
                    type: "GET",
                    url: self.apiUrl,
                    dataType: "json",
                    data: {q: val, access_token: token},
                    success: function(ev, data){
                        self.defaultSuccess(ev, data);
                    },
                    error: function(ev, data){
                        self.defaultError(ev, data);
                    }
                };
            $.ajax(ajaxOptions);
        }
    }
    var onError = function (data) {
        console.error("Error: ", data);
    }

    var onSuccess = function (data) {
        var resulDiv = $("#resul");
        
        //console.log("Success: ", total, data);
        /*total++;
        if (total < 20) {
            var e = $.Event("keyup");
            e.which = 13; // # Some key code value
            e.keyCode = 13;
            setTimeout(function () {
                $("#search").trigger(e);
            }, 3000);

        }*/
    }

    $(document).ready(function () {
        var apisearcher = ApiSearcher(API_URL, onSuccess, onError);
         apisearcher.on(ApiSearcher.SEARCH, function(ev){
             console.log("apisearcher on ", ev.response);
         });
         $("#search").on("keyup", function (e) {                
            if (e.keyCode == 13) {
                var val= $(this).val();
                /*setTimeout(function(){
                    apisearcher.doSearch($(this).val());
                }, 3000)*/
                if (total < 20) {
                    var e = $.Event("keyup");
                    e.which = 13; // # Some key code value
                    e.keyCode = 13;
                    apisearcher.doSearch(val);
                    setTimeout(function () {
                        $("#search").trigger(e);
                    }, 3000);
                    total++;
                }
            }
        });
    })
})(jQuery)