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
    
    var GithubRepoApi = {
        /**
         * All the response headers
         */
        headers: null,
        
        /**
         * url of github Api
         */ 
        url: "",
        /**
         * current response page number
         */        
        current: 0,
        
        /**
         * Last page number the github API will return
         */        
        last: 0,
        
        /* See: https://developer.github.com/v3/#rate-limiting */
        /**
         * Total repositories we get from the github API
         */        
        items: [],
        
        /**
         * Repositories we got in the last API call
         */        
        currentItems: [],
        
        /**
         * The maximum number of requests that the consumer is permitted to make per hour.
         */        
        xRateLimit: 0,
        
        /**
         * The number of requests remaining in the current rate limit window.
         */
        xRateLimitRemain:0,
        
        /**
         * The time at which the current rate limit window resets in UTC epoch seconds.
         */
        xRateLimitReset: 0,
        
        /**
         * Total number of repositories.
         */
        total: 0,
        
        /**
         * We extract all the data from the response
         * @param {Object} ev event object with the response and the xhr object
         * @returns {undefined}
         */
        parseResponse: function(ev){
            if(!ev) return;
            //We get position of search in the pagination of github through the link header
            if(ev.xhr){
                this.last = 0;
                var st = ev.xhr.getResponseHeader("link"),
                    re = /\<(https.+)\>.+(rel=["\']next["\']).+\<(https.+)\>.+(rel=["\']last["\'])/g,
                    res = re.exec(st), splitTmp;
                //if there are more than 1 page  
                if(res && res.length === 5 && res[2].indexOf("next") !== -1 && res[4].indexOf("last") !== -1) {                    
                    splitTmp = res[1].split("page=");
                    this.url = splitTmp[0];
                    this.current = parseInt(splitTmp[1], 10) - 1;
                    splitTmp = res[3].split("page=");
                    this.last = parseInt(splitTmp[1], 10);
                }else {
                    this.current = 1;
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
        },
        
        /**
         * Utility method to transform a group of repostitories to GithubRepoApi.Repository instances
         * @param {type} repos_
         * @returns {Array}
         */
        toRepositoryArray: function(repos_){
            var repositories = [],
                repos,
                i = 0;
            if( !$.isArray(repos_) ){
                repos = this.currentItems;
            }
            for (; i<repos.length; i++){
                repositories.push( new GithubRepoApi.Repository(repos[i]) );
            }
            return repositories;
        }
    }
    /**
     * We instance an object with the required data from each repository
     * We just save the properties we need to save memory
     * @param {Object} ob object with all the properties we can get from the github api
     */
    GithubRepoApi.Repository = function(ob){
        if( !ob || typeof ob !== "object" ) return;
        var default_ = "value not present";        
        this.name = ob.name || default_;
        this.owner = ob.owner && ob.owner.login ? ob.owner.login : default_;
        this.properties = {
            full_name: ob.full_name || default_,
            language: ob.language || default_,
            description: ob.description || default_,
            url: ob.html_url || default_,
            followers: ob.owner && ob.owner.followers_url ? ob.owner.followers_url : default_
        }

    }
    
    GithubRepoApi.Repository.prototype = {
        /**
         * Utility method to create a dom list of properties
         * @returns {Object} jQuery object with a list of properties
         */
        renderProperties: function(){
            var props = this.properties,
                ul = $("<ul />"), 
                li, fixProp, cleanProp;
          for(var prop in props){
              if( props.hasOwnProperty(prop) ){
                  fixProp = prop.replace("_", " ");
                  cleanProp = (prop === "url" || prop === "followers") ?
                            "<a href='"+props[prop]+"' target='_blank'>"+props[prop]+"</a>" 
                            : props[prop];
                  li = $("<li><span>"+fixProp+": </span>" + "<span>"+cleanProp+"</span></li>");
                  ul.append(li);
              }
          }
          return ul;
        },
        
        /**
         * Utility method to create a dom node with the required values of the repository.
         * @returns {Object} jQuery object with all the data from the repository
         */
        render: function(){
            var container = $("<div />"),
                name = $("<div><span>"+this.owner+": </span>" + "<span>"+this.name+"</span></div>"),
                list = this.renderProperties();
            container.append(name);
            container.append(list);
            list.hide();
            name.attr("class", "githubrepo-has-action");
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
        currentPage:0,
        totalPages: 0,
        class: 'paginated',
        selected: 'page-selected',
        pages: 0,
        provider: null,
        dots: "...",
        buttons: null,
        
        /**
         * Allows to render any kind of object
         * @param {Object} item
         * @returns {Object} jQuery node object 
         */
        renderer: function(item){
            var st = "";
            for (var ob in item){
                st += "<div>"+ob+": " +item[ob]+"</div>";
            }
            return $("<div>"+st+"</div>");
        },
        
        /**
         * Allows us to append each page of paginated elements
         * @param {Array} items elements to be displayed. If it is null we use the own Paginator items
         */
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
        
        /**
         * Creates the dom structure of pages
         */
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
            this.createPages();
        },
        
        /**
         * Adds actions to buttons
         */
        addPageActions: function(){
            var self = this, l;
            if($.isArray(this.buttons)){
                l = this.buttons.length;
                //return;
                try {
                    if(this.buttons[0]){
                        this.buttons[0].on("click", function(){
                            self.goPrevious();
                        });
                    }
                    if(this.buttons[l-1]){
                        this.buttons[l-1].on("click", function(){
                            self.goNext();
                        });
                    }
                    for(var i=1; i<l-1; i++){
                        if(this.buttons[i] && this.buttons[i].text() !== this.dots){
                            this.buttons[i].on("click", function(){
                                self.goToPage();
                            });
                        }
                    }
                }catch(e){
                    alert(e);
                }
            }
        },
        goNext: function(){
            if(this.currentPage < this.totalPages){
                this.currentPage++;
                this.paginate();
            }
        },
        goPrevious: function(){
            if(this.currentPage > 1){
                this.currentPage--;
                this.paginate();
            }
        },
        goToPage: function(){
            
        },
        createPages: function(){
            if( !this.div instanceof $ ) return;
            var max = 7,//we only show a maximum of 7 buttons
                num = max <= this.totalPages ? max : this.totalPages, 
                container = $("<div>"),
                current = this.currentPage,
                total = this.totalPages,
                limit = 3,
                previous = $("<span><<</span>") ,
                next =  $("<span>>></span>"),
                i = 1,
                dummy = $("<span>"+this.dots+"</span>"),
                layers = new Array(num+2), 
                begin = current <= limit, 
                end = total-current <= limit,
                ok = false;
            
            layers[0] = previous;
            layers[num+1] = next;
            if(total <= num){
                for(i=1; i<=num; i++){
                    layers[i] =  $("<span>"+i+"</span>");                    
                }
                layers[current].addClass("page-selected");
            }else {
                //if current page is one of the first three: 123..678
                if(begin || end){
                    do{
                        console.log("def ",i)
                        ok = i === current ? i : null;
                        if(i<limit){
                            layers[i] =  $("<span>"+i+"</span>");
                            i++;
                        }else if(i === limit){
                            layers[i] =  $("<span>"+i+"</span>");
                            i = num;
                        }else if(i > 4){
                            layers[i] =  $("<span>"+total+"</span>");
                            total--;
                            i--;
                        }                        
                        if(ok) layers[ok].addClass(this.selected);
                        
                    }while(i !== 4);
                    layers[4] = dummy;
                }else {
                    do {
                        if(i<limit){
                           layers[i] = $("<span>"+i+"</span>"); 
                        }else if( i=== 3 || i === 5 ){
                            if(current === 4){
                                layers[i] = i; 
                            }else{
                               layers[i] = dummy; 
                            }
                            
                        }else if(i===4){
                            layers[i] = $("<span>"+current+"</span>");
                            layers[i].addClass("page-selected");
                        }else{
                            console.log(total - (num-i))
                            layers[i] = $("<span>"+total+"</span>");
                        }
                        i++;
                    }while(i<=num);
                }
            }
            
            
            /*if(current < num){
                
            } else if(current === num){
                
            } else if(current > num && current <= this.totalPages){
                
            }*/
            
            /*if(current < 5 && last > num){
                for(; i<=5; i++){
                    layers[i] =  $("<span>"+i+"</span>");
                }
                layers[6] =  dummy;
                layers[7] =  $("<span>"+last+"</span>");
            } else if(current >= 5){
                for(var i=1; i<=num; i++){
                    layers[i] =  $("<span>"+i+"</span>");
                }
                if(current < num){
                    layers[5] =  $("<span>"+current+"</span>");
                    i = 6;
                    while(i<num){
                       layers[i] =  num;
                       i++;
                    }
                }else if(current > num){
                    
                }
            }
            
            if(last>current){
                layers.push(next);
            }*/
            
            /**/
            for(i=0; i<layers.length; i++){
                if(layers[i]) container.append(layers[i]);
            }
            this.div.prepend(container);            
            this.buttons = layers;
            this.addPageActions();
            
        },
        
        /**
         * Prepares each element as a list element wrapped in the li html tag
         * @param {Object} item to be wrapped
         * @returns {Object} jQuery li node
         */
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
            li.attr("class", "page-list-element");
            return li.children().length ? li : "";
        }
        
    }
    
    /**
     * Creates an instance to search an api
     * @param {String} url the API's url
     * @param {Function} defaultSuccessCb we can pass a search callback in the constructor
     * @param {Function} defaultErrorCb we can pass an error callback in the constructor
     * @returns {ApiSearcher}
     */
    function ApiSearcher(url, defaultSuccessCb, defaultErrorCb){
        if( !(this instanceof ApiSearcher) ){
            return new ApiSearcher(url, defaultSuccessCb, defaultErrorCb);
        }
        var noop = function(){};
        this.apiUrl = url;
        this.customSuccess = $.isFunction(defaultSuccessCb) ? defaultSuccessCb : noop;
        this.customError = $.isFunction(defaultErrorCb) ? defaultErrorCb : noop;
        
    }
    
    /**
     * Personal Authentication Token that allows us to call 20 times in a minute.
     * See: https://github.com/blog/1509-personal-api-tokens
     */
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
        
        /**
         * Method to make the ajax call to the API
         * @param {String} val string to search
         * @param {String} token_ authentication token, if null we use ApiSearcher.ACCESS_TOKEN
         */
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
    
    /**
     * We add a search button
     * @param {String} id element after which we add the button
     * @param {String} idButton 
     * @returns {htmlELEMENT} dom node of a button
     */
    function addButton(id, idButton, className){
        var wrap = $("#"+id).wrap("<div />").parent(),
            button = $("<button>Search github repositories</button>").attr("id", idButton);
        wrap.append(button);
        wrap.attr("class", className);
        return button;
    }
    
    /**
     * Start app
     */
    function main(){
        var layoutClass = "content-layout", //main layout class:
            button = addButton("search", "searchBtn", layoutClass);
            apisearcher = ApiSearcher(API_URL),
            resulDiv = $("#results"),
            searchInput = $("#search");
         
         resulDiv.attr("class", layoutClass)
         button.on("click", function(){
             apisearcher.doSearch($("#search").val());
         });
         
         apisearcher.on(ApiSearcher.SEARCH, function(ev){
             GithubRepoApi.parseResponse(ev);
             Paginator.container = resulDiv;
             Paginator.items = GithubRepoApi.toRepositoryArray();
             Paginator.currentPage = GithubRepoApi.current;
             Paginator.totalPages = GithubRepoApi.last;

             Paginator.paginate();
             Paginator.render();
         });
         
         searchInput.on("keyup", function (e) {                
            if (e.keyCode == 13) {
                var val= $(this).val();
                if (total < 20) {
                    apisearcher.doSearch(val);
                }
            }
        });
    }
    $(document).ready(function () {
        
        main();
    })
})(jQuery)