import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
// Providers
import { Api } from '../services/api.provider';
import { Account } from '../services/account.provider';
import { AbstractPaginator } from '../paginators/abstract_paginator';
import { Events } from '../../events/events.module';
import { _getDeferred } from 'src/functions/getDeferred';

export class MessagesPaginator extends AbstractPaginator {

    public cache_size:number = 20;
    public element_page_number:number = 20;
    public _start_filter:string = 'id';
    public _order_filter:any = {'message.id':'DESC'};
    public _column_filter:any = {'message.id':'<'};
    public _default_params:any = { conversation_id: this.conversation_id };
    public _method_get:string = 'message.getList';

    public sendings:any[] = JSON.parse(localStorage.getItem('cvn'+this.conversation_id+'.snd')||'[]');

    constructor( public name:string, public api: Api, public conversation_id:number, public account: Account, public events: Events ){
        super( 'conversations', api );
    }

    formatResult( data:any ): any{
        this.total = data.count;
        return data.list;
    }

    private _cleanSendings(){
        let n = this.sendings.length-1;
        for(;n>=0;n--){
            if( this.sendings[n].id ){
                let index = this.indexes.indexOf( this.sendings[n].id );
                if( index !== -1 ){
                    this.sendings.splice( n, 1 );
                }
            }
        }
    }

    send( text?:string, library?:object ){
        // Create message...
        let uid = 'SND#'+(Math.random()+'').slice(2),
            message = {
                user_id: this.account.session.id,
                text: text,
                library: library,
                created_date: (new Date()).toISOString(),
                id: undefined,
                sid: uid,
                sendingFailed: undefined,
                promise: undefined
            },
            promise = this.api.send('message.send', {text:text, conversation_id:this.conversation_id, library:library}).then(data => {
                message.id = parseInt(data.message_id);
                // Refresh paginator list...
                return this.get(true).then( () => {
                    this.events.process('cvn'+this.conversation_id+'.messages.update');
                    this._cleanSendings();
                });
                
            }, () => {
                message.sendingFailed = true;
            });
        // Set promise to message
        message.promise = promise;
        // Add message to sendings list.
        this.sendings.push( message );
        // Return.
        return message;
    }

    resend( message ){
        let idx = this.sendings.indexOf(message);
        if( idx !== -1 ){
            this.sendings.splice( idx, 1 );
            this.send( message.text, message.library );
        }
    }
}

@Injectable()
export class MessagesPaginatorProvider {

    public cache_size: number = 5;
    public list: any = {};
    public cached: number[] = JSON.parse(localStorage.getItem('mpp')||'[]');

    public waitingMessages: any = {};
    public waitingConversations: number[];

    private static wc_key: string = 'wc';
    private static wcm_key_prefix: string = 'wcm';
    private wc_promise: Promise<any>;
    private wcm_promises: any = {};
    private wc_storing: number = 0;
    private wcm_storings: any = {};

    constructor( public api: Api, public account: Account, public events: Events, public storage: Storage){}

    getPaginator( conversation_id:number ): MessagesPaginator{
        if( !this.list[conversation_id] ){
            this.list[conversation_id] = new MessagesPaginator('cvn'+conversation_id, this.api, conversation_id, this.account, this.events );

            this.cached.push( conversation_id );
            if( this.cached.length > this.cache_size ){
                var remId = this.cached.shift();                
                if( this.list[remId] ){
                    this.list[remId].cache_size = 0;                                
                }
                localStorage.removeItem('cvn'+conversation_id);
            }
            localStorage.setItem('mpp',JSON.stringify(this.cached));
        }
        return this.list[conversation_id];
    }

    send( conversation_id:number, prev_id:number, text?:string, library?:object ){
        // Register message.
        let wid = this._setWaitingMessage( conversation_id, prev_id, 'sending', text, library );
        // Send message.
        return this.api.send('message.send', {text:text, conversation_id:conversation_id, library:library})
            .then( data => {
                // If paginator exist, refresh it.
                if( this.list[conversation_id] ){
                    // Update waiting message status.
                    this._updateWaitingMessage( conversation_id, prev_id, wid, 'sent' );
                    // Refresh
                    return this.list[conversation_id].get(true).then( ()=>{
                        this._removeWaitingMessage( conversation_id, prev_id, wid );
                        this.events.process('cvn'+conversation_id+'.messages.update');
                    }).catch( () => {

                    });
                }else{
                    // Delete waiting message.
                    this._removeWaitingMessage( conversation_id, prev_id, wid );
                    // Process conversation update event.
                    this.events.process('cvn'+conversation_id+'.messages.update');
                }
            }, err => {
                this._updateWaitingMessage( conversation_id, prev_id, wid, 'failed' );
                this.events.process('cvn'+conversation_id+'.messages.update');
            });
    }

