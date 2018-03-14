import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
// Providers
import { Api } from '../services/api.provider';
import { Garbage } from '../services/garbage.provider';
import { Account } from '../services/account.provider';
import { AbstractPaginator } from '../paginators/abstract_paginator';
import { Events } from '../../events/events.module';
import { _getDeferred } from '../../../functions/getDeferred';
import { Network } from '@ionic-native/network';
import { Subscription } from 'rxjs/Subscription';

export class MessagesPaginator extends AbstractPaginator {

    public cache_size:number = 20;
    public element_page_number:number = 20;
    public _start_filter:string = 'id';
    public _order_filter:any = {'message.id':'DESC'};
    public _column_filter:any = {'message.id':'<'};
    public _default_params:any = { conversation_id: this.conversation_id };
    public _method_get:string = 'message.getList';

    public sendingMessages: any[];
    public failedMessages: any;
    public newMessages: any[] = [];
    public messageReadyPromise: Promise<any>;

    public displayableIndexes: any[] = [];

    constructor( public name:string, public api: Api, public garbage:Garbage, public storage:Storage, 
        public conversation_id:number, public events:Events, public network: Network, public account:Account ){
        super( 'messages'+conversation_id, api, garbage, storage );
    }

    formatResult( data:any ): any{
        this.total = data.count;
        return data.list;
    }

    initIndexes(){
        this.indexes = [];
        this.displayableIndexes = [];
        if( this.list.length ){
            this.list.forEach( datum => {
                let id = parseInt(datum[this._idx_name]);
                this.indexes.push( id );
                if( this.failedMessages[id] ){
                    Object.keys(this.failedMessages[id]).sort().forEach( uid => {
                        this.displayableIndexes.unshift( uid );
                    });
                }
                this.displayableIndexes.unshift( id );
            });
        }
    }

    _prependDatas( data: any[] ){
        super._prependDatas( data );
        // Update displayable indexes list.
        var i=data.length-1, id;            
        for(;i>=0;i--){
            id = parseInt( data[i][this._idx_name] );
            this.displayableIndexes.push( id );
            if( this.failedMessages[id] ){
                Object.keys(this.failedMessages[id]).sort().forEach( uid => { //(a,b)=> parseInt(b)-parseInt(a)
                    this.displayableIndexes.push( uid );
                });
            }
        }        
    }

    _appendDatas( data: any[] ){
        super._appendDatas( data );
        // Update displayable indexes list.
        var id, i=0, length=data.length;   
        for(;i<length;i++){
            id = parseInt(data[i][this._idx_name]);
            if( this.failedMessages[id] ){
                Object.keys(this.failedMessages[id]).sort((a,b)=> parseInt(b)-parseInt(a)).forEach( uid => {
                    this.displayableIndexes.push( uid );
                });
            }
            this.displayableIndexes.unshift( id );
        }
        console.log( this, 'AFTER NEXT');
    }

    ready(){
        if( !this.messageReadyPromise ){
            let sendingPromise = this.storage.get( this.name+'.sendings' ).then( data => {
                this.sendingMessages = data || [];
            });
            let failedPromise = this.storage.get( this.name + '.failed' ).then( data => {
                this.failedMessages = data || {};
            });
            this.messageReadyPromise = sendingPromise.then(()=>failedPromise.then( ()=>super.ready() ));
        }
        return this.messageReadyPromise;
    }

    refresh(){
        return this.get(true).then( data => {
            // Clean sending messages.
            this.sendingMessages.forEach( m => {
                if( m.id ){
                    let idx = this.indexes.indexOf( m.id );
                    if( idx !== -1 ){
                        this.removeSending( m );
                    }
                }
            });
            console.log('REFRESH?', this.name +'.updated', this, data );
            // Process event.
            this.events.process( this.name +'.updated', data );
        });
    }

    addSending( text?:string, library?:any ){
        let message = { text:text, library:library, id:undefined, user_id:this.account.session.id };
        this.sendingMessages.push(message);
        this.storage.set( this.name +'.sendings', this.sendingMessages );
        return message;
    }

    removeSending( message ){
        let idx = this.sendingMessages.indexOf( message );
        if( idx !== -1 ){
            this._removeSending(idx);
        }
    }

    _removeSending( idx ){
        this.sendingMessages.splice(idx, 1);
        this.storage.set( this.name + '.sendings', this.sendingMessages );
    }

