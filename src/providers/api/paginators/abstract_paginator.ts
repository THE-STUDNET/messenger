import { Storage } from '@ionic/storage';
import { Garbage } from '../services/garbage.provider';

import { Api } from '../services/api.provider';
import { _getDeferred } from '../../../functions/getDeferred';

export abstract class AbstractPaginator {

    public element_page_number: number = 15;
    public outdated_timeout: number = 1000*5*60;
    public last_update: number = 0;

    public _method_get: string;
    public _default_params: any = {};
    public _start_filter: string = 'id';
    public _order_filter: any;
    public _column_filter: any;
    public _idx_name: string = 'id';

    public list: any[] = [];
    public indexes: number[] = [];
    public loading: Promise<any>;
    public nexting: Promise<any>;
    public cache_size: number = 0;
    public total: number;

    public readyPromise: Promise<any>;

    constructor( public name:string, public api: Api, public garbage:Garbage, public storage: Storage ){
        this.garbage.register(this);
    }

    ready(){
        if( !this.readyPromise ){
            if( this.cache_size ){
                this.readyPromise = this.storage.get( this.name ).then( data => {
                    this.list = data || [];
                    this.initIndexes();
                });
            }else{
                let deferred = _getDeferred();
                this.readyPromise = deferred.promise;
                this.list = [];
                this.initIndexes();
                deferred.resolve();
            }
        }
        return this.readyPromise;
    }

    outdate(){
        this.last_update = 0;
    };
    
    unset( id: number ){
        var idx = this.indexes.indexOf(id);
        if( idx !== -1 ){
            this.indexes.splice(idx, 1);
            this.list.splice(idx, 1);
            this.updateCache();
        }
    };

    get( forceRefresh?:boolean ): Promise<any>{                
        var promise = this.loading;
        if( !this.loading ){
            var deferred = _getDeferred();
            promise = deferred.promise;
            this.loading = promise;

            this.ready().then( () => {            
                if( !this.list.length ){                    
                    this.api.queue( this._method_get, this._buildGetParams() ).then( result =>{
                        var data = this.formatResult(result);
                        this._prependDatas( data );
                        deferred.resolve( data );
                        this.loading = undefined;
                        this.last_update = Date.now();
                    }, () => {
                        deferred.reject();
                        this.loading = undefined;
                    });
                    
                }else if( this.isOutDated() || forceRefresh ){
                    this.api.queue( this._method_get, this._buildRefreshParams() ).then( result => {
                        var data = this.formatResult(result);
                        this._prependDatas( data );
                        deferred.resolve( data );
                        this.loading = undefined;
                        this.last_update = Date.now();
                    }, () => {
                        deferred.reject();
                        this.loading = undefined;
                    });
                }else{
                    deferred.resolve();
                    this.loading = undefined;
                }
            });
        }
        return promise;
    }

    next(){
        if( !this.nexting ){
            var deferred = _getDeferred();
            this.nexting = deferred.promise;

            this.ready().then( () => {
                this.api.queue( this._method_get, this._buildNextParams() ).then( result => {
                    var data = this.formatResult( result );
                    this._appendDatas( data );
                    this.nexting = undefined;
                    deferred.resolve( data );
                }, () => {
                    this.nexting = undefined;
                    deferred.reject();
                });
            });
        }
        return this.nexting;
    };

    formatResult( data: any ): any{
        return data;
    }

    _prependDatas( data: any[] ){
        var idx, 
            id_val,
            i= data.length-1;
            
        for(;i>=0;i--){
            id_val = parseInt(data[i][this._idx_name]);
            idx = this.indexes.indexOf( id_val );
            
            if( idx !== -1 ){
                this.indexes.splice( idx, 1 );
                this.list.splice( idx, 1 );
            }
            
            this.indexes.unshift( id_val );
            this.list.unshift( data[i] );
        }

        this.updateCache();
    }

    _appendDatas( data: any[] ){
        var count = this.list.length, 
            idx, id_val,
            i=0, 
            length=data.length;
            
        for(;i<length;i++){
            id_val = parseInt( data[i][this._idx_name] );
            idx = this.indexes.indexOf( id_val );
            
            if( idx !== -1 ){                        
                this.indexes.splice( idx, 1 );
                this.list.splice( idx, 1 );                        
            }
            
            this.indexes.push( id_val );
            this.list.push( data[i] );
        }
        
        if( count < this.cache_size ){
            this.updateCache();
        }
    }

    updateCache(){
        if( this.cache_size ){
            var cachedDatas = this.list.slice(0, this.cache_size );
            this.storage.set( this.name, cachedDatas );
        }
    }

    _buildGetParams(): object{
        return { 
            ...this._default_params,
            ...{
                filter:{
                    p: 1,
                    n: this.element_page_number,
                    o: this._order_filter
                }
            }
        };
    }

    _buildRefreshParams(): object{
        var key_column_filter = Object.keys(this._column_filter)[0],
            column_filter = {};
                    
        column_filter[key_column_filter] = this._column_filter[key_column_filter]==='>'?'<':'>';
        
        return { 
            ...this._default_params, 
            ...{
                filter:{
                    s: this._getStartRefresh(),
                    o: this._order_filter,
                    c: column_filter
                }
            }
        };
    }

    _buildNextParams(): object{
        return {
            ...this._default_params,
            ...{
                filter:{
                    n: this.element_page_number,
                    o: this._order_filter,
                    c: this.list.length ? this._column_filter: undefined,
                    s: this.list.length ? this._getStartNext(): undefined,
                }
            }
        };
    }

    _getStartNext(){
        return this._start_filter.split('.')
            .reduce(( start, key ) => { return start[key]; }, this.list[this.list.length-1]);
    }

    _getStartRefresh(){
        return this._start_filter.split('.')
            .reduce( ( start, key ) => { return start[key]; }, this.list[0]);        
    }

    initIndexes(){
        this.indexes = [];            
        if( this.list.length ){
            this.list.forEach( datum => {
                this.indexes.push( parseInt(datum[this._idx_name]) );
            });
        }
    }

    isOutDated(): boolean{
        return this.last_update !== undefined ? (Date.now() - this.last_update) > this.outdated_timeout: true;
    }

    clear(): void{
        this.storage.remove( this.name );
        this.list = [];
        this.indexes = [];
        this.total = undefined;
    }
}