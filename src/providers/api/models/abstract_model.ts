import 'rxjs/add/operator/timeout';

import { Storage } from '@ionic/storage';

import { Api } from '../services/api.provider';
import { Garbage } from '../services/garbage.provider';
import { _getDeferred } from '../../../functions/getDeferred';

export abstract class AbstractModel {

    public _req_aborters: any = [];
    public outdated_timeout: number = 1000 * 60 * 5;
    public queue_timeout: number = 50;

    public _method_get: string;

    public cache_model_prefix: string;
    public cache_list_name: string;
    public cache_size: number = 30;

    public list: any = {};
    public cached: any;
    public queued: {deferred: any,ids: any};

    private _getCachedPromise: Promise<any>;
    private _storingCached: number = 0;
    private _getCachedModelPromises: any = {};

    constructor( public api: Api, public storage:Storage, public garbage:Garbage ) {
        garbage.register( this );
    }

    private _getCachedList(){
        if( !this._getCachedPromise ){
            if( this.cache_size ){
                this._getCachedPromise = this.storage.ready().then( () =>{ 
                    return this.storage.get( this.cache_list_name )
                        .then( data => {
                            this.cached = data || [];
                        },()=>{
                            this.cached = [];
                        }); 
                });
            }else{
                let d = _getDeferred();
                d.resolve();
                this.cached = [];
                this._getCachedPromise = d.promise;
            }
        }
        return this._getCachedPromise;
    }

    private _storeCachedList(){
        if( this._storingCached === 0 ){
            this._storingCached = 1;
            this.storage.set( this.cache_list_name, this.cached ).then(()=>{
                if( this._storingCached === 2 ){
                    this._storingCached = 0;
                    this._storeCachedList();
                }else{
                    this._storingCached = 0;
                }
            });
        }else{
            this._storingCached = 2;
        }
    }

    private _getCachedModel( uid ){
        if( !this._getCachedModelPromises[uid] ){
            this._getCachedModelPromises[uid] = this.storage.get( this.cache_model_prefix + uid ).then( data =>{
                delete( this._getCachedModelPromises[uid] );
                this.list[uid] = data;
                return data;
            }).catch( e =>{
                console.log('CATCH STORAGE GET', e);
            });
        }
        return this._getCachedModelPromises[uid];
    }

    public checkAndLoadModels( ids ): Promise<any>{
        try{
            let deferred = _getDeferred(),
                steps = ids.length,
                next = function(){
                    steps--;
                    if( !steps ){
                        deferred.resolve();
                    }
                }.bind(this);

            ids.forEach( id => {
                this._getModel( id ).then( model => {
                    if( !model || !model.datum ){
                        deferred.reject();
                    }else{
                        next();
                    }
                }).catch( e =>{
                    console.log('CATCH GET MODEL IN C&L', e);
                });
            });

            return deferred.promise;
        }catch( e ){
            console.log('CATCH C&L', ids, e );
        }
    }

    clear(): void{
        this.list = {};
        // CLEAR CACHED MODELS
        this.cached.forEach(function( uid ){
            this.storage.remove( this.cache_model_prefix + uid );
        }.bind(this));
        // CLEAR LIST OF CACHED MODELS
        this.cached = [];
        this.storage.remove( this.cache_list_name );
    }

    // CHECK IF A UPDATED DATE IS OUTDATED
    _isOutDated( date, delay ): boolean{
        return Date.now() - (new Date(date)).getTime() > delay;
    }

    // BUILD GET PARAMS
    _buildGetParams( ids ): any{
        return { id: ids };
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
        if( datum === null ){
            this._deleteModel(index);
        }else if( cacheIndex === -1 && this.cache_size ){
            this._addModelCache( index );
        }else if( this.cache_size ){
            this._updateModelCache( index );
        }
    }

    _addModelCache( index:string ){
        // Set model in cache
        this.storage.set( this.cache_model_prefix+index, {
            updated_date: this.list[index].updated_date,
            datum: this.list[index].datum
        });
        // Update cached list
        this.cached.unshift( index );
        if( this.cached.length > this.cache_size ){
            // Remove item if max number of cached model reached.
            this.storage.remove( this.cache_model_prefix + this.cached.pop() );
        }
        this._storeCachedList();
    }

    _updateModelCache( index ){
        this.storage.set( this.cache_model_prefix+index, {
            updated_date: this.list[index].updated_date,
            datum: this.list[index].datum
        });
    }

    _deleteModelCache( _index ){
        var index = _index+'';
        this.storage.remove( this.cache_model_prefix+index  );

        var cdx = this.cached.indexOf(index);
        if( cdx !== -1 ){
            this.cached.splice( cdx, 1 );
            this._storeCachedList();
        }
    }

    _outdateModel = function( uid ){
        this._getCachedList().then(()=>this._getModel(uid).then( data => {
            if( data ){
                data.updated_date = 0;
                if( this.cache_size ){
                    this._updateModelCache( uid );
                }
            }
        }));
    }

    _getModel( _uid ){
        var deferred = _getDeferred(),
            uid = _uid+'';

        this._getCachedList().then( () => {
            if( !this.list[uid] && this.cached.indexOf(uid) !== -1 ){
                this._getCachedModel( uid ).then( data => deferred.resolve(data) ).catch( e=>{
                    console.log('CATCH GETCACHEDMODEL IN GM', e);
                });
            }else{
                deferred.resolve( this.list[uid] );
            }
        }).catch( e =>{
            console.log('CATCH GET MODEL', e);
        });

        return deferred.promise;
    }

    _deleteModel( index ){
        delete( this.list[index] );
        if( this.cache_size ){
            this._deleteModelCache(index);
        }
    }

    _deletePromise( index ){
        if( this.list[index] ){
            delete( this.list[index].promise );
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
            modelsToGetLeft = uids.length,
            count = -1,
            failed = false,
            next = function(){
                modelsToGetLeft--;
                if( !modelsToGetLeft ){
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
                        // REQUEST MODELS
                        this.api.queue( this._method_get, this._buildGetParams(ids) ).then(( d ) => {
                            Object.keys(d).forEach(( k ) => {
                                this._setModel( d[k], k);
                            });
    
                            methodDeferred.resolve();
                        }, function(){
                            ids.forEach(function( k ){
                                this._deletePromise( k );
                            }.bind(this));
    
                            methodDeferred.reject( arguments );
                        }.bind(this));
    
                        methodDeferred.promise.then(resolve, fail);
                    }else{
                        resolve();
                    }
                }
            }.bind(this),
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

        // CHECK WICH MODEL HAS TO BE REQUESTED
        uids.forEach( uid => {
            this._getModel( uid ).then( model => {
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
                next();
            });            
        });        

        return deferred.promise;
    }
}
