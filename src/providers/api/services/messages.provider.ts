import { Injectable } from '@angular/core';
// Providers
import { Api } from '../services/api.provider';
import { Account } from '../services/account.provider';
import { AbstractPaginator } from '../paginators/abstract_paginator';
import { Events } from '../../events/events.module';

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

    constructor( public api: Api, public account: Account, public events: Events){}

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

    /*clear: function(){
        service.list = {};
        storage.removeItem('cml');
    }*/
}