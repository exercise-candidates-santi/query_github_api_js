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
    
    function GithubRepo(ob){
        if( !ob || typeof ob !== "object" ) return;
        var default_ = "value not present";        
        this.name = ob.name || default_;
        this.fullName = ob.full_name || default_;        
        this.owner = ob.owner && ob.owner.name ? ob.owner.name : default_;
        this.language = ob.language || default_;
        this.description = ob.description;
        this.url = ob.url || default_;
    }
    GithubRepo.prototype = {
        toString: function(){
            var st = "";
            for (var p in this){
                if( this.hasOwnProperty(p) ){
                    //st
                }
            }
        }
    }
    /**
     * Quick paginator to show results.
     * @returns {app_L57.Paginator}
     */
    var Paginator = {
        container: null,
        items: null,
        numItemsPage: null,
        pages: 0        
    }
    /*function Paginator(container, items, numItemsPage, parser){
        if( !(this instanceof Paginator) ){
            return new Paginator(container, items, numItemsPage);
        }
        
        this.container = (function(el){
                var element;
                if( typeof el === "string" ){
                    element = $("#"+el);
                }else if( typeof el === "object" ){
                    element = $(element);
                }
                if( !element || !element.length ){
                    throw new Error("Paginator: The first argument must be an existing ID or a DOM element");
                }
                return element;
            })(container);
        
        
        this.num = numItemsPage || 10;
        this.pages = [];
        this.parseItems(items, parser);
        console.log(this);
    }
    Paginator.prototype = {
        parseItems: function(items, parser){
            if( $.isPlainObject(items) ){
                if( $.isFunction(parser) ){
                    parser.call(this, items);
                }else{
                    this.listItems = $.isArray(items.items) ? items.items : [];
                }                
                this.totalItems = items.total_count || 0;
            }            
        }
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
        defaultSuccess: function(data_, res, xhr){
            this.customSuccess.call(this, data_, res, xhr);
            var ev = $.Event( ApiSearcher.SEARCH, { response: data_,  result:res, xhr:xhr, target: this} ); 
            $(this).trigger(ev);
        },
        defaultError: function(data_, res, xhr){            
            this.customError.call(this, data_, res);
            var ev = $.Event( ApiSearcher.SEARCH, { response: data_,  result:res, xhr:xhr, target: this} ); 
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
                    success: function(response, res, xhr){
                        self.defaultSuccess(response, res, xhr);
                    },
                    error: function(response, res, xhr){
                        self.defaultError(response, res, xhr);
                    }
                };
            $.ajax(ajaxOptions);
        }
    }

    $(document).ready(function () {
        var apisearcher = ApiSearcher(API_URL);
         apisearcher.on(ApiSearcher.SEARCH, function(ev){
             //var paginate = Paginator("results", ev.response );
             Paginator.container = $("#results");
             Paginator.items = ev.response.items;
             console.log(ev);
         });
         $("#search").on("keyup", function (e) {                
            if (e.keyCode == 13) {
                var val= $(this).val();
                if (total < 20) {
                    apisearcher.doSearch(val);
                }
            }
        });
    })
})(jQuery)