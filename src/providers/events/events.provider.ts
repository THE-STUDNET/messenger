import 'rxjs/add/operator/toPromise';

import { Injectable } from '@angular/core';
import { _getDeferred } from '../../functions/getDeferred';

@Injectable()
export class Events {

    public default_priority: number = 50;
    private listeners: any = {};
    private uid: number = 0;

    constructor(){}

    public on( event: string, callback: any, context?: any, priority?: number ){
        if( !this.listeners[event] ){
            this.listeners[event] = [];
        }
        this.uid ++;
        this.listeners[event].push({fn:callback, ctx:context, p:priority || this.default_priority, uid:this.uid});
        return this.uid;
    }

    private unbindListener( callback:any, event?:string ){
        var evt,
            index,
            listeners = event && this.listeners[event]? {[event]:this.listeners[event]}: this.listeners;

        if( Object.keys( listeners ).some(function( eventName ){
            return listeners[eventName].some(function( listener, i){
                if( listener.fn === callback ){
                    evt = eventName;
                    index = i;
                    return true;
                }
            });
        }) ){
            this.listeners[evt].splice( index, 1);
        }
    }

    private unbindListenerId( listener_id:number, event?:string ){
        var evt,
            index,
            listeners = event && this.listeners[event]? {[event]:this.listeners[event]}: this.listeners;

        if( Object.keys( listeners ).some(function( eventName ){
            return listeners[eventName].some(function( listener, i){
                if( listener.uid === listener_id ){
                    evt = eventName;
                    index = i;
                    return true;
                }
            });
        }) ){
            this.listeners[evt].splice( index, 1);
        }
    }

    public off( event?: any, listener_id?: number, callback?: any ){
        if( !event && !listener_id && !callback ){
            this.listeners = {};
        }else if( listener_id ){
            this.unbindListenerId( listener_id, event );
        }else if( callback ){
            this.unbindListener( callback, event );
        }else{
            delete( this.listeners[event] );
        }
    }

    public process( event: string, ...data ){
        var deferred = _getDeferred(),
            queue = {},
            eventObject = { type: event, data: data };

        if( this.listeners[event] && this.listeners[event].length ){
            // BUILD PRIORITY QUEUE OBJECT.
            this.listeners[event].forEach(function( listener ){
                if( !queue[ listener.p ] ){
                    queue[ listener.p ] = [];
                }
                queue[ listener.p ].push( listener );
            });

            var promise = undefined;
            var processPriority = ( priority ) => {
                var l = queue[priority].length,
                    d = _getDeferred(),
                    stepresolver = function(){
                        l--;
                        if( !l ){ d.resolve(); }
                    };

                queue[priority].forEach(function( listener ){
                    var stepPromise = listener.fn.bind(listener.ctx)( eventObject );
                    if( stepPromise )
                        stepPromise.finally(stepresolver);
                    else
                        stepresolver();
                });

                return d.promise;
            };

            Object.keys( queue ).sort(function(a:string,b:string){ return Number(a)-Number(b); }).forEach(function(k){
                if( promise ){
                    promise = promise.then( processPriority.bind(null,k) );
                }else{
                    promise = processPriority(k);
                }
            });

            promise.then( function(){ deferred.resolve(); });
        }else{
            deferred.resolve();
        }

        return deferred.promise;
    }
}
