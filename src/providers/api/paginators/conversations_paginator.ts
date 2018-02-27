import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractPaginator } from './abstract_paginator';

@Injectable()
export class ConversationsPaginator extends AbstractPaginator {

    public cache_size:number = 20;
    public page_number:number = 10;
    public _start_filter:string = 'message.id';
    public _order_filter:any = {'message.id':'DESC'};
    public _column_filter:any = {'message.id':'<'};
    public _default_params:any = { type: 2 };
    public _method_get:string = 'conversation.getList';

    constructor(  public api: Api ){
        super( 'conversations', api );
    }

    formatResult( data:any ): any{
        return data.list;
    }
}