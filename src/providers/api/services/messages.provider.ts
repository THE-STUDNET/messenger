import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
// Providers
import { Api } from '../services/api.provider';
import { Garbage } from '../services/garbage.provider';
import { Account } from '../services/account.provider';
import { AbstractPaginator } from '../paginators/abstract_paginator';
import { Events } from '../../events/events.module';
import { Network } from '@ionic-native/network';

import { FileCache, Upload } from '../../shared/shared.module';
import { _getDeferred } from '../../../functions/getDeferred';

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

    constructor( public name:string, public api: Api, public garbage:Garbage, public storage:Storage, public upload: Upload,
        public conversation_id:number, public events:Events, public network: Network, public account:Account, public fileCache: FileCache ){
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
        // Clean sending messages.
        this.sendingMessages.forEach( m => {
            if( m.id ){
                let idx = this.indexes.indexOf( m.id );
                if( idx !== -1 ){
                    this.removeSending( m );
                }
            }
        });
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
    }

    ready(){
        if( !this.messageReadyPromise ){
            let sendingPromise = this.storage.get( this.name+'.sendings' ).then( data => {
                this.sendingMessages = data || [];
                console.log('GET SENDINGS', data );
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
            // Process event.
            this.events.process( this.name +'.updated', data );
        });
    }

    addSending( text?:string, library?:object, file? ){
        let message = { text:text, library: library, id:undefined, user_id:this.account.session.id };

        if( file ){    
            message.library = {
                name: file.name,
                type: file.type,
                file: file
            };
        }

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

    send( text?:string, library?:object, file? ){
        // Register message.
        let message = this.addSending( text, library, file );
        // Send message.
        this._send(message);        
    }

    _sendToAPI( message ){
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

    _sendFile( message, file, name ){
        let upload = this.upload.send( file, name );

        upload.observable.subscribe( data => {
            message.progress = data.progress;
            if( data.token ){
                message.progress = 100;
                message.library.token = data.token;
                // DELETING TEMP FILE
                message.file = undefined;
                //this.fileCache.removeFile( message.library.name );
                // UPDATE SENDINGS IN CACHE
                this.storage.set( this.name +'.sendings', this.sendingMessages );
                // SEND MESSAGE TO API.
                this._sendToAPI( message );
            }
        }, event => {
            console.log('UPLOAD ERR', event);
        });
    }

    _send( message ){
        if( message.library ){
            if( message.library.file && message.library.file instanceof File ){
                //this.fileCache.createFile( message.library.name, message.library.file ).then( ()=>{
                    this._sendFile( message, message.library.file, message.library.name );
                //});
            }else{
                this.fileCache.getFile( message.library.name ).then( entry => {
                    entry.file( file => {
                        this._sendFile( message, file, message.library.name );
                    }, e => console.log('ERR GET FILE REF FROM ENTRY', e));
                }, e => console.log('ERR GET SENDING FILE', e));
            }
        }else{
            this._sendToAPI( message );
        }

        /*
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
            });*/
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

    constructor( public api: Api, public account: Account, public events: Events, public upload: Upload,
        public storage: Storage, public garbage:Garbage, public network:Network, public fileCache: FileCache){            
        //this.listeners.push( this.events.on('message.new', event => this.onNewMessage(event) ) );
        this.garbage.register( this );
    }

    getPaginator( conversation_id:number ): MessagesPaginator{
        if( !this.list[conversation_id] ){
            this.list[conversation_id] = new MessagesPaginator('cvn'+conversation_id, this.api, this.garbage, this.storage, this.upload, conversation_id, this.events, this.network, this.account, this.fileCache );
        }
        return this.list[conversation_id];
    }

    //onNewMessage( event ){}

    clear(){
        this.list = {};
        this.listeners.forEach( listener => this.events.off(undefined, listener) );
    }
}