import 'rxjs/add/operator/toPromise';

import { Injectable, Inject } from '@angular/core';
import { Http, RequestOptionsArgs, Headers, Response } from '@angular/http';
import { Events } from '../../events/events.provider';
import { _getDeferred } from '../../../functions/getDeferred';

@Injectable()
export class Api {
    id: number = 0;
    url: string;
    authorization_header: string;
    headers: Headers;
    options: RequestOptionsArgs = {};

    private preparingBatch: boolean = false;
    private batchInQueue: any;
    private batchQ: any;

    constructor(public http: Http, @Inject('Configuration') config, private events: Events ) {
        this.url = config.api.url;
        this.authorization_header = config.api.authorization_header;
        this.headers = new Headers([]);
        this.options.headers = this.headers;
    }

    setAuthorization( token?: string ){
        if( token ){
            this.headers.set( this.authorization_header, token );
        }else{
            this.headers.delete( this.authorization_header );
        }
    }

    send( method: string, params: object, timeout?: number|Promise<any> ): Promise<any>{
        let deferred = _getDeferred();
        let subscriber = this.http.post(this.url,{jsonrpc:'2.0',method:method, params:params,id: this.id++, }, this.options )
            .subscribe( 
                (response: Response) => {
                    try{
                        var rpcResponse = response.json();
                    }catch( e ){
                        deferred.reject({code:0,message:'Response is not a JSON string'});
                    }
                    if( rpcResponse.error ){
                        this.processError( rpcResponse.error );
                        deferred.reject(rpcResponse.error);
                    }else{
                        deferred.resolve(rpcResponse.result);
                    }
                }, 
                () => { deferred.reject({code:0}) }
            );

        if( typeof timeout === 'number' ){
            setTimeout( () => { 
                subscriber.unsubscribe();
                deferred.reject(); 
            });
        }else if( timeout instanceof Promise ){
            timeout.then( () => {
                subscriber.unsubscribe();
                deferred.reject(); 
            })
        }

        return deferred.promise;
    }

    onError( callback ){
        return this.events.on('api::error', callback );
    }

    private processError( error ){
        this.events.process('api::error', error );
    }

    queue( method: string, datas: object ){
        var deferred = {resolve:undefined, reject:undefined, promise:undefined},
            request = {jsonrpc:'2.0',method:method,params:datas,id: this.id++ };

        deferred.promise = new Promise((resolve,reject)=> {
            deferred.reject = reject;
            deferred.resolve = resolve;
        });

        if( !this.preparingBatch ){
            this.batchInQueue = [];
            this.batchQ = {};
            this.preparingBatch = true;

            setTimeout(() => this.sendBatch(), 25);
        }

        this.batchInQueue.push(request);
        this.batchQ[request.id] = deferred;

        return deferred.promise;
    }

    sendBatch(){
        var batch = this.batchInQueue,
            deferreds = this.batchQ;

        this.batchInQueue = this.batchQ = undefined;
        this.preparingBatch = false;

        this.http.post(this.url, batch, this.options )
            .toPromise().then( response => {
                try{
                    var rpcResponse = response.json();
                }catch( e ){
                    throw {code:0,message:'Response is not a JSON string'};
                }

                if( rpcResponse && Array.isArray(rpcResponse) ){
                    rpcResponse.forEach( ( datum, index ) => {
                        var id = datum.id || batch[index].id;
                        if( datum.error ){
                            deferreds[id].reject( datum.error );
                            this.processError( datum.error );
                        }else{
                            deferreds[id].resolve( datum.result );
                        }
                    });
                }else{
                    rejectAll();
                }
            }).catch( rejectAll );

        function rejectAll(){
            Object.keys(deferreds).forEach((k) => {
                deferreds[k].reject({code:0});
            });
        }
    }
}
