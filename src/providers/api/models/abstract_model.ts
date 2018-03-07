import 'rxjs/add/operator/timeout';

import { Api } from '../services/api.provider';
import { _getDeferred } from '../../../functions/getDeferred';

export abstract class AbstractModel {

    public _emptyOnRefresh: boolean = true;
    public _req_aborters: any = [];
    public outdated_timeout: number = 1000 * 60 * 5;
    public queue_timeout: number = 50;

    public _method_get: string;

    public cache_model_prefix: string;
    public cache_list_name: string;
    public cache_size: number = 20;

    public list: any = {};
    public cached: any;
    public queued: {deferred: any,ids: any};

    constructor( public api: Api ) {
        this.cached = JSON.parse( localStorage.getItem(this.cache_list_name) || '[]');
        if( this._emptyOnRefresh ){
            this.clear();
        }
    }


    clear(): void{
        this.list = {};

        // ABORT REQUESTS
        //this._req_aborters.forEach(function(a){ a.resolve(); });
        //this._req_aborters = [];

        // CLEAR CACHED MODELS
        this.cached.forEach(function( uid ){
            localStorage.removeItem( this.cache_model_prefix+uid );
        }.bind(this));

        // CLEAR LIST OF CACHED ITEMS
        this.cached = [];
        localStorage.removeItem( this.cache_list_name );
    }

    // CHECK IF A UPDATED DATE IS OUTDATED
    _isOutDated( date, delay ): boolean{
        return Date.now() - (new Date(date)).getTime() > delay;
    }

    // BUILD GET PARAMS
    _buildGetParams( ids ): any{
        return { id: ids };
    }

    // GET MODEL FROM CACHE
    _getFromCache( uid ){
        this.list[uid] = JSON.parse( localStorage.getItem( this.cache_model_prefix + uid ) );
        return this.list[uid];
    }

    _format( d ){
        return d;
    }

    _setModel( datum, _index ){
        var index = _index+'';

        if( !this.list[index] ){
            this.list[index] = {};
        }

        this.list[index].datum = datum === null ? null : this._format( datum );
        this.list[index].updated_date = Date.now();

        delete( this.list[index].promise );

        var cacheIndex = this.cached.indexOf(index);

        if( cacheIndex === -1 && datum !== null ){
            if( this.cached.length === this.cache_size ){
                var uid = this.cached.pop();
                localStorage.removeItem( this.cache_model_prefix + uid );
            }

            this.cached.unshift(index);
            localStorage.setItem( this.cache_list_name, JSON.stringify(this.cached) );
        }else if( cacheIndex !== -1 && datum === null ){
            this._deleteModelCache(index);
        }

        // SET CACHE
        this._updateModelCache(index);
    }

    _updateModelCache( index ){
        localStorage.setItem( this.cache_model_prefix+index, JSON.stringify({
            updated_date: this.list[index].updated_date,
            datum: this.list[index].datum
        }));
    }

    _deleteModelCache( _index ){
        var index = _index+'';
        localStorage.removeItem( this.cache_model_prefix+index );

        var cdx = this.cached.indexOf(index);
        if( cdx !== -1 ){
            this.cached.splice( cdx, 1 );
            localStorage.setItem( this.cache_list_name, JSON.stringify(this.cached) );
        }
    }

    _outdateModel = function( uid ){
        var model = this._getModel(uid);
        if( model ){
            model.updated_date = 0;
            this._updateModelCache( uid );
        }
    }

    _getModel( _uid ){
        var uid = _uid+'', model = this.list[uid];

        if( !model && this.cached.indexOf(uid+'') !== -1 ){
            model = this._getFromCache( uid );
        }

        return model;
    }

    _deleteModel( index ){
        if( this.list[index] ){
            delete( this.list[index] );
            this._deleteModelCache(index);
        }
    }


    // TO DO => Timeout management & Maybe separate forced & unforced queue...
    queue( uids: any, force?:boolean, timeout?:number ): Promise<any>{
        if( !this.queued ){
            this.queued = {
                deferred: _getDeferred(),
                ids: {}
            };

            uids.forEach(function(k){ this.queued.ids[k]=null; }.bind(this));

            setTimeout(function(){
                this.get( Object.keys(this.queued.ids), force )
                    .then(this.queued.deferred.resolve, this.queued.deferred.reject);
                delete( this.queued );
            }.bind(this), timeout || this.queue_timeout );
        }else{
            uids.forEach(function(k){ this.queued.ids[k]=null; }.bind(this));
        }

        return this.queued.deferred.promise;
    }

    get( uids:any, force?:boolean, timeout?:number ): Promise<any>{

        var deferred = _getDeferred(),
            ids = uids.concat(),
            //outdateds = [],
            promises = [],
            count = -1,
            failed = false,
            resolve = function(){
                count++;
                if( count === promises.length ){
                    if( !failed ){
                        deferred.resolve();
                    }else{
                        deferred.reject();
                    }
                }
            }, fail = function(){
                failed = true;
                resolve();
            };

        //if( !force ){
            // CHECK WICH MODEL HAS TO BE REQUESTED
            uids.forEach(function( uid ){
                var model = this._getModel( uid );
                // IF MODEL DATUM EXITS && NOT OUTDATED
                if( !force && model && model.datum &&
                    !this._isOutDated( model.updated_date, timeout || this.outdated_timeout ) ){
                    ids.splice( ids.indexOf(uid), 1 );
                }
                // IF MODEL IS ALREADY REQUESTED & DOESNT EXIST => DONT REQUEST MODEL & WAIT MODEL RECEPTION TO RESOLVE.
                else if( model && model.promise ){
                    if( promises.indexOf( model.promise ) === -1 ){
                        promises.push( model.promise );
                        model.promise.then( resolve, fail );
                    }
                    ids.splice( ids.indexOf(uid), 1 );
                }
            }.bind(this));
        //}

        // IF THERE IS STILL IDS TO REQUEST
        if( ids.length ){
            var methodDeferred = _getDeferred();

            // CREATE & SET MODEL PROMISE
            ids.forEach(function( uid ){
                if( !this.list[uid] ){
                    this.list[uid] = {};
                }
                this.list[uid].promise = methodDeferred.promise;
            }.bind(this));

            // CREATE REQUEST ABORTER.
            //var a = _getDeferred();
            //this._req_aborters.push( a );

            // REQUEST MODELS
            this.api.queue( this._method_get, this._buildGetParams(ids) ).then(( d ) => {
                // DELETE REQUEST ABORTER.
                //this._req_aborters.splice( this._req_aborters.indexOf(a) );

                Object.keys(d).forEach(( k ) => {
                    this._setModel( d[k], k);
                });

                methodDeferred.resolve();
            }, function(){
                ids.forEach(function( k ){
                    this._deleteModel( k );
                }.bind(this));

                methodDeferred.reject( arguments );
            }.bind(this));

            methodDeferred.promise.then(resolve, fail);
        }else{
            resolve();
        }
        return deferred.promise;
    }


}