    addFailed( message: any ){
        if( !this.failedMessages[message.prev_id] ){
            this.failedMessages[message.prev_id] = {};
        }
        message.uid = message.prev_id + '.'+ Date.now();
        message.failed = true;
        this.failedMessages[message.prev_id][message.uid] = message;
        this.displayableIndexes.push( message.uid );
        this.storage.set( this.name +'.failed', this.failedMessages );
    }

    removeFailed( message:any ){
        delete(this.failedMessages[message.prev_id][message.uid]);
        if( !Object.keys(this.failedMessages[message.prev_id]).length ){
            delete(this.failedMessages[message.prev_id]);
        }
        let idx = this.displayableIndexes.indexOf( message.uid );
        if( idx !== -1 ){
            this.displayableIndexes.splice(idx, 1 );
        }
        this.storage.set( this.name +'.failed', this.failedMessages);
    }

    resend( message:any ){
        this.removeFailed( message );
        return this.send( message.text, message.library );
    }

    send( text?:string, library?:object ){
        // Register message.
        let message = this.addSending( text, library );
        // Send message.
        this._send(message);
    }

    _send( message ){
        return this.api.send('message.send', {text:message.text, conversation_id:this.conversation_id, library:message.library})
            .then( data => {
                message.id = parseInt(data.message_id);
                return this.refresh();
            }, err => {
                if( this.network.type !== 'none' ){
                    return this._send( message );
                }else{
                    return this._messageFailed( message );
                }
            });
    }

    _messageFailed( message ){
        this.removeSending( message );
        this.addFailed({ text:message.text, library:message.library, user_id: this.account.session.id, prev_id: this.indexes[0]} );
        this.events.process( this.name + '.updated', [] );
    }

    getFromIndex( index ){
        let idx = this.indexes.indexOf( index );
        if( idx !== -1 ){
            return this.list[idx];
        }else{
            let message;
            Object.keys(this.failedMessages).some( key => { 
                return Object.keys(this.failedMessages[key]).some( uid => {
                    if( uid === index ){
                        message = this.failedMessages[key][uid];
                        return true;
                    }
                });
            });
            return message;
        }
    }

    clear(){
        super.clear();
        // Clear cached...
        this.storage.remove( this.name + '.failed' );
        this.storage.remove( this.name + '.sendings' );
        // Clear in memory...
        this.sendingMessages = [];
        this.failedMessages = {};
        this.newMessages = [];
    }
}

@Injectable()
export class MessagesPaginatorProvider {

    public list: any = {};
    public listeners: any[] = [];
      

    public waitingMessages: any = {};
    public waitingConversations: number[];

    private static wc_key: string = 'wc';
    private static wcm_key_prefix: string = 'wcm';
    private wc_promise: Promise<any>;
    private wcm_promises: any = {};
    private wc_storing: number = 0;
    private wcm_storings: any = {};

    constructor( public api: Api, public account: Account, public events: Events, 
        public storage: Storage, public garbage:Garbage, public network:Network){
            
        this.listeners.push( this.events.on('message.new', event => this.onNewMessage(event) ) );
        this.garbage.register( this );
    }

    getPaginator( conversation_id:number ): MessagesPaginator{
        if( !this.list[conversation_id] ){
            this.list[conversation_id] = new MessagesPaginator('cvn'+conversation_id, this.api, this.garbage, this.storage, conversation_id, this.events, this.network, this.account );
        }
        return this.list[conversation_id];
    }

    onNewMessage( event ){
        let message = event.data[0],
            paginator = this.getPaginator( message.conversation_id );


        //paginator.;
    }

    clear(){
        this.list = {};
        this.listeners.forEach( listener => this.events.off(undefined, listener) );
    }
}