    resend( conversation_id:number, old_prev_id:number, new_prev_id:number, wid: string ){
        let m = this.waitingMessages[conversation_id][old_prev_id][wid];
        this._removeWaitingMessage( conversation_id, old_prev_id, wid );
        return this.send( conversation_id, new_prev_id, m.text, m.library );
    }

    private _removeWaitingMessage( conversation_id:number, prev_id:number, wid:string ){
        delete( this.waitingMessages[conversation_id][prev_id][wid] );
        this._storeWaitingConversationMessages(conversation_id);
    }

    private _updateWaitingMessage( conversation_id:number, prev_id:number, wid:string, status:string ){
        this.waitingMessages[conversation_id][prev_id][wid].status = status;
        this._storeWaitingConversationMessages(conversation_id);
    }

    private _setWaitingMessage( conversation_id:number, prev_id:number, status:string, text?:string, library?:object ): string{
        if( !this.waitingMessages[conversation_id][prev_id] ){
            this.waitingMessages[conversation_id][prev_id] = {};
        }
        let id = prev_id+'.'+Date.now(); // /!\ Pay attention to duplicate messages
        this.waitingMessages[conversation_id][prev_id][id] = { wid:id, text:text, library:library, status:status };
        this._storeWaitingConversationMessages(conversation_id);
        return id;
    }

    private _storeWaitingConversationMessages( conversation_id:number ){
        if( !this.wcm_storings[conversation_id] ){
            this.wcm_storings[conversation_id] = 1;
            this.storage.set( MessagesPaginatorProvider.wcm_key_prefix+conversation_id, this.waitingMessages[conversation_id] )
                .then( () => {
                    if( this.wcm_storings[conversation_id] === 2 ){
                        delete(this.wcm_storings[conversation_id]);
                        this._storeWaitingConversationMessages( conversation_id );
                    }else{
                        delete(this.wcm_storings[conversation_id]);
                    }
                });
        }else{
            this.wcm_storings[conversation_id] = 2;
        }
    }

    private _getCachedWaitingConversationMessages( conversation_id:number ){
        if( !this.wcm_promises[conversation_id] ){
            if( this.waitingMessages[conversation_id] ){
                this.wcm_promises[conversation_id] = this._getWCM(conversation_id);
            }else{
                this.wcm_promises[conversation_id] = this._getCachedWaitingConversations().then(()=>this._getWCM(conversation_id));
            }
        }
        return this.wcm_promises[conversation_id];
    }

    private _getWCM( conversation_id:number ){
        return this.storage.get( MessagesPaginatorProvider.wcm_key_prefix+conversation_id )
            .then( data => {
                console.log('GET DATA FROM STORE', data); // TO REMOVE...
                data = data || {};
                // Clean waiting messages...
                Object.keys(data).forEach( prev_id => {
                    Object.keys(data[prev_id]).forEach( wid => {
                        if( data[prev_id][wid].status === 'sent' ){
                            delete( data[prev_id][wid]);
                        }
                    });
                });
                // Set waiting messages.
                this.waitingMessages[conversation_id] = data;
                delete(this.wcm_promises[conversation_id]);
            })
            .catch( ()=> {
                this.waitingMessages[conversation_id] = {};
                delete(this.wcm_promises[conversation_id]);
            });
    }

    private _getCachedWaitingConversations(){
        if( !this.wc_promise ){
            this.wc_promise = this.storage.get( MessagesPaginatorProvider.wc_key )
                .then( data => {
                    this.waitingConversations = data;
                    this.wc_promise = undefined;
                })
                .catch(()=>{
                    this.waitingConversations = [];
                    this.wc_promise = undefined;
                });
        }
        return this.wc_promise;
    }

    private _storeWaitingConversations(){
        if( this.wc_storing === 0 ){
            this.wc_storing = 1;
            this.storage.set( MessagesPaginatorProvider.wc_key, this.waitingConversations ).then(()=>{
                if( this.wc_storing === 2 ){
                    this.wc_storing = 0;
                    this._storeWaitingConversations();
                }else{
                    this.wc_storing = 0;
                }
            });
        }else{
            this.wc_storing = 2;
        }        
    }

    clearWaitings(){
        // Remove data from storage
        this.storage.remove( MessagesPaginatorProvider.wc_key );
        this.waitingConversations.forEach( id => {
            this.storage.remove( MessagesPaginatorProvider.wcm_key_prefix+id );
        });
        // Clear service in memory.
        this.waitingMessages = {};
        this.waitingConversations = [];
    }


    /*clear: function(){
        service.list = {};
        storage.removeItem('cml');
    }*/
}