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
    
    var GithubRepo = {
        headers: null,
        current: 0,
        last: 0,
        items: [],
        currentItems: [],
        xRateLimit: 0,
        xRateLimitRemain:0,
        xRateLimitReset: 0,
        total: 0,
        parseResponse: function(ev){
            if(!ev) return;
            //We get position of search in the pagination of github through the link header
            if(ev.xhr){
                var st = ev.xhr.getResponseHeader("link"),
                    re = /\<(https.+)\>.+(rel=["\']next["\']).+\<(https.+)\>.+(rel=["\']last["\'])/g,
                    res = re.exec(st), splitTmp;
                if(res.length === 5 && res[2].indexOf("next") !== -1 && res[4].indexOf("last") !== -1) {                    
                    splitTmp = res[1].split("page=");
                    this.url = splitTmp[0];
                    this.current = parseInt(splitTmp[1], 10) - 1;
                    splitTmp = res[3].split("page=");
                    this.last = parseInt(splitTmp[1], 10);
                }                
                this.xRateLimit = ev.xhr.getResponseHeader("X-RateLimit-Limit");
                this.xRateLimitRemain = ev.xhr.getResponseHeader("X-RateLimit-Remaining");
                this.xRateLimitReset = parseInt(ev.xhr.getResponseHeader("X-RateLimit-Reset"), 10) * 1000;
                this.headers = ev.xhr.getAllResponseHeaders();
            }
            if(ev.response){
                this.currentItems = ev.response.items || [];
                this.total = ev.response.total_count;
            }
            window.resett = this.xRateLimitReset;
        },
        toRepositoryArray: function(repos_){
            var repositories = [],
                repos,
                i = 0;
            if( !$.isArray(repos_) ){
                repos = this.currentItems;
            }
            for (; i<repos.length; i++){
                repositories.push( new GithubRepo.Repository(repos[i]) );
            }
            return repositories;
        }
    }
    /**
     * We just save the properties we need to save memory
     * @param {Object} ob object with all the properties we can get from the github api
     */
    GithubRepo.Repository = function(ob){
        if( !ob || typeof ob !== "object" ) return;
        var default_ = "value not present";        
        this.name = ob.name || default_;
        this.owner = ob.owner && ob.owner.login ? ob.owner.login : default_;
        this.properties = {
            full_name: ob.full_name || default_,
            language: ob.language || default_,
            description: ob.description || default_,
            url: ob.url || default_,
            followers: ob.owner && ob.owner.followers_url ? ob.owner.followers_url : default_
        }

    }
    
    GithubRepo.Repository.prototype = {
        renderProperties: function(){
            var props = this.properties,
                ul = $("<ul />"), 
                li, fixProp;
          for(var prop in props){
              if( props.hasOwnProperty(prop) ){
                  fixProp = prop.replace("_", " ");
                  li = $("<li><span>"+fixProp+": </span>" + "<span>"+props[prop]+"</span></li>");
                  ul.append(li);
              }
          }
          return ul;
        },
        render: function(){
            var container = $("<div />"),
                name = $("<div><span>"+this.owner+": </span>" + "<span>"+this.name+"</span></div>"),
                list = this.renderProperties();
            container.append(name);
            container.append(list);
            list.hide();
            name.on("click", function(){
                list.toggle();
            });
            
            return container;            
        }        
    }
    /**
     * Quick paginator to show results.
     * @returns {app_L57.Paginator}
     */
    var Paginator = {
        container: null,
        div: null,
        ul: null,
        items: null,
        numItemsPage: 30,
        class: 'paginated',
        pages: 0,
        renderer: function(item){
            var st = "";
            for (var ob in item){
                st += "<div>"+ob+": " +item[ob]+"</div>";
            }
            return $("<div>"+st+"</div>");
        },
        //We use ducktyping to check if items have a method to draw themselves.
        render: function(items){
            var tmpLi;
            if( !$.isArray(items) ) {
                if($.isArray(this.items)){
                    var items = this.items;
                }else{
                    return;
                }
                
            }
            if(!this.div || !this.ul) {
                this.paginate();
            }            
           
            try{                
                for(var i=0; i<items.length; i++){
                    if(items[i]){                        
                        tmpLi = this.toLiNode(items[i]);
                        if(tmpLi){
                            this.ul.append(tmpLi);
                        }
                        
                    }
                }
            }catch(e){
               
                throw Error("Could not render items. ",e.message);
            }

        },
        paginate: function(){
            var div, ul;
            if(!this.container) {
                this.container = $("<div />");
                $("body").append(this.container);
            }
            this.container.empty();
            div = $("<div>").attr("class", this.class),
            ul = $("<ul>");
            div.append(ul);
            this.container.append(div);
            this.div = div;
            this.ul = ul;
        },
        toLiNode: function(item){
            var li = $("<li />"), node;
            //if item doesn't have a way to be rendered:
            
            if( typeof item.render !== "function" ){
                node = this.renderer(item);
            }else{
                node = item.render();
            }
            if( typeof node === "string" || node instanceof jQuery || node.nodeType){
                li.append(node);
            }
            
            
            return li.children().length ? li : "";
        }
        
    }
    
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
             GithubRepo.parseResponse(ev);
             Paginator.container = $("#results");
             Paginator.items = GithubRepo.toRepositoryArray();
             Paginator.numItemsPage = GithubRepo.currentItems.length;
             Paginator.totalPages = Math.ceil(GithubRepo.total/Paginator.numItemsPage);
             Paginator.paginate();
             Paginator.render();
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