/*
    send( conversation_id:number, prev_id:number, text?:string, library?:object ){
        // Register message.
        let wid = this.setWaitingMessage( conversation_id, prev_id, 'sending', text, library );
        // Send message.
        return this.api.send('message.send', {text:text, conversation_id:conversation_id, library:library})
            .then( data => {
                // If paginator exist, refresh it.
                if( this.list[conversation_id] ){
                    // Update waiting message status.
                    this.updateWaitingMessage( conversation_id, prev_id, wid, 'sent' );
                    // Refresh
                    return this.list[conversation_id].get(true).then( ()=>{
                        this.removeWaitingMessage( conversation_id, prev_id, wid );
                        this.events.process('cvn'+conversation_id+'.messages.update');
                    }).catch( () => {

                    });
                }else{
                    // Delete waiting message.
                    this.removeWaitingMessage( conversation_id, prev_id, wid );
                    // Process conversation update event.
                    this.events.process('cvn'+conversation_id+'.messages.update');
                }
            }, err => {
                this.updateWaitingMessage( conversation_id, prev_id, wid, 'failed' );
                this.events.process('cvn'+conversation_id+'.messages.update');
            });
    }

    resend( conversation_id:number, old_prev_id:number, new_prev_id:number, wid: string ){
        let m = this.waitingMessages[conversation_id][old_prev_id][wid];
        this.removeWaitingMessage( conversation_id, old_prev_id, wid );
        return this.send( conversation_id, new_prev_id, m.text, m.library );
    }

    getWaitingConversation( conversation_id:number ){
        let deferred = _getDeferred();
        if( this.waitingMessages[conversation_id] ){
            deferred.resolve( this.waitingMessages[conversation_id] );
        }else{
            this.getWaitingConversations().then(()=>{
                this._getCachedWaitingConversationMessages( conversation_id )
                    .then(()=> deferred.resolve( this.waitingMessages[conversation_id] ));
            });
        }
        return deferred.promise;
    }

    getWaitingConversations(){
        let deferred = _getDeferred();
        if( this.waitingConversations ){
            deferred.resolve( this.waitingConversations );
        }else{
            this._getCachedWaitingConversations().then(()=>deferred.resolve(this.waitingConversations));
        }
        return deferred.resolve();
    }

    removeWaitingMessage( conversation_id:number, prev_id:number, wid:string ){
        delete( this.waitingMessages[conversation_id][prev_id][wid] );
        if( !Object.keys(this.waitingConversations[conversation_id][prev_id]).length ){
            delete( this.waitingMessages[conversation_id][prev_id] );
        }
        if( this._isWaitingConversationEmpty( conversation_id ) ){
            let idx = this.waitingConversations.indexOf(conversation_id);
            if( idx !== -1){      
                this.waitingConversations.splice( idx , 1 );
                this._storeWaitingConversations();
                this._unstoreWaitingConversationMessages( conversation_id );
            }            
        }else{
            this._storeWaitingConversationMessages(conversation_id);
        }
    }

    updateWaitingMessage( conversation_id:number, prev_id:number, wid:string, status:string ){
        this.waitingMessages[conversation_id][prev_id][wid].status = status;
        this._storeWaitingConversationMessages(conversation_id);
    }

    setWaitingMessage( conversation_id:number, prev_id:number, status:string, text?:string, library?:object ): string{
        if( !this.waitingMessages[conversation_id][prev_id] ){
            this.waitingMessages[conversation_id][prev_id] = {};
        }
        let id = prev_id+'.'+Date.now(); // /!\ Pay attention to duplicate messages
        this.waitingMessages[conversation_id][prev_id][id] = { wid:id, text:text, library:library, status:status };
        this._storeWaitingConversationMessages(conversation_id);
        return id;
    }

    private _isWaitingConversationEmpty( conversation_id: number ){
        return !Object.keys( this.waitingConversations[conversation_id] )
            .some( prev_id => !!Object.keys(this.waitingConversations[conversation_id][prev_id]).length );
    }

    private _unstoreWaitingConversationMessages( conversation_id:number ){
        this.storage.remove( MessagesPaginatorProvider.wcm_key_prefix+conversation_id );
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

            if( this.waitingConversations.indexOf(conversation_id) === -1 ){
                this.waitingConversations.push( conversation_id );
                this._storeWaitingConversations();
            }
        }else{
            this.wcm_storings[conversation_id] = 2;
        }
    }

    private _getCachedWaitingConversationMessages( conversation_id:number ){
        let deferred = _getDeferred();
        
        if( this.waitingMessages[conversation_id] ){
            deferred.resolve();
        }else if( this.waitingConversations.indexOf(conversation_id) === -1 ){
            this.waitingMessages[conversation_id] = {};
            deferred.resolve();
        }else if( this.wcm_promises[conversation_id] ){
            return this.wcm_promises[conversation_id];
        }else{
            this.wcm_promises[conversation_id] = deferred.promise;
            this.storage.get( MessagesPaginatorProvider.wcm_key_prefix+conversation_id )
                .then( data => {
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
                    deferred.resolve();
                })
                .catch( ()=> {
                    this.waitingMessages[conversation_id] = {};
                    delete(this.wcm_promises[conversation_id]);
                    deferred.resolve();
                });
        }
        return deferred.promise;
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
    }*/